import { ArrowLeft } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { Kbd } from '@/components/ui/kbd'
import { Pane } from '@/components/ui/pane'
import { type PromptRunRequest } from '@/features/prompt-library/commands/prompt-library-command-executor'
import { type PromptViewMode } from '@/features/prompt-library/commands/prompt-library-ex-commands'
import { BenchmarkLedger } from '@/features/prompt-library/components/benchmark-ledger'
import { KindMark, KindTag } from '@/features/prompt-library/components/kind-mark'
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
  pluralize,
  relativeTime,
} from '@/features/prompt-library/rendering/prompt-library-formatting'
import { PromptSourceView } from '@/features/prompt-library/rendering/prompt-source-view'
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
  viewMode: PromptViewMode
  variableValues: PromptVariableValues
  knownModels: string[]
  onViewModeChange: (mode: PromptViewMode) => void
  onVariableChange: (name: string, value: string) => void
  onResetVariables: () => void
  onSelectTag: (tag: string) => void
  onSelectCategory: (category: string) => void
  onBack?: () => void
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'untitled'

/** `engineering/bug_hunt.md` — the path the entry would have on disk. */
export const promptPath = (prompt: Pick<PromptRecord, 'category' | 'title'>) =>
  `${slug(prompt.category)}/${slug(prompt.title)}.md`

export function PromptReader({
  prompt,
  catalogNumber,
  viewMode,
  variableValues,
  knownModels,
  onViewModeChange,
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
    <Pane
      aria-labelledby="prompt-reader-title"
      aside={<ViewModeToggle mode={viewMode} onChange={onViewModeChange} />}
      className="h-full"
      index={3}
      title={
        <span className="flex items-center gap-[1ch]">
          <KindMark className="text-[13px]" kind={prompt.kind} label={false} />
          {promptPath(prompt)}
        </span>
      }
    >
      <div
        className="scrollbar-term min-h-0 flex-1 overflow-y-auto outline-none"
        data-pane-focus
        key={prompt.id}
        tabIndex={-1}
      >
        <header className="px-[2ch] pt-4 pb-3">
          <div className="mb-2 flex flex-wrap items-center gap-x-[2ch] gap-y-1 text-[12px] text-fg-faint">
            {onBack ? (
              <button
                className="inline-flex items-center gap-[0.5ch] text-fg-dim hover:text-accent md:hidden"
                onClick={onBack}
                type="button"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                back
              </button>
            ) : null}
            <KindTag kind={prompt.kind} />
            <button
              className="hover:text-accent"
              onClick={() => onSelectCategory(prompt.category)}
              title={`cd ${prompt.category}`}
              type="button"
            >
              ~/{prompt.category.toLowerCase()}/
            </button>
            <span>{formatCatalogNumber(catalogNumber)}</span>
            {prompt.pinned ? <span className="text-accent">★ pinned</span> : null}
          </div>

          <h2
            className={cn(
              'voice-title animate-type-in text-[clamp(1.35rem,2.6vw,1.85rem)] leading-[1.15] text-balance text-fg',
              prompt.kind === 'fragment' && 'voice-note font-semibold',
            )}
            id="prompt-reader-title"
          >
            {prompt.title}
          </h2>

          <div className="mt-2 flex flex-wrap items-center gap-x-[2ch] gap-y-1 text-[12px] text-fg-faint">
            {prompt.tags.map((tag) => (
              <button
                className="text-magenta hover:underline"
                key={tag}
                onClick={() => onSelectTag(tag)}
                type="button"
              >
                #{tag}
              </button>
            ))}
            <span title={new Date(prompt.createdAt).toLocaleString()}>
              kept {prompt.createdAt.slice(0, 10)}
            </span>
            {prompt.uses > 0 ? <span>yanked {prompt.uses}×</span> : null}
          </div>
        </header>

        <ReaderActions prompt={prompt} {...actions} />

        <div className="px-[2ch] pt-4 pb-10">
          <PromptVariableProvider value={{ values: variableValues, onChange: onVariableChange }}>
            {variables.length > 0 ? (
              <BlanksHint
                filledCount={filledCount}
                onReset={onResetVariables}
                total={variables.length}
              />
            ) : null}

            <PromptBody onCopy={actions.onCopy} prompt={prompt} viewMode={viewMode} />
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
            <Annotation label={getPromptKindDefinition(prompt.kind).notesLabel}>
              {prompt.notes}
            </Annotation>
          ) : null}

          <footer className="mt-8 flex flex-wrap gap-x-[2ch] gap-y-1 border-t border-dashed border-line pt-2 text-[11.5px] text-fg-faint">
            <span>{pluralize(countWords(prompt.body), 'word')}</span>
            <span title="Rough estimate at about four characters per token">
              ~{pluralize(estimateTokens(prompt.body), 'token')}
            </span>
            <span title={new Date(prompt.updatedAt).toLocaleString()}>
              modified {relativeTime(prompt.updatedAt)}
            </span>
            <span>utf-8</span>
          </footer>
        </div>
      </div>
    </Pane>
  )
}

