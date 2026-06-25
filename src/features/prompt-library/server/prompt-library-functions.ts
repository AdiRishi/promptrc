import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'

import {
  assertPromptId,
  assertPromptRecord,
  assertPromptRecords,
  assertPromptShareId,
} from '@/features/prompt-library/model/prompt-library-validation'
import {
  createPromptShareForUser,
  getActivePromptShareForUser,
  getPublicPromptShare,
  revokePromptShareForUser,
} from '@/features/prompt-library/persistence/remote/prompt-share-persistence'
import { createRemotePromptLibraryPersistence } from '@/features/prompt-library/persistence/remote/remote-prompt-library-persistence'

export {
  acceptFirstSignInCopyForUser,
  addStarterPromptsForUser,
  copyPromptsForUser,
  deletePromptForUser,
  declineFirstSignInCopyForUser,
  getPromptLibraryForUser,
  incrementPromptUsesForUser,
  listPromptsForUser,
  markPromptLibraryNotFreshForUser,
  recordPromptUseForUser,
  savePromptForUser,
  seedPromptsForUser,
  upsertPromptForUser,
} from '@/features/prompt-library/persistence/remote/remote-prompt-library-persistence'
export {
  createPromptShareForUser,
  getActivePromptShareForUser,
  getPublicPromptShare,
  revokePromptShareForUser,
}

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

export const addRemoteStarterPrompts = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptRecords)
  .handler(async ({ data: prompts }) => {
    const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

    return promptLibrary.addStarterPrompts(prompts)
  })

export const acceptRemoteFirstSignInCopy = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptRecords)
  .handler(async ({ data: prompts }) => {
    const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

    return promptLibrary.acceptFirstSignInCopy(prompts)
  })

export const declineRemoteFirstSignInCopy = createServerFn({ method: 'POST' }).handler(async () => {
  const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

  return promptLibrary.declineFirstSignInCopy()
})

export const seedRemoteStarterPrompts = addRemoteStarterPrompts
export const copyRemotePromptsToPromptLibrary = acceptRemoteFirstSignInCopy

export const upsertRemotePrompt = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptRecord)
  .handler(async ({ data: prompt }) => {
    const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

    return promptLibrary.savePrompt(prompt)
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

    return promptLibrary.recordPromptUse(promptId)
  })

export const createRemotePromptShare = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return createPromptShareForUser(db, extUserId, promptId)
  })

export const revokeRemotePromptShare = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return revokePromptShareForUser(db, extUserId, promptId)
  })

export const getPublicRemotePromptShare = createServerFn({ method: 'GET' })
  .inputValidator(assertPromptShareId)
  .handler(async ({ data: shareId }) => {
    const db = await getDatabase()

    return getPublicPromptShare(db, shareId)
  })
