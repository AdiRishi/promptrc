import { describe, expect, it } from 'vitest'

import {
  describePromptLibraryFilter,
  matchesPromptQuery,
  selectPromptLibraryVisibleState,
} from '@/features/prompt-library/selectors/prompt-library-selectors'
import { type PromptRecord } from '@/features/prompt-library/types'

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
    expect(visibleState.categories).toContain('Engineering')
    expect(visibleState.categories).toContain('Writing')
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

    expect(ids({ type: 'kind', kind: 'fragment' })).toEqual(['f'])
    expect(ids({ type: 'pinned' })).toEqual(['f'])
    expect(ids({ type: 'category', category: 'Writing' }).sort()).toEqual(['b', 'f'])
    expect(ids({ type: 'tag', tag: 'tone' }).sort()).toEqual(['b', 'f'])
    expect(ids({ type: 'all' })).toHaveLength(3)
  })

  it('distinguishes an empty filter from a query with no matches', () => {
    const prompts = [createPrompt()]

    expect(
      selectPromptLibraryVisibleState({
        prompts,
        query: '',
        selectedPromptId: null,
        filter: { type: 'kind', kind: 'sequence' },
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

  it('counts kinds, pins, Categories in Category Order, and tags by frequency', () => {
    const prompts = [
      createPrompt({ id: '1', kind: 'prompt', category: 'Writing', tags: ['tone'] }),
      createPrompt({ id: '2', kind: 'sequence', category: 'engineering', tags: ['tone', 'plan'] }),
      createPrompt({ id: '3', kind: 'sequence', category: 'Engineering', pinned: true, tags: [] }),
    ]

    const { facets } = selectPromptLibraryVisibleState({
      prompts,
      query: '',
      selectedPromptId: null,
    })

    expect(facets.total).toBe(3)
    expect(facets.pinned).toBe(1)
    expect(facets.kinds).toEqual({ prompt: 1, fragment: 0, sequence: 2, benchmark: 0 })
    expect(facets.categories.map((category) => [category.label, category.count])).toEqual([
      ['engineering', 2],
      ['Writing', 1],
    ])
    expect(facets.tags.map((tag) => tag.key)).toEqual(['tone', 'plan'])
  })

  it('keeps composer Category suggestions stable while preserving default Categories first', () => {
    const prompts = [
      createPrompt({ id: 'prompt-workflow', category: 'Workflow' }),
      createPrompt({ id: 'prompt-benchmarks', category: 'Benchmarks' }),
    ]

    const visibleState = selectPromptLibraryVisibleState({
      prompts,
      query: '',
      selectedPromptId: null,
    })

    expect(visibleState.categories.slice(0, 8)).toEqual([
      'Engineering',
      'Writing',
      'Thinking',
      'Teaching',
      'Product',
      'Career',
      'Personal',
      'Communication',
    ])
    expect(visibleState.categories.slice(8)).toEqual(['Benchmarks', 'Workflow'])
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
    expect(describePromptLibraryFilter({ type: 'all' })).toBe('Everything')
    expect(describePromptLibraryFilter({ type: 'kind', kind: 'sequence' })).toBe('Sequences')
    expect(describePromptLibraryFilter({ type: 'tag', tag: 'tone' })).toBe('#tone')
  })
})
