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
      createPrompt({ id: 'prompt-alpha', title: 'Alpha' }),
      createPrompt({ id: 'prompt-beta', title: 'Beta' }),
      createPrompt({ id: 'prompt-gamma', title: 'Gamma' }),
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
