import { Bracketed, Choice, ChoiceGroup } from '@/components/ui/choice'
import { Pane } from '@/components/ui/pane'
import { KindMark } from '@/features/prompt-library/components/kind-mark'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { summarizePromptRuns } from '@/features/prompt-library/model/prompt-runs'
import { splitSequenceSteps } from '@/features/prompt-library/model/prompt-sequences'
import {
  formatCatalogNumber,
  pluralize,
  toPlainExcerpt,
} from '@/features/prompt-library/rendering/prompt-library-formatting'
import {
  type PromptLibraryEmptyReason,
  type PromptLibraryFacets,
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
  /** Counts inside the current Project, for the kind and ★ toggles. */
  counts: PromptLibraryFacets['here']
  sort: PromptLibrarySort
  query: string
  emptyReason: PromptLibraryEmptyReason | null
  isLoading: boolean
  active: boolean
  className?: string
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onSelect: (promptId: string) => void
  onQueryChange: (query: string) => void
  onSortChange: (sort: PromptLibrarySort) => void
  onClearFilter: () => void
  onFilterChange: (patch: Partial<PromptLibraryFilter>) => void
  onCapture: () => void
}

/**
 * The heading for the list, written as the path you'd `ls`: the Project, then
 * whatever narrows it — `~/.promptrc/render-md/sequences/★/#review`.
 */
export const listPath = (filter: PromptLibraryFilter) => {
  return [
    '~/.promptrc',
    filter.project,
    filter.kind ? PROMPT_KIND_DEFINITIONS[filter.kind].plural.toLowerCase() : null,
    filter.pinned ? '★' : null,
    filter.tag ? `#${filter.tag}` : null,
  ]
    .filter(Boolean)
    .join('/')
}

