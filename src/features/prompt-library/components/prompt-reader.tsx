import { type ReactNode, useState } from 'react'

import { Bracketed } from '@/components/ui/choice'
import { Kbd } from '@/components/ui/kbd'
import { KeyAction, KeyActionBar } from '@/components/ui/key-action'
import { Pane } from '@/components/ui/pane'
import { type PromptRunRequest } from '@/features/prompt-library/commands/prompt-library-command-executor'
import { type PromptViewMode } from '@/features/prompt-library/commands/prompt-library-ex-commands'
import { BenchmarkLedger } from '@/features/prompt-library/components/benchmark-ledger'
import { KindTag } from '@/features/prompt-library/components/kind-mark'
import { SectionLabel } from '@/features/prompt-library/components/section-label'
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
  active?: boolean
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '_')
    .replace(/^[_-]+|[_-]+$/g, '')
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
  active,
  ...actions
}: PromptReaderProps) {
  const variables = extractFillablePromptVariables(prompt.body)
  const filledCount = variables.filter((variable) => variableValues[variable.name]?.trim()).length

  return (
    <Pane
      active={active}
      aria-labelledby="prompt-reader-title"
      aside={<ViewModeToggle mode={viewMode} onChange={onViewModeChange} />}
      className="h-full"
      index={3}
      title={promptPath(prompt)}
    >
      <div
        className="scrollbar-term min-h-0 flex-1 overflow-y-auto outline-none"
        data-pane-focus
        key={prompt.id}
        tabIndex={-1}
      >
        <header className="px-[2ch] pt-5 max-md:pt-4 md:px-[3ch]">
          <div className="measure">
            <h2
              className={cn(
                'voice-title animate-boot text-title text-balance text-fg',
                prompt.kind === 'fragment' && 'voice-note',
              )}
              id="prompt-reader-title"
            >
              {prompt.title}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-x-[2ch] text-meta text-fg-faint">
              <KindTag kind={prompt.kind} />
              <button
                className="transition-colors hover:text-fg"
                onClick={() => onSelectCategory(prompt.category)}
                title={`cd ${prompt.category}`}
                type="button"
              >
                {prompt.category}/
              </button>
              <span className="tabular-nums">{formatCatalogNumber(catalogNumber)}</span>
              {prompt.tags.length > 0 ? (
                <span className="flex flex-wrap gap-x-[1ch]">
                  {prompt.tags.map((tag) => (
                    <button
                      className="text-fg-dim transition-colors hover:text-fg"
                      key={tag}
                      onClick={() => onSelectTag(tag)}
                      type="button"
                    >
                      #{tag}
                    </button>
                  ))}
                </span>
              ) : null}
              {prompt.pinned ? (
                <span className="whitespace-nowrap">
                  <span className="text-yellow">★</span> pinned
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <ReaderActions prompt={prompt} {...actions} />

        <div className="px-[2ch] pt-6 pb-12 max-md:pt-4 md:px-[3ch]">
          <div className="measure">
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

            <footer className="mt-8 flex flex-wrap gap-x-[2ch] border-t border-line pt-3 text-meta text-fg-faint">
              <span>{pluralize(countWords(prompt.body), 'word')}</span>
              <span title="Rough estimate at about four characters per token">
                ~{pluralize(estimateTokens(prompt.body), 'token')}
              </span>
              <span title={new Date(prompt.updatedAt).toLocaleString()}>
                modified {relativeTime(prompt.updatedAt)}
              </span>
              <span title={new Date(prompt.createdAt).toLocaleString()}>
                kept {prompt.createdAt.slice(0, 10)}
              </span>
              {prompt.uses > 0 ? <span>yanked ×{prompt.uses}</span> : null}
            </footer>
          </div>
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
    <fieldset aria-label="View" className="flex items-center">
      {(['rendered', 'raw'] as const).map((option) => (
        <button
          aria-pressed={mode === option}
          className={cn(
            'transition-colors',
            mode === option ? 'text-fg' : 'text-fg-faint hover:text-fg',
          )}
          key={option}
          onClick={() => onChange(option)}
          title="Toggle with r"
          type="button"
        >
          <Bracketed active={mode === option}>{option}</Bracketed>
        </button>
      ))}
    </fieldset>
  )
}

type ReaderActionsProps = Omit<PromptReaderActions, 'onLogRun' | 'onRemoveRun'> & {
  prompt: PromptRecord
}

/** lazygit-style key hints that double as buttons. Yank is the one that leads. */
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
    <div className="mt-4 border-b border-line px-[2ch] pb-3 max-md:mt-2 max-md:pb-2 md:px-[3ch]">
      <KeyActionBar>
        <KeyAction keys={['y']} label="yank" onClick={() => onCopy()} primary />
        <KeyAction keys={['e']} label="edit" onClick={onEdit} />
        <KeyAction keys={['p']} label={prompt.pinned ? 'unpin' : 'pin'} onClick={onTogglePin} />
        <KeyAction keys={['d']} label="dup" onClick={onDuplicate} />
        {canSharePrompts ? <KeyAction keys={['s']} label="share" onClick={onShare} /> : null}
        {canSharePrompts && hasActivePromptShare ? (
          <KeyAction label="unshare" onClick={onRevokeShare} />
        ) : null}
        <KeyAction
          ariaLabel={isConfirmingDelete ? 'Press again to delete' : 'Delete'}
          className={isConfirmingDelete ? 'text-red' : undefined}
          keys={['x']}
          label={isConfirmingDelete ? 'press again to delete' : 'delete'}
          onClick={onDelete}
        />
      </KeyActionBar>
    </div>
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
      <blockquote className="border-l-2 border-kind-fragment pl-[2ch]">
        <PromptBodyMarkdown
          body={prompt.body}
          className="voice-note text-head"
          imageUrlFor={imageUrlFor}
          images={prompt.images}
        />
      </blockquote>
    )
  }

  return (
    <div>
      {prompt.kind === 'benchmark' ? <SectionLabel>test prompt</SectionLabel> : null}
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
    <ol aria-label="Steps" className="flex flex-col gap-8">
      {steps.map((step, index) => {
        const isCopied = copiedSteps.includes(index)
        const isNext = !isCopied && copiedSteps.length > 0 && index === Math.max(...copiedSteps) + 1

        return (
          // A step is identified by its position in the sequence.
          // oxlint-disable-next-line react/no-array-index-key
          <li key={`${index}-${step.slice(0, 12)}`}>
            <div className="mb-2 flex items-center gap-[1ch] text-meta">
              <span
                className={cn('font-semibold', isCopied ? 'text-fg-faint' : 'text-kind-sequence')}
              >
                {isCopied ? '✓' : '»'} Step {index + 1} of {steps.length}
              </span>
              {isNext ? <span className="text-accent">← next</span> : null}
              <span aria-hidden="true" className="h-0 flex-1 border-t border-dashed border-line" />
              <KeyAction
                ariaLabel={`Copy step ${index + 1}`}
                className={cn('-mr-[1ch]', isCopied && 'text-fg-dim')}
                keys={[`:y${index + 1}`]}
                label={isCopied ? 'yanked' : 'yank'}
                onClick={() => copyStep(index)}
              />
            </div>
            <div
              className={cn(
                'border-l-2 pl-[2ch] transition-colors',
                isNext ? 'border-accent' : isCopied ? 'border-line' : 'border-kind-sequence/60',
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
  const done = filledCount === total

  return (
    <p className="mb-5 text-meta text-fg-dim max-md:mb-3">
      <span aria-hidden="true" className={done ? 'text-green' : 'text-fg-faint'}>
        {done ? '●' : '○'}{' '}
      </span>
      {done
        ? `${pluralize(total, 'blank')} filled. Yank copies your words.`
        : `${filledCount} of ${pluralize(total, 'blank')} filled`}
      {done ? null : <span className="max-sm:hidden">. Type into the ‹fields› below.</span>}
      {filledCount > 0 ? (
        <button
          className="ml-[2ch] text-fg-faint underline-offset-2 hover:text-fg hover:underline"
          onClick={onReset}
          type="button"
        >
          clear
        </button>
      ) : null}
    </p>
  )
}

/** Notes read like comments someone left in the margin of the file. */
export function Annotation({ label, children }: { label: string; children: string }) {
  return (
    <aside className="mt-8">
      <SectionLabel>{label.toLowerCase()}</SectionLabel>
      <div className="voice-note border-l-2 border-line pl-[2ch] text-body whitespace-pre-line text-fg-dim">
        {children}
      </div>
    </aside>
  )
}

export function ReaderPlaceholder({
  active,
  onCapture,
}: {
  active?: boolean
  onCapture: () => void
}) {
  return (
    <Pane active={active} className="h-full" index={3} title="[No Name]">
      <div className="flex-1 px-[2ch] pt-5 text-fg-dim md:px-[3ch]">
        <EmptyBufferLine>
          <span className="text-fg">promptrc</span>, nothing open
        </EmptyBufferLine>
        <EmptyBufferLine />
        <EmptyBufferLine>
          Select an entry with <Kbd>j</Kbd> <Kbd>k</Kbd>, or press <Kbd>c</Kbd> to{' '}
          <button className="link" onClick={onCapture} type="button">
            capture
          </button>{' '}
          something new.
        </EmptyBufferLine>
        <EmptyBufferLine />
        <EmptyBufferLine />
      </div>
    </Pane>
  )
}

/**
 * The entry pane while the library loads, like a login banner. It is also what
 * the server sends, so a page read without running the app still says what
 * promptrc is and links to the pages that explain it.
 */
export function ReaderBanner({ active }: { active?: boolean }) {
  return (
    <Pane active={active} className="h-full" index={3} title="[No Name]">
      <div className="flex-1 px-[2ch] pt-5 text-fg-dim md:px-[3ch]">
        <EmptyBufferLine>
          <span className="text-fg">promptrc</span>, a keyboard-first AI prompt manager and library
        </EmptyBufferLine>
        <EmptyBufferLine />
        <EmptyBufferLine>
          Keep the prompts, phrasings, sequences and benchmarks that worked, and get them back in a
          keystroke.
        </EmptyBufferLine>
        <EmptyBufferLine />
        <EmptyBufferLine>
          Read{' '}
          <a className="link" href="/about">
            about promptrc
          </a>
          , the{' '}
          <a className="link" href="/manual">
            manual
          </a>
          , or the{' '}
          <a className="link" href="/guides">
            guides
          </a>
          .
        </EmptyBufferLine>
      </div>
    </Pane>
  )
}

function EmptyBufferLine({ children }: { children?: ReactNode }) {
  return (
    <p className="flex min-h-[1lh] gap-[2ch]">
      <span aria-hidden="true" className="text-line-strong">
        ~
      </span>
      <span>{children}</span>
    </p>
  )
}
