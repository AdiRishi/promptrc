import { Menu, Pin, Plus, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Choice, ChoiceGroup } from '@/components/ui/choice'
import { Kbd } from '@/components/ui/kbd'
import { KindMark } from '@/features/prompt-library/components/kind-mark'
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
  { value: 'created', label: 'Newest' },
  { value: 'used', label: 'Most used' },
  { value: 'title', label: 'A–Z' },
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
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onSelect: (promptId: string) => void
  onQueryChange: (query: string) => void
  onSortChange: (sort: PromptLibrarySort) => void
  onClearFilter: () => void
  onCapture: () => void
  onOpenSidebar: () => void
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
  searchInputRef,
  onSelect,
  onQueryChange,
  onSortChange,
  onClearFilter,
  onCapture,
  onOpenSidebar,
}: PromptListProps) {
  const heading = describePromptLibraryFilter(filter)

  return (
    <section aria-labelledby="prompt-list-heading" className="flex h-full min-h-0 flex-col">
      <header className="px-5 pt-5 pb-3 md:pt-6">
        <div className="mb-4 flex items-start gap-2">
          <Button
            aria-label="Open library navigation"
            className="-ml-2 lg:hidden"
            onClick={onOpenSidebar}
            size="icon-sm"
            variant="ghost"
          >
            <Menu aria-hidden="true" className="size-[18px]" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1
              className="font-display truncate text-[30px] leading-[1.05] text-ink"
              id="prompt-list-heading"
            >
              {filter.type === 'kind' ? (
                <KindMark className="mr-2 text-[0.9em]" kind={filter.kind} label={false} />
              ) : null}
              {heading}
            </h1>
            <p className="label-caps mt-2 text-[10px]">
              {query.trim()
                ? `${prompts.length} of ${totalCount} match`
                : pluralize(prompts.length, 'entry', 'entries')}
            </p>
          </div>
          <Button aria-label="Capture" className="md:hidden" onClick={onCapture} size="icon-sm">
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.4} />
          </Button>
        </div>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-faint"
          />
          <label className="sr-only" htmlFor="prompt-filter">
            Filter entries
          </label>
          <input
            autoComplete="off"
            className="h-9 w-full rounded-lg bg-paper-raised pr-9 pl-8.5 text-[13.5px] text-ink shadow-[inset_0_0_0_1px_var(--rule)] transition-shadow outline-none placeholder:text-ink-faint focus:shadow-[inset_0_0_0_1.5px_var(--vermilion)]"
            id="prompt-filter"
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && prompts[0]) {
                onSelect(prompts[0].id)
                event.currentTarget.blur()
              }
            }}
            placeholder="Filter by words or #tag"
            ref={searchInputRef}
            spellCheck={false}
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear filter"
              className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-ink/5 hover:text-ink"
              onClick={() => onQueryChange('')}
              type="button"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          ) : (
            <Kbd className="absolute top-1/2 right-2 -translate-y-1/2">/</Kbd>
          )}
        </div>

        <ChoiceGroup className="mt-3 flex items-center gap-1" label="Sort entries">
          {SORT_OPTIONS.map((option) => (
            <Choice
              checked={sort === option.value}
              className={cn(
                'inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-medium transition-colors',
                sort === option.value ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink',
              )}
              key={option.value}
              label={`Sort by ${option.label}`}
              name="prompt-sort"
              onSelect={onSortChange}
              value={option.value}
            >
              {option.label}
            </Choice>
          ))}
        </ChoiceGroup>
      </header>

      <div className="scrollbar-quiet min-h-0 flex-1 overflow-y-auto px-2.5 pb-10">
        {isLoading ? <ListSkeleton /> : null}

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
          <ol aria-label={`${heading} entries`} className="flex flex-col gap-0.5" data-prompt-list>
            {prompts.map((prompt, index) => (
              <li
                className="animate-rise"
                key={prompt.id}
                style={{ animationDelay: `${Math.min(index, 12) * 22}ms` }}
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
    </section>
  )
}

type PromptListItemProps = {
  prompt: PromptRecord
  catalogNumber: number | undefined
  active: boolean
  onSelect: (promptId: string) => void
}

function PromptListItem({ prompt, catalogNumber, active, onSelect }: PromptListItemProps) {
  const excerpt = toPlainExcerpt(prompt.body, 150)

  return (
    <button
      aria-current={active ? 'true' : undefined}
      className={cn(
        'group relative w-full rounded-xl px-3.5 py-3 text-left transition-[background-color,box-shadow] duration-150',
        active
          ? 'bg-paper-raised shadow-card ring-1 ring-rule'
          : 'hover:bg-ink/[0.035] dark:hover:bg-white/[0.03]',
      )}
      data-prompt-id={prompt.id}
      onClick={() => onSelect(prompt.id)}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-3.5 bottom-3.5 left-0 w-[2.5px] rounded-full bg-vermilion transition-opacity',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      <span className="mb-1 flex items-center gap-2">
        <KindMark className="text-[15px]" kind={prompt.kind} />
        <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-faint">
          {formatCatalogNumber(catalogNumber)}
        </span>
        <span className="ml-auto flex items-center gap-2 font-mono text-[10.5px] text-ink-faint">
          <ItemSignal prompt={prompt} />
          {prompt.uses > 0 ? <span title="Times copied">×{prompt.uses}</span> : null}
          {prompt.pinned ? (
            <Pin aria-label="Pinned" className="size-3 fill-vermilion text-vermilion" />
          ) : null}
        </span>
      </span>
      <span
        className={cn(
          'font-display block text-[17.5px] leading-[1.25] text-pretty text-ink',
          prompt.kind === 'fragment' && 'italic',
        )}
      >
        {prompt.title}
      </span>
      {excerpt && excerpt !== prompt.title ? (
        <span className="mt-1 line-clamp-2 block text-[12.5px] leading-[1.5] text-ink-muted">
          {excerpt}
        </span>
      ) : null}
      {prompt.tags.length > 0 ? (
        <span className="mt-1.5 flex flex-wrap gap-x-2 font-mono text-[10.5px] text-ink-faint">
          {prompt.tags.slice(0, 4).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </span>
      ) : null}
    </button>
  )
}

/** Kind-specific detail in the item header: step count, or the latest verdicts. */
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
      <span
        aria-label={`${summary.pass} of ${summary.total} runs passed`}
        className="flex gap-[3px]"
      >
        {prompt.runs.slice(0, 6).map((run) => (
          <span
            className={cn(
              'block size-[6px] rounded-full',
              run.verdict === 'pass' && 'bg-verdict-pass',
              run.verdict === 'mixed' && 'bg-verdict-mixed',
              run.verdict === 'fail' && 'bg-verdict-fail',
            )}
            key={run.id}
          />
        ))}
      </span>
    )
  }

  return null
}

