import { describe, expect, it } from 'vitest'

import { createPromptImageMarkdown } from '@/features/prompt-library/model/prompt-images'
import {
  copyPromptForRemoteLibrary,
  createEmptyPromptDraft,
  createPromptDraft,
  createPromptInput,
  createPromptRecordFromDraft,
  deriveTitleFromBody,
  duplicatePromptRecord,
  normalizePromptRecord,
  normalizePromptTags,
  setPromptRecordPinned,
  updatePromptRecordFromDraft,
} from '@/features/prompt-library/model/prompt-library-integrity'
import { SEQUENCE_STEP_MARKER } from '@/features/prompt-library/model/prompt-sequences'
import { type PromptRecord, type PromptRun } from '@/features/prompt-library/types'

const prompt: PromptRecord = {
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['Testing'],
  kind: 'prompt',
  notes: '',
  runs: [],
  pinned: false,
  images: [],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
}

const image = {
  id: 'image-alpha',
  fileName: 'diagram.png',
  contentType: 'image/png',
  size: 2048,
  createdAt: '2026-04-24T00:01:00.000Z',
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
          kind: 'prompt',
          notes: '',
          images: [],
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
      kind: 'prompt',
      notes: '',
      runs: [],
      pinned: false,
      images: [],
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
      uses: 0,
    })
    expect(
      createPromptRecordFromDraft({
        title: 'No body',
        category: 'Engineering',
        body: '',
        kind: 'prompt',
        notes: '',
        images: [],
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

  it('keeps only images referenced in the Prompt Body', () => {
    const body = `Look here:\n\n${createPromptImageMarkdown(image)}`

    expect(
      normalizePromptRecord({
        ...prompt,
        body,
        images: [image, { ...image, id: 'image-unused', fileName: 'unused.png' }],
      }).images,
    ).toEqual([image])
  })

  it('keeps image metadata when a referenced Prompt Body image has a Markdown title', () => {
    expect(
      normalizePromptRecord({
        ...prompt,
        body: 'Look here:\n\n![diagram](prompt-image://image-alpha "full size")',
        images: [image],
      }).images,
    ).toEqual([image])
  })

  it('normalizes run logs and notes on Prompt records', () => {
    const older: PromptRun = {
      id: 'run-old',
      model: 'model-a',
      verdict: 'fail',
      note: '',
      ranAt: '2026-04-24T00:00:00.000Z',
    }
    const newer: PromptRun = { ...older, id: 'run-new', ranAt: '2026-04-25T00:00:00.000Z' }

    expect(
      normalizePromptRecord({
        ...prompt,
        kind: 'benchmark',
        notes: '  Pass means all three bugs found.  ',
        runs: [older, newer, older],
        pinned: true,
      }),
    ).toMatchObject({
      kind: 'benchmark',
      notes: 'Pass means all three bugs found.',
      runs: [newer, older],
      pinned: true,
    })
  })
})

describe('prompt kinds, notes, runs, and pinning on records', () => {
  const run: PromptRun = {
    id: 'run-alpha',
    model: 'model-a',
    verdict: 'pass',
    note: 'clean',
    ranAt: '2026-04-25T00:00:00.000Z',
  }
  const benchmark: PromptRecord = {
    ...prompt,
    kind: 'benchmark',
    notes: 'Expected: finds the off-by-one.',
    runs: [run],
    pinned: true,
    uses: 7,
  }

  it('starts empty drafts with the requested kind', () => {
    expect(createEmptyPromptDraft()).toMatchObject({ kind: 'prompt', notes: '', body: '' })
    expect(createEmptyPromptDraft('sequence').kind).toBe('sequence')
    expect(createEmptyPromptDraft('benchmark')).not.toBe(createEmptyPromptDraft('benchmark'))
  })

  it('carries kind and notes from a record into a draft and back into save input', () => {
    const draft = createPromptDraft(benchmark)

    expect(draft).toMatchObject({ kind: 'benchmark', notes: 'Expected: finds the off-by-one.' })
    expect(createPromptInput({ ...draft, notes: '  Updated rubric  ' })).toMatchObject({
      kind: 'benchmark',
      notes: 'Updated rubric',
    })
  })

  it('creates new records from a draft with its kind and notes, unpinned and without runs', () => {
    expect(
      createPromptRecordFromDraft(
        {
          ...createEmptyPromptDraft('fragment'),
          title: 'Uncertainty',
          body: 'Preserve uncertainty as open questions.',
          notes: '  Fixed overconfident summaries.  ',
        },
        { generateId: () => 'fragment-1', now: () => new Date('2026-04-24T00:00:00.000Z') },
      ),
    ).toMatchObject({
      id: 'fragment-1',
      kind: 'fragment',
      notes: 'Fixed overconfident summaries.',
      runs: [],
      pinned: false,
    })
  })

  it('updates kind and notes from a draft but keeps the run log and pin', () => {
    const updated = updatePromptRecordFromDraft(
      benchmark,
      { ...createPromptDraft(benchmark), kind: 'prompt', notes: 'Now a plain prompt' },
      { now: () => new Date('2026-04-26T00:00:00.000Z') },
    )

    expect(updated).toMatchObject({
      kind: 'prompt',
      notes: 'Now a plain prompt',
      runs: [run],
      pinned: true,
      uses: 7,
      updatedAt: '2026-04-26T00:00:00.000Z',
    })
  })

  it('duplicates keep kind and notes but start with no runs, unpinned, and unused', () => {
    expect(
      duplicatePromptRecord(benchmark, {
        generateId: () => 'prompt-copy',
        now: () => new Date('2026-04-27T00:00:00.000Z'),
      }),
    ).toEqual({
      ...benchmark,
      id: 'prompt-copy',
      title: 'Alpha (copy)',
      runs: [],
      pinned: false,
      uses: 0,
      createdAt: '2026-04-27T00:00:00.000Z',
      updatedAt: '2026-04-27T00:00:00.000Z',
    })
  })

  it('pins and unpins without mutating the record or touching updatedAt', () => {
    const pinned = setPromptRecordPinned(prompt, true)

    expect(pinned).toEqual({ ...prompt, pinned: true })
    expect(prompt.pinned).toBe(false)
    expect(setPromptRecordPinned(pinned, false)).toEqual(prompt)
  })
})

describe('deriveTitleFromBody', () => {
  it('uses the first meaningful line', () => {
    expect(deriveTitleFromBody('\n\n   \nReview this diff carefully\nSecond line')).toBe(
      'Review this diff carefully',
    )
  })

  it('strips markdown headings, quotes, list markers, and emphasis', () => {
    expect(deriveTitleFromBody('## Bug Hunt\n\nFind the bug.')).toBe('Bug Hunt')
    expect(deriveTitleFromBody('> **Act** as a `careful` reviewer')).toBe(
      'Act as a careful reviewer',
    )
    expect(deriveTitleFromBody('- Bullet idea')).toBe('Bullet idea')
    expect(deriveTitleFromBody('* Starred idea')).toBe('Starred idea')
    expect(deriveTitleFromBody('1. Restate the problem')).toBe('Restate the problem')
  })

  it('skips sequence step markers, comments, and lines that are only markup', () => {
    expect(deriveTitleFromBody(`${SEQUENCE_STEP_MARKER}\n\nRestate the problem\n`)).toBe(
      'Restate the problem',
    )
    expect(deriveTitleFromBody('---\n#\n<!-- draft -->\nReal title')).toBe('Real title')
    expect(deriveTitleFromBody('<!-- note --> Inline after comment')).toBe('Inline after comment')
  })

  it('drops one trailing punctuation mark', () => {
    expect(deriveTitleFromBody('Summarize this thread:')).toBe('Summarize this thread')
    expect(deriveTitleFromBody('Be concise.')).toBe('Be concise')
    expect(deriveTitleFromBody('Really?')).toBe('Really?')
  })

  it('keeps a line of exactly 64 characters whole', () => {
    const line = `${'a'.repeat(30)} ${'b'.repeat(33)}`

    expect(line).toHaveLength(64)
    expect(deriveTitleFromBody(line)).toBe(line)
  })

  it('clips long lines at a word boundary and adds an ellipsis', () => {
    const body =
      'Act as a careful senior reviewer and read the following pull request, looking for regressions.'
    const title = deriveTitleFromBody(body)

    expect(title).toBe('Act as a careful senior reviewer and read the following pull…')
    expect(title.length).toBeLessThanOrEqual(65)
  })

  it('drops trailing punctuation before the ellipsis when clipping', () => {
    expect(
      deriveTitleFromBody(
        'Act as a careful senior reviewer, then read the following request, and look for regressions.',
      ),
    ).toBe('Act as a careful senior reviewer, then read the following…')
  })

  it('hard clips when there is no reasonable word boundary', () => {
    expect(deriveTitleFromBody('x'.repeat(100))).toBe(`${'x'.repeat(64)}…`)
    expect(deriveTitleFromBody(`short ${'y'.repeat(100)}`)).toBe(`short ${'y'.repeat(58)}…`)
  })

  it('returns an empty title when there is nothing meaningful', () => {
    expect(deriveTitleFromBody('')).toBe('')
    expect(deriveTitleFromBody(`  \n${SEQUENCE_STEP_MARKER}\n---\n`)).toBe('')
  })

  // BUG: the list-marker strip `/^[#>*\-\d.\s]+/` removes ANY leading digits, dots,
  // and dashes, not just a list marker, so titles that start with a number lose it
  // ("10x engineer review" -> "x engineer review", "3 ways to…" -> "ways to…").
  it('keeps leading numbers that are part of the text, not a list marker', () => {
    expect(deriveTitleFromBody('10x engineer review')).toBe('10x engineer review')
    expect(deriveTitleFromBody('3 ways to cut latency')).toBe('3 ways to cut latency')
  })

  // BUG: emphasis stripping `/[*_`]/g` deletes every underscore, mangling identifiers
  // ("Refactor user_id handling" -> "Refactor userid handling").
  it('keeps underscores inside identifiers', () => {
    expect(deriveTitleFromBody('Refactor user_id handling')).toBe('Refactor user_id handling')
  })
})
