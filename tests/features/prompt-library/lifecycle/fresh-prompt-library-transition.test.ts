import { describe, expect, it, vi } from 'vitest'

import {
  acceptFreshPromptLibraryFirstSignInCopy,
  applyFreshPromptLibraryTransition,
  decideFreshPromptLibraryTransition,
} from '@/features/prompt-library/lifecycle/fresh-prompt-library-transition'
import { type RemotePromptLibraryStorage } from '@/features/prompt-library/persistence/prompt-library-storage'
import { createPromptLibraryStore } from '@/features/prompt-library/store/prompt-library-store'
import {
  type PromptLibraryPersistedSnapshot,
  type PromptRecord,
} from '@/features/prompt-library/types'

const prompt: PromptRecord = {
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing'],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
}

const createPersistedSnapshot = (
  overrides: Partial<PromptLibraryPersistedSnapshot> = {},
): PromptLibraryPersistedSnapshot => ({
  prompts: [],
  isFresh: true,
  query: '',
  selectedPromptId: null,
  composer: {
    mode: 'view',
    draft: {
      title: '',
      category: '',
      body: '',
      tagsInput: '',
    },
  },
  ...overrides,
})

const createRemoteStorage = (
  overrides: Partial<RemotePromptLibraryStorage> = {},
): RemotePromptLibraryStorage => ({
  mode: 'remote',
  acceptFirstSignInCopy: (prompts) => Promise.resolve(prompts),
  addStarterPrompts: (starterPrompts) => Promise.resolve(starterPrompts),
  declineFirstSignInCopy: () =>
    Promise.resolve({
      prompts: [],
      isFresh: false,
    }),
  deletePrompt: () => Promise.resolve(),
  hydrate: () =>
    Promise.resolve({
      source: 'remote',
      snapshot: {
        prompts: [],
        isFresh: false,
      },
    }),
  recordPromptUse: (promptId) =>
    Promise.resolve({
      ...prompt,
      id: promptId,
      uses: prompt.uses + 1,
    }),
  reportError: (error) => (error instanceof Error ? error.message : 'sync failed'),
  savePrompt: (savedPrompt) => Promise.resolve(savedPrompt),
  ...overrides,
})

describe('Fresh Prompt Library transition', () => {
  it('offers First-Sign-In Copy before adding Starter Prompts', async () => {
    const store = createPromptLibraryStore()
    const addStarterPrompts = vi.fn((starterPrompts: PromptRecord[]) =>
      Promise.resolve(starterPrompts),
    )
    const storage = createRemoteStorage({ addStarterPrompts })

    store.getState().actions.replacePrompts([], { isFresh: true })

    await applyFreshPromptLibraryTransition(storage, store, {
      readLocalSnapshot: () =>
        createPersistedSnapshot({
          prompts: [prompt],
          isFresh: false,
          selectedPromptId: prompt.id,
        }),
    })

    expect(addStarterPrompts).not.toHaveBeenCalled()
    expect(store.getState().firstSignInCopy).toMatchObject({
      status: 'prompting',
      localPrompts: [prompt],
    })
  })

  it('preserves a non-fresh empty local Prompt Library choice', async () => {
    const store = createPromptLibraryStore()
    const declineFirstSignInCopy = vi.fn(() =>
      Promise.resolve({
        prompts: [],
        isFresh: false,
      }),
    )
    const storage = createRemoteStorage({ declineFirstSignInCopy })

    store.getState().actions.replacePrompts([], { isFresh: true })

    await applyFreshPromptLibraryTransition(storage, store, {
      readLocalSnapshot: () => createPersistedSnapshot({ prompts: [], isFresh: false }),
    })

    expect(declineFirstSignInCopy).toHaveBeenCalledOnce()
    expect(store.getState()).toMatchObject({
      prompts: [],
      isFresh: false,
      selectedPromptId: null,
    })
    expect(store.getState().firstSignInCopy.status).toBe('idle')
  })

  it('accepts First-Sign-In Copy through the transition interface', async () => {
    const store = createPromptLibraryStore()
    const copiedPrompt = { ...prompt, id: 'remote-prompt-alpha' }
    const acceptFirstSignInCopy = vi.fn(() => Promise.resolve([copiedPrompt]))
    const storage = createRemoteStorage({ acceptFirstSignInCopy })

    store.getState().actions.offerFirstSignInCopy([prompt])

    await acceptFreshPromptLibraryFirstSignInCopy(storage, store)

    expect(acceptFirstSignInCopy).toHaveBeenCalledWith([prompt])
    expect(store.getState().prompts).toEqual([copiedPrompt])
    expect(store.getState()).toMatchObject({
      isFresh: false,
      selectedPromptId: copiedPrompt.id,
    })
    expect(store.getState().firstSignInCopy.status).toBe('idle')
  })

  it('decides that a local Fresh Prompt Library should receive Starter Prompts', () => {
    expect(
      decideFreshPromptLibraryTransition({
        isRemote: false,
        localSnapshot: null,
        prompts: [],
        isFresh: true,
      }),
    ).toEqual({ type: 'add-starter-prompts' })
  })
})
