import { ArrowLeft, Menu, Plus, X } from 'lucide-react'

import { Choice, ChoiceGroup } from '@/components/ui/choice'
import { Kbd } from '@/components/ui/kbd'
import { Pane } from '@/components/ui/pane'
import {
  KIND_GLYPHS,
  KIND_TEXT_CLASS,
  KindMark,
} from '@/features/prompt-library/components/kind-mark'
import { PROMPT_KIND_DEFINITIONS } from '@/features/prompt-library/model/prompt-kinds'
import { summarizePromptRuns } from '@/features/prompt-library/model/prompt-runs'
import { splitSequenceSteps } from '@/features/prompt-library/model/prompt-sequences'
import {
  formatCatalogNumber,
  pluralize,
  toPlainExcerpt,
} from '@/features/prompt-library/rendering/prompt-library-formatting'
import {
  type PromptLibraryEmptyReason,
  describePromptLibraryFilter,
} from '@/features/prompt-library/selectors/prompt-library-selectors'
import {
  type PromptLibraryFilter,
  type PromptLibrarySort,
  type PromptRecord,
} from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

const SORT_OPTIONS: Array<{ value: PromptLibrarySort; label: string }> = [
  { value: 'created', label: 'new' },
  { value: 'used', label: 'used' },
  { value: 'title', label: 'a-z' },
]

type PromptListProps = {
  prompts: PromptRecord[]
  totalCount: number
  catalogNumbers: Map<string, number>
  activePromptId: string | null
  filter: PromptLibraryFilter
  sort: PromptLibrarySort
  query: string
  emptyReason: PromptLibraryEmptyReason | null
  isLoading: boolean
  className?: string
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onSelect: (promptId: string) => void
  onQueryChange: (query: string) => void
  onSortChange: (sort: PromptLibrarySort) => void
  onClearFilter: () => void
  onCapture: () => void
  onOpenLibrary: () => void
}

/** The heading for the list, written as the path you'd `ls`. */
export const listPath = (filter: PromptLibraryFilter) => {
  switch (filter.type) {
    case 'all':
      return '~/.promptrc'
    case 'pinned':
      return '~/.promptrc/★pinned'
    case 'kind':
      return `~/.promptrc/${PROMPT_KIND_DEFINITIONS[filter.kind].plural.toLowerCase()}`
    case 'category':
      return `~/.promptrc/${filter.category.toLowerCase()}`
    case 'tag':
      return `~/.promptrc/#${filter.tag}`
  }
}

