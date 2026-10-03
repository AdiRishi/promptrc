import { describe, expect, it } from 'vitest'

import {
  assertBoolean,
  assertPromptId,
  assertPromptImageUploadInput,
  assertPromptRecord,
  assertPromptRecordWithinLimits,
  assertPromptRecords,
  assertPromptRecordsWithinLimits,
  assertPromptRun,
  parsePromptLibraryPersistedSnapshot,
} from '@/features/prompt-library/model/prompt-library-validation'
import { MAX_PROMPT_RUNS } from '@/features/prompt-library/model/prompt-runs'
import { type PromptRecord, type PromptRun } from '@/features/prompt-library/types'

const prompt: PromptRecord = {
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing'],
  kind: 'prompt',
  notes: '',
  runs: [],
  pinned: false,
  images: [],
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
    expect(() =>
      assertPromptImageUploadInput({
        fileName: 'notes.txt',
        contentType: 'text/plain',
        dataBase64: 'abc',
      }),
    ).toThrow('image type is unsupported')
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
          kind: 'prompt',
          notes: '',
          images: [],
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
          kind: 'prompt',
          notes: '',
          images: [],
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
        kind: 'prompt',
        notes: '',
        images: [],
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

const parseDraft = (draft: Record<string, unknown>) =>
  parsePromptLibraryPersistedSnapshot({
    prompts: [prompt],
    composer: { mode: 'new', draft },
  })?.composer.draft

describe('prompt library validation for kinds, notes, runs, and pinning', () => {
  const run: PromptRun = {
    id: 'run-alpha',
    model: 'model-a',
    verdict: 'pass',
    note: 'Found all three bugs.',
    ranAt: '2026-04-25T00:00:00.000Z',
  }

  /** A record as stored before kinds, notes, runs, and pinning existed. */
  const legacyPrompt = {
    id: prompt.id,
    title: prompt.title,
    body: prompt.body,
    category: prompt.category,
    tags: prompt.tags,
    images: prompt.images,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
    uses: prompt.uses,
  }

  it('loads legacy records saved before kinds, notes, runs, and pinning existed', () => {
    expect(assertPromptRecord(legacyPrompt)).toEqual({
      ...legacyPrompt,
      kind: 'prompt',
      notes: '',
      runs: [],
      pinned: false,
    })
    expect(
      parsePromptLibraryPersistedSnapshot({
        prompts: [legacyPrompt],
        selectedPromptId: 'prompt-alpha',
      })?.prompts,
    ).toEqual([prompt])
  })

  it('accepts and normalizes the new fields when present', () => {
    const older = { ...run, id: 'run-older', ranAt: '2026-04-24T00:00:00.000Z' }

    expect(
      assertPromptRecord({
        ...prompt,
        kind: 'benchmark',
        notes: '  Rubric  ',
        runs: [older, { ...run, model: ' model-a ', note: ' Found all three bugs. ' }],
        pinned: true,
      }),
    ).toEqual({
      ...prompt,
      kind: 'benchmark',
      notes: 'Rubric',
      runs: [run, older],
      pinned: true,
    })
  })

  it('rejects invalid values for the new fields instead of silently defaulting', () => {
    expect(() => assertPromptRecord({ ...prompt, kind: 'note' })).toThrow('kind is invalid')
    expect(() => assertPromptRecord({ ...prompt, kind: null })).toThrow('kind is invalid')
    expect(() => assertPromptRecord({ ...prompt, notes: 42 })).toThrow('notes must be a string')
    expect(() => assertPromptRecord({ ...prompt, pinned: 'yes' })).toThrow(
      'pinned must be a boolean',
    )
    expect(() => assertPromptRecord({ ...prompt, runs: {} })).toThrow('runs must be an array')
    expect(() => assertPromptRecord({ ...prompt, runs: [{ ...run, verdict: 'skip' }] })).toThrow(
      'run.verdict is invalid',
    )
    expect(() =>
      assertPromptRecord({
        ...prompt,
        runs: Array.from({ length: MAX_PROMPT_RUNS + 1 }, (_, index) => ({
          ...run,
          id: `run-${index}`,
        })),
      }),
    ).toThrow('runs has too many entries')
  })

  it('validates individual runs', () => {
    const runWithoutNote = { id: run.id, model: run.model, verdict: run.verdict, ranAt: run.ranAt }

    expect(assertPromptRun(runWithoutNote)).toEqual({ ...run, note: '' })
    expect(() => assertPromptRun(null)).toThrow('run must be an object')
    expect(() => assertPromptRun({ ...run, id: '  ' })).toThrow('run.id is invalid')
    expect(() => assertPromptRun({ ...run, id: 'x'.repeat(97) })).toThrow('run.id is invalid')
    expect(() => assertPromptRun({ ...run, model: '   ' })).toThrow('run.model is invalid')
    expect(() => assertPromptRun({ ...run, model: 'm'.repeat(121) })).toThrow(
      'run.model is invalid',
    )
    expect(() => assertPromptRun({ ...run, note: 'n'.repeat(4001) })).toThrow(
      'run.note is too long',
    )
    expect(() => assertPromptRun({ ...run, ranAt: 'yesterday' })).toThrow(
      'run.ranAt must be a date',
    )
  })

  it('rejects a whole persisted snapshot when one record has an invalid kind', () => {
    expect(
      parsePromptLibraryPersistedSnapshot({ prompts: [{ ...prompt, kind: 'note' }] }),
    ).toBeNull()
  })

  it('parses persisted filter and sort, defaulting when they are missing', () => {
    expect(parsePromptLibraryPersistedSnapshot({ prompts: [prompt] })).toMatchObject({
      filter: { type: 'all' },
      sort: 'created',
    })

    for (const filter of [
      { type: 'all' },
      { type: 'pinned' },
      { type: 'kind', kind: 'sequence' },
      { type: 'category', category: 'Engineering' },
      { type: 'tag', tag: 'testing' },
    ] as const) {
      expect(parsePromptLibraryPersistedSnapshot({ prompts: [prompt], filter })?.filter).toEqual(
        filter,
      )
    }

    for (const sort of ['created', 'used', 'title'] as const) {
      expect(parsePromptLibraryPersistedSnapshot({ prompts: [prompt], sort })?.sort).toBe(sort)
    }
  })

  it('falls back to the default filter and sort for invalid persisted values', () => {
    for (const filter of [
      'pinned',
      null,
      { type: 'unknown' },
      { type: 'kind', kind: 'note' },
      { type: 'kind' },
      { type: 'category', category: '' },
      { type: 'category', category: 7 },
      { type: 'tag', tag: '' },
    ]) {
      expect(parsePromptLibraryPersistedSnapshot({ prompts: [prompt], filter })?.filter).toEqual({
        type: 'all',
      })
    }

    for (const sort of ['newest', 42, null, 'TITLE']) {
      expect(parsePromptLibraryPersistedSnapshot({ prompts: [prompt], sort })?.sort).toBe('created')
    }
  })

  it('strips extra keys from persisted filters', () => {
    expect(
      parsePromptLibraryPersistedSnapshot({
        prompts: [prompt],
        filter: { type: 'pinned', kind: 'benchmark', extra: true },
      })?.filter,
    ).toEqual({ type: 'pinned' })
  })

  it('parses draft kind and notes, falling back for invalid values', () => {
    expect(parseDraft({ kind: 'benchmark', notes: 'Rubric', body: 'Test' })).toMatchObject({
      kind: 'benchmark',
      notes: 'Rubric',
      body: 'Test',
    })
    expect(parseDraft({ kind: 'nope', notes: 99 })).toMatchObject({ kind: 'prompt', notes: '' })
    expect(parseDraft({ title: 'Legacy draft' })).toMatchObject({
      kind: 'prompt',
      notes: '',
      title: 'Legacy draft',
    })
  })
})

describe('server-side prompt limits', () => {
  const base = {
    id: 'prompt-alpha',
    title: 'Alpha',
    body: 'Body',
    category: 'Engineering',
    tags: ['one'],
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
    uses: 0,
  }

  it('accepts ordinary prompts and rejects oversized fields', () => {
    expect(assertPromptRecordWithinLimits(base).title).toBe('Alpha')
    expect(() => assertPromptRecordWithinLimits({ ...base, notes: 'x'.repeat(20_001) })).toThrow(
      /notes/,
    )
    expect(() =>
      assertPromptRecordWithinLimits({
        ...base,
        tags: Array.from({ length: 51 }, (_, index) => `tag${index}`),
      }),
    ).toThrow(/tags/)
    expect(() => assertPromptRecordWithinLimits({ ...base, title: 't'.repeat(301) })).toThrow(
      /title/,
    )
  })

  it('caps how many prompts one request may copy', () => {
    expect(() =>
      assertPromptRecordsWithinLimits(Array.from({ length: 2_001 }, () => base)),
    ).toThrow(/at most 2000/)
  })

  it('leaves the local snapshot parser unbounded so oversized libraries still load', () => {
    expect(assertPromptRecord({ ...base, notes: 'x'.repeat(20_001) }).notes).toHaveLength(20_001)
  })
})
