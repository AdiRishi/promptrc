import {
  ArrowLeft,
  Check,
  Copy,
  CopyPlus,
  Link2,
  Link2Off,
  Pencil,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { Button } from '@/components/ui/button'
import { KeyCombo } from '@/components/ui/kbd'
import { type PromptRunRequest } from '@/features/prompt-library/commands/prompt-library-command-executor'
import { BenchmarkLedger } from '@/features/prompt-library/components/benchmark-ledger'
import { KindBadge, KindMark } from '@/features/prompt-library/components/kind-mark'
import { getPromptKindDefinition } from '@/features/prompt-library/model/prompt-kinds'
import { splitSequenceSteps } from '@/features/prompt-library/model/prompt-sequences'
import { extractFillablePromptVariables } from '@/features/prompt-library/model/prompt-templates'
import {
  PromptBodyMarkdown,
  PromptImageAttachments,
  type PromptImageUrlResolver,
} from '@/features/prompt-library/rendering/prompt-body-markdown'
import {
  countWords,
  estimateTokens,
  formatCatalogNumber,
  formatLongDate,
  pluralize,
  relativeTime,
} from '@/features/prompt-library/rendering/prompt-library-formatting'
import {
  PromptVariableProvider,
  type PromptVariableValues,
} from '@/features/prompt-library/rendering/prompt-variable-slot'
import { type PromptRecord } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

export type PromptCopyHandler = (request?: { stepIndex?: number }) => void | Promise<void>

type PromptReaderActions = {
  canSharePrompts: boolean
  hasActivePromptShare: boolean
  isConfirmingDelete: boolean
  onCopy: PromptCopyHandler
  onEdit: () => void
  onTogglePin: () => void
  onDuplicate: () => void
  onShare: () => void | Promise<void>
  onRevokeShare: () => void | Promise<void>
  onDelete: () => void
  onLogRun: (request: PromptRunRequest) => boolean
  onRemoveRun: (runId: string) => void
}

type PromptReaderProps = PromptReaderActions & {
  prompt: PromptRecord
  catalogNumber: number | undefined
  variableValues: PromptVariableValues
  knownModels: string[]
  onVariableChange: (name: string, value: string) => void
  onResetVariables: () => void
  onSelectTag: (tag: string) => void
  onSelectCategory: (category: string) => void
  onBack?: () => void
}

export function PromptReader({
  prompt,
  catalogNumber,
  variableValues,
  knownModels,
  onVariableChange,
  onResetVariables,
  onSelectTag,
  onSelectCategory,
  onBack,
  ...actions
}: PromptReaderProps) {
  const variables = extractFillablePromptVariables(prompt.body)
  const filledCount = variables.filter((variable) => variableValues[variable.name]?.trim()).length

  return (
    <article aria-labelledby="prompt-reader-title" className="flex h-full min-h-0 flex-col">
      <ReaderToolbar
        catalogNumber={catalogNumber}
        category={prompt.category}
        onBack={onBack}
        onSelectCategory={onSelectCategory}
        prompt={prompt}
        {...actions}
      />

      <div className="scrollbar-quiet min-h-0 flex-1 overflow-y-auto" key={prompt.id}>
        <div className="mx-auto w-full max-w-[46rem] px-6 pt-8 pb-28 md:px-10 md:pt-12">
          <header className="animate-rise">
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <KindBadge kind={prompt.kind} />
              <span className="label-caps text-[10px]">
                Kept {formatLongDate(prompt.createdAt)}
              </span>
              {prompt.uses > 0 ? (
                <span className="label-caps text-[10px]">
                  Used {pluralize(prompt.uses, 'time')}
                </span>
              ) : null}
            </div>

            <h2
              className={cn(
                'font-display text-[clamp(2rem,4.2vw,2.9rem)] leading-[1.04] text-balance text-ink',
                prompt.kind === 'fragment' && 'italic',
              )}
              id="prompt-reader-title"
            >
              {prompt.title}
            </h2>

            {prompt.tags.length > 0 ? (
              <ul aria-label="Tags" className="mt-4 flex flex-wrap gap-1.5">
                {prompt.tags.map((tag) => (
                  <li key={tag}>
                    <button
                      className="h-6 rounded-full px-2.5 font-mono text-[11px] text-ink-muted shadow-[inset_0_0_0_1px_var(--rule)] transition-colors hover:bg-paper-raised hover:text-ink"
                      onClick={() => onSelectTag(tag)}
                      type="button"
                    >
                      #{tag}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          <Ornament />

          <PromptVariableProvider value={{ values: variableValues, onChange: onVariableChange }}>
            {variables.length > 0 ? (
              <BlanksHint
                filledCount={filledCount}
                onReset={onResetVariables}
                total={variables.length}
              />
            ) : null}

            <div className="animate-rise [animation-delay:60ms]">
              <PromptBody onCopy={actions.onCopy} prompt={prompt} />
            </div>
          </PromptVariableProvider>

          <PromptImageAttachments images={prompt.images} />

          {prompt.kind === 'benchmark' ? (
            <BenchmarkLedger
              expected={prompt.notes}
              knownModels={knownModels}
              onLogRun={actions.onLogRun}
              onRemoveRun={actions.onRemoveRun}
              runs={prompt.runs}
            />
          ) : prompt.notes ? (
            <Marginalia label={getPromptKindDefinition(prompt.kind).notesLabel}>
              {prompt.notes}
            </Marginalia>
          ) : null}

          <footer className="mt-14 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule pt-4 font-mono text-[10.5px] tracking-[0.04em] text-ink-faint">
            <span>{formatCatalogNumber(catalogNumber)}</span>
            <span>{pluralize(countWords(prompt.body), 'word')}</span>
            <span title="Rough estimate at about four characters per token">
              ≈{pluralize(estimateTokens(prompt.body), 'token')}
            </span>
            <span title={new Date(prompt.updatedAt).toLocaleString()}>
              Revised {relativeTime(prompt.updatedAt)}
            </span>
          </footer>
        </div>
      </div>
    </article>
  )
}

export function PromptBody({
  prompt,
  onCopy,
  imageUrlFor,
}: {
  prompt: PromptRecord
  onCopy: PromptCopyHandler
  imageUrlFor?: PromptImageUrlResolver
}) {
  if (prompt.kind === 'fragment') {
    return (
      <blockquote className="relative py-2 pl-10">
        <span
          aria-hidden="true"
          className="font-display absolute -top-5 left-0 text-[88px] leading-none text-kind-fragment/80"
        >
          “
        </span>
        <PromptBodyMarkdown
          body={prompt.body}
          className="font-display text-[clamp(1.4rem,2.6vw,1.8rem)] leading-[1.4] text-ink italic"
          imageUrlFor={imageUrlFor}
          images={prompt.images}
        />
      </blockquote>
    )
  }

  if (prompt.kind === 'sequence') {
    return <SequenceSteps imageUrlFor={imageUrlFor} onCopy={onCopy} prompt={prompt} />
  }

  return (
    <div className={cn(prompt.kind === 'benchmark' && 'relative')}>
      {prompt.kind === 'benchmark' ? (
        <p className="label-caps mb-3 text-kind-benchmark">The test</p>
      ) : null}
      <PromptBodyMarkdown body={prompt.body} imageUrlFor={imageUrlFor} images={prompt.images} />
    </div>
  )
}

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii']

function SequenceSteps({
  prompt,
  onCopy,
  imageUrlFor,
}: {
  prompt: PromptRecord
  onCopy: PromptCopyHandler
  imageUrlFor?: PromptImageUrlResolver
}) {
  const steps = splitSequenceSteps(prompt.body)
  const [copied, setCopied] = useState<{ promptId: string; steps: number[] }>({
    promptId: prompt.id,
    steps: [],
  })
  const copiedSteps = copied.promptId === prompt.id ? copied.steps : []

  const copyStep = async (index: number) => {
    await onCopy({ stepIndex: index })
    setCopied({
      promptId: prompt.id,
      steps: copiedSteps.includes(index) ? copiedSteps : [...copiedSteps, index],
    })
  }

  return (
    <ol aria-label="Steps" className="relative flex flex-col gap-4">
      <span
        aria-hidden="true"
        className="absolute top-4 bottom-4 left-[1.15rem] w-px bg-[linear-gradient(to_bottom,var(--kind-sequence)_0_4px,transparent_4px_9px)] bg-[length:1px_9px] opacity-50"
      />
      {steps.map((step, index) => {
        const isCopied = copiedSteps.includes(index)
        const isNext = !isCopied && copiedSteps.length > 0 && index === Math.max(...copiedSteps) + 1

        return (
          <li
            className="relative grid grid-cols-[2.3rem_minmax(0,1fr)] gap-4"
            // A step is identified by its position in the sequence.
            // oxlint-disable-next-line react/no-array-index-key
            key={`${index}-${step.slice(0, 12)}`}
          >
            <span
              className={cn(
                'font-display relative z-10 grid size-[2.3rem] place-items-center rounded-full bg-paper text-[17px] italic shadow-[inset_0_0_0_1px_var(--kind-sequence)] transition-colors',
                isCopied ? 'bg-kind-sequence text-paper' : 'text-kind-sequence',
              )}
            >
              {isCopied ? (
                <Check aria-hidden="true" className="size-4" strokeWidth={2.6} />
              ) : (
                (ROMAN[index] ?? index + 1)
              )}
            </span>
            <div
              className={cn(
                'rounded-2xl bg-paper-raised px-5 py-4 shadow-[inset_0_0_0_1px_var(--rule)] transition-shadow',
                isNext && 'shadow-[inset_0_0_0_1.5px_var(--kind-sequence)]',
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="label-caps text-[10px]">
                  Step {index + 1} of {steps.length}
                  {isNext ? <span className="ml-2 text-kind-sequence">· next</span> : null}
                </span>
                <Button
                  aria-label={`Copy step ${index + 1}`}
                  onClick={() => void copyStep(index)}
                  size="xs"
                  variant={isCopied ? 'ghost' : 'outline'}
                >
                  {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {isCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <PromptBodyMarkdown
                body={step}
                className="text-[16px]"
                imageUrlFor={imageUrlFor}
                images={prompt.images}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function BlanksHint({
  filledCount,
  total,
  onReset,
}: {
  filledCount: number
  total: number
  onReset: () => void
}) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl bg-vermilion-wash/60 px-4 py-2.5 text-[12.5px] text-ink-soft">
      <span className="font-display text-[18px] leading-none text-vermilion italic">fill in</span>
      <span className="flex-1">
        {filledCount === total
          ? 'Every blank is filled. Copying uses your words.'
          : `${filledCount} of ${pluralize(total, 'blank')} filled — type straight into the highlighted gaps.`}
      </span>
      {filledCount > 0 ? (
        <Button onClick={onReset} size="xs" variant="ghost">
          <RotateCcw aria-hidden="true" />
          Clear
        </Button>
      ) : null}
    </div>
  )
}

export function Marginalia({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside className="relative mt-12 pl-6">
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-0 w-[3px] rounded-full bg-vermilion/70"
      />
      <p className="label-caps mb-2 text-vermilion">{label}</p>
      <p className="font-reading text-[16px] leading-[1.65] whitespace-pre-line text-ink-muted italic">
        {children}
      </p>
    </aside>
  )
}

export function Ornament() {
  return (
    <div aria-hidden="true" className="my-8 flex items-center gap-4 text-ink-faint">
      <span className="hairline-x h-px flex-1" />
      <span className="font-display text-[15px]">❦</span>
      <span className="hairline-x h-px flex-1" />
    </div>
  )
}

type ReaderToolbarProps = PromptReaderActions & {
  prompt: PromptRecord
  catalogNumber: number | undefined
  category: string
  onSelectCategory: (category: string) => void
  onBack?: () => void
}

function ReaderToolbar({
  prompt,
  catalogNumber,
  category,
  canSharePrompts,
  hasActivePromptShare,
  isConfirmingDelete,
  onSelectCategory,
  onBack,
  onCopy,
  onEdit,
  onTogglePin,
  onDuplicate,
  onShare,
  onRevokeShare,
  onDelete,
}: ReaderToolbarProps) {
  return (
    <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-rule bg-paper/85 px-3 backdrop-blur-md md:px-5">
      {onBack ? (
        <Button
          aria-label="Back to the list"
          className="md:hidden"
          onClick={onBack}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" className="size-[18px]" />
        </Button>
      ) : null}

      <div className="flex min-w-0 items-center gap-2">
        <KindMark className="text-[16px]" kind={prompt.kind} label={false} />
        <button
          className="label-caps truncate text-[10px] transition-colors hover:text-ink"
          onClick={() => onSelectCategory(category)}
          title={`Show everything in ${category}`}
          type="button"
        >
          {category}
        </button>
        <span aria-hidden="true" className="hidden text-ink-faint sm:inline">
          ·
        </span>
        <span className="hidden font-mono text-[10.5px] whitespace-nowrap text-ink-faint sm:inline">
          {formatCatalogNumber(catalogNumber)}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-0.5">
        <ToolbarButton label={prompt.pinned ? 'Unpin' : 'Pin'} onClick={onTogglePin} shortcut="P">
          {prompt.pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
        </ToolbarButton>
        <ToolbarButton label="Duplicate" onClick={onDuplicate} shortcut="D">
          <CopyPlus aria-hidden="true" />
        </ToolbarButton>
        {canSharePrompts ? (
          <ToolbarButton label="Copy share link" onClick={onShare} shortcut="S">
            <Link2 aria-hidden="true" />
          </ToolbarButton>
        ) : null}
        {canSharePrompts && hasActivePromptShare ? (
          <ToolbarButton label="Revoke share link" onClick={onRevokeShare}>
            <Link2Off aria-hidden="true" />
          </ToolbarButton>
        ) : null}
        <Button
          aria-label={isConfirmingDelete ? 'Press again to delete' : 'Delete'}
          className={cn(!isConfirmingDelete && 'text-ink-muted')}
          onClick={onDelete}
          size={isConfirmingDelete ? 'sm' : 'icon-sm'}
          title="Delete (X twice)"
          variant={isConfirmingDelete ? 'destructive' : 'ghost'}
        >
          <Trash2 aria-hidden="true" />
          {isConfirmingDelete ? 'Press again' : null}
        </Button>

        <span aria-hidden="true" className="mx-1.5 h-5 w-px bg-rule" />

        <Button className="hidden sm:inline-flex" onClick={onEdit} size="sm" variant="outline">
          <Pencil aria-hidden="true" />
          Edit
        </Button>
        <Button
          aria-label="Edit"
          className="sm:hidden"
          onClick={onEdit}
          size="icon-sm"
          variant="outline"
        >
          <Pencil aria-hidden="true" />
        </Button>
        <Button className="ml-1" onClick={() => void onCopy()} size="sm">
          <Copy aria-hidden="true" />
          <span className="hidden sm:inline">Copy</span>
          <KeyCombo
            className="ml-1 hidden opacity-80 lg:inline-flex [&_kbd]:bg-white/15 [&_kbd]:text-primary-foreground [&_kbd]:shadow-none"
            keys={['Mod', 'C']}
          />
        </Button>
      </div>
    </div>
  )
}

function ToolbarButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  onClick: () => void | Promise<void>
  children: ReactNode
}) {
  return (
    <Button
      aria-label={label}
      className="text-ink-muted"
      onClick={() => void onClick()}
      size="icon-sm"
      title={shortcut ? `${label} (${shortcut})` : label}
      variant="ghost"
    >
      {children}
    </Button>
  )
}

export function ReaderPlaceholder({ onCapture }: { onCapture: () => void }) {
  return (
    <div className="grid h-full place-items-center px-8 text-center">
      <div className="animate-fade">
        <p aria-hidden="true" className="font-display text-[120px] leading-none text-rule-strong">
          ¶
        </p>
        <p className="font-display mt-4 text-[22px] text-ink">Nothing open</p>
        <p className="mx-auto mt-2 max-w-[34ch] text-[13.5px] leading-relaxed text-ink-muted">
          Choose an entry from the list, or capture something new while it is still fresh.
        </p>
        <Button className="mt-6" onClick={onCapture} variant="outline">
          Capture
          <KeyCombo keys={['C']} />
        </Button>
      </div>
    </div>
  )
}
