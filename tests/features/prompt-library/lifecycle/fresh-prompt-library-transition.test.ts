import { describe, expect, it, vi } from 'vitest'

import {
  acceptFreshPromptLibraryFirstSignInCopy,
  applyFreshPromptLibraryTransition,
} from '@/features/prompt-library/lifecycle/fresh-prompt-library-transition'
import { STARTER_PROMPT_TITLES } from '@/features/prompt-library/model/starter-prompts'
import {
  type LocalPromptLibraryStorage,
  type RemotePromptLibraryStorage,
} from '@/features/prompt-library/persistence/prompt-library-storage'
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
  createPromptShare: (promptId) =>
    Promise.resolve({
      id: 'share-alpha',
      promptId,
      createdAt: '2026-04-24T00:01:00.000Z',
      revokedAt: null,
    }),
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
  revokePromptShare: (promptId) =>
    Promise.resolve({
      promptId,
      revoked: true,
    }),
  savePrompt: (savedPrompt) => Promise.resolve(savedPrompt),
  ...overrides,
})

const createLocalStorage = (
  overrides: Partial<LocalPromptLibraryStorage> = {},
): LocalPromptLibraryStorage => ({
  mode: 'local',
  hydrate: () =>
    Promise.resolve({
      source: 'local',
      snapshot: null,
    }),
  persistSnapshot: () => undefined,
  reportError: (error) => (error instanceof Error ? error.message : 'sync failed'),
  ...overrides,
})

describe('Fresh Prompt Library transition', () => {
  it('seeds Starter Prompts into a local Fresh Prompt Library', async () => {
    const store = createPromptLibraryStore()
    const storage = createLocalStorage()

    store.getState().actions.replacePrompts([], { isFresh: true })

    await applyFreshPromptLibraryTransition(storage, store)

    expect(store.getState().prompts.map((starterPrompt) => starterPrompt.title)).toEqual(
      STARTER_PROMPT_TITLES,
    )
    expect(store.getState().selectedPromptId).toBe(store.getState().prompts[0]?.id)
    expect(store.getState().isFresh).toBe(true)
    expect(store.getState().firstSignInCopy.status).toBe('idle')
  })

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

  it('keeps First-Sign-In Copy retryable when the remote copy fails', async () => {
    const store = createPromptLibraryStore()
    const storage = createRemoteStorage({
      acceptFirstSignInCopy: () => Promise.reject(new Error('D1 unavailable')),
    })

    store.getState().actions.offerFirstSignInCopy([prompt])

    await expect(acceptFreshPromptLibraryFirstSignInCopy(storage, store)).rejects.toThrow(
      'D1 unavailable',
    )

    expect(store.getState().prompts).toEqual([])
    expect(store.getState().firstSignInCopy).toMatchObject({
      status: 'error',
      localPrompts: [prompt],
      error: 'D1 unavailable',
    })
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
})
