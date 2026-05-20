import { type PromptLibraryStorage } from '@/features/prompt-library/persistence/prompt-library-storage'
import { type PromptLibraryStoreApi } from '@/features/prompt-library/store/prompt-library-store'
import {
  acceptFreshPromptLibraryFirstSignInCopy,
  declineFreshPromptLibraryFirstSignInCopy,
} from '@/features/prompt-library/sync/fresh-prompt-library-transition'
import { makePromptLibraryReady } from '@/features/prompt-library/sync/prompt-library-lifecycle'
import { type PromptRecord, type PromptSyncMode } from '@/features/prompt-library/types'

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
  mode: PromptSyncMode
  acceptFirstSignInCopy: () => Promise<void>
  deletePrompt: (promptId: string) => Promise<PromptLibraryMutationResult<void>>
  declineFirstSignInCopy: () => Promise<void>
  reportError: (error: unknown) => string
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
    return {
      mode: storage.mode,
      acceptFirstSignInCopy: noopFirstSignInCopyDecision,
      deletePrompt: () => syncMutation(() => Promise.resolve()),
      declineFirstSignInCopy: noopFirstSignInCopyDecision,
      reportError: storage.reportError,
      savePrompt: (prompt) => syncMutation(() => Promise.resolve(prompt)),
      sync,
      recordPromptUse: () => syncMutation(() => Promise.resolve(null)),
    }
  }

  return {
    mode: storage.mode,
    acceptFirstSignInCopy: () => acceptFreshPromptLibraryFirstSignInCopy(storage, store),
    deletePrompt: (promptId) => syncMutation(() => storage.deletePrompt(promptId)),
    declineFirstSignInCopy: () => declineFreshPromptLibraryFirstSignInCopy(storage, store),
    reportError: storage.reportError,
    savePrompt: (prompt) => syncMutation(() => storage.savePrompt(prompt)),
    sync,
    recordPromptUse: (promptId) => syncMutation(() => storage.recordPromptUse(promptId)),
  }
}
