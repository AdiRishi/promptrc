import {
  type PromptLibraryHydrationResult,
  type PromptLibraryStorage,
} from '@/features/prompt-library/storage/prompt-library-storage'
import {
  type PromptLibraryStoreApi,
  getPromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/store/prompt-library-store'
import { type PromptRecord, type PromptSyncMode } from '@/features/prompt-library/types'

export type PromptLibraryClient = {
  mode: PromptSyncMode
  addPrompt: (prompt: PromptRecord) => Promise<PromptRecord>
  removePrompt: (promptId: string) => Promise<void>
  reportError: (error: unknown) => string
  sync: () => Promise<void>
  updatePrompt: (prompt: PromptRecord) => Promise<PromptRecord>
  recordPromptUse: (promptId: string) => Promise<PromptRecord | null>
}

export const applyHydrationResult = (
  store: PromptLibraryStoreApi,
  hydrationResult: PromptLibraryHydrationResult,
) => {
  if (hydrationResult.source === 'local') {
    store.getState().actions.restoreLocalState(hydrationResult.snapshot)
    return
  }

  store.getState().actions.replacePrompts(hydrationResult.prompts)
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
    const hydrationResult = await storage.hydrate()

    applyHydrationResult(store, hydrationResult)
    persistLocalSnapshot()
  }

  if (storage.mode === 'local') {
    const persistPrompt = (prompt: PromptRecord) => {
      persistLocalSnapshot()
      return Promise.resolve(prompt)
    }

    return {
      mode: storage.mode,
      addPrompt: persistPrompt,
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
    addPrompt: storage.savePrompt,
    removePrompt: storage.deletePrompt,
    reportError: storage.reportError,
    sync,
    updatePrompt: storage.savePrompt,
    recordPromptUse: storage.incrementUses,
  }
}
