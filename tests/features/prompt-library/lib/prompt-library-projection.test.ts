import { describe, expect, it } from 'vitest'

import { createPromptLibraryProjection } from '@/features/prompt-library/lib/prompt-library-projection'
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

describe('prompt library projection', () => {
  it('projects searchable Prompts into Categories and active selection', () => {
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

    const projection = createPromptLibraryProjection({
      prompts,
      query: '#stakeholder',
      selectedPromptId: 'prompt-beta',
    })

    expect(projection.activePrompt?.id).toBe('prompt-beta')
    expect(projection.orderedPromptIds).toEqual(['prompt-beta'])
    expect(projection.categoryKeys).toEqual(['Writing'])
    expect(projection.groupedPrompts.Writing?.map((prompt) => prompt.id)).toEqual(['prompt-beta'])
    expect(projection.categories).toContain('Engineering')
    expect(projection.categories).toContain('Writing')
  })

  it('owns next, previous, and delete-neighbor selection rules', () => {
    const prompts = [
      createPrompt({ id: 'prompt-alpha', title: 'Alpha' }),
      createPrompt({ id: 'prompt-beta', title: 'Beta' }),
      createPrompt({ id: 'prompt-gamma', title: 'Gamma' }),
    ]

    const projection = createPromptLibraryProjection({
      prompts,
      query: '',
      selectedPromptId: 'prompt-beta',
    })

    expect(projection.getNextPromptId()).toBe('prompt-gamma')
    expect(projection.getPreviousPromptId()).toBe('prompt-alpha')
    expect(projection.getNearestPromptIdAfterRemoval('prompt-beta')).toBe('prompt-gamma')
    expect(projection.getNearestPromptIdAfterRemoval('prompt-gamma')).toBe('prompt-beta')
  })
})
