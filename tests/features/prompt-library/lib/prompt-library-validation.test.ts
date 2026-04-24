import { describe, expect, it } from 'vitest'

import { parsePromptLibraryPersistedSnapshot } from '@/features/prompt-library/lib/prompt-library-validation'
import { type PromptRecord } from '@/features/prompt-library/types'

const prompt: PromptRecord = {
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing'],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
}

describe('prompt library validation', () => {
  it('parses a valid persisted snapshot', () => {
    const snapshot = parsePromptLibraryPersistedSnapshot({
      prompts: [prompt],
      query: 'alpha',
      selectedPromptId: prompt.id,
      composer: {
        mode: 'edit',
        draft: {
          title: 'Alpha',
          category: 'Engineering',
          body: 'Draft body',
          tagsInput: '#testing',
        },
      },
    })

    expect(snapshot).toMatchObject({
      prompts: [prompt],
      query: 'alpha',
      selectedPromptId: prompt.id,
      composer: {
        mode: 'edit',
      },
    })
  })

  it('rejects snapshots with malformed prompts', () => {
    expect(
      parsePromptLibraryPersistedSnapshot({
        prompts: [{ ...prompt, uses: -1 }],
      }),
    ).toBeNull()
  })
})