export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: PromptViewMode
  onChange: (mode: PromptViewMode) => void
}) {
  return (
    <fieldset aria-label="View" className="flex items-center gap-[1ch]">
      {(['rendered', 'raw'] as const).map((option) => (
        <button
          aria-pressed={mode === option}
          className={cn(
            'transition-colors',
            mode === option ? 'text-accent' : 'text-fg-faint hover:text-fg',
          )}
          key={option}
          onClick={() => onChange(option)}
          title="Toggle with r"
          type="button"
        >
          {mode === option ? `[${option}]` : option}
        </button>
      ))}
    </fieldset>
  )
}

type ReaderActionsProps = Omit<PromptReaderActions, 'onLogRun' | 'onRemoveRun'> & {
  prompt: PromptRecord
}

/** lazygit-style key hints that double as buttons. */
function ReaderActions({
  prompt,
  canSharePrompts,
  hasActivePromptShare,
  isConfirmingDelete,
  onCopy,
  onEdit,
  onTogglePin,
  onDuplicate,
  onShare,
  onRevokeShare,
  onDelete,
}: ReaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-[2ch] gap-y-1.5 border-y border-line bg-bg-sunken/60 px-[2ch] py-1.5 text-[12.5px]">
      <button
        className="inline-flex items-center gap-[1ch] rounded-sm bg-accent px-[1ch] font-semibold text-accent-fg hover:brightness-110"
        onClick={() => void onCopy()}
        type="button"
      >
        <span className="opacity-70">y</span> yank
      </button>
      <KeyAction keyLabel="e" label="edit" onClick={onEdit} />
      <KeyAction keyLabel="p" label={prompt.pinned ? 'unpin' : 'pin'} onClick={onTogglePin} />
      <KeyAction keyLabel="d" label="dup" onClick={onDuplicate} />
      {canSharePrompts ? <KeyAction keyLabel="s" label="share" onClick={onShare} /> : null}
      {canSharePrompts && hasActivePromptShare ? (
        <KeyAction label="unshare" onClick={onRevokeShare} />
      ) : null}
      <KeyAction
        ariaLabel={isConfirmingDelete ? 'Press again to delete' : 'Delete'}
        className={isConfirmingDelete ? 'animate-pulse text-red' : undefined}
        keyLabel="x"
        label={isConfirmingDelete ? 'x again to delete' : 'delete'}
        onClick={onDelete}
      />
    </div>
  )
}

function KeyAction({
  keyLabel,
  label,
  onClick,
  className,
  ariaLabel,
}: {
  keyLabel?: string
  label: string
  onClick: () => void | Promise<void>
  className?: string
  ariaLabel?: string
}) {
  return (
    <button
      aria-label={ariaLabel ?? label}
      className={cn(
        'inline-flex items-center gap-[1ch] text-fg-dim transition-colors hover:text-fg',
        className,
      )}
      onClick={() => void onClick()}
      type="button"
    >
      {keyLabel ? <span className="text-accent">{keyLabel}</span> : null}
      {label}
    </button>
  )
}

export function PromptBody({
  prompt,
  viewMode,
  onCopy,
  imageUrlFor,
}: {
  prompt: PromptRecord
  viewMode: PromptViewMode
  onCopy: PromptCopyHandler
  imageUrlFor?: PromptImageUrlResolver
}) {
  if (prompt.kind === 'sequence') {
    return (
      <SequenceSteps
        imageUrlFor={imageUrlFor}
        onCopy={onCopy}
        prompt={prompt}
        viewMode={viewMode}
      />
    )
  }

  if (viewMode === 'raw') {
    return <PromptSourceView body={prompt.body} imageUrlFor={imageUrlFor} images={prompt.images} />
  }

  if (prompt.kind === 'fragment') {
    return (
      <blockquote className="relative border-l-2 border-magenta py-1 pl-[3ch]">
        <PromptBodyMarkdown
          body={prompt.body}
          className="voice-note text-[16px] leading-[1.6]"
          imageUrlFor={imageUrlFor}
          images={prompt.images}
        />
      </blockquote>
    )
  }

  return (
    <div>
      {prompt.kind === 'benchmark' ? (
        <p className="mb-2 text-[12px] text-cyan">## test prompt</p>
      ) : null}
      <PromptBodyMarkdown body={prompt.body} imageUrlFor={imageUrlFor} images={prompt.images} />
    </div>
  )
}

