import {
  createStarterPrompts,
  hasStarterPrompts,
} from '@/features/prompt-library/model/starter-prompts'
import { readLocalPromptLibrarySnapshot } from '@/features/prompt-library/persistence/local-prompt-library-storage'
import { type PromptLibraryStorage } from '@/features/prompt-library/persistence/prompt-library-storage'
import { type PromptLibraryStoreApi } from '@/features/prompt-library/store/prompt-library-store'
import { type PromptLibraryPersistedSnapshot } from '@/features/prompt-library/types'

export type FreshPromptLibraryTransitionOptions = {
  readLocalSnapshot?: () => PromptLibraryPersistedSnapshot | null
}

type FreshPromptLibraryDecision =
  | { type: 'none' }
  | { localPrompts: PromptLibraryPersistedSnapshot['prompts']; type: 'offer-first-sign-in-copy' }
  | { type: 'preserve-empty-local-choice' }
  | { type: 'add-starter-prompts' }

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

export const applyFreshPromptLibraryTransition = async (
  storage: PromptLibraryStorage,
  store: PromptLibraryStoreApi,
  options: FreshPromptLibraryTransitionOptions = {},
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
    await declineFreshPromptLibraryFirstSignInCopy(storage, store)
    return
  }

  const starterPrompts = createStarterPrompts()
  const savedStarterPrompts =
    storage.mode === 'remote' ? await storage.addStarterPrompts(starterPrompts) : starterPrompts

  store.getState().actions.seedStarterPrompts(savedStarterPrompts)
}

export const acceptFreshPromptLibraryFirstSignInCopy = async (
  storage: PromptLibraryStorage,
  store: PromptLibraryStoreApi,
) => {
  if (storage.mode !== 'remote') {
    return
  }

  const localPrompts = store.getState().firstSignInCopy.localPrompts

  if (!localPrompts.length) {
    return
  }

  store.getState().actions.beginFirstSignInCopy()

  try {
    const copiedPrompts = await storage.acceptFirstSignInCopy(localPrompts)
    store.getState().actions.completeFirstSignInCopy(copiedPrompts)
  } catch (error) {
    const message = storage.reportError(error)

    store.getState().actions.failFirstSignInCopy(message)
    throw error
  }
}

export const declineFreshPromptLibraryFirstSignInCopy = async (
  storage: PromptLibraryStorage,
  store: PromptLibraryStoreApi,
) => {
  if (storage.mode === 'remote') {
    await storage.declineFirstSignInCopy()
  }

  store.getState().actions.declineFirstSignInCopy()
}