export function PromptList({
  prompts,
  totalCount,
  catalogNumbers,
  activePromptId,
  filter,
  sort,
  query,
  emptyReason,
  isLoading,
  className,
  searchInputRef,
  onSelect,
  onQueryChange,
  onSortChange,
  onClearFilter,
  onCapture,
  onOpenLibrary,
}: PromptListProps) {
  const heading = describePromptLibraryFilter(filter)

  return (
    <Pane
      aria-labelledby="prompt-list-heading"
      aside={<span>{query.trim() ? `${prompts.length}/${totalCount}` : prompts.length}</span>}
      className={cn('h-full', className)}
      index={2}
      title={<span id="prompt-list-heading">{listPath(filter)}</span>}
    >
      <div className="flex items-center gap-[1ch] px-[1ch] pt-3 lg:hidden">
        <button
          aria-label="Open library navigation"
          className="inline-flex items-center gap-[0.5ch] rounded-sm px-[0.5ch] text-[12px] text-fg-dim hover:bg-bg-hover hover:text-fg"
          onClick={onOpenLibrary}
          type="button"
        >
          <Menu aria-hidden="true" className="size-3.5" />
          [1] library
        </button>
        <button
          aria-label="Capture"
          className="ml-auto inline-flex items-center gap-[0.5ch] rounded-sm bg-accent px-[1ch] text-[12px] font-bold text-accent-fg md:hidden"
          onClick={onCapture}
          type="button"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          capture
        </button>
      </div>

      <div className="px-[1ch] pt-3">
        <label className="flex h-8 items-center gap-[1ch] rounded-sm border border-line bg-bg-sunken px-[1ch] text-[13px] focus-within:border-accent">
          <span className="text-accent">/</span>
          <span className="sr-only">Filter entries</span>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-faint"
            id="prompt-filter"
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && prompts[0]) {
                onSelect(prompts[0].id)
                event.currentTarget.blur()
              }
            }}
            placeholder="grep words or #tag"
            ref={searchInputRef}
            spellCheck={false}
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear filter"
              className="text-fg-faint hover:text-fg"
              onClick={() => onQueryChange('')}
              type="button"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          ) : (
            <Kbd>/</Kbd>
          )}
        </label>

        <div className="mt-1.5 flex items-center gap-[1ch] text-[12px] text-fg-faint">
          <span>sort:</span>
          <ChoiceGroup className="flex items-center gap-[0.5ch]" label="Sort entries">
            {SORT_OPTIONS.map((option) => (
              <Choice
                checked={sort === option.value}
                className={cn(
                  'rounded-sm px-[0.5ch] transition-colors',
                  sort === option.value ? 'bg-bg-sel text-accent' : 'hover:text-fg',
                )}
                key={option.value}
                label={`Sort by ${option.label}`}
                name="prompt-sort"
                onSelect={onSortChange}
                value={option.value}
              >
                {sort === option.value ? `[${option.label}]` : option.label}
              </Choice>
            ))}
          </ChoiceGroup>
          <span className="ml-auto truncate">{heading.toLowerCase()}</span>
        </div>
      </div>

      <div className="scrollbar-term mt-2 min-h-0 flex-1 overflow-y-auto border-t border-line pb-6">
        {isLoading ? <BootLog /> : null}

        {!isLoading && emptyReason ? (
          <ListEmptyState
            filter={filter}
            onCapture={onCapture}
            onClearFilter={onClearFilter}
            onClearQuery={() => onQueryChange('')}
            query={query}
            reason={emptyReason}
          />
        ) : null}

        {!isLoading ? (
          <ol aria-label={`${heading} entries`} data-pane-focus data-prompt-list>
            {prompts.map((prompt, index) => (
              <li
                className="animate-boot"
                key={prompt.id}
                style={{ animationDelay: `${Math.min(index, 16) * 18}ms` }}
              >
                <PromptListItem
                  active={prompt.id === activePromptId}
                  catalogNumber={catalogNumbers.get(prompt.id)}
                  onSelect={onSelect}
                  prompt={prompt}
                />
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </Pane>
  )
}

type PromptListItemProps = {
  prompt: PromptRecord
  catalogNumber: number | undefined
  active: boolean
  onSelect: (promptId: string) => void
}

function PromptListItem({ prompt, catalogNumber, active, onSelect }: PromptListItemProps) {
  const excerpt = toPlainExcerpt(prompt.body, 140)

  return (
    <button
      aria-current={active ? 'true' : undefined}
      className={cn(
        'group relative grid w-full grid-cols-[2ch_minmax(0,1fr)] gap-x-[1ch] border-b border-line/60 py-2 pr-[1.5ch] pl-[1ch] text-left text-[13px] transition-colors',
        active ? 'bg-bg-sel' : 'hover:bg-bg-hover',
      )}
      data-prompt-id={prompt.id}
      onClick={() => onSelect(prompt.id)}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-[2px] bg-accent',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      <KindMark className="mt-[0.15em]" kind={prompt.kind} />
      <span className="min-w-0">
        <span className="flex items-baseline gap-[1ch]">
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              active ? 'font-bold text-accent' : 'text-fg',
              prompt.kind === 'fragment' && 'voice-note',
            )}
          >
            {prompt.title}
          </span>
          <span className="shrink-0 text-[11.5px] text-fg-faint">
            <ItemSignal prompt={prompt} />
            {prompt.uses > 0 ? <span className="ml-[1ch]">×{prompt.uses}</span> : null}
            {prompt.pinned ? (
              <span aria-label="Pinned" className="ml-[1ch] text-accent">
                ★
              </span>
            ) : null}
          </span>
        </span>
        {excerpt && excerpt !== prompt.title ? (
          <span className="mt-0.5 block truncate text-[12px] text-fg-dim">{excerpt}</span>
        ) : null}
        <span className="mt-0.5 flex gap-x-[1ch] truncate text-[11.5px] text-fg-faint">
          <span>{formatCatalogNumber(catalogNumber)}</span>
          <span className="text-blue/80">{prompt.category.toLowerCase()}/</span>
          {prompt.tags.slice(0, 3).map((tag) => (
            <span className="text-magenta/80" key={tag}>
              #{tag}
            </span>
          ))}
        </span>
      </span>
    </button>
  )
}

/** Kind-specific detail: a step count, or the latest verdicts as a mini sparkline. */
function ItemSignal({ prompt }: { prompt: PromptRecord }) {
  if (prompt.kind === 'sequence') {
    return <span>{pluralize(splitSequenceSteps(prompt.body).length, 'step')}</span>
  }

  if (prompt.kind === 'benchmark') {
    const summary = summarizePromptRuns(prompt.runs)

    if (!summary.total) {
      return <span>no runs</span>
    }

    return (
      <span aria-label={`${summary.pass} of ${summary.total} runs passed`}>
        {[...prompt.runs]
          .slice(0, 8)
          .reverse()
          .map((run) => (
            <span
              className={cn(
                run.verdict === 'pass' && 'text-green',
                run.verdict === 'mixed' && 'text-yellow',
                run.verdict === 'fail' && 'text-red',
              )}
              key={run.id}
            >
              {run.verdict === 'pass' ? '█' : run.verdict === 'mixed' ? '▄' : '▁'}
            </span>
          ))}
      </span>
    )
  }

  return null
}

const BOOT_LINES = [
  'mounting ~/.promptrc',
  'reading library index',
  'restoring blanks and pins',
  'warming up the cursor',
]

/** Shown for the moment the library takes to hydrate. */
function BootLog() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading library"
      className="px-[1ch] pt-2 text-[12px] text-fg-dim"
    >
      {BOOT_LINES.map((line, index) => (
        <p className="animate-boot" key={line} style={{ animationDelay: `${index * 120}ms` }}>
          <span className="text-green">[ ok ]</span> {line}
        </p>
      ))}
      <p className="cursor-block mt-1" />
    </div>
  )
}

