import { describe, expect, it } from 'vitest'

import { mergeWwwHostLibrary } from '@/features/prompt-library/persistence/local/www-host-library'
import {
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

const library = (
  prompts: PromptRecord[],
  overrides: Partial<PromptLibraryPersistedSnapshot> = {},
): PromptLibraryPersistedSnapshot => ({
  prompts,
  query: '',
  selectedPromptId: null,
  composer: {
    mode: 'view',
    draft: {
      kind: 'prompt',
      title: '',
      category: '',
      body: '',
      notes: '',
      images: [],
      tagsInput: '',
    },
  },
  isFresh: false,
  ...overrides,
})

describe('bringing over a library saved on the www host', () => {
  it('takes the www library when this host has none, or only an untouched one', () => {
    const fromWww = library([prompt('mine')])

    expect(mergeWwwHostLibrary(null, fromWww)).toBe(fromWww)
    expect(mergeWwwHostLibrary(library([prompt('starter')], { isFresh: true }), fromWww)).toBe(
      fromWww,
    )
  })

  it('keeps this host’s library when the www host has nothing its owner made', () => {
    const current = library([prompt('mine')])

    expect(mergeWwwHostLibrary(current, null)).toBe(current)
    expect(mergeWwwHostLibrary(current, library([prompt('starter')], { isFresh: true }))).toBe(
      current,
    )
    expect(mergeWwwHostLibrary(null, null)).toBeNull()
  })

  it('joins two edited libraries, and this host’s copy of an entry wins', () => {
    const merged = mergeWwwHostLibrary(
      library([prompt('shared', 'Edited here'), prompt('here')], { selectedPromptId: 'here' }),
      library([prompt('shared', 'Older copy'), prompt('there')]),
    )

    expect(merged?.prompts.map((entry) => [entry.id, entry.title])).toEqual([
      ['shared', 'Edited here'],
      ['here', 'here'],
      ['there', 'there'],
    ])
    expect(merged?.selectedPromptId).toBe('here')
    expect(merged?.isFresh).toBe(false)
  })
})
