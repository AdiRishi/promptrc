import { beforeEach, describe, expect, it, vi } from 'vitest'

import { importWwwHostLibrary } from '@/features/prompt-library/lifecycle/www-host-library-import'
import {
  createLocalPromptLibraryStorage,
  readLocalPromptLibrarySnapshot,
} from '@/features/prompt-library/persistence/local/local-prompt-library-storage'
import {
  createPromptLibraryStore,
  getPromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/store/prompt-library-store'
import {
  type ComposerState,
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
const createLoadedLibrary = (prompts: PromptRecord[]) => {
  const store = createPromptLibraryStore()
  const storage = createLocalPromptLibraryStorage()
  const saveLibrary = () => {
    try {
      storage.persistSnapshot(getPromptLibraryPersistedSnapshot(store.getState()))
      return true
    } catch {
      return false
    }
  }

  store.getState().actions.replacePrompts(prompts, { isFresh: false })
  saveLibrary()
  store.subscribe(saveLibrary)

  return { store, saveLibrary }
}

const wwwLibrary = (
  prompts: PromptRecord[],
  overrides: Partial<PromptLibraryPersistedSnapshot> = {},
) =>
  ({
    ...getPromptLibraryPersistedSnapshot(createPromptLibraryStore().getState()),
    prompts,
    isFresh: false,
    ...overrides,
  }) satisfies PromptLibraryPersistedSnapshot

const draftLeftOnWww = (): ComposerState => {
  const store = createPromptLibraryStore()

  store.getState().actions.startNew()
  store.getState().actions.updateDraft('title', 'Left on www')

  return store.getState().composer
}

const savedLibrary = () => {
  const saved = readLocalPromptLibrarySnapshot()

  return {
    ids: saved?.prompts.map((entry) => entry.id),
    draft: saved?.composer.draft.title,
  }
}

describe('importing a library saved on the www host', () => {
  let browserStorage: ReturnType<typeof createBrowserStorage>

  beforeEach(() => {
    browserStorage = createBrowserStorage()
    Object.defineProperty(window, 'localStorage', { configurable: true, value: browserStorage })
  })

  it('adds the www entries without touching work started while the answer was on its way', async () => {
    const { store, saveLibrary } = createLoadedLibrary([prompt('here')])
    const markImported = vi.fn()
    let answer: (snapshot: PromptLibraryPersistedSnapshot) => void = () => {}
    const pending = importWwwHostLibrary(store, {
      isActive: () => true,
      saveLibrary,
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

    expect(store.getState().prompts.map((entry) => entry.id)).toEqual(['here', 'there'])
    expect(savedLibrary()).toEqual({ ids: ['here', 'there'], draft: 'Typed during the wait' })
    expect(markImported).toHaveBeenCalledOnce()
  })

  it('asks again next time when storage had no room for the entries it brought over', async () => {
    const { store, saveLibrary } = createLoadedLibrary([prompt('here')])
    const markImported = vi.fn()

    browserStorage.isFull = true
    await importWwwHostLibrary(store, {
      isActive: () => true,
      saveLibrary,
      markImported,
      readWwwLibrary: () => Promise.resolve(wwwLibrary([prompt('there')])),
    })

    expect(savedLibrary().ids).toEqual(['here'])
    expect(markImported).not.toHaveBeenCalled()
  })

  it('asks again next time when storage had no room for a draft it brought over', async () => {
    const { store, saveLibrary } = createLoadedLibrary([prompt('here')])
    const markImported = vi.fn()

    browserStorage.isFull = true
    await importWwwHostLibrary(store, {
      isActive: () => true,
      saveLibrary,
      markImported,
      readWwwLibrary: () =>
        Promise.resolve(wwwLibrary([], { isFresh: true, composer: draftLeftOnWww() })),
    })

    expect(store.getState().composer.draft.title).toBe('Left on www')
    expect(savedLibrary()).toEqual({ ids: ['here'], draft: '' })
    expect(markImported).not.toHaveBeenCalled()
  })

  it('is done when the www host has nothing to bring over', async () => {
    const { store, saveLibrary } = createLoadedLibrary([prompt('here')])
    const markImported = vi.fn()

    await importWwwHostLibrary(store, {
      isActive: () => true,
      saveLibrary,
      markImported,
      readWwwLibrary: () => Promise.resolve(null),
    })

    expect(savedLibrary().ids).toEqual(['here'])
    expect(markImported).toHaveBeenCalledOnce()
  })

  it('asks again next time when the www host did not answer', async () => {
    const { store, saveLibrary } = createLoadedLibrary([prompt('here')])
    const markImported = vi.fn()

    await importWwwHostLibrary(store, {
      isActive: () => true,
      saveLibrary,
      markImported,
      readWwwLibrary: () => Promise.resolve(undefined),
    })

    expect(savedLibrary().ids).toEqual(['here'])
    expect(markImported).not.toHaveBeenCalled()
  })

  it('leaves the library alone once the signed-out session has ended', async () => {
    const { store, saveLibrary } = createLoadedLibrary([prompt('here')])
    const markImported = vi.fn()

    await importWwwHostLibrary(store, {
      isActive: () => false,
      saveLibrary,
      markImported,
      readWwwLibrary: () => Promise.resolve(wwwLibrary([prompt('there')])),
    })

    expect(store.getState().prompts.map((entry) => entry.id)).toEqual(['here'])
    expect(markImported).not.toHaveBeenCalled()
  })
})
