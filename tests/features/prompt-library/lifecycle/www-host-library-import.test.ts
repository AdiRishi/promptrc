import { beforeEach, describe, expect, it, vi } from 'vitest'

import { importWwwHostLibrary } from '@/features/prompt-library/lifecycle/www-host-library-import'
import {
  createLocalPromptLibraryStorage,
  readLocalPromptLibrarySnapshot,
} from '@/features/prompt-library/persistence/local/local-prompt-library-storage'
import {
  type PromptLibraryStoreApi,
  createPromptLibraryStore,
  getPromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/store/prompt-library-store'
import {
  type PromptLibraryPersistedSnapshot,
  type PromptRecord,
} from '@/features/prompt-library/types'

const prompt = (id: string): PromptRecord => ({
  id,
  kind: 'prompt',
  title: id,
  body: 'Body',
  notes: '',
  category: 'Engineering',
  tags: [],
  images: [],
  runs: [],
  pinned: false,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
})

/** Browser storage that can be told it is full. */
const createBrowserStorage = () => {
  const values = new Map<string, string>()
  const storage = {
    isFull: false,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (storage.isFull) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      }

      values.set(key, value)
    },
  }

  return storage
}

/** A signed-out library in use: loaded, and saving each change as the session does. */
const createLoadedStore = (prompts: PromptRecord[]) => {
  const store = createPromptLibraryStore()
  const storage = createLocalPromptLibraryStorage()

  store.getState().actions.replacePrompts(prompts, { isFresh: false })
  storage.persistSnapshot(getPromptLibraryPersistedSnapshot(store.getState()))
  store.subscribe((state) => {
    try {
      storage.persistSnapshot(getPromptLibraryPersistedSnapshot(state))
    } catch {
      // The session reports this as a sync error and carries on.
    }
  })

  return store
}

const wwwLibrary = (prompts: PromptRecord[]) =>
  ({
    ...getPromptLibraryPersistedSnapshot(createPromptLibraryStore().getState()),
    prompts,
    isFresh: false,
  }) satisfies PromptLibraryPersistedSnapshot

const shownIds = (store: PromptLibraryStoreApi) => store.getState().prompts.map((entry) => entry.id)

const savedIds = () => readLocalPromptLibrarySnapshot()?.prompts.map((entry) => entry.id)

describe('importing a library saved on the www host', () => {
  let browserStorage: ReturnType<typeof createBrowserStorage>

  beforeEach(() => {
    browserStorage = createBrowserStorage()
    Object.defineProperty(window, 'localStorage', { configurable: true, value: browserStorage })
  })

  it('adds the www entries without touching work started while the answer was on its way', async () => {
    const store = createLoadedStore([prompt('here')])
    const markImported = vi.fn()
    let answer: (snapshot: PromptLibraryPersistedSnapshot) => void = () => {}
    const pending = importWwwHostLibrary(store, {
      isActive: () => true,
      markImported,
      readWwwLibrary: () =>
        new Promise((resolve) => {
          answer = resolve
        }),
    })

    store.getState().actions.startNew()
    store.getState().actions.updateDraft('title', 'Typed during the wait')
    answer(wwwLibrary([prompt('there')]))
    await pending

    expect(shownIds(store)).toEqual(['here', 'there'])
    expect(store.getState().composer).toMatchObject({
      mode: 'new',
      draft: { title: 'Typed during the wait' },
    })
    expect(savedIds()).toEqual(['here', 'there'])
    expect(markImported).toHaveBeenCalledOnce()
  })

  it('asks again next time when storage had no room for what it brought over', async () => {
    const store = createLoadedStore([prompt('here')])
    const markImported = vi.fn()

    browserStorage.isFull = true
    await importWwwHostLibrary(store, {
      isActive: () => true,
      markImported,
      readWwwLibrary: () => Promise.resolve(wwwLibrary([prompt('there')])),
    })

    expect(savedIds()).toEqual(['here'])
    expect(markImported).not.toHaveBeenCalled()
  })

  it('is done when the www host has nothing to bring over', async () => {
    const store = createLoadedStore([prompt('here')])
    const markImported = vi.fn()

    await importWwwHostLibrary(store, {
      isActive: () => true,
      markImported,
      readWwwLibrary: () => Promise.resolve(null),
    })

    expect(shownIds(store)).toEqual(['here'])
    expect(markImported).toHaveBeenCalledOnce()
  })

  it('asks again next time when the www host did not answer', async () => {
    const store = createLoadedStore([prompt('here')])
    const markImported = vi.fn()

    await importWwwHostLibrary(store, {
      isActive: () => true,
      markImported,
      readWwwLibrary: () => Promise.resolve(undefined),
    })

    expect(shownIds(store)).toEqual(['here'])
    expect(markImported).not.toHaveBeenCalled()
  })

  it('leaves the store alone once the signed-out session has ended', async () => {
    const store = createLoadedStore([prompt('here')])
    const markImported = vi.fn()

    await importWwwHostLibrary(store, {
      isActive: () => false,
      markImported,
      readWwwLibrary: () => Promise.resolve(wwwLibrary([prompt('there')])),
    })

    expect(shownIds(store)).toEqual(['here'])
    expect(markImported).not.toHaveBeenCalled()
  })
})
