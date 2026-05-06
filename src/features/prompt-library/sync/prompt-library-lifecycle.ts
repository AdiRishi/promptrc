import {
  createStarterPrompts,
  hasStarterPrompts,
} from '@/features/prompt-library/model/starter-prompts'
import { readLocalPromptLibrarySnapshot } from '@/features/prompt-library/persistence/local-prompt-library-storage'
import {
  type PromptLibraryHydrationResult,
  type PromptLibraryStorage,
} from '@/features/prompt-library/persistence/prompt-library-storage'
import { type PromptLibraryStoreApi } from '@/features/prompt-library/store/prompt-library-store'
import { type PromptLibraryPersistedSnapshot } from '@/features/prompt-library/types'

type FreshPromptLibraryLifecycleOptions = {
  readLocalSnapshot?: () => PromptLibraryPersistedSnapshot | null
}

type FreshPromptLibraryDecision =
  | { type: 'none' }
  | { localPrompts: PromptLibraryPersistedSnapshot['prompts']; type: 'offer-first-sign-in-copy' }
  | { type: 'preserve-empty-local-choice' }
  | { type: 'add-starter-prompts' }

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

export const decideFreshPromptLibraryTransition = ({
  isRemote,
  localSnapshot,
  prompts,
  isFresh,
}: {
  isRemote: boolean
  localSnapshot: PromptLibraryPersistedSnapshot | null
  prompts: PromptLibraryPersistedSnapshot['prompts']
  isFresh: boolean
}): FreshPromptLibraryDecision => {
  if (!isFresh || hasStarterPrompts(prompts) || prompts.length > 0) {
    return { type: 'none' }
  }

  if (!isRemote) {
    return { type: 'add-starter-prompts' }
  }

  if (localSnapshot?.prompts.length) {
    return {
      type: 'offer-first-sign-in-copy',
      localPrompts: localSnapshot.prompts,
    }
  }

  if (localSnapshot && !localSnapshot.isFresh) {
    return { type: 'preserve-empty-local-choice' }
  }

  return { type: 'add-starter-prompts' }
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
  const readLocalSnapshot = options.readLocalSnapshot ?? readLocalPromptLibrarySnapshot
  const decision = decideFreshPromptLibraryTransition({
    isRemote: storage.mode === 'remote',
    isFresh: state.isFresh,
    localSnapshot: storage.mode === 'remote' ? readLocalSnapshot() : null,
    prompts: state.prompts,
  })

  if (decision.type === 'none') {
    return
  }

  if (decision.type === 'offer-first-sign-in-copy') {
    store.getState().actions.offerFirstSignInCopy(decision.localPrompts)
    return
  }

  if (decision.type === 'preserve-empty-local-choice') {
    if (storage.mode === 'remote') {
      await storage.declineFirstSignInCopy()
    }

    store.getState().actions.markPromptLibraryNotFresh()
    return
  }

  const starterPrompts = createStarterPrompts()
  const savedStarterPrompts =
    storage.mode === 'remote' ? await storage.addStarterPrompts(starterPrompts) : starterPrompts

  store.getState().actions.seedStarterPrompts(savedStarterPrompts)
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
