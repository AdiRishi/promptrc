import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'

import {
  assertBoolean,
  assertPromptId,
  assertPromptRecord,
  assertPromptRecords,
} from '@/features/prompt-library/lib/prompt-library-validation'
import { createRemotePromptLibraryPersistence } from '@/features/prompt-library/server/remote-prompt-library-persistence'

export {
  copyPromptsForUser,
  deletePromptForUser,
  getPromptLibraryForUser,
  incrementPromptUsesForUser,
  listPromptsForUser,
  seedPromptsForUser,
  setPromptLibraryFreshnessForUser,
  upsertPromptForUser,
} from '@/features/prompt-library/server/remote-prompt-library-persistence'

const getDatabase = async () => {
  const { env } = await import('cloudflare:workers')

  if (!env.DB) {
    throw new Error('D1 binding DB is not configured')
  }

  return env.DB
}

const requireUserId = async () => {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated || !userId) {
    throw new Error('Authentication required')
  }

  return userId
}

const getAuthenticatedPromptLibraryPersistence = async () => {
  const extUserId = await requireUserId()
  const db = await getDatabase()

  return createRemotePromptLibraryPersistence(db, extUserId)
}

export const listRemotePrompts = createServerFn({ method: 'GET' }).handler(async () => {
  const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

  return promptLibrary.listPrompts()
})

export const getRemotePromptLibrary = createServerFn({ method: 'GET' }).handler(async () => {
  const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

  return promptLibrary.getPromptLibrary()
})

export const setRemotePromptLibraryFreshness = createServerFn({ method: 'POST' })
  .inputValidator((value) => assertBoolean(value, 'isFresh'))
  .handler(async ({ data: isFresh }) => {
    const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

    return promptLibrary.setFreshness(isFresh)
  })

export const seedRemoteStarterPrompts = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptRecords)
  .handler(async ({ data: prompts }) => {
    const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

    return promptLibrary.seedPrompts(prompts)
  })

export const copyRemotePromptsToPromptLibrary = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptRecords)
  .handler(async ({ data: prompts }) => {
    const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

    return promptLibrary.copyPrompts(prompts)
  })

export const upsertRemotePrompt = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptRecord)
  .handler(async ({ data: prompt }) => {
    const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

    return promptLibrary.upsertPrompt(prompt, { markLibraryNotFresh: true })
  })

export const deleteRemotePrompt = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

    return promptLibrary.deletePrompt(promptId)
  })

export const incrementRemotePromptUses = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

    return promptLibrary.incrementPromptUses(promptId)
  })
