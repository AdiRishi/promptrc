import { beforeEach, describe, expect, it } from 'vitest'

import { createPendingPromptImageMarkdown } from '@/features/prompt-library/model/prompt-images'
import { createStarterPrompts } from '@/features/prompt-library/model/starter-prompts'
import {
  createPromptLibraryStore,
  getPromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/store/prompt-library-store'
import {
  type PromptLibraryFilter,
  type PromptRecord,
  type PromptRun,
} from '@/features/prompt-library/types'

const createPrompt = (overrides: Partial<PromptRecord> = {}): PromptRecord => ({
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing'],
  kind: 'prompt',
  notes: '',
  runs: [],
  pinned: false,
  images: [],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
  ...overrides,
})

const createRun = (overrides: Partial<PromptRun> = {}): PromptRun => ({
  id: 'run-1',
  model: 'model-a',
  verdict: 'pass',
  note: '',
  ranAt: '2026-05-01T00:00:00.000Z',
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

const filterOf = (patch: Partial<PromptLibraryFilter>): PromptLibraryFilter => ({
  project: null,
  kind: null,
  pinned: false,
  tag: null,
  ...patch,
})

describe('prompt library store', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageMock(),
    })
  })

  it('creates a new prompt from the composer draft', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.startNew()
    actions.updateDraft('title', 'My New Prompt')
    actions.updateDraft('category', 'Research')
    actions.updateDraft('tagsInput', '#mapping #review')
    actions.updateDraft('body', 'Map the codebase in 15 minutes.')

    const result = actions.saveComposer()
    const state = store.getState()

    expect(result.status).toBe('created')
    expect(state.prompts[0]?.title).toBe('My New Prompt')
    expect(state.prompts[0]?.tags).toEqual(['mapping', 'review'])
    expect(state.selectedPromptId).toBe(state.prompts[0]?.id ?? null)
    expect(state.composer.mode).toBe('view')
  })

  it('updates an existing prompt through edit mode', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.startNew()
    actions.updateDraft('title', 'Original Prompt')
    actions.updateDraft('body', 'Original body')
    actions.saveComposer()

    const promptToEdit = store.getState().prompts[0]

    actions.startEdit(promptToEdit.id)
    actions.updateDraft('title', 'Updated Prompt')

    const result = actions.saveComposer()

    expect(result.status).toBe('updated')
    expect(store.getState().prompts[0]?.title).toBe('Updated Prompt')
  })

  it('blocks saving while image upload placeholders are still pending', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.startNew()
    actions.updateDraft('title', 'Prompt with Image')
    actions.updateDraft('body', createPendingPromptImageMarkdown('diagram.png', 'pending-image'))

    const result = actions.saveComposer()

    expect(result.status).toBe('pending-images')
    expect(store.getState().prompts.some((prompt) => prompt.title === 'Prompt with Image')).toBe(
      false,
    )
    expect(store.getState().composer.mode).toBe('new')
  })

  it('duplicates and deletes prompts while keeping selection valid', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.startNew()
    actions.updateDraft('title', 'Source Prompt')
    actions.updateDraft('body', 'Source body')
    actions.saveComposer()

    const sourcePrompt = store.getState().prompts[0]

    const duplicate = actions.duplicatePrompt(sourcePrompt.id)

    expect(duplicate?.title).toBe(`${sourcePrompt.title} (copy)`)
    expect(store.getState().selectedPromptId).toBe(duplicate?.id ?? null)

    const deletedPrompt = actions.deletePrompt(duplicate?.id ?? '', sourcePrompt.id)

    expect(deletedPrompt?.id).toBe(duplicate?.id)
    expect(store.getState().selectedPromptId).toBe(sourcePrompt.id)
  })

  it('starts with an empty library', () => {
    const store = createPromptLibraryStore()

    expect(store.getState().prompts).toEqual([])
    expect(store.getState().selectedPromptId).toBeNull()
    expect(store.getState().isFresh).toBe(true)
  })

  it('adds Starter Prompts while preserving freshness and selecting Start Here', () => {
    const store = createPromptLibraryStore()
    const starterPrompts = createStarterPrompts()

    store.getState().actions.seedStarterPrompts(starterPrompts)

    expect(store.getState().prompts.map((prompt) => prompt.title)).toEqual([
      'Start Here',
      'Bug Hunt',
      'Preserve uncertainty',
      'Plan, critique, build',
      'Executive summary under pressure',
      'Difficult Reply',
    ])
    expect(store.getState().selectedPromptId).toBe(starterPrompts[0]?.id)
    expect(store.getState().isFresh).toBe(true)
  })

  it('ends freshness for ownership actions but not browsing, selecting, or searching', () => {
    const store = createPromptLibraryStore()
    const starterPrompts = createStarterPrompts()
    const { actions } = store.getState()

    actions.seedStarterPrompts(starterPrompts)
    actions.setQuery('prd')
    actions.selectPrompt(starterPrompts[1]?.id ?? null)

    expect(store.getState().isFresh).toBe(true)

    actions.startNew()
    actions.updateDraft('title', 'Owned Prompt')
    actions.updateDraft('body', 'This is mine now.')
    actions.saveComposer()

    expect(store.getState().isFresh).toBe(false)

    actions.seedStarterPrompts(starterPrompts)
    actions.duplicatePrompt(starterPrompts[0]?.id ?? '')

    expect(store.getState().isFresh).toBe(false)

    actions.seedStarterPrompts(starterPrompts)
    actions.incrementUses(starterPrompts[0]?.id ?? '')

    expect(store.getState().isFresh).toBe(false)

    actions.seedStarterPrompts(starterPrompts)
    actions.deletePrompt(starterPrompts[0]?.id ?? '')

    expect(store.getState().isFresh).toBe(false)
  })

  it('sets the filter and sort without ending freshness, and persists them', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    expect(store.getState()).toMatchObject({ filter: filterOf({}), sort: 'created' })

    actions.setFilter(filterOf({ kind: 'benchmark' }))
    actions.setSort('used')

    expect(store.getState()).toMatchObject({
      filter: filterOf({ kind: 'benchmark' }),
      sort: 'used',
      isFresh: true,
    })
    expect(getPromptLibraryPersistedSnapshot(store.getState())).toMatchObject({
      filter: filterOf({ kind: 'benchmark' }),
      sort: 'used',
    })
  })

  it('restores filter and sort from a snapshot, keeping current ones when absent', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()
    const snapshot = {
      prompts: [createPrompt()],
      query: '',
      selectedPromptId: null,
      composer: { mode: 'view' as const, draft: store.getState().composer.draft },
      isFresh: false,
    }

    actions.restoreLocalState({ ...snapshot, filter: filterOf({ pinned: true }), sort: 'title' })
    expect(store.getState()).toMatchObject({ filter: filterOf({ pinned: true }), sort: 'title' })

    actions.restoreLocalState(snapshot)
    expect(store.getState()).toMatchObject({ filter: filterOf({ pinned: true }), sort: 'title' })
  })

  it('starts a new draft of the requested kind', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.startNew('sequence')

    expect(store.getState().composer).toMatchObject({
      mode: 'new',
      draft: { kind: 'sequence', category: '', tagsInput: '', body: '', notes: '' },
    })
  })

  it('pre-fills a new draft from the current filter', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.setFilter(filterOf({ kind: 'benchmark' }))
    actions.startNew()
    expect(store.getState().composer.draft).toMatchObject({ kind: 'benchmark', category: '' })

    actions.setFilter(filterOf({ project: 'Research' }))
    actions.startNew()
    expect(store.getState().composer.draft).toMatchObject({ kind: 'prompt', category: 'Research' })

    actions.setFilter(filterOf({ tag: 'review' }))
    actions.startNew('fragment')
    expect(store.getState().composer.draft).toMatchObject({
      kind: 'fragment',
      category: '',
      tagsInput: '#review',
    })

    actions.setFilter(filterOf({ pinned: true }))
    actions.startNew()
    expect(store.getState().composer.draft).toMatchObject({
      kind: 'prompt',
      category: '',
      tagsInput: '',
    })
  })

  it('pre-fills every part of a stacked filter at once', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.setFilter(filterOf({ project: 'render-md', kind: 'sequence', tag: 'plan' }))
    actions.startNew()

    expect(store.getState().composer.draft).toMatchObject({
      kind: 'sequence',
      category: 'render-md',
      tagsInput: '#plan',
    })
  })

  it('files a draft under an existing Project when only the spelling differs', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.restoreLocalState({
      prompts: [createPrompt({ id: 'existing', category: 'render-md' })],
      query: '',
      selectedPromptId: null,
      composer: { mode: 'view', draft: store.getState().composer.draft },
      isFresh: false,
    })
    actions.startNew()
    actions.updateDraft('title', 'Route migration')
    actions.updateDraft('body', 'Move the route.')
    actions.updateDraft('category', ' Render MD ')

    const result = actions.saveComposer()

    expect(result.status).toBe('created')
    expect(store.getState().prompts[0]?.category).toBe('render-md')
  })

  it('lets an explicit kind win over a kind filter, without leaking into later drafts', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.setFilter(filterOf({ kind: 'benchmark' }))
    actions.startNew('fragment')
    expect(store.getState().composer.draft.kind).toBe('fragment')

    actions.setFilter(filterOf({ project: 'Research' }))
    actions.startNew()
    actions.cancelComposer()
    actions.setFilter(filterOf({}))
    actions.startNew()
    expect(store.getState().composer.draft).toMatchObject({ kind: 'prompt', category: '' })
  })

  it('saves a new draft with its kind and notes', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.setFilter(filterOf({ tag: 'review' }))
    actions.startNew('benchmark')
    actions.updateDraft('title', 'Off-by-one hunt')
    actions.updateDraft('body', 'Find the bug in this loop.')
    actions.updateDraft('notes', 'Pass: names the boundary.')

    const result = actions.saveComposer()

    expect(result.status).toBe('created')
    expect(store.getState().prompts[0]).toMatchObject({
      kind: 'benchmark',
      notes: 'Pass: names the boundary.',
      tags: ['review'],
      runs: [],
      pinned: false,
    })
  })

  it('inserts a captured Prompt at the top, selects it, and replaces a stale copy', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.seedStarterPrompts([createPrompt({ id: 'a' }), createPrompt({ id: 'b' })])
    actions.insertPrompt(createPrompt({ id: 'c', title: 'Captured' }))

    expect(store.getState().prompts.map((prompt) => prompt.id)).toEqual(['c', 'a', 'b'])
    expect(store.getState().selectedPromptId).toBe('c')
    expect(store.getState().isFresh).toBe(false)

    actions.insertPrompt(createPrompt({ id: 'b', title: 'Re-captured' }))

    expect(store.getState().prompts.map((prompt) => prompt.id)).toEqual(['b', 'c', 'a'])
    expect(store.getState().prompts[0]?.title).toBe('Re-captured')
  })

  it('pins and unpins a Prompt, returning the changed record', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()

    actions.seedStarterPrompts([createPrompt()])

    const pinned = actions.setPinned('prompt-alpha', true)

    expect(pinned).toMatchObject({ id: 'prompt-alpha', pinned: true })
    expect(store.getState().prompts[0]?.pinned).toBe(true)
    expect(store.getState().prompts[0]?.updatedAt).toBe('2026-04-24T00:00:00.000Z')
    expect(store.getState().isFresh).toBe(false)

    expect(actions.setPinned('prompt-alpha', false)?.pinned).toBe(false)
    expect(actions.setPinned('missing', true)).toBeNull()
  })

  it('adds runs newest first, de-duplicated, and bumps updatedAt to the run time', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()
    const first = createRun({ id: 'run-1', ranAt: '2026-05-01T00:00:00.000Z' })
    const second = createRun({ id: 'run-2', verdict: 'fail', ranAt: '2026-05-02T00:00:00.000Z' })

    actions.seedStarterPrompts([createPrompt({ kind: 'benchmark' })])
    actions.addRun('prompt-alpha', first)

    const updated = actions.addRun('prompt-alpha', second)

    expect(updated?.runs).toEqual([second, first])
    expect(updated?.updatedAt).toBe(second.ranAt)
    expect(store.getState().prompts[0]).toEqual(updated)
    expect(store.getState().isFresh).toBe(false)

    expect(actions.addRun('prompt-alpha', second)?.runs).toEqual([second, first])
    expect(actions.addRun('missing', first)).toBeNull()
  })

  it('removes a single run from a Prompt', () => {
    const store = createPromptLibraryStore()
    const { actions } = store.getState()
    const keep = createRun({ id: 'keep' })
    const drop = createRun({ id: 'drop' })

    actions.seedStarterPrompts([createPrompt({ kind: 'benchmark', runs: [keep, drop] })])

    expect(actions.removeRun('prompt-alpha', 'drop')?.runs).toEqual([keep])
    expect(store.getState().prompts[0]?.runs).toEqual([keep])
    expect(actions.removeRun('missing', 'keep')).toBeNull()
  })
})
