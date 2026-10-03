import { type FormEvent, useId, useState } from 'react'

import { Choice, ChoiceGroup } from '@/components/ui/choice'
import { type PromptRunRequest } from '@/features/prompt-library/commands/prompt-library-command-executor'
import {
  PROMPT_RUN_VERDICTS,
  summarizePromptRuns,
} from '@/features/prompt-library/model/prompt-runs'
import { type PromptRun, type PromptRunVerdict } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

const VERDICT_STYLE: Record<PromptRunVerdict, { mark: string; text: string; label: string }> = {
  pass: { mark: '✓', text: 'text-green', label: 'PASS' },
  mixed: { mark: '~', text: 'text-yellow', label: 'MIXED' },
  fail: { mark: '✗', text: 'text-red', label: 'FAIL' },
}

const SPARK_HEIGHT: Record<PromptRunVerdict, string> = {
  pass: '█',
  mixed: '▄',
  fail: '▁',
}

type BenchmarkLedgerProps = {
  expected: string
  runs: PromptRun[]
  knownModels?: string[]
  /** Without handlers the ledger is read-only. */
  onLogRun?: (request: PromptRunRequest) => boolean
  onRemoveRun?: (runId: string) => void
}

/** A benchmark reads like test-runner output: the spec, the runs, the tally. */
export function BenchmarkLedger({
  expected,
  runs,
  knownModels = [],
  onLogRun,
  onRemoveRun,
}: BenchmarkLedgerProps) {
  const summary = summarizePromptRuns(runs)
  const sparkline = [...runs].reverse().slice(-32)

  return (
    <section aria-label="Benchmark" className="mt-8 text-[13px]">
      <p className="mb-1 text-[12px] text-cyan">## expected</p>
      {expected ? (
        <div className="border-l-2 border-cyan/60 pl-[2ch] whitespace-pre-line text-fg">
          {expected}
        </div>
      ) : (
        <p className="text-fg-faint">
          # no rubric yet — <span className="text-accent">e</span>dit and describe what a pass looks
          like
        </p>
      )}

      <p className="mt-6 mb-1 text-[12px] text-cyan">## runs</p>
      <div className="flex flex-wrap items-baseline gap-x-[2ch] gap-y-1">
        <span className="font-bold">
          {summary.total ? (
            <>
              <span className="text-green">{summary.pass} passed</span>
              {summary.mixed ? <span className="text-yellow"> | {summary.mixed} mixed</span> : null}
              {summary.fail ? <span className="text-red"> | {summary.fail} failed</span> : null}
              <span className="font-normal text-fg-faint"> ({summary.total})</span>
            </>
          ) : (
            <span className="font-normal text-fg-faint">no runs yet</span>
          )}
        </span>
        {summary.passRate !== null ? (
          <span className="text-fg-dim">{Math.round(summary.passRate * 100)}% pass rate</span>
        ) : null}
        {sparkline.length > 0 ? (
          <span aria-hidden="true">
            {sparkline.map((run) => (
              <span
                className={VERDICT_STYLE[run.verdict].text}
                key={run.id}
                title={`${run.model}: ${run.verdict}`}
              >
                {SPARK_HEIGHT[run.verdict]}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      {runs.length > 0 ? (
        <ol aria-label="Runs" className="mt-2">
          {runs.map((run) => {
            const style = VERDICT_STYLE[run.verdict]

            return (
              <li
                className="group grid grid-cols-[2ch_6ch_minmax(0,1fr)_auto] gap-x-[1ch] py-0.5"
                key={run.id}
              >
                <span className={style.text}>{style.mark}</span>
                <span className={cn('font-bold', style.text)}>{style.label}</span>
                <span className="min-w-0">
                  <span className="text-fg">{run.model}</span>
                  {run.note ? <span className="text-fg-dim"> — {run.note}</span> : null}
                </span>
                <span className="flex items-center gap-[1ch] text-[11.5px] text-fg-faint">
                  <time dateTime={run.ranAt}>{run.ranAt.slice(0, 10)}</time>
                  {onRemoveRun ? (
                    <button
                      aria-label={`Remove the ${run.model} run`}
                      className="opacity-0 group-hover:opacity-100 hover:text-red focus-visible:opacity-100"
                      onClick={() => onRemoveRun(run.id)}
                      type="button"
                    >
                      rm
                    </button>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ol>
      ) : null}

      {onLogRun ? <LogRunForm knownModels={knownModels} onLogRun={onLogRun} /> : null}
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
      className="mt-3 flex flex-wrap items-center gap-x-[1.5ch] gap-y-2 rounded-sm border border-dashed border-line-strong px-[1.5ch] py-2 text-[12.5px]"
      onSubmit={submit}
    >
      <span className="text-accent">❯ log</span>
      <label className="sr-only" htmlFor={`${id}-model`}>
        Model
      </label>
      <input
        autoComplete="off"
        className="w-[22ch] border-b border-line-strong bg-transparent text-fg outline-none placeholder:text-fg-faint focus:border-accent"
        id={`${id}-model`}
        list={`${id}-models`}
        onChange={(event) => setModel(event.target.value)}
        placeholder="model"
        spellCheck={false}
        value={model}
      />
      <datalist id={`${id}-models`}>
        {knownModels.map((knownModel) => (
          <option key={knownModel} value={knownModel} />
        ))}
      </datalist>

      <ChoiceGroup className="flex items-center gap-[0.5ch]" label="Verdict">
        {PROMPT_RUN_VERDICTS.map((option) => (
          <Choice
            checked={verdict === option}
            className={cn(
              'rounded-sm px-[0.75ch] transition-colors',
              verdict === option
                ? cn('bg-bg-hover font-bold', VERDICT_STYLE[option].text)
                : 'text-fg-faint hover:text-fg',
            )}
            key={option}
            label={`${option[0]?.toUpperCase() ?? ''}${option.slice(1)}`}
            name={`${id}-verdict`}
            onSelect={setVerdict}
            value={option}
          >
            {VERDICT_STYLE[option].mark} {option}
          </Choice>
        ))}
      </ChoiceGroup>

      <label className="sr-only" htmlFor={`${id}-note`}>
        Note
      </label>
      <input
        autoComplete="off"
        className="min-w-[16ch] flex-1 border-b border-line-strong bg-transparent text-fg outline-none placeholder:text-fg-faint focus:border-accent"
        id={`${id}-note`}
        onChange={(event) => setNote(event.target.value)}
        placeholder="what happened? (optional)"
        value={note}
      />
      <button
        className="rounded-sm border border-line-strong px-[1ch] text-fg-dim transition-colors hover:border-accent hover:text-accent"
        type="submit"
      >
        ⏎ Log run
      </button>
    </form>
  )
}
