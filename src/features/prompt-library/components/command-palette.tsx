import { Command } from 'cmdk'
import { BookOpen, CornerDownLeft, Hash, Monitor, Moon, Pin, Search, Sun } from 'lucide-react'
import { type ReactNode } from 'react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { KeyCombo } from '@/components/ui/kbd'
import { KindMark } from '@/features/prompt-library/components/kind-mark'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import {
  formatCatalogNumber,
  toPlainExcerpt,
} from '@/features/prompt-library/rendering/prompt-library-formatting'
import { type PromptLibraryFacets } from '@/features/prompt-library/selectors/prompt-library-selectors'
import { type PromptLibraryFilter, type PromptRecord } from '@/features/prompt-library/types'
import { type ThemePreference } from '@/lib/theme'

export type PaletteAction = {
  id: string
  label: string
  keys?: readonly string[]
  icon?: ReactNode
  disabled?: boolean
  run: () => void
}

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompts: PromptRecord[]
  catalogNumbers: Map<string, number>
  facets: PromptLibraryFacets
  actions: PaletteAction[]
  onSelectPrompt: (promptId: string) => void
  onFilter: (filter: PromptLibraryFilter) => void
  onTheme: (preference: ThemePreference) => void
}

const itemClass =
  'group flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-[13.5px] text-ink-soft outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40 data-[selected=true]:bg-ink data-[selected=true]:text-paper'

