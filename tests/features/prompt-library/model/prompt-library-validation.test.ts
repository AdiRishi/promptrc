import { describe, expect, it } from 'vitest'

import {
  assertBoolean,
  assertPromptId,
  assertPromptRecord,
  assertPromptRecords,
  parsePromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/model/prompt-library-validation'
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
  it('normalizes trusted Prompt fields at the server-function boundary', () => {
    expect(
      assertPromptRecord({
        ...prompt,
        id: ' prompt-alpha ',
        title: ' Alpha ',
        body: ' Body ',
        category: '',
        tags: ['Testing', '#review'],
      }),
    ).toEqual({
      ...prompt,
      id: 'prompt-alpha',
      title: 'Alpha',
      body: 'Body',
      category: 'Personal',
      tags: ['testing', 'review'],
    })
    expect(assertPromptRecords([prompt])).toEqual([prompt])
  })

  it('rejects malformed server-function inputs', () => {
    expect(() => assertPromptId('   ')).toThrow('promptId is required')
    expect(() => assertBoolean('true', 'isFresh')).toThrow('isFresh must be a boolean')
    expect(() => assertPromptRecords({ prompts: [prompt] })).toThrow('prompts must be an array')
    expect(() => assertPromptRecord({ ...prompt, title: '' })).toThrow('title is required')
  })

  it('parses a valid persisted snapshot', () => {
    const snapshot = parsePromptLibraryPersistedSnapshot({
      prompts: [prompt],
      isFresh: false,
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
      isFresh: false,
      query: 'alpha',
      selectedPromptId: prompt.id,
      composer: {
        mode: 'edit',
      },
    })
  })

  it('falls back to a safe composer when persisted workspace data is partial', () => {
    expect(
      parsePromptLibraryPersistedSnapshot({
        prompts: [prompt],
        query: 42,
        selectedPromptId: null,
        composer: {
          mode: 'unknown',
          draft: {
            title: 'Recovered title',
            category: 123,
          },
        },
      }),
    ).toMatchObject({
      query: '',
      selectedPromptId: null,
      composer: {
        mode: 'view',
        draft: {
          title: 'Recovered title',
          category: '',
          body: '',
          tagsInput: '',
        },
      },
    })
    expect(
      parsePromptLibraryPersistedSnapshot({
        prompts: [prompt],
        composer: null,
      })?.composer,
    ).toEqual({
      mode: 'view',
      draft: {
        title: '',
        category: '',
        body: '',
        tagsInput: '',
      },
    })
  })

  it('rejects persisted snapshots with invalid selection metadata', () => {
    expect(
      parsePromptLibraryPersistedSnapshot({
        prompts: [prompt],
        selectedPromptId: 42,
      }),
    ).toBeNull()
  })

  it('rejects snapshots with malformed prompts', () => {
    expect(
      parsePromptLibraryPersistedSnapshot({
        prompts: [{ ...prompt, uses: -1 }],
      }),
    ).toBeNull()
  })

  it('parses persisted freshness and treats legacy empty snapshots as fresh', () => {
    expect(
      parsePromptLibraryPersistedSnapshot({
        prompts: [prompt],
        isFresh: false,
      })?.isFresh,
    ).toBe(false)
    expect(
      parsePromptLibraryPersistedSnapshot({
        prompts: [],
      })?.isFresh,
    ).toBe(true)
    expect(
      parsePromptLibraryPersistedSnapshot({
        prompts: [prompt],
      })?.isFresh,
    ).toBe(false)
  })
})
