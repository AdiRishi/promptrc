import {
  createStarterPrompts,
  hasStarterPrompts,
} from '@/features/prompt-library/lib/starter-prompts'
import { readLocalPromptLibrarySnapshot } from '@/features/prompt-library/storage/local-prompt-library-storage'
import {
  type PromptLibraryHydrationResult,
  type PromptLibraryStorage,
} from '@/features/prompt-library/storage/prompt-library-storage'
import { type PromptLibraryStoreApi } from '@/features/prompt-library/store/prompt-library-store'
import { type PromptLibraryPersistedSnapshot } from '@/features/prompt-library/types'

type FreshPromptLibraryLifecycleOptions = {
  readLocalSnapshot?: () => PromptLibraryPersistedSnapshot | null
}

export const applyPromptLibraryHydrationResult = (
  store: PromptLibraryStoreApi,
  hydrationResult: PromptLibraryHydrationResult,
) => {
  if (hydrationResult.source === 'local') {
    store.getState().actions.restoreLocalState(hydrationResult.snapshot)
    ensureFreshLocalStarterPromptSelection(store)
    return
  }

  store.getState().actions.replacePrompts(hydrationResult.snapshot.prompts, {
    isFresh: hydrationResult.snapshot.isFresh,
  })
}

const ensureFreshLocalStarterPromptSelection = (store: PromptLibraryStoreApi) => {
  const state = store.getState()

  if (state.isFresh && state.prompts.length === 0) {
    store.getState().actions.seedStarterPrompts(createStarterPrompts())
    return
  }

  if (state.isFresh && hasStarterPrompts(state.prompts) && !state.selectedPromptId) {
    store.getState().actions.seedStarterPrompts(state.prompts)
  }
}

export const progressFreshPromptLibraryLifecycle = async (
  storage: PromptLibraryStorage,
  store: PromptLibraryStoreApi,
  options: FreshPromptLibraryLifecycleOptions = {},
) => {
  const state = store.getState()

  if (!state.isFresh || hasStarterPrompts(state.prompts) || state.prompts.length > 0) {
    return
  }

  if (storage.mode === 'remote') {
    const readLocalSnapshot = options.readLocalSnapshot ?? readLocalPromptLibrarySnapshot
    const localSnapshot = readLocalSnapshot()

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

export const makePromptLibraryReady = async (
  storage: PromptLibraryStorage,
  store: PromptLibraryStoreApi,
  options: FreshPromptLibraryLifecycleOptions = {},
) => {
  const hydrationResult = await storage.hydrate()

  applyPromptLibraryHydrationResult(store, hydrationResult)
  await progressFreshPromptLibraryLifecycle(storage, store, options)
}
