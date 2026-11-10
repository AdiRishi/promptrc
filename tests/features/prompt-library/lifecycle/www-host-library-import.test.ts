import { describe, expect, it, vi } from 'vitest'

import { importWwwHostLibrary } from '@/features/prompt-library/lifecycle/www-host-library-import'
import {
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

const createLoadedStore = (prompts: PromptRecord[]) => {
  const store = createPromptLibraryStore()

  store.getState().actions.replacePrompts(prompts, { isFresh: false })

  return store
}

const wwwLibrary = (prompts: PromptRecord[]) =>
  ({
    ...getPromptLibraryPersistedSnapshot(createPromptLibraryStore().getState()),
    prompts,
    isFresh: false,
  }) satisfies PromptLibraryPersistedSnapshot

describe('importing a library saved on the www host', () => {
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

    const state = store.getState()

    expect(state.prompts.map((entry) => entry.id)).toEqual(['here', 'there'])
    expect(state.composer).toMatchObject({
      mode: 'new',
      draft: { title: 'Typed during the wait' },
    })
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

    expect(store.getState().prompts.map((entry) => entry.id)).toEqual(['here'])
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

    expect(store.getState().prompts.map((entry) => entry.id)).toEqual(['here'])
    expect(markImported).not.toHaveBeenCalled()
  })
})
