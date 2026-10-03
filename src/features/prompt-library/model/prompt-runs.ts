import { type PromptRun, type PromptRunVerdict } from '@/features/prompt-library/types'

export const PROMPT_RUN_VERDICTS = [
  'pass',
  'mixed',
  'fail',
] as const satisfies readonly PromptRunVerdict[]

export const PROMPT_RUN_VERDICT_LABELS: Record<PromptRunVerdict, string> = {
  pass: 'Pass',
  mixed: 'Mixed',
  fail: 'Fail',
}

/** Runs are a log, not a dataset — keep the newest ones within a sane bound. */
export const MAX_PROMPT_RUNS = 200
export const MAX_PROMPT_RUN_MODEL_LENGTH = 120
export const MAX_PROMPT_RUN_NOTE_LENGTH = 4000

export const isPromptRunVerdict = (value: unknown): value is PromptRunVerdict => {
  return typeof value === 'string' && (PROMPT_RUN_VERDICTS as readonly string[]).includes(value)
}

type PromptRunInput = {
  model: string
  verdict: PromptRunVerdict
  note?: string
}

type PromptRunFactoryOptions = {
  generateId?: () => string
  now?: () => Date
}

export const createPromptRun = (
  input: PromptRunInput,
  options: PromptRunFactoryOptions = {},
): PromptRun | null => {
  const model = input.model.trim().slice(0, MAX_PROMPT_RUN_MODEL_LENGTH)

  if (!model) {
    return null
  }

  return {
    id: options.generateId?.() ?? crypto.randomUUID(),
    model,
    verdict: input.verdict,
    note: (input.note ?? '').trim().slice(0, MAX_PROMPT_RUN_NOTE_LENGTH),
    ranAt: (options.now?.() ?? new Date()).toISOString(),
  }
}

/** Newest first, de-duplicated by id, and capped. */
export const normalizePromptRuns = (runs: readonly PromptRun[]): PromptRun[] => {
  const seen = new Set<string>()

  return [...runs]
    .sort((left, right) => right.ranAt.localeCompare(left.ranAt))
    .filter((run) => {
      if (seen.has(run.id)) {
        return false
      }

      seen.add(run.id)
      return true
    })
    .slice(0, MAX_PROMPT_RUNS)
}

export type PromptRunSummary = {
  total: number
  pass: number
  mixed: number
  fail: number
  /** Share of runs that passed, 0–1, or null without runs. */
  passRate: number | null
  latest: PromptRun | null
  models: string[]
}

export const summarizePromptRuns = (runs: readonly PromptRun[]): PromptRunSummary => {
  const ordered = normalizePromptRuns(runs)
  const counts = { pass: 0, mixed: 0, fail: 0 }

  for (const run of ordered) {
    counts[run.verdict] += 1
  }

  return {
    total: ordered.length,
    ...counts,
    passRate: ordered.length ? counts.pass / ordered.length : null,
    latest: ordered[0] ?? null,
    models: Array.from(new Set(ordered.map((run) => run.model))),
  }
}
