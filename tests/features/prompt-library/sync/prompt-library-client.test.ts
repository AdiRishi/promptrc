import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STARTER_PROMPT_TITLES } from '@/features/prompt-library/model/starter-prompts'
import {
  createLocalPromptLibraryStorage,
  readLocalPromptLibrarySnapshot,
} from '@/features/prompt-library/persistence/local/local-prompt-library-storage'
import {
  type LocalPromptLibraryStorage,
  type RemotePromptLibraryStorage,
} from '@/features/prompt-library/persistence/prompt-library-storage'
import { createPromptLibraryStore } from '@/features/prompt-library/store/prompt-library-store'
import { createPromptLibraryClient } from '@/features/prompt-library/sync/prompt-library-client'
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

describe('prompt library client', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageMock(),
    })
  })

  it('returns synced results for local mutations while session persistence owns local writes', async () => {
    const store = createPromptLibraryStore()
    const storage: LocalPromptLibraryStorage = {
      mode: 'local',
      hydrate: () =>
        Promise.resolve({
          source: 'local',
          snapshot: null,
        }),
      persistSnapshot: vi.fn(),
      reportError: () => 'sync failed',
    }
    const client = createPromptLibraryClient(storage, store)

    expect(client.canSharePrompts).toBe(false)
    await expect(client.savePrompt(prompt)).resolves.toEqual({
      status: 'synced',
      value: prompt,
    })
    await expect(client.deletePrompt(prompt.id)).resolves.toEqual({
      status: 'synced',
      value: undefined,
    })
    expect(storage.persistSnapshot).not.toHaveBeenCalled()
  })

  it('seeds Starter Prompts once when a local Prompt Library is fresh and empty', async () => {
    const store = createPromptLibraryStore()
    const storage: LocalPromptLibraryStorage = {
      mode: 'local',
      hydrate: () =>
        Promise.resolve({
          source: 'local',
          snapshot: createPersistedSnapshot(),
        }),
      persistSnapshot: vi.fn(),
      reportError: () => 'sync failed',
    }
    const client = createPromptLibraryClient(storage, store)

    await client.sync()

    expect(store.getState().prompts.map((starterPrompt) => starterPrompt.title)).toEqual(
      STARTER_PROMPT_TITLES,
    )
    expect(store.getState().selectedPromptId).toBe(store.getState().prompts[0]?.id)
    expect(store.getState().isFresh).toBe(true)
  })

  it('syncs prompt mutations through remote storage and records sync state', async () => {
    const store = createPromptLibraryStore()
    const savePrompt = vi.fn((savedPrompt: PromptRecord) => Promise.resolve(savedPrompt))
    const deletePrompt = vi.fn(() => Promise.resolve())
    const recordPromptUse = vi.fn((promptId: string) =>
      Promise.resolve({
        ...prompt,
        id: promptId,
        uses: prompt.uses + 1,
      }),
    )
    const storage = createRemoteStorage({
      savePrompt,
      deletePrompt,
      recordPromptUse,
    })
    const client = createPromptLibraryClient(storage, store)

    expect(client.canSharePrompts).toBe(true)
    await expect(client.savePrompt(prompt)).resolves.toEqual({
      status: 'synced',
      value: prompt,
    })
    await expect(client.deletePrompt(prompt.id)).resolves.toEqual({
      status: 'synced',
      value: undefined,
    })
    await expect(client.recordPromptUse(prompt.id)).resolves.toMatchObject({
      status: 'synced',
      value: { uses: 1 },
    })

    expect(savePrompt).toHaveBeenCalledWith(prompt)
    expect(deletePrompt).toHaveBeenCalledWith(prompt.id)
    expect(recordPromptUse).toHaveBeenCalledWith(prompt.id)
    expect(store.getState().syncStatus).toBe('ready')
  })

  it('syncs Prompt share mutations through remote storage', async () => {
    const store = createPromptLibraryStore()
    const createPromptShare = vi.fn((promptId: string) =>
      Promise.resolve({
        id: 'share-alpha',
        promptId,
        createdAt: '2026-04-24T00:01:00.000Z',
        revokedAt: null,
      }),
    )
    const revokePromptShare = vi.fn((promptId: string) =>
      Promise.resolve({
        promptId,
        revoked: true,
      }),
    )
    const storage = createRemoteStorage({
      createPromptShare,
      revokePromptShare,
    })
    const client = createPromptLibraryClient(storage, store)

    await expect(client.createPromptShare(prompt.id)).resolves.toEqual({
      status: 'synced',
      value: {
        id: 'share-alpha',
        promptId: prompt.id,
        createdAt: '2026-04-24T00:01:00.000Z',
        revokedAt: null,
      },
    })
    await expect(client.revokePromptShare(prompt.id)).resolves.toEqual({
      status: 'synced',
      value: {
        promptId: prompt.id,
        revoked: true,
      },
    })
    expect(createPromptShare).toHaveBeenCalledWith(prompt.id)
    expect(revokePromptShare).toHaveBeenCalledWith(prompt.id)
  })

  it('keeps optimistic local changes and makes remote sync failures explicit', async () => {
    const store = createPromptLibraryStore()
    const storage = createRemoteStorage({
      savePrompt: () => Promise.reject(new Error('D1 unavailable')),
    })
    const client = createPromptLibraryClient(storage, store)

    await expect(client.savePrompt(prompt)).resolves.toMatchObject({
      status: 'failed',
      message: 'D1 unavailable',
    })
    expect(store.getState()).toMatchObject({
      syncMode: 'remote',
      syncStatus: 'error',
      syncError: 'D1 unavailable',
    })
  })

  it('adds Starter Prompts remotely when a remote Prompt Library is fresh and empty', async () => {
    const store = createPromptLibraryStore()
    const addStarterPrompts = vi.fn((starterPrompts: PromptRecord[]) =>
      Promise.resolve(starterPrompts),
    )
    const storage = createRemoteStorage({
      addStarterPrompts,
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          snapshot: {
            prompts: [],
            isFresh: true,
          },
        }),
    })
    const client = createPromptLibraryClient(storage, store)

    await client.sync()

    expect(addStarterPrompts).toHaveBeenCalledOnce()
    expect(
      addStarterPrompts.mock.calls[0]?.[0].map((starterPrompt) => starterPrompt.title),
    ).toEqual(STARTER_PROMPT_TITLES)
    expect(store.getState().prompts.map((starterPrompt) => starterPrompt.title)).toEqual(
      STARTER_PROMPT_TITLES,
    )
    expect(store.getState().isFresh).toBe(true)
  })

  it('offers First-Sign-In Copy before adding remote Starter Prompts when local Prompts exist', async () => {
    createLocalPromptLibraryStorage().persistSnapshot(
      createPersistedSnapshot({
        prompts: [prompt],
        isFresh: false,
        selectedPromptId: prompt.id,
      }),
    )

    const store = createPromptLibraryStore()
    const addStarterPrompts = vi.fn((starterPrompts: PromptRecord[]) =>
      Promise.resolve(starterPrompts),
    )
    const storage = createRemoteStorage({
      addStarterPrompts,
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          snapshot: {
            prompts: [],
            isFresh: true,
          },
        }),
    })
    const client = createPromptLibraryClient(storage, store)

    await client.sync()

    expect(addStarterPrompts).not.toHaveBeenCalled()
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
    const acceptFirstSignInCopy = vi.fn(() => Promise.resolve(copiedPrompts))
    const savePrompt = vi.fn((savedPrompt: PromptRecord) => Promise.resolve(savedPrompt))
    const storage = createRemoteStorage({
      acceptFirstSignInCopy,
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          snapshot: {
            prompts: [],
            isFresh: true,
          },
        }),
      savePrompt,
    })
    const store = createPromptLibraryStore()
    const client = createPromptLibraryClient(storage, store)

    await client.sync()
    await client.acceptFirstSignInCopy()

    expect(acceptFirstSignInCopy).toHaveBeenCalledOnce()
    expect(acceptFirstSignInCopy).toHaveBeenCalledWith([prompt])
    expect(savePrompt).not.toHaveBeenCalled()
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

    const addStarterPrompts = vi.fn((starterPrompts: PromptRecord[]) =>
      Promise.resolve(starterPrompts),
    )
    const declineFirstSignInCopy = vi.fn(() =>
      Promise.resolve({
        prompts: [],
        isFresh: false,
      }),
    )
    const storage = createRemoteStorage({
      addStarterPrompts,
      declineFirstSignInCopy,
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          snapshot: {
            prompts: [],
            isFresh: true,
          },
        }),
    })
    const store = createPromptLibraryStore()
    const client = createPromptLibraryClient(storage, store)

    await client.sync()
    await client.declineFirstSignInCopy()

    expect(addStarterPrompts).not.toHaveBeenCalled()
    expect(declineFirstSignInCopy).toHaveBeenCalledOnce()
    expect(store.getState().prompts).toEqual([])
    expect(store.getState().selectedPromptId).toBeNull()
    expect(store.getState().isFresh).toBe(false)
    expect(store.getState().firstSignInCopy.status).toBe('idle')
  })

  it('preserves a local empty choice when a non-fresh local Prompt Library has no Prompts', async () => {
    createLocalPromptLibraryStorage().persistSnapshot(
      createPersistedSnapshot({
        prompts: [],
        isFresh: false,
      }),
    )

    const addStarterPrompts = vi.fn((starterPrompts: PromptRecord[]) =>
      Promise.resolve(starterPrompts),
    )
    const declineFirstSignInCopy = vi.fn(() =>
      Promise.resolve({
        prompts: [],
        isFresh: false,
      }),
    )
    const storage = createRemoteStorage({
      addStarterPrompts,
      declineFirstSignInCopy,
      hydrate: () =>
        Promise.resolve({
          source: 'remote',
          snapshot: {
            prompts: [],
            isFresh: true,
          },
        }),
    })
    const store = createPromptLibraryStore()
    const client = createPromptLibraryClient(storage, store)

    await client.sync()

    expect(addStarterPrompts).not.toHaveBeenCalled()
    expect(declineFirstSignInCopy).toHaveBeenCalledOnce()
    expect(store.getState().prompts).toEqual([])
    expect(store.getState().isFresh).toBe(false)
    expect(store.getState().firstSignInCopy.status).toBe('idle')
  })
})
