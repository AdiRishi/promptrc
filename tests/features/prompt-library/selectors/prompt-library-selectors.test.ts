import { describe, expect, it } from 'vitest'

import { selectPromptLibraryVisibleState } from '@/features/prompt-library/selectors/prompt-library-selectors'
import { type PromptRecord } from '@/features/prompt-library/types'

const createPrompt = (overrides: Partial<PromptRecord> = {}): PromptRecord => ({
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing'],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
  ...overrides,
})

describe('prompt library selectors', () => {
  it('derives searchable Prompts into Categories and active selection', () => {
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
    expect(visibleState.categoryKeys).toEqual(['Writing'])
    expect(visibleState.groupedPrompts.Writing?.map((prompt) => prompt.id)).toEqual(['prompt-beta'])
    expect(visibleState.categories).toContain('Engineering')
    expect(visibleState.categories).toContain('Writing')
  })

  it('owns next, previous, and delete-neighbor selection rules', () => {
    const prompts = [
      createPrompt({ id: 'prompt-alpha', title: 'Alpha', category: 'Engineering' }),
      createPrompt({ id: 'prompt-beta', title: 'Beta', category: 'Engineering' }),
      createPrompt({ id: 'prompt-gamma', title: 'Gamma', category: 'Engineering' }),
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

  it('keeps the visible tree stable when Prompt recency changes', () => {
    const prompts = [
      createPrompt({
        id: 'prompt-workflow-zebra',
        title: 'Zebra',
        category: 'Workflow',
        updatedAt: '2026-04-24T00:04:00.000Z',
      }),
      createPrompt({
        id: 'prompt-benchmarks-alpha',
        title: 'Alpha',
        category: 'Benchmarks',
        updatedAt: '2026-04-24T00:03:00.000Z',
      }),
      createPrompt({
        id: 'prompt-workflow-alpha',
        title: 'Alpha',
        category: 'Workflow',
        updatedAt: '2026-04-24T00:02:00.000Z',
      }),
      createPrompt({
        id: 'prompt-dhawal-beta',
        title: 'Beta',
        category: 'Dhawal Ops',
        updatedAt: '2026-04-24T00:01:00.000Z',
      }),
    ]

    const visibleState = selectPromptLibraryVisibleState({
      prompts,
      query: '',
      selectedPromptId: 'prompt-workflow-zebra',
    })

    expect(visibleState.categoryKeys).toEqual(['Benchmarks', 'Dhawal Ops', 'Workflow'])
    expect(visibleState.groupedPrompts.Workflow?.map((prompt) => prompt.id)).toEqual([
      'prompt-workflow-alpha',
      'prompt-workflow-zebra',
    ])
    expect(visibleState.orderedPromptIds).toEqual([
      'prompt-benchmarks-alpha',
      'prompt-dhawal-beta',
      'prompt-workflow-alpha',
      'prompt-workflow-zebra',
    ])
    expect(visibleState.getPreviousPromptId()).toBe('prompt-workflow-alpha')
  })

  it('sorts Prompts inside each folder by newest creation time', () => {
    const prompts = [
      createPrompt({
        id: 'prompt-research-alpha',
        title: 'Alpha',
        category: 'Research',
        createdAt: '2026-04-24T00:01:00.000Z',
      }),
      createPrompt({
        id: 'prompt-research-zebra',
        title: 'Zebra',
        category: 'Research',
        createdAt: '2026-04-24T00:03:00.000Z',
      }),
      createPrompt({
        id: 'prompt-research-beta',
        title: 'Beta',
        category: 'Research',
        createdAt: '2026-04-24T00:02:00.000Z',
      }),
    ]

    const visibleState = selectPromptLibraryVisibleState({
      prompts,
      query: '',
      selectedPromptId: 'prompt-research-alpha',
    })

    expect(visibleState.groupedPrompts.Research?.map((prompt) => prompt.id)).toEqual([
      'prompt-research-zebra',
      'prompt-research-beta',
      'prompt-research-alpha',
    ])
    expect(visibleState.orderedPromptIds).toEqual([
      'prompt-research-zebra',
      'prompt-research-beta',
      'prompt-research-alpha',
    ])
    expect(visibleState.getPreviousPromptId()).toBe('prompt-research-beta')
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
    expect(visibleState.visiblePromptId).toBe('prompt-beta')
    expect(visibleState.getNextPromptId()).toBe('prompt-beta')
    expect(visibleState.getPreviousPromptId()).toBe('prompt-beta')
  })

  it('explains no-Prompt and no-match empty states', () => {
    expect(
      selectPromptLibraryVisibleState({
        prompts: [],
        query: '',
        selectedPromptId: null,
      }).emptyReason,
    ).toBe('no-prompts')

    expect(
      selectPromptLibraryVisibleState({
        prompts: [createPrompt()],
        query: 'stakeholder',
        selectedPromptId: 'prompt-alpha',
      }).emptyReason,
    ).toBe('no-query-matches')
  })
})
