import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STARTER_PROMPT_TITLES } from '@/features/prompt-library/lib/starter-prompts'
import {
  createLocalPromptLibraryStorage,
  readLocalPromptLibrarySnapshot,
} from '@/features/prompt-library/storage/local-prompt-library-storage'
import { createPromptLibraryClient } from '@/features/prompt-library/storage/prompt-library-client'
import {
  type LocalPromptLibraryStorage,
  type RemotePromptLibraryStorage,
} from '@/features/prompt-library/storage/prompt-library-storage'
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

const createStorageMock = () => {
  const values = new Map<string, string>()

  return {
    clear: () => {
      values.clear()
    },
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      values.delete(key)
    },
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('prompt library client', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageMock(),
    })
  })

  it('persists the current snapshot for local mutations', async () => {
    const persistedSnapshots: PromptLibraryPersistedSnapshot[] = []
    const store = createPromptLibraryStore()
    const storage: LocalPromptLibraryStorage = {
      mode: 'local',
      hydrate: () =>
        Promise.resolve({
          source: 'local',
          snapshot: null,
        }),
      persistSnapshot: (snapshot) => {
        persistedSnapshots.push(snapshot)
      },
      reportError: () => 'sync failed',
    }
    const client = createPromptLibraryClient(storage, store)

    store.getState().actions.replacePrompt(prompt)

    await client.addPrompt(prompt)

    expect(persistedSnapshots.at(-1)?.prompts).toEqual([prompt])
  })

  it('seeds Starter Prompts once when a local Prompt Library is fresh and empty', async () => {
    const persistedSnapshots: PromptLibraryPersistedSnapshot[] = []
    const store = createPromptLibraryStore()
    const storage: LocalPromptLibraryStorage = {
      mode: 'local',
      hydrate: () =>
        Promise.resolve({
          source: 'local',
          snapshot: createPersistedSnapshot(),
        }),
      persistSnapshot: (snapshot) => {
        persistedSnapshots.push(snapshot)
      },
      reportError: () => 'sync failed',
    }
    const client = createPromptLibraryClient(storage, store)

    await client.sync()

    expect(store.getState().prompts.map((starterPrompt) => starterPrompt.title)).toEqual(
      STARTER_PROMPT_TITLES,
    )
    expect(store.getState().selectedPromptId).toBe(store.getState().prompts[0]?.id)
    expect(store.getState().isFresh).toBe(true)
    expect(persistedSnapshots.at(-1)?.prompts.map((starterPrompt) => starterPrompt.title)).toEqual(
      STARTER_PROMPT_TITLES,
    )
  })

  it('delegates prompt mutations to remote storage', async () => {
    const store = createPromptLibraryStore()
    const savePrompt = vi.fn((savedPrompt: PromptRecord) => Promise.resolve(savedPrompt))
    const deletePrompt = vi.fn(() => Promise.resolve())
    const incrementUses = vi.fn((promptId: string) =>
      Promise.resolve({
        ...prompt,
        id: promptId,
        uses: prompt.uses + 1,
      }),
    )
    const storage: RemotePromptLibraryStorage = {
      mode: 'remote',
      copyPrompts: (prompts) => Promise.resolve(prompts),
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          snapshot: {
            prompts: [],
            isFresh: false,
          },
        }),
      savePrompt,
      seedPrompts: (starterPrompts) => Promise.resolve(starterPrompts),
      setFreshness: (isFresh) => Promise.resolve({ isFresh }),
      deletePrompt,
      incrementUses,
      reportError: () => 'sync failed',
    }
    const client = createPromptLibraryClient(storage, store)

    await expect(client.addPrompt(prompt)).resolves.toEqual(prompt)
    await client.removePrompt(prompt.id)
    await expect(client.recordPromptUse(prompt.id)).resolves.toMatchObject({ uses: 1 })

    expect(savePrompt).toHaveBeenCalledWith(prompt)
    expect(deletePrompt).toHaveBeenCalledWith(prompt.id)
    expect(incrementUses).toHaveBeenCalledWith(prompt.id)
  })

  it('persists Starter Prompts remotely when a remote Prompt Library is fresh and empty', async () => {
    const store = createPromptLibraryStore()
    const seedPrompts = vi.fn((starterPrompts: PromptRecord[]) => Promise.resolve(starterPrompts))
    const storage: RemotePromptLibraryStorage = {
      mode: 'remote',
      copyPrompts: (prompts) => Promise.resolve(prompts),
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          snapshot: {
            prompts: [],
            isFresh: true,
          },
        }),
      savePrompt: (savedPrompt) => Promise.resolve(savedPrompt),
      seedPrompts,
      setFreshness: () => Promise.resolve({ isFresh: false }),
      deletePrompt: () => Promise.resolve(),
      incrementUses: () => Promise.resolve(prompt),
      reportError: () => 'sync failed',
    }
    const client = createPromptLibraryClient(storage, store)

    await client.sync()

    expect(seedPrompts).toHaveBeenCalledOnce()
    expect(seedPrompts.mock.calls[0]?.[0].map((starterPrompt) => starterPrompt.title)).toEqual(
      STARTER_PROMPT_TITLES,
    )
    expect(store.getState().prompts.map((starterPrompt) => starterPrompt.title)).toEqual(
      STARTER_PROMPT_TITLES,
    )
    expect(store.getState().isFresh).toBe(true)
  })

  it('offers First-Sign-In Copy before seeding remote Starter Prompts when local Prompts exist', async () => {
    createLocalPromptLibraryStorage().persistSnapshot(
      createPersistedSnapshot({
        prompts: [prompt],
        isFresh: false,
        selectedPromptId: prompt.id,
      }),
    )

    const store = createPromptLibraryStore()
    const seedPrompts = vi.fn((starterPrompts: PromptRecord[]) => Promise.resolve(starterPrompts))
    const storage: RemotePromptLibraryStorage = {
      mode: 'remote',
      copyPrompts: (prompts) => Promise.resolve(prompts),
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          snapshot: {
            prompts: [],
            isFresh: true,
          },
        }),
      savePrompt: (savedPrompt) => Promise.resolve(savedPrompt),
      seedPrompts,
      setFreshness: () => Promise.resolve({ isFresh: false }),
      deletePrompt: () => Promise.resolve(),
      incrementUses: () => Promise.resolve(prompt),
      reportError: () => 'sync failed',
    }
    const client = createPromptLibraryClient(storage, store)

    await client.sync()

    expect(seedPrompts).not.toHaveBeenCalled()
    expect(store.getState().prompts).toEqual([])
    expect(store.getState().firstSignInCopy).toMatchObject({
      status: 'prompting',
      localPrompts: [prompt],
    })
  })

  it('accepts First-Sign-In Copy by copying local Prompts into remote storage without clearing local storage', async () => {
    createLocalPromptLibraryStorage().persistSnapshot(
      createPersistedSnapshot({
        prompts: [prompt],
        isFresh: false,
        selectedPromptId: prompt.id,
      }),
    )

    const copiedPrompts = [
      {
        ...prompt,
        id: 'remote-prompt-alpha',
      },
    ]
    const copyPrompts = vi.fn(() => Promise.resolve(copiedPrompts))
    const savePrompt = vi.fn((savedPrompt: PromptRecord) => Promise.resolve(savedPrompt))
    const setFreshness = vi.fn((isFresh: boolean) => Promise.resolve({ isFresh }))
    const storage: RemotePromptLibraryStorage = {
      mode: 'remote',
      copyPrompts,
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          snapshot: {
            prompts: [],
            isFresh: true,
          },
        }),
      savePrompt,
      seedPrompts: (starterPrompts) => Promise.resolve(starterPrompts),
      setFreshness,
      deletePrompt: () => Promise.resolve(),
      incrementUses: () => Promise.resolve(prompt),
      reportError: () => 'sync failed',
    }
    const store = createPromptLibraryStore()
    const client = createPromptLibraryClient(storage, store)

    await client.sync()
    await client.acceptFirstSignInCopy()

    expect(copyPrompts).toHaveBeenCalledOnce()
    expect(copyPrompts).toHaveBeenCalledWith([prompt])
    expect(savePrompt).not.toHaveBeenCalled()
    expect(setFreshness).not.toHaveBeenCalled()
    expect(store.getState().prompts).toEqual(copiedPrompts)
    expect(store.getState().isFresh).toBe(false)
    expect(store.getState().firstSignInCopy.status).toBe('idle')
    expect(readLocalPromptLibrarySnapshot()?.prompts).toEqual([prompt])
  })

  it('declines First-Sign-In Copy by keeping the remote Prompt Library empty and non-fresh', async () => {
    createLocalPromptLibraryStorage().persistSnapshot(
      createPersistedSnapshot({
        prompts: [prompt],
        isFresh: false,
        selectedPromptId: prompt.id,
      }),
    )

    const seedPrompts = vi.fn((starterPrompts: PromptRecord[]) => Promise.resolve(starterPrompts))
    const setFreshness = vi.fn((isFresh: boolean) => Promise.resolve({ isFresh }))
    const storage: RemotePromptLibraryStorage = {
      mode: 'remote',
      copyPrompts: (prompts) => Promise.resolve(prompts),
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          snapshot: {
            prompts: [],
            isFresh: true,
          },
        }),
      savePrompt: (savedPrompt) => Promise.resolve(savedPrompt),
      seedPrompts,
      setFreshness,
      deletePrompt: () => Promise.resolve(),
      incrementUses: () => Promise.resolve(prompt),
      reportError: () => 'sync failed',
    }
    const store = createPromptLibraryStore()
    const client = createPromptLibraryClient(storage, store)

    await client.sync()
    await client.declineFirstSignInCopy()

    expect(seedPrompts).not.toHaveBeenCalled()
    expect(setFreshness).toHaveBeenCalledWith(false)
    expect(store.getState().prompts).toEqual([])
    expect(store.getState().selectedPromptId).toBeNull()
    expect(store.getState().isFresh).toBe(false)
    expect(store.getState().firstSignInCopy.status).toBe('idle')
  })

  it('keeps remote empty when a non-fresh local Prompt Library has no Prompts', async () => {
    createLocalPromptLibraryStorage().persistSnapshot(
      createPersistedSnapshot({
        prompts: [],
        isFresh: false,
      }),
    )

    const seedPrompts = vi.fn((starterPrompts: PromptRecord[]) => Promise.resolve(starterPrompts))
    const setFreshness = vi.fn((isFresh: boolean) => Promise.resolve({ isFresh }))
    const storage: RemotePromptLibraryStorage = {
      mode: 'remote',
      copyPrompts: (prompts) => Promise.resolve(prompts),
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          snapshot: {
            prompts: [],
            isFresh: true,
          },
        }),
      savePrompt: (savedPrompt) => Promise.resolve(savedPrompt),
      seedPrompts,
      setFreshness,
      deletePrompt: () => Promise.resolve(),
      incrementUses: () => Promise.resolve(prompt),
      reportError: () => 'sync failed',
    }
    const store = createPromptLibraryStore()
    const client = createPromptLibraryClient(storage, store)

    await client.sync()

    expect(seedPrompts).not.toHaveBeenCalled()
    expect(setFreshness).toHaveBeenCalledWith(false)
    expect(store.getState().prompts).toEqual([])
    expect(store.getState().isFresh).toBe(false)
    expect(store.getState().firstSignInCopy.status).toBe('idle')
  })
})
