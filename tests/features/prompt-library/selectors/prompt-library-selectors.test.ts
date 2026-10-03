import { describe, expect, it } from 'vitest'

import {
  EMPTY_PROMPT_LIBRARY_FILTER,
  describePromptLibraryFilter,
  getFilterShowingPrompt,
  matchesPromptQuery,
  selectPromptLibraryVisibleState,
} from '@/features/prompt-library/selectors/prompt-library-selectors'
import { type PromptLibraryFilter, type PromptRecord } from '@/features/prompt-library/types'

const filterOf = (patch: Partial<PromptLibraryFilter>): PromptLibraryFilter => ({
  ...EMPTY_PROMPT_LIBRARY_FILTER,
  ...patch,
})

const describeFilter = (patch: Partial<PromptLibraryFilter>) =>
  describePromptLibraryFilter({ ...EMPTY_PROMPT_LIBRARY_FILTER, ...patch })

const createPrompt = (overrides: Partial<PromptRecord> = {}): PromptRecord => ({
  id: 'prompt-alpha',
  kind: 'prompt',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  notes: '',
  category: 'Engineering',
  tags: ['testing'],
  images: [],
  runs: [],
  pinned: false,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
  ...overrides,
})

describe('prompt library selectors', () => {
  it('filters by query and keeps the selected Prompt active', () => {
    const prompts = [
      createPrompt(),
      createPrompt({
        id: 'prompt-beta',
        title: 'Beta',
        body: 'Summarize stakeholder notes.',
        category: 'Writing',
        tags: ['stakeholder'],
      }),
    ]

    const visibleState = selectPromptLibraryVisibleState({
      prompts,
      query: '#stakeholder',
      selectedPromptId: 'prompt-beta',
    })

    expect(visibleState.activePrompt?.id).toBe('prompt-beta')
    expect(visibleState.visiblePromptId).toBe('prompt-beta')
    expect(visibleState.emptyReason).toBeNull()
    expect(visibleState.orderedPromptIds).toEqual(['prompt-beta'])
    expect(visibleState.facets.projects.map((project) => project.label)).toEqual([
      'Engineering',
      'Writing',
    ])
  })

  it('owns next, previous, and delete-neighbor selection rules', () => {
    const prompts = [
      createPrompt({ id: 'prompt-alpha', createdAt: '2026-04-24T00:03:00.000Z' }),
      createPrompt({ id: 'prompt-beta', createdAt: '2026-04-24T00:02:00.000Z' }),
      createPrompt({ id: 'prompt-gamma', createdAt: '2026-04-24T00:01:00.000Z' }),
    ]

    const visibleState = selectPromptLibraryVisibleState({
      prompts,
      query: '',
      selectedPromptId: 'prompt-beta',
    })

    expect(visibleState.getNextPromptId()).toBe('prompt-gamma')
    expect(visibleState.getPreviousPromptId()).toBe('prompt-alpha')
    expect(visibleState.getNearestPromptIdAfterRemoval('prompt-beta')).toBe('prompt-gamma')
    expect(visibleState.getNearestPromptIdAfterRemoval('prompt-gamma')).toBe('prompt-beta')
  })

  it('orders newest-created first and ignores edits, so the list stays put', () => {
    const prompts = [
      createPrompt({
        id: 'older-but-edited',
        createdAt: '2026-04-24T00:01:00.000Z',
        updatedAt: '2026-04-25T00:00:00.000Z',
      }),
      createPrompt({ id: 'newest', createdAt: '2026-04-24T00:03:00.000Z' }),
      createPrompt({ id: 'middle', createdAt: '2026-04-24T00:02:00.000Z' }),
    ]

    const visibleState = selectPromptLibraryVisibleState({
      prompts,
      query: '',
      selectedPromptId: null,
    })

    expect(visibleState.orderedPromptIds).toEqual(['newest', 'middle', 'older-but-edited'])
  })

  it('floats pinned Prompts above everything else for every sort', () => {
    const prompts = [
      createPrompt({ id: 'popular', title: 'A', uses: 10, createdAt: '2026-04-24T00:03:00.000Z' }),
      createPrompt({
        id: 'pinned',
        title: 'Z',
        pinned: true,
        createdAt: '2026-04-24T00:01:00.000Z',
      }),
      createPrompt({ id: 'quiet', title: 'M', uses: 2, createdAt: '2026-04-24T00:02:00.000Z' }),
    ]

    const ids = (sort: 'created' | 'used' | 'title') =>
      selectPromptLibraryVisibleState({ prompts, query: '', selectedPromptId: null, sort })
        .orderedPromptIds

    expect(ids('created')).toEqual(['pinned', 'popular', 'quiet'])
    expect(ids('used')).toEqual(['pinned', 'popular', 'quiet'])
    expect(ids('title')).toEqual(['pinned', 'popular', 'quiet'])
  })

  it('applies kind, pinned, category, and tag filters', () => {
    const prompts = [
      createPrompt({ id: 'p', kind: 'prompt', category: 'Engineering', tags: ['debugging'] }),
      createPrompt({
        id: 'f',
        kind: 'fragment',
        category: 'Writing',
        tags: ['tone'],
        pinned: true,
      }),
      createPrompt({ id: 'b', kind: 'benchmark', category: 'writing', tags: ['tone', 'summary'] }),
    ]

    const ids = (filter: Parameters<typeof selectPromptLibraryVisibleState>[0]['filter']) =>
      selectPromptLibraryVisibleState({ prompts, query: '', selectedPromptId: null, filter })
        .orderedPromptIds

    expect(ids(filterOf({ kind: 'fragment' }))).toEqual(['f'])
    expect(ids(filterOf({ pinned: true }))).toEqual(['f'])
    expect(ids(filterOf({ project: 'Writing' })).sort()).toEqual(['b', 'f'])
    expect(ids(filterOf({ tag: 'tone' })).sort()).toEqual(['b', 'f'])
    expect(ids(filterOf({}))).toHaveLength(3)
  })

  it('stacks a Project with kind, pin and tag filters', () => {
    const prompts = [
      createPrompt({ id: 'seq-here', kind: 'sequence', category: 'render-md', tags: ['plan'] }),
      createPrompt({ id: 'seq-there', kind: 'sequence', category: 'promptrc', tags: ['plan'] }),
      createPrompt({ id: 'prompt-here', kind: 'prompt', category: 'Render MD', pinned: true }),
    ]
    const ids = (patch: Partial<PromptLibraryFilter>) =>
      selectPromptLibraryVisibleState({
        prompts,
        query: '',
        selectedPromptId: null,
        filter: { ...EMPTY_PROMPT_LIBRARY_FILTER, ...patch },
      }).orderedPromptIds

    // "Render MD" and "render-md" are the same Project.
    expect(ids({ project: 'render-md' }).sort()).toEqual(['prompt-here', 'seq-here'])
    expect(ids({ project: 'render-md', kind: 'sequence' })).toEqual(['seq-here'])
    expect(ids({ project: 'render-md', pinned: true })).toEqual(['prompt-here'])
    expect(ids({ kind: 'sequence', tag: 'plan' }).sort()).toEqual(['seq-here', 'seq-there'])
  })

  it('shows a saved Prompt by dropping narrowing first, then following its Project', () => {
    const prompt = createPrompt({ kind: 'fragment', category: 'render-md' })
    const here = { ...EMPTY_PROMPT_LIBRARY_FILTER, project: 'Render MD', kind: 'sequence' as const }
    const elsewhere = { ...EMPTY_PROMPT_LIBRARY_FILTER, project: 'promptrc', pinned: true }

    expect(getFilterShowingPrompt(prompt, here)).toEqual({
      ...EMPTY_PROMPT_LIBRARY_FILTER,
      project: 'Render MD',
    })
    expect(getFilterShowingPrompt(prompt, elsewhere)).toEqual({
      ...EMPTY_PROMPT_LIBRARY_FILTER,
      project: 'render-md',
    })
    expect(getFilterShowingPrompt(prompt, EMPTY_PROMPT_LIBRARY_FILTER)).toBe(
      EMPTY_PROMPT_LIBRARY_FILTER,
    )
  })

  it('distinguishes an empty filter from a query with no matches', () => {
    const prompts = [createPrompt()]

    expect(
      selectPromptLibraryVisibleState({
        prompts,
        query: '',
        selectedPromptId: null,
        filter: { ...EMPTY_PROMPT_LIBRARY_FILTER, kind: 'sequence' },
      }).emptyReason,
    ).toBe('empty-filter')
    expect(
      selectPromptLibraryVisibleState({ prompts, query: 'nothing-here', selectedPromptId: null })
        .emptyReason,
    ).toBe('no-query-matches')
    expect(
      selectPromptLibraryVisibleState({ prompts: [], query: '', selectedPromptId: null })
        .emptyReason,
    ).toBe('no-prompts')
  })

  it('lists Projects A–Z and counts kinds, pins and tags inside the current Project', () => {
    const prompts = [
      createPrompt({ id: '1', kind: 'prompt', category: 'Writing', tags: ['tone'] }),
      createPrompt({ id: '2', kind: 'sequence', category: 'engineering', tags: ['tone', 'plan'] }),
      createPrompt({ id: '3', kind: 'sequence', category: 'Engineering', pinned: true, tags: [] }),
      createPrompt({ id: '4', kind: 'fragment', category: 'Engineering', tags: [] }),
    ]

    const facetsFor = (project: string | null) =>
      selectPromptLibraryVisibleState({
        prompts,
        query: '',
        selectedPromptId: null,
        filter: { ...EMPTY_PROMPT_LIBRARY_FILTER, project },
      }).facets

    const everywhere = facetsFor(null)

    expect(everywhere.total).toBe(4)
    // Spellings of one Project merge under the most common spelling.
    expect(everywhere.projects.map((project) => [project.label, project.count])).toEqual([
      ['Engineering', 3],
      ['Writing', 1],
    ])
    expect(everywhere.tags.map((tag) => tag.key)).toEqual(['tone', 'plan'])
    expect(everywhere.here.kinds).toEqual({ prompt: 1, fragment: 1, sequence: 2, benchmark: 0 })

    const engineering = facetsFor('engineering')

    expect(engineering.total).toBe(4)
    expect(engineering.here.total).toBe(3)
    expect(engineering.here.pinned).toBe(1)
    expect(engineering.here.kinds).toEqual({ prompt: 0, fragment: 1, sequence: 2, benchmark: 0 })
    expect(engineering.here.tags.map((tag) => tag.key)).toEqual(['plan', 'tone'])
  })

  it('uses the first matching Prompt when the selected Prompt is hidden by query', () => {
    const prompts = [
      createPrompt({ id: 'prompt-alpha', title: 'Alpha', tags: ['testing'] }),
      createPrompt({
        id: 'prompt-beta',
        title: 'Beta',
        body: 'Summarize stakeholder notes.',
        tags: ['stakeholder'],
      }),
    ]

    const visibleState = selectPromptLibraryVisibleState({
      prompts,
      query: '#stakeholder',
      selectedPromptId: 'prompt-alpha',
    })

    expect(visibleState.activePrompt?.id).toBe('prompt-beta')
    expect(visibleState.getNextPromptId()).toBe('prompt-beta')
    expect(visibleState.getPreviousPromptId()).toBe('prompt-beta')
  })

  it('matches every search term across body, notes, kind, and tag prefixes', () => {
    const prompt = createPrompt({
      kind: 'benchmark',
      title: 'Summary under pressure',
      notes: 'Pass when the decision leads.',
      tags: ['stakeholder'],
    })

    expect(matchesPromptQuery(prompt, 'summary decision')).toBe(true)
    expect(matchesPromptQuery(prompt, 'benchmark')).toBe(true)
    expect(matchesPromptQuery(prompt, '#stake')).toBe(true)
    expect(matchesPromptQuery(prompt, '#holder')).toBe(false)
    expect(matchesPromptQuery(prompt, 'summary missing')).toBe(false)
  })

  it('describes filters for headings', () => {
    expect(describeFilter({})).toBe('Everything')
    expect(describeFilter({ kind: 'sequence' })).toBe('Sequences')
    expect(describeFilter({ tag: 'tone' })).toBe('Everything tagged #tone')
    expect(describeFilter({ project: 'render-md', kind: 'sequence', pinned: true })).toBe(
      'Pinned sequences in render-md',
    )
  })
})