type ListEmptyStateProps = {
  reason: PromptLibraryEmptyReason
  filter: PromptLibraryFilter
  query: string
  onCapture: () => void
  onClearFilter: () => void
  onClearQuery: () => void
}

function ListEmptyState({
  reason,
  filter,
  query,
  onCapture,
  onClearFilter,
  onClearQuery,
}: ListEmptyStateProps) {
  if (reason === 'no-query-matches') {
    return (
      <div className="px-[1ch] pt-3 text-[12.5px] leading-[1.8]">
        <p className="text-fg-dim">
          <span className="text-fg-faint">$</span> grep -ri &quot;{query.trim()}&quot; ~/.promptrc
        </p>
        <p className="text-red">grep: no matches</p>
        <button className="mt-2 text-accent hover:underline" onClick={onClearQuery} type="button">
          ❯ clear the filter
        </button>
      </div>
    )
  }

  if (reason === 'empty-filter') {
    return (
      <div className="px-[1ch] pt-3 text-[12.5px] leading-[1.8]">
        <p className="text-fg-dim">
          <span className="text-fg-faint">$</span> ls {listPath(filter)}
        </p>
        <p className="text-fg-faint">total 0</p>
        {filter.type === 'kind' ? (
          <p className="mt-2 text-fg-dim">
            <span className={KIND_TEXT_CLASS[filter.kind]}>{KIND_GLYPHS[filter.kind]}</span>{' '}
            {PROMPT_KIND_DEFINITIONS[filter.kind].description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-col items-start gap-1">
          <button className="text-accent hover:underline" onClick={onCapture} type="button">
            ❯ capture one
          </button>
          <button
            className="text-fg-dim hover:text-fg hover:underline"
            onClick={onClearFilter}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="mr-[0.5ch] inline size-3.5" />
            cd ~
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-[1ch] pt-3 text-[12.5px] leading-[1.8]">
      <p className="text-fg-dim">
        <span className="text-fg-faint">$</span> ls ~/.promptrc
      </p>
      <p className="text-fg-faint">total 0</p>
      <p className="mt-2 text-fg-dim">An empty library. The next time something works exactly</p>
      <p className="text-fg-dim">right, keep it here before it slips away.</p>
      <button className="mt-3 text-accent hover:underline" onClick={onCapture} type="button">
        ❯ capture the first one <span className="text-fg-faint">(c)</span>
      </button>
    </div>
  )
}
