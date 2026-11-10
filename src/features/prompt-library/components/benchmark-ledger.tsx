import { type SubmitEvent, useId, useState } from 'react'

import { Bracketed, Choice, ChoiceGroup } from '@/components/ui/choice'
import { type PromptRunRequest } from '@/features/prompt-library/commands/prompt-library-command-executor'
import { SectionLabel } from '@/features/prompt-library/components/section-label'
import {
  PROMPT_RUN_VERDICTS,
  summarizePromptRuns,
} from '@/features/prompt-library/model/prompt-runs'
import { type PromptRun, type PromptRunVerdict } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

const VERDICT_STYLE: Record<PromptRunVerdict, { mark: string; text: string; label: string }> = {
  pass: { mark: '✓', text: 'text-green', label: 'PASS' },
  mixed: { mark: '≈', text: 'text-yellow', label: 'MIXED' },
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
  const sparkline = runs.toReversed().slice(-32)

  return (
    <section aria-label="Benchmark" className="@container mt-8">
      <SectionLabel>expected</SectionLabel>
      {expected ? (
        <div className="border-l-2 border-kind-benchmark/60 pl-[2ch] text-body whitespace-pre-line text-fg">
          {expected}
        </div>
      ) : (
        <p className="text-fg-dim">
          No rubric yet. Press <span className="text-accent">e</span> and describe what a pass looks
          like.
        </p>
      )}

      <div className="mt-8">
        <SectionLabel>runs</SectionLabel>
      </div>
      <p className="flex flex-wrap items-baseline gap-x-[1ch] text-fg-dim">
        {summary.total ? (
          <>
            <span>
              <span className="font-semibold text-green">{summary.pass}</span> passed
            </span>
            {summary.mixed ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  <span className="font-semibold text-yellow">{summary.mixed}</span> mixed
                </span>
              </>
            ) : null}
            {summary.fail ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  <span className="font-semibold text-red">{summary.fail}</span> failed
                </span>
              </>
            ) : null}
          </>
        ) : (
          <span>No runs yet.</span>
        )}
        {summary.passRate !== null ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{Math.round(summary.passRate * 100)}% pass rate</span>
          </>
        ) : null}
        {sparkline.length > 0 ? (
          <span aria-hidden="true" className="ml-[1ch]">
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
      </p>

      {runs.length > 0 ? (
        <ol aria-label="Runs" className="mt-3 border-t border-line">
          {runs.map((run) => {
            const style = VERDICT_STYLE[run.verdict]

            return (
              <li
                className="group relative grid grid-cols-[2ch_6ch_minmax(0,1fr)_10ch] items-baseline gap-x-[2ch] gap-y-1 border-b border-line py-1.5 @xl:grid-cols-[2ch_6ch_18ch_minmax(0,1fr)_10ch]"
                key={run.id}
              >
                <span aria-hidden="true" className={style.text}>
                  {style.mark}
                </span>
                <span className={cn('text-meta font-semibold tracking-wide', style.text)}>
                  {style.label}
                </span>
                <span className="min-w-0 truncate text-fg">{run.model}</span>
                <span className="min-w-0 [overflow-wrap:anywhere] text-fg-dim @max-xl:col-span-2 @max-xl:col-start-3 @max-xl:row-start-2">
                  {run.note}
                </span>
                <time
                  className="text-right text-meta whitespace-nowrap text-fg-faint tabular-nums @max-xl:col-start-4 @max-xl:row-start-1"
                  dateTime={run.ranAt}
                >
                  {run.ranAt.slice(0, 10)}
                </time>
                {onRemoveRun ? (
                  <button
                    aria-label={`Remove the ${run.model} run`}
                    className="absolute inset-y-0 right-0 bg-bg-raised pl-[2ch] text-meta text-fg-dim opacity-0 group-hover:opacity-100 hover:text-red focus-visible:opacity-100"
                    onClick={() => onRemoveRun(run.id)}
                    type="button"
                  >
                    rm
                  </button>
                ) : null}
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

  const submit = (event: SubmitEvent) => {
    event.preventDefault()

    if (onLogRun({ model, verdict, note })) {
      setNote('')
    }
  }

  return (
    <form aria-label="Log a run" className="mt-3 flex gap-[1ch]" onSubmit={submit}>
      <span aria-hidden="true" className="flex h-8 items-center font-bold text-accent max-md:h-11">
        ❯
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-[2ch]">
          <label className="sr-only" htmlFor={`${id}-model`}>
            Model
          </label>
          <input
            autoComplete="off"
            className={cn(inputClass, 'w-[24ch] max-sm:w-full')}
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

          <ChoiceGroup className="flex items-center" label="Verdict">
            {PROMPT_RUN_VERDICTS.map((option) => (
              <Choice
                checked={verdict === option}
                className={cn(
                  'inline-flex h-6 items-center transition-colors max-md:h-11',
                  verdict === option
                    ? cn('font-semibold', VERDICT_STYLE[option].text)
                    : 'text-fg-dim hover:text-fg',
                )}
                key={option}
                label={`${option[0]?.toUpperCase() ?? ''}${option.slice(1)}`}
                name={`${id}-verdict`}
                onSelect={setVerdict}
                value={option}
              >
                <Bracketed active={verdict === option}>
                  {VERDICT_STYLE[option].mark} {option}
                </Bracketed>
              </Choice>
            ))}
          </ChoiceGroup>
        </div>

        <div className="flex items-center gap-x-[2ch]">
          <label className="sr-only" htmlFor={`${id}-note`}>
            Note
          </label>
          <input
            autoComplete="off"
            className={cn(inputClass, 'min-w-0 flex-1')}
            id={`${id}-note`}
            onChange={(event) => setNote(event.target.value)}
            placeholder="what happened? (optional)"
            value={note}
          />
          <button
            className="-mr-[1ch] inline-flex h-7 shrink-0 items-center gap-[1ch] px-[1ch] text-fg-dim transition-colors hover:bg-bg-hover hover:text-fg max-md:h-11"
            type="submit"
          >
            <span className="text-accent">⏎</span> log run
          </button>
        </div>
      </div>
    </form>
  )
}

const inputClass =
  'h-8 border-b border-line bg-transparent text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-accent max-md:h-11 max-md:text-[16px]'
