import { generatePromptId } from '@/features/prompt-library/lib/prompt-library-utils'
import {
  createStarterPrompts,
  hasStarterPrompts,
} from '@/features/prompt-library/lib/starter-prompts'
import { readLocalPromptLibrarySnapshot } from '@/features/prompt-library/storage/local-prompt-library-storage'
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
  acceptFirstSignInCopy: () => Promise<void>
  declineFirstSignInCopy: () => Promise<void>
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

    const state = store.getState()

    if (state.isFresh && state.prompts.length === 0) {
      store.getState().actions.seedStarterPrompts(createStarterPrompts())
    }

    if (state.isFresh && hasStarterPrompts(state.prompts) && !state.selectedPromptId) {
      store.getState().actions.seedStarterPrompts(state.prompts)
    }

    return
  }

  store.getState().actions.replacePrompts(hydrationResult.snapshot.prompts, {
    isFresh: hydrationResult.snapshot.isFresh,
  })
}

export const seedFreshPromptLibrary = async (
  storage: PromptLibraryStorage,
  store: PromptLibraryStoreApi,
) => {
  const state = store.getState()

  if (!state.isFresh || hasStarterPrompts(state.prompts) || state.prompts.length > 0) {
    return
  }

  if (storage.mode === 'remote') {
    const localSnapshot = readLocalPromptLibrarySnapshot()

    if (localSnapshot?.prompts.length) {
      store.getState().actions.offerFirstSignInCopy(localSnapshot.prompts)
      return
    }

    if (localSnapshot && !localSnapshot.isFresh) {
      await storage.setFreshness(false)
      store.getState().actions.markPromptLibraryNotFresh()
      return
    }
  }

  const starterPrompts = createStarterPrompts()

  if (storage.mode === 'remote') {
    await storage.seedPrompts(starterPrompts)
  }

  store.getState().actions.seedStarterPrompts(starterPrompts)
}

export const hydratePromptLibrary = async (
  storage: PromptLibraryStorage,
  store: PromptLibraryStoreApi,
) => {
  const hydrationResult = await storage.hydrate()

  applyHydrationResult(store, hydrationResult)
  await seedFreshPromptLibrary(storage, store)
}

const createRemoteCopyPrompt = (prompt: PromptRecord): PromptRecord => ({
  ...prompt,
  id: generatePromptId(),
})

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
        const copiedPrompts: PromptRecord[] = []

        for (const localPrompt of localPrompts) {
          copiedPrompts.push(await storage.savePrompt(createRemoteCopyPrompt(localPrompt)))
        }

        await storage.setFreshness(false)
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
