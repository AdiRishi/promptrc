import { describe, expect, it } from 'vitest'

import { mergeWwwHostLibrary } from '@/features/prompt-library/persistence/local/www-host-library'
import {
  type ComposerState,
  type PromptLibraryPersistedSnapshot,
  type PromptRecord,
} from '@/features/prompt-library/types'

const prompt = (id: string, title = id): PromptRecord => ({
  id,
  kind: 'prompt',
  title,
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

const composer = (mode: ComposerState['mode'], title = ''): ComposerState => ({
  mode,
  draft: {
    kind: 'prompt',
    title,
    category: '',
    body: '',
    notes: '',
    images: [],
    tagsInput: '',
  },
})

const library = (
  prompts: PromptRecord[],
  overrides: Partial<PromptLibraryPersistedSnapshot> = {},
): PromptLibraryPersistedSnapshot => ({
  prompts,
  query: '',
  selectedPromptId: null,
  composer: composer('view'),
  isFresh: false,
  ...overrides,
})

const starters = (overrides: Partial<PromptLibraryPersistedSnapshot> = {}) =>
  library([prompt('starter')], { isFresh: true, selectedPromptId: 'starter', ...overrides })

const ids = (snapshot: PromptLibraryPersistedSnapshot) => snapshot.prompts.map((entry) => entry.id)

describe('bringing over a library saved on the www host', () => {
  it('changes nothing when the www host has nothing its owner made', () => {
    const current = library([prompt('mine')])

    expect(mergeWwwHostLibrary(current, null)).toBe(current)
    expect(mergeWwwHostLibrary(current, starters())).toBe(current)
  })

  it('replaces untouched starter entries with the www library, keeping this host’s view', () => {
    const merged = mergeWwwHostLibrary(
      starters({ query: 'typed here' }),
      library([prompt('mine')], { selectedPromptId: 'mine', query: 'typed on www' }),
    )

    expect(ids(merged)).toEqual(['mine'])
    expect(merged.selectedPromptId).toBe('mine')
    expect(merged.isFresh).toBe(false)
    expect(merged.query).toBe('typed here')
  })

  it('joins two edited libraries, and this host’s copy of an entry wins', () => {
    const merged = mergeWwwHostLibrary(
      library([prompt('shared', 'Edited here'), prompt('here')], { selectedPromptId: 'here' }),
      library([prompt('shared', 'Older copy'), prompt('there')]),
    )

    expect(merged.prompts.map((entry) => [entry.id, entry.title])).toEqual([
      ['shared', 'Edited here'],
      ['here', 'here'],
      ['there', 'there'],
    ])
    expect(merged.selectedPromptId).toBe('here')
    expect(merged.isFresh).toBe(false)
  })

  it('keeps a draft in progress here, even over starter entries nobody changed', () => {
    const draft = composer('new', 'Half written')
    const merged = mergeWwwHostLibrary(
      starters({ composer: draft }),
      library([prompt('mine')], { composer: composer('new', 'Draft from www') }),
    )

    expect(merged.composer).toBe(draft)
    expect(ids(merged)).toEqual(['starter', 'mine'])
    expect(merged.selectedPromptId).toBe('starter')
  })

  it('picks up a draft left on the www host when there is none here', () => {
    const newDraft = composer('new', 'Left on www')

    expect(
      mergeWwwHostLibrary(library([prompt('mine')]), starters({ composer: newDraft })),
    ).toMatchObject({ composer: newDraft, prompts: [{ id: 'mine' }], isFresh: false })

    const editDraft = composer('edit', 'Edited on www')
    const merged = mergeWwwHostLibrary(
      library([prompt('here')], { selectedPromptId: 'here' }),
      library([prompt('there')], { selectedPromptId: 'there', composer: editDraft }),
    )

    expect(merged.composer).toBe(editDraft)
    expect(merged.selectedPromptId).toBe('there')
  })

  it('leaves behind an edit draft whose entry did not come along', () => {
    const merged = mergeWwwHostLibrary(
      library([prompt('here')], { selectedPromptId: 'here' }),
      starters({ selectedPromptId: 'gone', composer: composer('edit', 'Orphan') }),
    )

    expect(merged.composer.mode).toBe('view')
    expect(merged.selectedPromptId).toBe('here')
  })
})
