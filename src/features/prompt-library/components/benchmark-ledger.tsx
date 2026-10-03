import { X } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Choice, ChoiceGroup } from '@/components/ui/choice'
import { Input } from '@/components/ui/input'
import { type PromptRunRequest } from '@/features/prompt-library/commands/prompt-library-command-executor'
import {
  PROMPT_RUN_VERDICT_LABELS,
  PROMPT_RUN_VERDICTS,
  summarizePromptRuns,
} from '@/features/prompt-library/model/prompt-runs'
import {
  formatLongDate,
  pluralize,
} from '@/features/prompt-library/rendering/prompt-library-formatting'
import { type PromptRun, type PromptRunVerdict } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

const VERDICT_TEXT: Record<PromptRunVerdict, string> = {
  pass: 'text-verdict-pass',
  mixed: 'text-verdict-mixed',
  fail: 'text-verdict-fail',
}

const VERDICT_BG: Record<PromptRunVerdict, string> = {
  pass: 'bg-verdict-pass',
  mixed: 'bg-verdict-mixed',
  fail: 'bg-verdict-fail',
}

type BenchmarkLedgerProps = {
  expected: string
  runs: PromptRun[]
  knownModels?: string[]
  /** Without handlers the ledger is read-only (shared pages). */
  onLogRun?: (request: PromptRunRequest) => boolean
  onRemoveRun?: (runId: string) => void
}

/** The lab sheet under a benchmark: what good looks like, and what actually happened. */
export function BenchmarkLedger({
  expected,
  runs,
  knownModels = [],
  onLogRun,
  onRemoveRun,
}: BenchmarkLedgerProps) {
  const summary = summarizePromptRuns(runs)

  return (
    <section aria-label="Benchmark" className="mt-12 flex flex-col gap-8">
      <div className="rounded-2xl bg-paper-raised p-5 shadow-[inset_0_0_0_1px_var(--rule)]">
        <p className="label-caps mb-2 text-kind-benchmark">Expected result</p>
        {expected ? (
          <p className="font-reading text-[15.5px] leading-[1.65] whitespace-pre-line text-ink-soft">
            {expected}
          </p>
        ) : (
          <p className="text-[13px] text-ink-muted">
            No rubric yet. Edit this benchmark and describe what a pass looks like, so every run is
            judged the same way.
          </p>
        )}
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps mb-1">Run log</p>
            <p className="font-display text-[34px] leading-none text-ink tabular-nums">
              {summary.passRate === null ? '—' : `${Math.round(summary.passRate * 100)}%`}
              <span className="ml-2 font-sans text-[13px] text-ink-muted">
                {summary.total
                  ? `passing across ${pluralize(summary.total, 'run')}`
                  : 'no runs yet'}
              </span>
            </p>
          </div>
          {summary.total > 0 ? (
            <div aria-hidden="true" className="flex h-8 items-end gap-[3px]">
              {[...runs]
                .reverse()
                .slice(-24)
                .map((run) => (
                  <span
                    className={cn(
                      'w-[6px] rounded-full',
                      VERDICT_BG[run.verdict],
                      run.verdict === 'pass' ? 'h-8' : run.verdict === 'mixed' ? 'h-5' : 'h-2.5',
                    )}
                    key={run.id}
                    title={`${run.model}: ${run.verdict}`}
                  />
                ))}
            </div>
          ) : null}
        </div>

        {onLogRun ? <LogRunForm knownModels={knownModels} onLogRun={onLogRun} /> : null}

        {runs.length > 0 ? (
          <ol aria-label="Runs" className="mt-4 divide-y divide-rule border-t border-rule">
            {runs.map((run) => (
              <li
                className="group grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-3 py-3"
                key={run.id}
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-6 animate-stamp items-center justify-center rounded-[5px] font-mono text-[10px] font-semibold tracking-[0.16em] uppercase shadow-[inset_0_0_0_1.5px_currentColor]',
                    VERDICT_TEXT[run.verdict],
                  )}
                >
                  {run.verdict}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">{run.model}</p>
                  {run.note ? (
                    <p className="mt-0.5 text-[13px] leading-relaxed whitespace-pre-line text-ink-muted">
                      {run.note}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <time className="font-mono text-[10.5px] text-ink-faint" dateTime={run.ranAt}>
                    {formatLongDate(run.ranAt)}
                  </time>
                  {onRemoveRun ? (
                    <Button
                      aria-label={`Remove the ${run.model} run`}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => onRemoveRun(run.id)}
                      size="icon-xs"
                      variant="ghost"
                    >
                      <X aria-hidden="true" className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  )
}

function LogRunForm({
  knownModels,
  onLogRun,
}: {
  knownModels: string[]
  onLogRun: (request: PromptRunRequest) => boolean
}) {
  const id = useId()
  const [model, setModel] = useState(knownModels[0] ?? '')
  const [verdict, setVerdict] = useState<PromptRunVerdict>('pass')
  const [note, setNote] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()

    if (onLogRun({ model, verdict, note })) {
      setNote('')
    }
  }

  return (
    <form
      aria-label="Log a run"
      className="grid gap-2 rounded-2xl bg-paper-sunken/70 p-3 shadow-[inset_0_0_0_1px_var(--rule)] sm:grid-cols-[minmax(0,11rem)_auto_minmax(0,1fr)_auto]"
      onSubmit={submit}
    >
      <label className="sr-only" htmlFor={`${id}-model`}>
        Model
      </label>
      <Input
        id={`${id}-model`}
        list={`${id}-models`}
        onChange={(event) => setModel(event.target.value)}
        placeholder="Model, e.g. claude-opus-5-5"
        value={model}
      />
      <datalist id={`${id}-models`}>
        {knownModels.map((knownModel) => (
          <option key={knownModel} value={knownModel} />
        ))}
      </datalist>

      <ChoiceGroup
        className="flex h-9 items-center gap-0.5 rounded-lg bg-paper-raised p-0.5 shadow-[inset_0_0_0_1px_var(--rule-strong)]"
        label="Verdict"
      >
        {PROMPT_RUN_VERDICTS.map((option) => (
          <Choice
            checked={verdict === option}
            className={cn(
              'inline-flex h-full items-center rounded-md px-2.5 text-[12px] font-medium transition-colors',
              verdict === option
                ? cn(VERDICT_BG[option], 'text-paper')
                : 'text-ink-muted hover:text-ink',
            )}
            key={option}
            label={PROMPT_RUN_VERDICT_LABELS[option]}
            name={`${id}-verdict`}
            onSelect={setVerdict}
            value={option}
          >
            {PROMPT_RUN_VERDICT_LABELS[option]}
          </Choice>
        ))}
      </ChoiceGroup>

      <label className="sr-only" htmlFor={`${id}-note`}>
        Note
      </label>
      <Input
        id={`${id}-note`}
        onChange={(event) => setNote(event.target.value)}
        placeholder="What happened? (optional)"
        value={note}
      />
      <Button type="submit" variant="ink">
        Log run
      </Button>
    </form>
  )
}
