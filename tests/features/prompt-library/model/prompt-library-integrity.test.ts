import { describe, expect, it } from 'vitest'

import {
  copyPromptForRemoteLibrary,
  createPromptRecordFromDraft,
  normalizePromptRecord,
  normalizePromptTags,
} from '@/features/prompt-library/model/prompt-library-integrity'
import { type PromptRecord } from '@/features/prompt-library/types'

const prompt: PromptRecord = {
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['Testing'],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
}

describe('prompt library integrity', () => {
  it('normalizes Tags without pretending to validate the Prompt Body', () => {
    expect(normalizePromptTags('#Testing testing, D1  #review')).toEqual([
      'testing',
      'd1',
      'review',
    ])
  })

  it('creates Prompt records with the realistic required fields only', () => {
    expect(
      createPromptRecordFromDraft(
        {
          title: '  Owned Prompt ',
          category: '',
          body: '  Keep this close. ',
          tagsInput: '#Testing #testing',
        },
        {
          generateId: () => 'prompt-owned',
          now: () => new Date('2026-04-24T00:00:00.000Z'),
        },
      ),
    ).toEqual({
      id: 'prompt-owned',
      title: 'Owned Prompt',
      body: 'Keep this close.',
      category: 'Personal',
      tags: ['testing'],
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
      uses: 0,
    })
    expect(
      createPromptRecordFromDraft({
        title: 'No body',
        category: 'Engineering',
        body: '',
        tagsInput: '',
      }),
    ).toBeNull()
  })

  it('copies local Prompts into remote storage with a new id and normalized fields', () => {
    expect(
      copyPromptForRemoteLibrary(
        {
          ...prompt,
          title: ' Alpha ',
          category: '',
          tags: ['Testing', '#review'],
        },
        {
          generateId: () => 'remote-prompt-alpha',
        },
      ),
    ).toMatchObject({
      id: 'remote-prompt-alpha',
      title: 'Alpha',
      category: 'Personal',
      tags: ['testing', 'review'],
    })
  })

  it('normalizes Prompt records without changing ownership timestamps or Use Count', () => {
    expect(
      normalizePromptRecord({
        ...prompt,
        title: ' Alpha ',
        body: ' Body ',
        category: '',
        tags: ['Testing', 'testing'],
        uses: 3,
      }),
    ).toEqual({
      ...prompt,
      title: 'Alpha',
      body: 'Body',
      category: 'Personal',
      tags: ['testing'],
      uses: 3,
    })
  })
})
