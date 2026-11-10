import { Command, useCommandState } from 'cmdk'
import { type ReactNode, useState } from 'react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { KeyCombo } from '@/components/ui/kbd'
import { KindMark, KindTag } from '@/features/prompt-library/components/kind-mark'
import { promptPath } from '@/features/prompt-library/components/prompt-reader'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { splitSequenceSteps } from '@/features/prompt-library/model/prompt-sequences'
import { PromptBodyMarkdown } from '@/features/prompt-library/rendering/prompt-body-markdown'
import { formatCatalogNumber } from '@/features/prompt-library/rendering/prompt-library-formatting'
import { type PromptLibraryFacets } from '@/features/prompt-library/selectors/prompt-library-selectors'
import { type PromptLibraryFilter, type PromptRecord } from '@/features/prompt-library/types'
import { COLOR_SCHEMES, type ColorSchemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils'

export type FinderAction = {
  id: string
  label: string
  keys?: readonly string[]
  detail?: string
  disabled?: boolean
  run: () => void
}

type FinderProps = {
  open: boolean
  initialQuery?: string
  onOpenChange: (open: boolean) => void
  prompts: PromptRecord[]
  catalogNumbers: Map<string, number>
  facets: PromptLibraryFacets
  actions: FinderAction[]
  onSelectPrompt: (promptId: string) => void
  /** Changes some parts of the filter; the rest stay. */
  onFilter: (patch: Partial<PromptLibraryFilter>) => void
  onColorScheme: (scheme: ColorSchemePreference) => void
}

type FinderItem =
  | { kind: 'entry'; prompt: PromptRecord }
  | { kind: 'action'; action: FinderAction }
  | {
      kind: 'filter'
      label: string
      /** What typing matches: `@project/`, `#tag`, or the plain label. */
      token: string
      /** The `:` command that does the same, shown in the preview. */
      command: string
      patch: Partial<PromptLibraryFilter>
      count: number
      glyph: ReactNode
    }
  | { kind: 'scheme'; id: ColorSchemePreference; description: string }

const itemClass =
  'flex h-8 cursor-pointer items-center gap-[1ch] px-[2ch] text-fg-dim outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40 data-[selected=true]:bg-bg-sel data-[selected=true]:font-semibold data-[selected=true]:text-fg data-[selected=true]:shadow-[inset_2px_0_0_var(--accent)] max-md:h-11'

const groupClass =
  '[&_[cmdk-group-heading]]:px-[2ch] [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-meta [&_[cmdk-group-heading]]:text-fg-faint'

const entryValue = (prompt: PromptRecord) => `${prompt.title} ${promptPath(prompt)} ${prompt.id}`
const filterValue = (token: string) => `go ${token}`
const actionValue = (label: string) => `> ${label}`
const schemeValue = (id: string) => `> colorscheme ${id}`

/** Telescope for prompts: fuzzy results on the left, a live preview on the right. */
export function Finder({ open, onOpenChange, ...props }: FinderProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="top-[12vh] translate-y-0 gap-0 p-0 sm:max-w-[min(112ch,calc(100%-2rem))] sm:has-[[data-finder-mode=actions]]:max-w-[min(72ch,calc(100%-2rem))]"
        showCloseButton={false}
      >
        <DialogTitle className="pane-title text-meta font-normal text-fg-dim">find</DialogTitle>
        {open ? <FinderBody onClose={() => onOpenChange(false)} {...props} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function FinderBody({
  initialQuery = '',
  prompts,
  catalogNumbers,
  facets,
  actions,
  onSelectPrompt,
  onFilter,
  onColorScheme,
  onClose,
}: Omit<FinderProps, 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const [search, setSearch] = useState(initialQuery)
  const [selected, setSelected] = useState('')
  const run = (callback: () => void) => () => {
    onClose()
    callback()
  }

  // Projects move you; kinds, ★ and tags narrow wherever you are.
  const filters: Array<Extract<FinderItem, { kind: 'filter' }>> = [
    {
      kind: 'filter',
      label: 'everything',
      token: '~ everything',
      command: 'cd ~',
      patch: { project: null, kind: null, pinned: false, tag: null },
      count: facets.total,
      glyph: <span className="text-fg-faint">~</span>,
    },
    ...facets.projects.map((project) => ({
      kind: 'filter' as const,
      label: `${project.label}/`,
      token: `@${project.label}/`,
      command: `cd ${project.label}`,
      patch: { project: project.label, tag: null },
      count: project.count,
      glyph: '@',
    })),
    ...PROMPT_KINDS.map((kind) => ({
      kind: 'filter' as const,
      label: PROMPT_KIND_DEFINITIONS[kind].plural.toLowerCase(),
      token: PROMPT_KIND_DEFINITIONS[kind].plural.toLowerCase(),
      command: PROMPT_KIND_DEFINITIONS[kind].plural.toLowerCase(),
      patch: { kind },
      count: facets.here.kinds[kind],
      glyph: <KindMark kind={kind} label={false} />,
    })),
    {
      kind: 'filter',
      label: 'pinned',
      token: '★ pinned',
      command: 'pinned',
      patch: { pinned: true },
      count: facets.here.pinned,
      glyph: <span className="text-accent">★</span>,
    },
    ...facets.tags.map((tag) => ({
      kind: 'filter' as const,
      label: tag.label,
      token: `#${tag.label}`,
      command: `tag ${tag.label}`,
      patch: { tag: tag.key },
      count: tag.count,
      glyph: '#',
    })),
  ]
  const schemes = [
    { id: 'system' as const, description: 'follow the OS: promptrc or daylight' },
    ...COLOR_SCHEMES,
  ]
  const selectedKey = selected.toLowerCase()
  const selectedPrompt = prompts.find((prompt) => entryValue(prompt).toLowerCase() === selectedKey)
  const selectedFilter = filters.find(
    (item) => filterValue(item.token).toLowerCase() === selectedKey,
  )
  const selectedAction = actions.find(
    (action) => actionValue(action.label).toLowerCase() === selectedKey,
  )
  const selectedScheme = schemes.find(
    (scheme) => schemeValue(scheme.id).toLowerCase() === selectedKey,
  )
  const selectedItem: FinderItem | undefined = selectedPrompt
    ? { kind: 'entry', prompt: selectedPrompt }
    : selectedFilter
      ? selectedFilter
      : selectedAction
        ? { kind: 'action', action: selectedAction }
        : selectedScheme
          ? { kind: 'scheme', id: selectedScheme.id, description: selectedScheme.description }
          : undefined
  const mode = search.startsWith('>')
    ? 'actions'
    : search.startsWith('#') || search.startsWith('@')
      ? 'filters'
      : 'all'

  const entryGroup = (
    <Command.Group className={groupClass} heading="entries">
      {prompts.map((prompt) => (
        <Command.Item
          className={itemClass}
          key={prompt.id}
          keywords={[...prompt.tags.map((tag) => `#${tag}`), `@${prompt.category}`, prompt.kind]}
          onSelect={run(() => onSelectPrompt(prompt.id))}
          value={entryValue(prompt)}
        >
          <KindMark kind={prompt.kind} label={false} />
          <span className="min-w-0 flex-1 truncate">{prompt.title}</span>
          <span className="text-meta font-normal text-fg-faint tabular-nums">
            {formatCatalogNumber(catalogNumbers.get(prompt.id))}
          </span>
        </Command.Item>
      ))}
    </Command.Group>
  )

  return (
    <Command
      className="grid max-h-[min(560px,76dvh)] min-h-[min(280px,76dvh)] grid-rows-[auto_minmax(0,1fr)_auto]"
      data-finder-mode={mode}
      filter={(value, query, keywords) =>
        scoreItem(value, query.replace(/^[>]\s*/, ''), keywords, mode)
      }
      label="Find entries, places and commands"
      loop
      onValueChange={setSelected}
      shouldFilter
      value={selected}
    >
      <div className="flex h-12 items-center gap-[1ch] border-b border-line px-[2ch]">
        <span aria-hidden="true" className="font-bold text-accent">
          ❯
        </span>
        <Command.Input
          // The finder exists to be typed into immediately.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-faint max-md:text-[16px]"
          onValueChange={setSearch}
          placeholder="entries · @projects · #tags · >commands"
          value={search}
        />
      </div>

      <div
        className={cn(
          'grid min-h-0',
          mode !== 'actions' && 'md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]',
        )}
      >
        <Command.List className="scrollbar-term min-h-0 scroll-py-2 overflow-y-auto pb-2">
          <Command.Empty className="px-[2ch] py-6 text-fg-dim">
            No results. Try fewer letters.
          </Command.Empty>

          {mode === 'all' ? entryGroup : null}

          {mode !== 'actions' ? (
            <Command.Group className={groupClass} heading="places">
              {filters.map((item) => (
                <Command.Item
                  className={itemClass}
                  key={item.token}
                  onSelect={run(() => onFilter(item.patch))}
                  value={filterValue(item.token)}
                >
                  <span className="inline-block w-[2ch] shrink-0 text-center text-fg-faint">
                    {item.glyph}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-meta font-normal text-fg-faint tabular-nums">
                    {item.count}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}

          {mode !== 'filters' ? (
            <Command.Group className={groupClass} heading="commands">
              {actions.map((action) => (
                <Command.Item
                  className={itemClass}
                  disabled={action.disabled}
                  key={action.id}
                  onSelect={run(action.run)}
                  value={actionValue(action.label)}
                >
                  <span className="inline-block w-[2ch] shrink-0 text-center text-fg-faint">:</span>
                  <span className="flex-1 truncate">{action.label}</span>
                  {action.keys ? <KeyCombo className="font-normal" keys={action.keys} /> : null}
                </Command.Item>
              ))}
              {schemes.map((scheme) => (
                <Command.Item
                  className={itemClass}
                  key={scheme.id}
                  onSelect={run(() => onColorScheme(scheme.id))}
                  value={schemeValue(scheme.id)}
                >
                  <span className="inline-block w-[2ch] shrink-0 text-center text-fg-faint">:</span>
                  <span className="shrink-0">colorscheme {scheme.id}</span>
                  {mode === 'actions' ? (
                    <span className="min-w-0 flex-1 truncate text-right text-meta font-normal text-fg-faint">
                      {scheme.description}
                    </span>
                  ) : null}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>

        {mode === 'actions' ? null : (
          <div className="hidden min-h-0 border-l border-line md:flex md:flex-col">
            <FinderPreview item={selectedItem} />
          </div>
        )}
      </div>

      <div className="flex h-9 items-center gap-[2ch] border-t border-line px-[2ch] text-meta text-fg-faint">
        <span className="flex items-center gap-[1ch]">
          <KeyCombo keys={['ArrowUp', 'ArrowDown']} /> move
        </span>
        <span className="flex items-center gap-[1ch]">
          <KeyCombo keys={['Enter']} />{' '}
          {selectedItem?.kind === 'entry' ? 'open' : selectedItem?.kind === 'filter' ? 'go' : 'run'}
        </span>
        <span className="flex items-center gap-[1ch]">
          <KeyCombo keys={['Esc']} /> close
        </span>
        <ResultCount />
      </div>
    </Command>
  )
}

function FinderPreview({ item }: { item: FinderItem | undefined }) {
  if (!item) {
    return null
  }

  if (item.kind === 'entry') {
    const { prompt } = item

    return (
      <div className="scrollbar-term min-h-0 flex-1 overflow-y-auto px-[3ch] pt-4 pb-6">
        <div className="flex items-center gap-[2ch] text-meta text-fg-faint">
          <KindTag kind={prompt.kind} />
          <span className="truncate">{promptPath(prompt)}</span>
        </div>
        <p className="voice-title mt-1 mb-4 text-head text-fg">{prompt.title}</p>
        <PromptBodyMarkdown
          // A sequence's steps are split by markers in the source; here a rule stands in.
          body={
            prompt.kind === 'sequence'
              ? splitSequenceSteps(prompt.body).join('\n\n---\n\n')
              : prompt.body
          }
          className="text-ui"
          images={prompt.images}
        />
      </div>
    )
  }

  if (item.kind === 'filter') {
    return (
      <PreviewNote command={item.command}>
        {item.count === 1 ? '1 entry' : `${item.count} entries`}
      </PreviewNote>
    )
  }

  if (item.kind === 'scheme') {
    return <PreviewNote command={`colorscheme ${item.id}`}>{item.description}</PreviewNote>
  }

  return (
    <PreviewNote command={item.action.label}>
      {item.action.detail}
      {item.action.keys ? (
        <span className="mt-2 flex items-center gap-[1ch]">
          <KeyCombo keys={item.action.keys} />
        </span>
      ) : null}
    </PreviewNote>
  )
}

/** How many rows the current query leaves, whatever mix of entries, places and commands. */
function ResultCount() {
  const count = useCommandState((state) => state.filtered.count)

  return (
    <span className="ml-auto tabular-nums max-sm:hidden">
      {count === 1 ? '1 result' : `${count} results`}
    </span>
  )
}

/** What a place or command would do, as the `:` line you could have typed. */
function PreviewNote({ command, children }: { command: string; children: ReactNode }) {
  return (
    <div className="px-[3ch] pt-4">
      <p className="text-fg">
        <span className="text-accent">:</span>
        {command}
      </p>
      <div className="mt-1 text-meta text-fg-faint">{children}</div>
    </div>
  )
}

/**
 * Every typed word must appear (title, path, tags, kind, category); titles that
 * start with the query rank first. `>` narrows to commands, `#`/`@` to places.
 */
function scoreItem(value: string, search: string, keywords: string[] = [], mode: string) {
  const lowerValue = value.toLowerCase()

  if (mode === 'actions' && !lowerValue.startsWith('>')) {
    return 0
  }

  if (mode === 'filters' && !lowerValue.startsWith('go ')) {
    return 0
  }

  const terms = search.toLowerCase().split(/\s+/).filter(Boolean)

  if (terms.length === 0) {
    return 1
  }

  const haystack = `${lowerValue} ${keywords.join(' ').toLowerCase()}`

  if (!terms.every((term) => haystack.includes(term))) {
    return 0
  }

  return lowerValue.startsWith(search.toLowerCase())
    ? 1
    : lowerValue.includes(terms[0] ?? '')
      ? 0.8
      : 0.5
}