function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading library" className="flex flex-col gap-1 px-3.5 pt-2">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className="animate-pulse py-3"
          key={index}
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <div className="mb-2 h-2.5 w-16 rounded-full bg-rule" />
          <div className="mb-2 h-4 w-3/4 rounded-full bg-rule" />
          <div className="h-3 w-full rounded-full bg-rule/70" />
        </div>
      ))}
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
      <div className="px-4 py-10 text-center">
        <p className="font-display text-[20px] text-ink">Nothing matches “{query.trim()}”</p>
        <p className="mt-2 text-[13px] text-ink-muted">Try fewer words, or a #tag.</p>
        <Button className="mt-5" onClick={onClearQuery} size="sm" variant="outline">
          Clear filter
        </Button>
      </div>
    )
  }

  if (reason === 'empty-filter') {
    const kindHint =
      filter.type === 'kind' ? PROMPT_KIND_DEFINITIONS[filter.kind].description : null

    return (
      <div className="px-4 py-10 text-center">
        {filter.type === 'kind' ? (
          <KindMark className="mb-3 text-[44px] opacity-80" kind={filter.kind} label={false} />
        ) : null}
        <p className="font-display text-[20px] text-ink">
          Nothing in {describePromptLibraryFilter(filter)} yet
        </p>
        {kindHint ? (
          <p className="mx-auto mt-2 max-w-[30ch] text-[13px] text-ink-muted">{kindHint}</p>
        ) : null}
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={onCapture} size="sm">
            Capture one
          </Button>
          <Button onClick={onClearFilter} size="sm" variant="outline">
            Show everything
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-12 text-center">
      <p aria-hidden="true" className="font-display mb-3 text-[52px] leading-none text-ink-faint">
        ¶
      </p>
      <p className="font-display text-[22px] text-ink">An empty book</p>
      <p className="mx-auto mt-2 max-w-[30ch] text-[13px] leading-relaxed text-ink-muted">
        The next time a prompt works exactly right, keep it here before it slips away.
      </p>
      <Button className="mt-5" onClick={onCapture} size="sm">
        Capture the first one
      </Button>
    </div>
  )
}
