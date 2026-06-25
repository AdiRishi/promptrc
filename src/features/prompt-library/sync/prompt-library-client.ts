import {
  acceptFreshPromptLibraryFirstSignInCopy,
  declineFreshPromptLibraryFirstSignInCopy,
} from '@/features/prompt-library/lifecycle/fresh-prompt-library-transition'
import { makePromptLibraryReady } from '@/features/prompt-library/lifecycle/prompt-library-hydration'
import { type PromptLibraryStorage } from '@/features/prompt-library/persistence/prompt-library-storage'
import { type PromptLibraryStoreApi } from '@/features/prompt-library/store/prompt-library-store'
import {
  type PromptRecord,
  type PromptShareRecord,
  type PromptShareRevokeResult,
  type PromptSyncMode,
} from '@/features/prompt-library/types'

export type PromptLibraryMutationResult<TValue> =
  | {
      status: 'synced'
      value: TValue
    }
  | {
      error: unknown
      message: string
      status: 'failed'
    }

export type PromptLibraryClient = {
  canSharePrompts: boolean
  mode: PromptSyncMode
  acceptFirstSignInCopy: () => Promise<void>
  createPromptShare: (promptId: string) => Promise<PromptLibraryMutationResult<PromptShareRecord>>
  deletePrompt: (promptId: string) => Promise<PromptLibraryMutationResult<void>>
  declineFirstSignInCopy: () => Promise<void>
  reportError: (error: unknown) => string
  revokePromptShare: (
    promptId: string,
  ) => Promise<PromptLibraryMutationResult<PromptShareRevokeResult>>
  savePrompt: (prompt: PromptRecord) => Promise<PromptLibraryMutationResult<PromptRecord>>
  sync: () => Promise<void>
  recordPromptUse: (promptId: string) => Promise<PromptLibraryMutationResult<PromptRecord | null>>
}

export const hydratePromptLibrary = async (
  storage: PromptLibraryStorage,
  store: PromptLibraryStoreApi,
) => {
  await makePromptLibraryReady(storage, store)
}

export const createPromptLibraryClient = (
  storage: PromptLibraryStorage,
  store: PromptLibraryStoreApi,
): PromptLibraryClient => {
  const markSyncReady = () => {
    store.getState().actions.setSyncState({ syncMode: storage.mode, syncStatus: 'ready' })
  }

  const markSyncError = (error: unknown) => {
    const message = storage.reportError(error)

    store.getState().actions.setSyncState({
      syncMode: storage.mode,
      syncStatus: 'error',
      syncError: message,
    })

    return message
  }

  const syncMutation = async <TValue>(
    operation: () => Promise<TValue>,
  ): Promise<PromptLibraryMutationResult<TValue>> => {
    try {
      const value = await operation()

      markSyncReady()

      return { status: 'synced', value }
    } catch (error) {
      return {
        status: 'failed',
        message: markSyncError(error),
        error,
      }
    }
  }

  const sync = async () => {
    await hydratePromptLibrary(storage, store)
    markSyncReady()
  }

  const noopFirstSignInCopyDecision = () => Promise.resolve()

  if (storage.mode === 'local') {
    const localShareUnavailable = () =>
      Promise.resolve({
        status: 'failed',
        message: 'Sign in to share prompts',
        error: new Error('Sign in to share prompts'),
      } satisfies PromptLibraryMutationResult<never>)

    return {
      canSharePrompts: false,
      mode: storage.mode,
      acceptFirstSignInCopy: noopFirstSignInCopyDecision,
      createPromptShare: localShareUnavailable,
      deletePrompt: () => syncMutation(() => Promise.resolve()),
      declineFirstSignInCopy: noopFirstSignInCopyDecision,
      reportError: storage.reportError,
      revokePromptShare: localShareUnavailable,
      savePrompt: (prompt) => syncMutation(() => Promise.resolve(prompt)),
      sync,
      recordPromptUse: () => syncMutation(() => Promise.resolve(null)),
    }
  }

  return {
    canSharePrompts: true,
    mode: storage.mode,
    acceptFirstSignInCopy: () => acceptFreshPromptLibraryFirstSignInCopy(storage, store),
    createPromptShare: (promptId) => syncMutation(() => storage.createPromptShare(promptId)),
    deletePrompt: (promptId) => syncMutation(() => storage.deletePrompt(promptId)),
    declineFirstSignInCopy: () => declineFreshPromptLibraryFirstSignInCopy(storage, store),
    reportError: storage.reportError,
    revokePromptShare: (promptId) => syncMutation(() => storage.revokePromptShare(promptId)),
    savePrompt: (prompt) => syncMutation(() => storage.savePrompt(prompt)),
    sync,
    recordPromptUse: (promptId) => syncMutation(() => storage.recordPromptUse(promptId)),
  }
}
