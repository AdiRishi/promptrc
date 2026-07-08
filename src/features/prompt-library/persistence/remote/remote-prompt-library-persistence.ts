import {
  copyPromptForRemoteLibrary,
  normalizePromptRecord,
} from '@/features/prompt-library/model/prompt-library-integrity'
import { createD1PromptLibraryAdapter } from '@/features/prompt-library/persistence/remote/d1-prompt-library-adapter'
import {
  deleteUnreferencedPromptImageObjectsForUser,
  getRemovedPromptImageIds,
} from '@/features/prompt-library/persistence/remote/prompt-image-persistence'
import {
  type PromptLibraryRemoteSnapshot,
  type PromptRecord,
} from '@/features/prompt-library/types'

export type RemotePromptLibraryPersistence = ReturnType<typeof createRemotePromptLibraryPersistence>

export const createRemotePromptLibraryPersistence = (db: D1Database, extUserId: string) => {
  const promptLibrary = createD1PromptLibraryAdapter(db, extUserId)

  return {
    acceptFirstSignInCopy: (localPrompts: PromptRecord[]) =>
      acceptFirstSignInCopyForUser(db, extUserId, localPrompts),
    addStarterPrompts: (starterPrompts: PromptRecord[]) =>
      addStarterPromptsForUser(db, extUserId, starterPrompts),
    declineFirstSignInCopy: () => declineFirstSignInCopyForUser(db, extUserId),
    deletePrompt: async (promptId: string) => {
      const changes = await promptLibrary.deletePrompt(promptId)

      if (changes === 0) {
        throw new Error('Prompt not found')
      }

      await markPromptLibraryNotFreshForUser(db, extUserId)

      return { promptId }
    },
    getPromptLibrary: () => getPromptLibraryForUser(db, extUserId),
    listPrompts: () => promptLibrary.listPrompts(),
    recordPromptUse: async (promptId: string) => {
      const changes = await promptLibrary.incrementPromptUses(promptId)

      if (changes === 0) {
        throw new Error('Prompt not found')
      }

      await markPromptLibraryNotFreshForUser(db, extUserId)

      const prompt = await promptLibrary.findPrompt(promptId)

      if (!prompt) {
        throw new Error('Prompt not found')
      }

      return prompt
    },
    savePrompt: async (prompt: PromptRecord) => {
      const normalizedPrompt = normalizePromptRecord(prompt)
      const changes = await promptLibrary.upsertPrompt(normalizedPrompt)

      if (changes === 0) {
        throw new Error('Prompt id already exists')
      }

      await markPromptLibraryNotFreshForUser(db, extUserId)

      return normalizedPrompt
    },
  }
}

export const listPromptsForUser = async (
  db: D1Database,
  extUserId: string,
): Promise<PromptRecord[]> => {
  return createD1PromptLibraryAdapter(db, extUserId).listPrompts()
}

export const findPromptForUser = async (
  db: D1Database,
  extUserId: string,
  promptId: string,
): Promise<PromptRecord | null> => {
  return createD1PromptLibraryAdapter(db, extUserId).findPrompt(promptId)
}

export const getPromptLibraryForUser = async (
  db: D1Database,
  extUserId: string,
): Promise<PromptLibraryRemoteSnapshot> => {
  const promptLibrary = createD1PromptLibraryAdapter(db, extUserId)
  const [prompts, isFresh] = await Promise.all([
    promptLibrary.listPrompts(),
    promptLibrary.getFreshness(),
  ])

  return { prompts, isFresh }
}

export const markPromptLibraryNotFreshForUser = async (db: D1Database, extUserId: string) => {
  await createD1PromptLibraryAdapter(db, extUserId).setFreshness(false)

  return { isFresh: false }
}

export const addStarterPromptsForUser = async (
  db: D1Database,
  extUserId: string,
  starterPrompts: PromptRecord[],
) => {
  const promptLibrary = createD1PromptLibraryAdapter(db, extUserId)
  const existingLibrary = await getPromptLibraryForUser(db, extUserId)

  if (!existingLibrary.isFresh || existingLibrary.prompts.length > 0) {
    return existingLibrary.prompts
  }

  if (!starterPrompts.length) {
    return []
  }

  await promptLibrary.addPrompts(starterPrompts.map((prompt) => normalizePromptRecord(prompt)))

  return starterPrompts.map(normalizePromptRecord)
}

export const acceptFirstSignInCopyForUser = async (
  db: D1Database,
  extUserId: string,
  localPrompts: PromptRecord[],
) => {
  const promptLibrary = createD1PromptLibraryAdapter(db, extUserId)
  const existingLibrary = await getPromptLibraryForUser(db, extUserId)

  if (!existingLibrary.isFresh || existingLibrary.prompts.length > 0) {
    return existingLibrary.prompts
  }

  const copiedPrompts = localPrompts.map((prompt) => copyPromptForRemoteLibrary(prompt))

  await promptLibrary.addPromptsAndSetFreshness(copiedPrompts, false)

  return copiedPrompts
}

export const declineFirstSignInCopyForUser = async (db: D1Database, extUserId: string) => {
  await markPromptLibraryNotFreshForUser(db, extUserId)

  return getPromptLibraryForUser(db, extUserId)
}

export const savePromptForUser = async (
  db: D1Database,
  extUserId: string,
  prompt: PromptRecord,
) => {
  return createRemotePromptLibraryPersistence(db, extUserId).savePrompt(prompt)
}

export const deletePromptForUser = async (db: D1Database, extUserId: string, promptId: string) => {
  return createRemotePromptLibraryPersistence(db, extUserId).deletePrompt(promptId)
}

export const savePromptAndPruneImagesForUser = async (
  db: D1Database,
  bucket: R2Bucket,
  extUserId: string,
  prompt: PromptRecord,
) => {
  const previousPrompt = await findPromptForUser(db, extUserId, prompt.id)
  const savedPrompt = await savePromptForUser(db, extUserId, prompt)

  if (!previousPrompt) {
    return savedPrompt
  }

  const removedImageIds = getRemovedPromptImageIds(previousPrompt, savedPrompt)

  if (removedImageIds.length > 0) {
    await deleteUnreferencedPromptImageObjectsForUser(
      bucket,
      extUserId,
      removedImageIds,
      await listPromptsForUser(db, extUserId),
    )
  }

  return savedPrompt
}

export const deletePromptAndPruneImagesForUser = async (
  db: D1Database,
  bucket: R2Bucket,
  extUserId: string,
  promptId: string,
) => {
  const previousPrompt = await findPromptForUser(db, extUserId, promptId)
  const result = await deletePromptForUser(db, extUserId, promptId)

  if (previousPrompt && previousPrompt.images.length > 0) {
    await deleteUnreferencedPromptImageObjectsForUser(
      bucket,
      extUserId,
      previousPrompt.images.map((image) => image.id),
      await listPromptsForUser(db, extUserId),
    )
  }

  return result
}

export const recordPromptUseForUser = async (
  db: D1Database,
  extUserId: string,
  promptId: string,
) => {
  return createRemotePromptLibraryPersistence(db, extUserId).recordPromptUse(promptId)
}

export const upsertPromptForUser = savePromptForUser
export const seedPromptsForUser = addStarterPromptsForUser
export const copyPromptsForUser = acceptFirstSignInCopyForUser
export const incrementPromptUsesForUser = recordPromptUseForUser
