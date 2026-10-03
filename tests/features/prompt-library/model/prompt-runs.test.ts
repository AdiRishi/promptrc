import { describe, expect, it } from 'vitest'

import {
  MAX_PROMPT_RUN_MODEL_LENGTH,
  MAX_PROMPT_RUN_NOTE_LENGTH,
  MAX_PROMPT_RUNS,
  createPromptRun,
  isPromptRunVerdict,
  normalizePromptRuns,
  summarizePromptRuns,
} from '@/features/prompt-library/model/prompt-runs'
import { type PromptRun } from '@/features/prompt-library/types'

const createRun = (overrides: Partial<PromptRun> = {}): PromptRun => ({
  id: 'run-1',
  model: 'claude-opus',
  verdict: 'pass',
  note: '',
  ranAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
})

describe('prompt runs', () => {
  describe('createPromptRun', () => {
    it('creates a run with a trimmed model and note, an id, and a timestamp', () => {
      expect(
        createPromptRun(
          { model: '  gpt-x  ', verdict: 'mixed', note: '  close, missed edge case  ' },
          { generateId: () => 'run-generated', now: () => new Date('2026-05-02T10:00:00.000Z') },
        ),
      ).toEqual({
        id: 'run-generated',
        model: 'gpt-x',
        verdict: 'mixed',
        note: 'close, missed edge case',
        ranAt: '2026-05-02T10:00:00.000Z',
      })
    })

    it('refuses a run without a model name', () => {
      expect(createPromptRun({ model: '', verdict: 'pass' })).toBeNull()
      expect(createPromptRun({ model: '   \n', verdict: 'fail' })).toBeNull()
    })

    it('defaults the note to empty and generates a real id and timestamp', () => {
      const run = createPromptRun({ model: 'model', verdict: 'pass' })

      expect(run?.note).toBe('')
      expect(run?.id).toMatch(/^[0-9a-f-]{36}$/)
      expect(Number.isNaN(Date.parse(run?.ranAt ?? ''))).toBe(false)
    })

    it('caps overly long model names and notes', () => {
      const run = createPromptRun({
        model: 'm'.repeat(MAX_PROMPT_RUN_MODEL_LENGTH + 50),
        verdict: 'pass',
        note: 'n'.repeat(MAX_PROMPT_RUN_NOTE_LENGTH + 50),
      })

      expect(run?.model).toHaveLength(MAX_PROMPT_RUN_MODEL_LENGTH)
      expect(run?.note).toHaveLength(MAX_PROMPT_RUN_NOTE_LENGTH)
    })
  })

  it('recognizes only known verdicts', () => {
    expect(['pass', 'mixed', 'fail'].every(isPromptRunVerdict)).toBe(true)
    expect(isPromptRunVerdict('PASS')).toBe(false)
    expect(isPromptRunVerdict('skip')).toBe(false)
    expect(isPromptRunVerdict(undefined)).toBe(false)
  })

  describe('normalizePromptRuns', () => {
    it('orders runs newest first without mutating the input', () => {
      const runs = [
        createRun({ id: 'old', ranAt: '2026-05-01T00:00:00.000Z' }),
        createRun({ id: 'new', ranAt: '2026-05-03T00:00:00.000Z' }),
        createRun({ id: 'mid', ranAt: '2026-05-02T00:00:00.000Z' }),
      ]
      const snapshot = runs.map((run) => run.id)

      expect(normalizePromptRuns(runs).map((run) => run.id)).toEqual(['new', 'mid', 'old'])
      expect(runs.map((run) => run.id)).toEqual(snapshot)
    })

    it('keeps the newest copy when the same run id appears twice', () => {
      expect(
        normalizePromptRuns([
          createRun({ id: 'dup', verdict: 'fail', ranAt: '2026-05-01T00:00:00.000Z' }),
          createRun({ id: 'dup', verdict: 'pass', ranAt: '2026-05-02T00:00:00.000Z' }),
        ]),
      ).toEqual([createRun({ id: 'dup', verdict: 'pass', ranAt: '2026-05-02T00:00:00.000Z' })])
    })

    it(`keeps only the newest ${MAX_PROMPT_RUNS} runs`, () => {
      const runs = Array.from({ length: MAX_PROMPT_RUNS + 5 }, (_, index) =>
        createRun({
          id: `run-${index}`,
          ranAt: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
        }),
      )
      const normalized = normalizePromptRuns(runs)

      expect(normalized).toHaveLength(MAX_PROMPT_RUNS)
      expect(normalized[0]?.id).toBe(`run-${MAX_PROMPT_RUNS + 4}`)
      expect(normalized.some((run) => run.id === 'run-0')).toBe(false)
    })
  })

  describe('summarizePromptRuns', () => {
    it('summarizes an empty log without a pass rate', () => {
      expect(summarizePromptRuns([])).toEqual({
        total: 0,
        pass: 0,
        mixed: 0,
        fail: 0,
        passRate: null,
        latest: null,
        models: [],
      })
    })

    it('counts verdicts, computes the pass rate, and lists models by recency', () => {
      const latest = createRun({
        id: 'r4',
        model: 'model-b',
        verdict: 'pass',
        ranAt: '2026-05-04T00:00:00.000Z',
      })
      const summary = summarizePromptRuns([
        createRun({
          id: 'r1',
          model: 'model-a',
          verdict: 'pass',
          ranAt: '2026-05-01T00:00:00.000Z',
        }),
        createRun({
          id: 'r2',
          model: 'model-c',
          verdict: 'fail',
          ranAt: '2026-05-02T00:00:00.000Z',
        }),
        latest,
        createRun({
          id: 'r3',
          model: 'model-a',
          verdict: 'mixed',
          ranAt: '2026-05-03T00:00:00.000Z',
        }),
      ])

      expect(summary).toEqual({
        total: 4,
        pass: 2,
        mixed: 1,
        fail: 1,
        passRate: 0.5,
        latest,
        models: ['model-b', 'model-a', 'model-c'],
      })
    })

    it('does not double count duplicated runs', () => {
      const run = createRun({ id: 'same', verdict: 'fail' })

      expect(summarizePromptRuns([run, run])).toMatchObject({ total: 1, fail: 1, passRate: 0 })
    })
  })
})
