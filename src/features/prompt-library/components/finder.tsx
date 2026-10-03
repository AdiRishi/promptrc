import { Command } from 'cmdk'
import { type ReactNode, useState } from 'react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { KeyCombo } from '@/components/ui/kbd'
import {
  KIND_GLYPHS,
  KIND_TEXT_CLASS,
  KindTag,
} from '@/features/prompt-library/components/kind-mark'
import { promptPath } from '@/features/prompt-library/components/prompt-reader'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { formatCatalogNumber } from '@/features/prompt-library/rendering/prompt-library-formatting'
import { PromptSourceView } from '@/features/prompt-library/rendering/prompt-source-view'
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
  onFilter: (filter: PromptLibraryFilter) => void
  onColorScheme: (scheme: ColorSchemePreference) => void
}

type FinderItem =
  | { kind: 'entry'; prompt: PromptRecord }
  | { kind: 'action'; action: FinderAction }
  | { kind: 'filter'; label: string; filter: PromptLibraryFilter; count: number; glyph?: ReactNode }
  | { kind: 'scheme'; id: ColorSchemePreference; description: string }

const itemClass =
  'flex h-7 cursor-pointer items-center gap-[1ch] rounded-sm px-[1ch] text-[13px] text-fg-dim outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-35 data-[selected=true]:bg-bg-sel data-[selected=true]:text-fg'

const groupClass =
  '[&_[cmdk-group-heading]]:px-[1ch] [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-0.5 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:text-cyan'

const entryValue = (prompt: PromptRecord) => `${prompt.title} ${promptPath(prompt)} ${prompt.id}`
const filterValue = (label: string) => `go ${label}`
const actionValue = (label: string) => `> ${label}`
const schemeValue = (id: string) => `> colorscheme ${id}`