function SequenceSteps({
  prompt,
  viewMode,
  onCopy,
  imageUrlFor,
}: {
  prompt: PromptRecord
  viewMode: PromptViewMode
  onCopy: PromptCopyHandler
  imageUrlFor?: PromptImageUrlResolver
}) {
  const steps = splitSequenceSteps(prompt.body)
  const [copied, setCopied] = useState<{ promptId: string; steps: number[] }>({
    promptId: prompt.id,
    steps: [],
  })
  const copiedSteps = copied.promptId === prompt.id ? copied.steps : []
  const startLines = steps.reduce<number[]>((starts, _step, index) => {
    starts.push(
      index === 0 ? 1 : (starts[index - 1] ?? 1) + (steps[index - 1]?.split('\n').length ?? 0),
    )
    return starts
  }, [])

  const copyStep = async (index: number) => {
    await onCopy({ stepIndex: index })
    setCopied({
      promptId: prompt.id,
      steps: copiedSteps.includes(index) ? copiedSteps : [...copiedSteps, index],
    })
  }

  return (
    <ol aria-label="Steps" className="flex flex-col gap-4">
      {steps.map((step, index) => {
        const isCopied = copiedSteps.includes(index)
        const isNext = !isCopied && copiedSteps.length > 0 && index === Math.max(...copiedSteps) + 1

        return (
          // A step is identified by its position in the sequence.
          // oxlint-disable-next-line react/no-array-index-key
          <li key={`${index}-${step.slice(0, 12)}`}>
            <div className="mb-1.5 flex items-center gap-[1ch] text-[12px]">
              <span className={cn('font-semibold', isCopied ? 'text-fg-faint' : 'text-green')}>
                {isCopied ? '✓' : '»'} Step {index + 1} of {steps.length}
              </span>
              {isNext ? <span className="text-accent">◂ next</span> : null}
              <span
                aria-hidden="true"
                className="h-0 flex-1 border-t border-dashed border-line-strong"
              />
              <button
                aria-label={`Copy step ${index + 1}`}
                className={cn(
                  'inline-flex items-center gap-[1ch] rounded-sm px-[1ch] transition-colors',
                  isCopied
                    ? 'text-fg-faint hover:text-fg'
                    : 'text-fg-dim hover:bg-bg-hover hover:text-accent',
                )}
                onClick={() => void copyStep(index)}
                type="button"
              >
                <span className="text-accent">:y{index + 1}</span>
                {isCopied ? 'yanked' : 'yank'}
              </button>
            </div>
            <div
              className={cn(
                'border-l-2 pl-[2ch] transition-colors',
                isNext ? 'border-accent' : isCopied ? 'border-line' : 'border-green/60',
                isCopied && 'opacity-60',
              )}
            >
              {viewMode === 'raw' ? (
                <PromptSourceView
                  body={step}
                  imageUrlFor={imageUrlFor}
                  images={prompt.images}
                  startLine={startLines[index]}
                />
              ) : (
                <PromptBodyMarkdown body={step} imageUrlFor={imageUrlFor} images={prompt.images} />
              )}
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
    <div className="mb-4 flex flex-wrap items-center gap-x-[1ch] text-[12px] text-fg-dim">
      <span className="text-accent">{filledCount === total ? '●' : '○'}</span>
      <span>
        {filledCount === total
          ? `${pluralize(total, 'blank')} filled — yank copies your words.`
          : `${filledCount} of ${pluralize(total, 'blank')} filled — type into the ‹fields› below.`}
      </span>
      {filledCount > 0 ? (
        <button
          className="text-fg-faint underline-offset-2 hover:text-accent hover:underline"
          onClick={onReset}
          type="button"
        >
          clear
        </button>
      ) : null}
    </div>
  )
}

/** Notes read like comments someone left in the margin of the file. */
export function Annotation({ label, children }: { label: string; children: string }) {
  return (
    <aside className="mt-8 text-[13px] leading-[1.65]">
      <p className="text-fg-faint"># {label.toLowerCase()}</p>
      <div className="voice-note text-fg-dim">
        {children.split('\n').map((line, index) => (
          // Lines of a note have no identity beyond their order.
          // oxlint-disable-next-line react/no-array-index-key
          <p className="before:mr-[1ch] before:text-fg-faint before:content-['#']" key={index}>
            {line}
          </p>
        ))}
      </div>
    </aside>
  )
}

export function ReaderPlaceholder({ onCapture }: { onCapture: () => void }) {
  return (
    <Pane className="h-full" index={3} title="[No Name]">
      <div className="flex-1 px-[2ch] pt-4 text-[12.5px] leading-[1.9] text-fg-faint">
        <EmptyBufferLine>
          <span className="text-accent">promptrc</span> — nothing open
        </EmptyBufferLine>
        <EmptyBufferLine />
        <EmptyBufferLine>
          select an entry with <Kbd>j</Kbd> <Kbd>k</Kbd>, or press <Kbd>c</Kbd> to{' '}
          <button className="text-accent hover:underline" onClick={onCapture} type="button">
            capture
          </button>{' '}
          something new
        </EmptyBufferLine>
        <EmptyBufferLine>
          <Kbd>:</Kbd> for commands · <Kbd>?</Kbd> for the manual
        </EmptyBufferLine>
        {Array.from({ length: 8 }, (_, index) => (
          <EmptyBufferLine key={index} />
        ))}
      </div>
    </Pane>
  )
}

function EmptyBufferLine({ children }: { children?: ReactNode }) {
  return (
    <p>
      <span className="mr-[1ch] text-blue/70">~</span>
      {children}
    </p>
  )
}
