import {
  type FreshPromptLibraryTransitionOptions,
  applyFreshPromptLibraryTransition,
} from '@/features/prompt-library/lifecycle/fresh-prompt-library-transition'
import {
  createStarterPrompts,
  hasStarterPrompts,
} from '@/features/prompt-library/model/starter-prompts'
import {
  type PromptLibraryHydrationResult,
  type PromptLibraryStorage,
} from '@/features/prompt-library/persistence/prompt-library-storage'
import { type PromptLibraryStoreApi } from '@/features/prompt-library/store/prompt-library-store'

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

export const makePromptLibraryReady = async (
  storage: PromptLibraryStorage,
  store: PromptLibraryStoreApi,
  options: FreshPromptLibraryTransitionOptions = {},
) => {
  const hydrationResult = await storage.hydrate()

  applyPromptLibraryHydrationResult(store, hydrationResult)
  await applyFreshPromptLibraryTransition(storage, store, options)
}