const groupClass =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[9.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-ink-muted [&_[cmdk-group-heading]]:uppercase'

export function CommandPalette({
  open,
  onOpenChange,
  prompts,
  catalogNumbers,
  facets,
  actions,
  onSelectPrompt,
  onFilter,
  onTheme,
}: CommandPaletteProps) {
  const close = () => onOpenChange(false)
  const run = (callback: () => void) => () => {
    close()
    callback()
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="top-[14vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-[620px]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search and commands</DialogTitle>
        {open ? (
          <Command
            className="flex max-h-[min(560px,70vh)] flex-col"
            filter={(value, search, keywords) => scoreItem(value, search, keywords)}
            label="Search entries and commands"
            loop
          >
            <div className="flex items-center gap-3 border-b border-rule px-4">
              <Search aria-hidden="true" className="size-4 shrink-0 text-ink-faint" />
              <Command.Input
                // The palette exists to be typed into immediately.
                // oxlint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                className="h-14 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-faint"
                placeholder="Search entries, jump to a category, or run a command…"
              />
              <KeyCombo keys={['Esc']} />
            </div>

            <Command.List className="scrollbar-quiet min-h-0 flex-1 overflow-y-auto p-2">
              <Command.Empty className="px-3 py-10 text-center text-[13.5px] text-ink-muted">
                Nothing found. Try fewer words.
              </Command.Empty>

              <Command.Group className={groupClass} heading="Entries">
                {prompts.map((prompt) => (
                  <Command.Item
                    className={`${itemClass} h-auto py-2`}
                    key={prompt.id}
                    keywords={[
                      ...prompt.tags.map((tag) => `#${tag}`),
                      prompt.category,
                      prompt.kind,
                    ]}
                    onSelect={run(() => onSelectPrompt(prompt.id))}
                    value={`${prompt.title} ${toPlainExcerpt(prompt.body, 80)} ${prompt.id}`}
                  >
                    <KindMark
                      className="w-4 text-center text-[17px]"
                      kind={prompt.kind}
                      label={false}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-display block truncate text-[15.5px]">
                        {prompt.title}
                      </span>
                      <span className="block truncate text-[12px] opacity-60">
                        {toPlainExcerpt(prompt.body, 90)}
                      </span>
                    </span>
                    <span className="font-mono text-[10.5px] opacity-50">
                      {formatCatalogNumber(catalogNumbers.get(prompt.id))}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group className={groupClass} heading="Actions">
                {actions.map((action) => (
                  <Command.Item
                    className={itemClass}
                    disabled={action.disabled}
                    key={action.id}
                    onSelect={run(action.run)}
                    value={`action ${action.label}`}
                  >
                    <span className="grid w-4 place-items-center opacity-70 [&_svg]:size-4">
                      {action.icon ?? <CornerDownLeft aria-hidden="true" />}
                    </span>
                    <span className="flex-1">{action.label}</span>
                    {action.keys ? (
                      <KeyCombo
                        className="group-data-[selected=true]:opacity-70"
                        keys={action.keys}
                      />
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group className={groupClass} heading="Go to">
                <Command.Item
                  className={itemClass}
                  onSelect={run(() => onFilter({ type: 'all' }))}
                  value="go everything all"
                >
                  <BookOpen aria-hidden="true" className="size-4 opacity-70" />
                  <span className="flex-1">Everything</span>
                  <Count value={facets.total} />
                </Command.Item>
                <Command.Item
                  className={itemClass}
                  onSelect={run(() => onFilter({ type: 'pinned' }))}
                  value="go pinned"
                >
                  <Pin aria-hidden="true" className="size-4 opacity-70" />
                  <span className="flex-1">Pinned</span>
                  <Count value={facets.pinned} />
                </Command.Item>
                {PROMPT_KINDS.map((kind) => (
                  <Command.Item
                    className={itemClass}
                    key={kind}
                    onSelect={run(() => onFilter({ type: 'kind', kind }))}
                    value={`go kind ${PROMPT_KIND_DEFINITIONS[kind].plural}`}
                  >
                    <KindMark className="w-4 text-center text-[17px]" kind={kind} label={false} />
                    <span className="flex-1">{PROMPT_KIND_DEFINITIONS[kind].plural}</span>
                    <Count value={facets.kinds[kind]} />
                  </Command.Item>
                ))}
                {facets.categories.map((category) => (
                  <Command.Item
                    className={itemClass}
                    key={`category-${category.key}`}
                    onSelect={run(() => onFilter({ type: 'category', category: category.key }))}
                    value={`go category ${category.label}`}
                  >
                    <span aria-hidden="true" className="grid w-4 place-items-center">
                      <span className="size-[7px] rounded-full bg-current opacity-50" />
                    </span>
                    <span className="flex-1">{category.label}</span>
                    <Count value={category.count} />
                  </Command.Item>
                ))}
                {facets.tags.map((tag) => (
                  <Command.Item
                    className={itemClass}
                    key={`tag-${tag.key}`}
                    onSelect={run(() => onFilter({ type: 'tag', tag: tag.key }))}
                    value={`go tag #${tag.key}`}
                  >
                    <Hash aria-hidden="true" className="size-4 opacity-70" />
                    <span className="flex-1 font-mono text-[12.5px]">{tag.label}</span>
                    <Count value={tag.count} />
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group className={groupClass} heading="Appearance">
                <Command.Item
                  className={itemClass}
                  onSelect={run(() => onTheme('light'))}
                  value="theme light paper"
                >
                  <Sun aria-hidden="true" className="size-4 opacity-70" />
                  Light — paper
                </Command.Item>
                <Command.Item
                  className={itemClass}
                  onSelect={run(() => onTheme('dark'))}
                  value="theme dark ink"
                >
                  <Moon aria-hidden="true" className="size-4 opacity-70" />
                  Dark — darkroom
                </Command.Item>
                <Command.Item
                  className={itemClass}
                  onSelect={run(() => onTheme('system'))}
                  value="theme system auto"
                >
                  <Monitor aria-hidden="true" className="size-4 opacity-70" />
                  Match the system
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Count({ value }: { value: number }) {
  return <span className="font-mono text-[11px] tabular-nums opacity-50">{value}</span>
}

/**
 * Every typed word must appear somewhere (title, excerpt, tags, kind, category);
 * titles that start with the query rank first.
 */
function scoreItem(value: string, search: string, keywords: string[] = []) {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean)

  if (terms.length === 0) {
    return 1
  }

  const haystack = `${value} ${keywords.join(' ')}`.toLowerCase()

  if (!terms.every((term) => haystack.includes(term))) {
    return 0
  }

  const lowerValue = value.toLowerCase()

  if (lowerValue.startsWith(search.toLowerCase())) {
    return 1
  }

  return lowerValue.includes(terms[0] ?? '') ? 0.8 : 0.5
}
