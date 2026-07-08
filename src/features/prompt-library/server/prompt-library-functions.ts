import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'

import {
  assertPromptId,
  assertPromptImageId,
  assertPromptImageUploadInput,
  assertPromptRecord,
  assertPromptRecords,
  assertPromptShareId,
} from '@/features/prompt-library/model/prompt-library-validation'
import {
  deleteUnreferencedPromptImageObjectsForUser,
  getPromptImageObjectForUser,
  getPublicPromptShareImageObject,
  promptImageObjectToResponse,
  uploadPromptImageForUser,
} from '@/features/prompt-library/persistence/remote/prompt-image-persistence'
import {
  createPromptShareForUser,
  getActivePromptShareForUser,
  getPublicPromptShare,
  revokePromptShareForUser,
} from '@/features/prompt-library/persistence/remote/prompt-share-persistence'
import {
  createRemotePromptLibraryPersistence,
  deletePromptAndPruneImagesForUser,
  savePromptAndPruneImagesForUser,
} from '@/features/prompt-library/persistence/remote/remote-prompt-library-persistence'

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

const getPromptImageBucket = async () => {
  const { env } = await import('cloudflare:workers')
  const bucket = (env as { PROMPT_IMAGES?: R2Bucket }).PROMPT_IMAGES

  if (!bucket) {
    throw new Error('R2 binding PROMPT_IMAGES is not configured')
  }

  return bucket
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
  .validator(assertPromptRecords)
  .handler(async ({ data: prompts }) => {
    const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

    return promptLibrary.addStarterPrompts(prompts)
  })

export const acceptRemoteFirstSignInCopy = createServerFn({ method: 'POST' })
  .validator(assertPromptRecords)
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
  .validator(assertPromptRecord)
  .handler(async ({ data: prompt }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()
    const bucket = await getPromptImageBucket()

    return savePromptAndPruneImagesForUser(db, bucket, extUserId, prompt)
  })

export const deleteRemotePrompt = createServerFn({ method: 'POST' })
  .validator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()
    const bucket = await getPromptImageBucket()

    return deletePromptAndPruneImagesForUser(db, bucket, extUserId, promptId)
  })

export const incrementRemotePromptUses = createServerFn({ method: 'POST' })
  .validator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const promptLibrary = await getAuthenticatedPromptLibraryPersistence()

    return promptLibrary.recordPromptUse(promptId)
  })

export const createRemotePromptShare = createServerFn({ method: 'POST' })
  .validator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return createPromptShareForUser(db, extUserId, promptId)
  })

export const revokeRemotePromptShare = createServerFn({ method: 'POST' })
  .validator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return revokePromptShareForUser(db, extUserId, promptId)
  })

export const getRemotePromptShare = createServerFn({ method: 'GET' })
  .validator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return getActivePromptShareForUser(db, extUserId, promptId)
  })

export const getPublicRemotePromptShare = createServerFn({ method: 'GET' })
  .validator(assertPromptShareId)
  .handler(async ({ data: shareId }) => {
    const db = await getDatabase()

    return getPublicPromptShare(db, shareId)
  })

export const uploadRemotePromptImage = createServerFn({ method: 'POST' })
  .validator(assertPromptImageUploadInput)
  .handler(async ({ data: upload }) => {
    const extUserId = await requireUserId()
    const bucket = await getPromptImageBucket()

    return uploadPromptImageForUser(bucket, extUserId, upload)
  })

export const deleteRemotePromptImage = createServerFn({ method: 'POST' })
  .validator(assertPromptImageId)
  .handler(async ({ data: imageId }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()
    const bucket = await getPromptImageBucket()
    const promptLibrary = createRemotePromptLibraryPersistence(db, extUserId)

    await deleteUnreferencedPromptImageObjectsForUser(
      bucket,
      extUserId,
      [imageId],
      await promptLibrary.listPrompts(),
    )
  })

export const getAuthenticatedPromptImageResponse = async (imageId: string) => {
  const extUserId = await requireUserId()
  const bucket = await getPromptImageBucket()
  const object = await getPromptImageObjectForUser(bucket, extUserId, imageId)

  return promptImageObjectToResponse(object)
}

export const getPublicPromptShareImageResponse = async (shareId: string, imageId: string) => {
  const db = await getDatabase()
  const bucket = await getPromptImageBucket()
  const object = await getPublicPromptShareImageObject(db, bucket, shareId, imageId)

  return promptImageObjectToResponse(object)
}