export function PromptList({
  prompts,
  totalCount,
  catalogNumbers,
  activePromptId,
  filter,
  counts,
  sort,
  query,
  emptyReason,
  isLoading,
  active,
  className,
  searchInputRef,
  onSelect,
  onQueryChange,
  onSortChange,
  onClearFilter,
  onFilterChange,
  onCapture,
}: PromptListProps) {
  const heading = describePromptLibraryFilter(filter)

  return (
    <Pane
      active={active}
      aria-labelledby="prompt-list-heading"
      aside={
        <>
          {/* A phone has no `c` key to press. */}
          <button className="text-accent md:hidden" onClick={onCapture} type="button">
            + capture
          </button>
          <span className="max-md:hidden">
            {query.trim() ? `${prompts.length}/${totalCount}` : prompts.length}
          </span>
        </>
      }
      className={cn('h-full', className)}
      index={2}
      title={<span id="prompt-list-heading">{listPath(filter)}</span>}
    >
      <div className="px-[2ch] pt-4">
        <FilterToggles counts={counts} filter={filter} onFilterChange={onFilterChange} />
        <label className="mt-2 flex h-8 items-center gap-[1ch] border border-line bg-bg-sunken px-[1ch] transition-colors focus-within:border-accent max-md:h-11">
          <span aria-hidden="true" className="text-fg-faint">
            /
          </span>
          <span className="sr-only">Filter entries</span>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-faint max-md:text-[16px]"
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
              className="px-[0.5ch] text-fg-faint transition-colors hover:text-fg"
              onClick={() => onQueryChange('')}
              type="button"
            >
              <span aria-hidden="true">✕</span>
            </button>
          ) : null}
        </label>

        <div className="mt-2 flex items-center text-meta text-fg-faint max-md:mt-0">
          <span className="mr-[1ch]">sort</span>
          <ChoiceGroup className="flex items-center" label="Sort entries">
            {SORT_OPTIONS.map((option) => (
              <Choice
                checked={sort === option.value}
                className={cn(
                  'inline-flex items-center transition-colors max-md:h-11',
                  sort === option.value ? 'text-fg' : 'hover:text-fg',
                )}
                key={option.value}
                label={`Sort by ${option.label}`}
                name="prompt-sort"
                onSelect={onSortChange}
                value={option.value}
              >
                <Bracketed active={sort === option.value}>{option.label}</Bracketed>
              </Choice>
            ))}
          </ChoiceGroup>
        </div>
      </div>

      <div className="scrollbar-term mt-2 min-h-0 flex-1 scroll-py-14 overflow-y-auto border-t border-line pb-4">
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
                style={{ animationDelay: `${Math.min(index, 16) * 12}ms` }}
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
        'grid w-full grid-cols-[2ch_minmax(0,1fr)] gap-x-[1ch] border-b border-line/60 px-[2ch] py-1.5 text-left -outline-offset-2 transition-colors max-md:py-2.5',
        active ? 'row-selected' : 'hover:bg-bg-hover',
      )}
      data-prompt-id={prompt.id}
      onClick={() => onSelect(prompt.id)}
      type="button"
    >
      <KindMark kind={prompt.kind} />
      <span className="min-w-0">
        <span className="flex items-baseline gap-[1ch]">
          <span
            className={cn('min-w-0 flex-1 truncate', active ? 'font-semibold text-fg' : 'text-fg')}
          >
            {prompt.title}
          </span>
          <span className="shrink-0 text-meta text-fg-faint tabular-nums">
            <ItemSignal prompt={prompt} />
          </span>
          {/* Every row keeps the slot, so the facts beside it share one right edge. */}
          <span className="w-[2ch] shrink-0 text-right text-meta text-yellow">
            {prompt.pinned ? <span aria-label="Pinned">★</span> : null}
          </span>
        </span>
        {/* Beside the reader the excerpt repeats it; on a phone the list stands alone. */}
        {excerpt && excerpt !== prompt.title ? (
          <span className="block truncate text-meta text-fg-dim md:hidden">{excerpt}</span>
        ) : null}
        <span className="flex gap-x-[1ch] text-meta text-fg-faint">
          <span className="shrink-0 tabular-nums">{formatCatalogNumber(catalogNumber)}</span>
          <span className="shrink-0 text-fg-dim">{prompt.category}/</span>
          <span className="min-w-0 flex-1 truncate">
            {prompt.tags.map((tag) => `#${tag}`).join(' ')}
          </span>
        </span>
      </span>
    </button>
  )
}

