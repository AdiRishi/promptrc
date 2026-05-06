import { makePromptLibraryReady } from '@/features/prompt-library/storage/prompt-library-lifecycle'
import { type PromptLibraryStorage } from '@/features/prompt-library/storage/prompt-library-storage'
import {
  type PromptLibraryStoreApi,
  getPromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/store/prompt-library-store'
import { type PromptRecord, type PromptSyncMode } from '@/features/prompt-library/types'

export type PromptLibraryClient = {
  mode: PromptSyncMode
  addPrompt: (prompt: PromptRecord) => Promise<PromptRecord>
  acceptFirstSignInCopy: () => Promise<void>
  declineFirstSignInCopy: () => Promise<void>
  removePrompt: (promptId: string) => Promise<void>
  reportError: (error: unknown) => string
  sync: () => Promise<void>
  updatePrompt: (prompt: PromptRecord) => Promise<PromptRecord>
  recordPromptUse: (promptId: string) => Promise<PromptRecord | null>
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
  const persistLocalSnapshot = () => {
    if (storage.mode === 'local') {
      storage.persistSnapshot(getPromptLibraryPersistedSnapshot(store.getState()))
    }
  }

  const sync = async () => {
    await hydratePromptLibrary(storage, store)
    persistLocalSnapshot()
  }

  const noopFirstSignInCopyDecision = () => Promise.resolve()

  if (storage.mode === 'local') {
    const persistPrompt = (prompt: PromptRecord) => {
      persistLocalSnapshot()
      return Promise.resolve(prompt)
    }

    return {
      mode: storage.mode,
      addPrompt: persistPrompt,
      acceptFirstSignInCopy: noopFirstSignInCopyDecision,
      declineFirstSignInCopy: noopFirstSignInCopyDecision,
      removePrompt: () => {
        persistLocalSnapshot()
        return Promise.resolve()
      },
      reportError: storage.reportError,
      sync,
      updatePrompt: persistPrompt,
      recordPromptUse: () => {
        persistLocalSnapshot()
        return Promise.resolve(null)
      },
    }
  }

  return {
    mode: storage.mode,
    acceptFirstSignInCopy: async () => {
      const localPrompts = store.getState().firstSignInCopy.localPrompts

      if (!localPrompts.length) {
        return
      }

      store.getState().actions.beginFirstSignInCopy()

      try {
        const copiedPrompts = await storage.copyPrompts(localPrompts)
        store.getState().actions.completeFirstSignInCopy(copiedPrompts)
      } catch (error) {
        const message = storage.reportError(error)

        store.getState().actions.failFirstSignInCopy(message)
        throw error
      }
    },
    addPrompt: storage.savePrompt,
    declineFirstSignInCopy: async () => {
      await storage.setFreshness(false)
      store.getState().actions.declineFirstSignInCopy()
    },
    removePrompt: storage.deletePrompt,
    reportError: storage.reportError,
    sync,
    updatePrompt: storage.savePrompt,
    recordPromptUse: storage.incrementUses,
  }
}