/** Telescope for prompts: fuzzy results on the left, a live preview on the right. */
export function Finder({ open, onOpenChange, ...props }: FinderProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="top-[10vh] translate-y-0 gap-0 overflow-visible p-0 sm:max-w-[min(1040px,calc(100%-2rem))]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Find</DialogTitle>
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

  const filters: Array<Extract<FinderItem, { kind: 'filter' }>> = [
    { kind: 'filter', label: '~/.promptrc', filter: { type: 'all' }, count: facets.total },
    { kind: 'filter', label: '★ pinned', filter: { type: 'pinned' }, count: facets.pinned },
    ...PROMPT_KINDS.map((kind) => ({
      kind: 'filter' as const,
      label: PROMPT_KIND_DEFINITIONS[kind].plural.toLowerCase(),
      filter: { type: 'kind' as const, kind },
      count: facets.kinds[kind],
      glyph: <span className={KIND_TEXT_CLASS[kind]}>{KIND_GLYPHS[kind]}</span>,
    })),
    ...facets.categories.map((category) => ({
      kind: 'filter' as const,
      label: `@${category.label.toLowerCase()}/`,
      filter: { type: 'category' as const, category: category.key },
      count: category.count,
    })),
    ...facets.tags.map((tag) => ({
      kind: 'filter' as const,
      label: `#${tag.label}`,
      filter: { type: 'tag' as const, tag: tag.key },
      count: tag.count,
    })),
  ]
  const schemes = [
    { id: 'system' as const, description: 'follow the OS: promptrc or daylight' },
    ...COLOR_SCHEMES,
  ]
  const selectedKey = selected.toLowerCase()
  const selectedPrompt = prompts.find((prompt) => entryValue(prompt).toLowerCase() === selectedKey)
  const selectedFilter = filters.find(
    (item) => filterValue(item.label).toLowerCase() === selectedKey,
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
          className={cn(itemClass, 'h-auto min-h-7 py-0.5')}
          key={prompt.id}
          keywords={[...prompt.tags.map((tag) => `#${tag}`), `@${prompt.category}`, prompt.kind]}
          onSelect={run(() => onSelectPrompt(prompt.id))}
          value={entryValue(prompt)}
        >
          <span className={cn('w-[1ch]', KIND_TEXT_CLASS[prompt.kind])}>
            {KIND_GLYPHS[prompt.kind]}
          </span>
          <span className="min-w-0 flex-1 truncate">{prompt.title}</span>
          <span className="text-[11.5px] text-fg-faint">
            {formatCatalogNumber(catalogNumbers.get(prompt.id))}
          </span>
        </Command.Item>
      ))}
    </Command.Group>
  )

  return (
    <Command
      className="grid h-[min(620px,78vh)] grid-rows-[auto_minmax(0,1fr)_auto]"
      filter={(value, query, keywords) =>
        scoreItem(value, query.replace(/^[>]\s*/, ''), keywords, mode)
      }
      label="Find entries, places and commands"
      loop
      onValueChange={setSelected}
      shouldFilter
      value={selected}
    >
      <div className="relative flex items-center gap-[1ch] border-b border-line px-[2ch] pt-4 pb-2.5">
        <span className="pane-title text-accent">find</span>
        <span className="text-accent">❯</span>
        <Command.Input
          // The finder exists to be typed into immediately.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-faint"
          onValueChange={setSearch}
          placeholder="entries · #tags · @categories · >commands"
          value={search}
        />
        <KeyCombo keys={['Esc']} />
      </div>

      <div className="grid min-h-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Command.List className="scrollbar-term min-h-0 overflow-y-auto p-1.5">
          <Command.Empty className="px-[1ch] py-6 text-[13px] text-fg-faint">
            0 results — try fewer letters
          </Command.Empty>

          {mode === 'all' ? entryGroup : null}

          {mode !== 'actions' ? (
            <Command.Group className={groupClass} heading="places">
              {filters.map((item) => (
                <Command.Item
                  className={itemClass}
                  key={item.label}
                  onSelect={run(() => onFilter(item.filter))}
                  value={filterValue(item.label)}
                >
                  <span className="w-[1ch]">
                    {item.glyph ?? <span className="text-blue">▸</span>}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-[11.5px] text-fg-faint tabular-nums">{item.count}</span>
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
                  <span className="w-[1ch] text-accent">:</span>
                  <span className="flex-1 truncate">{action.label}</span>
                  {action.keys ? <KeyCombo keys={action.keys} /> : null}
                </Command.Item>
              ))}
              {schemes.map((scheme) => (
                <Command.Item
                  className={itemClass}
                  key={scheme.id}
                  onSelect={run(() => onColorScheme(scheme.id))}
                  value={schemeValue(scheme.id)}
                >
                  <span className="w-[1ch] text-accent">◐</span>
                  <span className="flex-1 truncate">colorscheme {scheme.id}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>

        <div className="relative hidden min-h-0 border-l border-line md:flex md:flex-col">
          <span className="pane-title -top-px text-fg-faint">preview</span>
          <FinderPreview item={selectedItem} />
        </div>
      </div>

      <div className="flex items-center gap-[2ch] border-t border-line bg-bg-sunken/60 px-[2ch] py-1.5 text-[11.5px] text-fg-faint">
        <span className="flex items-center gap-[1ch]">
          <KeyCombo keys={['ArrowUp', 'ArrowDown']} /> move
        </span>
        <span className="flex items-center gap-[1ch]">
          <KeyCombo keys={['Enter']} /> open
        </span>
        <span className="ml-auto">{prompts.length} entries indexed</span>
      </div>
    </Command>
  )
}

function FinderPreview({ item }: { item: FinderItem | undefined }) {
  if (!item) {
    return <p className="px-[2ch] pt-4 text-[12.5px] text-fg-faint">~</p>
  }

  if (item.kind === 'entry') {
    const { prompt } = item
    const lines = prompt.body.split('\n')

    return (
      <div className="scrollbar-term min-h-0 flex-1 overflow-y-auto px-[2ch] pt-4 pb-4">
        <div className="mb-2 flex items-center gap-[2ch] text-[12px] text-fg-faint">
          <KindTag kind={prompt.kind} />
          <span>{promptPath(prompt)}</span>
        </div>
        <p className="voice-title mb-3 text-[17px] text-fg">{prompt.title}</p>
        <PromptSourceView body={lines.slice(0, 60).join('\n')} images={prompt.images} />
        {lines.length > 60 ? (
          <p className="mt-1 text-[12px] text-fg-faint">… {lines.length - 60} more lines</p>
        ) : null}
      </div>
    )
  }

  if (item.kind === 'filter') {
    return (
      <div className="px-[2ch] pt-4 text-[12.5px] leading-[1.8] text-fg-dim">
        <p>
          <span className="text-fg-faint">$</span> cd {item.label}
        </p>
        <p className="text-fg-faint">{item.count} entries</p>
      </div>
    )
  }

  if (item.kind === 'scheme') {
    return (
      <div className="px-[2ch] pt-4 text-[12.5px] leading-[1.8] text-fg-dim">
        <p>
          <span className="text-accent">:</span>colorscheme {item.id}
        </p>
        <p className="text-fg-faint"># {item.description}</p>
      </div>
    )
  }

  return (
    <div className="px-[2ch] pt-4 text-[12.5px] leading-[1.8] text-fg-dim">
      <p>
        <span className="text-accent">:</span>
        {item.action.label}
      </p>
      {item.action.detail ? <p className="text-fg-faint"># {item.action.detail}</p> : null}
      {item.action.keys ? (
        <p className="mt-1 flex items-center gap-[1ch] text-fg-faint">
          key <KeyCombo keys={item.action.keys} />
        </p>
      ) : null}
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