/** The one fact worth a glance: steps, the latest verdicts, or how often it was yanked. */
function ItemSignal({ prompt }: { prompt: PromptRecord }) {
  if (prompt.kind === 'sequence') {
    return pluralize(splitSequenceSteps(prompt.body).length, 'step')
  }

  if (prompt.kind === 'benchmark') {
    const summary = summarizePromptRuns(prompt.runs)

    if (!summary.total) {
      return 'no runs'
    }

    return (
      <span aria-label={`${summary.pass} of ${summary.total} runs passed`}>
        {prompt.runs
          .slice(0, 8)
          .toReversed()
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

  return prompt.uses > 0 ? `×${prompt.uses}` : null
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
      className="px-[2ch] pt-4 text-meta text-fg-dim"
    >
      {BOOT_LINES.map((line, index) => (
        <p className="animate-boot" key={line} style={{ animationDelay: `${index * 120}ms` }}>
          <span className="text-green">[ ok ]</span> {line}
        </p>
      ))}
      <p className="cursor-block cursor-blink mt-1" />
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
      <div className="px-[2ch] pt-4">
        <p className="text-meta text-fg-faint">
          $ grep -ri &quot;{query.trim()}&quot; {listPath(filter)}
        </p>
        <p className="mt-2 text-fg-dim">No entries match “{query.trim()}”.</p>
        <button className="link mt-3" onClick={onClearQuery} type="button">
          Clear the filter
        </button>
      </div>
    )
  }

  if (reason === 'empty-filter') {
    return (
      <div className="px-[2ch] pt-4">
        <p className="text-meta text-fg-faint">$ ls {listPath(filter)}</p>
        <p className="mt-2 text-fg-dim">Nothing here yet.</p>
        {filter.kind ? (
          <p className="mt-1 flex gap-[1ch] text-fg-dim">
            <KindMark kind={filter.kind} label={false} />
            {PROMPT_KIND_DEFINITIONS[filter.kind].description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-col items-start gap-1">
          <button className="link" onClick={onCapture} type="button">
            Capture one
          </button>
          <button
            className="text-fg-dim hover:text-fg hover:underline"
            onClick={onClearFilter}
            type="button"
          >
            <span aria-hidden="true">← </span>
            {filter.kind || filter.pinned || filter.tag
              ? `show all of ${filter.project ?? '~'}`
              : 'cd ~'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-[2ch] pt-4">
      <p className="text-meta text-fg-faint">$ ls ~/.promptrc</p>
      <p className="mt-2 text-fg-dim">
        An empty library. The next time something works exactly right, keep it here before it slips
        away.
      </p>
      <button className="link mt-3" onClick={onCapture} type="button">
        Capture the first one
      </button>
    </div>
  )
}

const toggleClass = (active: boolean, empty: boolean) =>
  cn(
    'inline-flex h-6 items-center tabular-nums transition-colors max-md:h-11',
    active
      ? 'font-semibold text-fg'
      : empty
        ? 'text-fg-faint hover:text-fg'
        : 'text-fg-dim hover:text-fg',
  )

/**
 * Kind and ★ narrow the current Project; they stack with it rather than
 * replace it. Pressing the active toggle again lets it go.
 */
function FilterToggles({
  filter,
  counts,
  onFilterChange,
}: {
  filter: PromptLibraryFilter
  counts: PromptLibraryFacets['here']
  onFilterChange: (patch: Partial<PromptLibraryFilter>) => void
}) {
  return (
    <div
      aria-label="Narrow the list"
      className="-mx-[1ch] flex flex-wrap items-center text-meta"
      role="toolbar"
    >
      <button
        aria-pressed={filter.kind === null}
        className={toggleClass(filter.kind === null, false)}
        onClick={() => onFilterChange({ kind: null })}
        type="button"
      >
        <Bracketed active={filter.kind === null}>
          all <span className="ml-[1ch] font-normal text-fg-faint">{counts.total}</span>
        </Bracketed>
      </button>
      {PROMPT_KINDS.map((kind) => {
        const active = filter.kind === kind

        return (
          <button
            aria-label={`${PROMPT_KIND_DEFINITIONS[kind].plural} (${counts.kinds[kind]})`}
            aria-pressed={active}
            className={toggleClass(active, counts.kinds[kind] === 0)}
            key={kind}
            onClick={() => onFilterChange({ kind: active ? null : kind })}
            title={PROMPT_KIND_DEFINITIONS[kind].plural}
            type="button"
          >
            <Bracketed active={active}>
              <KindMark className="w-[1ch]" kind={kind} label={false} />
              <span className="ml-[1ch] font-normal text-fg-faint">{counts.kinds[kind]}</span>
            </Bracketed>
          </button>
        )
      })}
      <button
        aria-label={`Pinned (${counts.pinned})`}
        aria-pressed={filter.pinned}
        className={toggleClass(filter.pinned, counts.pinned === 0)}
        onClick={() => onFilterChange({ pinned: !filter.pinned })}
        type="button"
      >
        <Bracketed active={filter.pinned}>
          <span className="text-yellow">★</span>
          <span className="ml-[1ch] font-normal text-fg-faint">{counts.pinned}</span>
        </Bracketed>
      </button>
      {filter.tag ? (
        <button
          aria-label={`Stop filtering by #${filter.tag}`}
          className="ml-auto inline-flex h-6 items-center gap-[1ch] px-[1ch] text-fg transition-colors hover:text-accent max-md:h-11"
          onClick={() => onFilterChange({ tag: null })}
          type="button"
        >
          #{filter.tag}
          <span aria-hidden="true">✕</span>
        </button>
      ) : null}
    </div>
  )
}
