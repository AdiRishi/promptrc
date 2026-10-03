import { Show, UserButton } from '@clerk/tanstack-react-start'
import { type ReactNode } from 'react'
import { FaGithub } from 'react-icons/fa'

import { Kbd, KeyCombo } from '@/components/ui/kbd'
import { Pane } from '@/components/ui/pane'
import { isSameProject } from '@/features/prompt-library/model/prompt-projects'
import { type PromptLibraryFacets } from '@/features/prompt-library/selectors/prompt-library-selectors'
import {
  type PromptLibraryFilter,
  type PromptSyncMode,
  type PromptSyncStatus,
} from '@/features/prompt-library/types'
import { SITE_GITHUB_URL } from '@/lib/site-config'
import { useColorScheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

type LibraryPaneProps = {
  facets: PromptLibraryFacets
  filter: PromptLibraryFilter
  syncMode: PromptSyncMode
  syncStatus: PromptSyncStatus
  className?: string
  /** Changes some parts of the filter; the rest stay. */
  onFilterChange: (patch: Partial<PromptLibraryFilter>) => void
  onCapture: () => void
  onOpenFinder: () => void
  onOpenCommandLine: () => void
  onOpenHelp: () => void
}

const MAX_TAGS = 18

/** The prompt glyph + `rc`, as it would sit at the start of a shell line. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline font-bold tracking-tight', className)}>
      <span className="text-accent">❯</span>
      <span className="ml-[0.5ch] text-fg">prompt</span>
      <span className="text-accent">rc</span>
      <span aria-hidden="true" className="cursor-block" />
    </span>
  )
}

export function LibraryPane({
  facets,
  filter,
  syncMode,
  syncStatus,
  className,
  onFilterChange,
  onCapture,
  onOpenFinder,
  onOpenCommandLine,
  onOpenHelp,
}: LibraryPaneProps) {
  const colorScheme = useColorScheme()
  const tags = facets.here.tags.slice(0, MAX_TAGS)

  return (
    <Pane className={cn('h-full', className)} index={1} title="~/.promptrc">
      <nav
        aria-label="Projects"
        className="scrollbar-term min-h-0 flex-1 overflow-y-auto px-[1ch] pt-3 pb-2"
        data-pane-focus
      >
        <TreeHeading>projects/</TreeHeading>
        <TreeRow
          active={filter.project === null}
          count={facets.total}
          glyph={<span className="text-accent">~</span>}
          label="everything"
          last={facets.projects.length === 0}
          onClick={() => onFilterChange({ project: null, tag: null })}
        />
        {facets.projects.map((project, index) => (
          <TreeRow
            active={filter.project !== null && isSameProject(filter.project, project.label)}
            count={project.count}
            key={project.key}
            label={`${project.label}/`}
            labelClassName="text-blue"
            last={index === facets.projects.length - 1}
            onClick={() => onFilterChange({ project: project.label, tag: null })}
          />
        ))}

        {tags.length > 0 ? (
          <>
            <TreeHeading>
              {filter.project === null ? 'tags/' : `tags in ${filter.project}/`}
            </TreeHeading>
            <div className="flex flex-wrap gap-x-[1ch] gap-y-0.5 pl-[1ch] text-[12px]">
              {tags.map((tag) => {
                const active = filter.tag === tag.key

                return (
                  <button
                    aria-pressed={active}
                    className={cn(
                      'rounded-sm px-[0.5ch] transition-colors',
                      active ? 'bg-accent text-accent-fg' : 'text-magenta hover:bg-bg-hover',
                    )}
                    key={tag.key}
                    onClick={() => onFilterChange({ tag: active ? null : tag.key })}
                    type="button"
                  >
                    #{tag.label}
                    <span className={active ? 'opacity-70' : 'text-fg-faint'}>·{tag.count}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : null}
      </nav>

      <div className="border-t border-line px-[1ch] pt-2 pb-2 text-[12px]">
        <button
          className="mb-2 flex w-full items-center justify-between rounded-sm bg-accent px-[1ch] py-1 font-bold text-accent-fg transition hover:brightness-110"
          onClick={onCapture}
          type="button"
        >
          <span>❯ capture</span>
          <span className="opacity-70">c</span>
        </button>
        <div className="mb-2 grid grid-cols-3 gap-[1ch] text-fg-dim">
          <FooterKey onClick={onOpenFinder} keys={['Mod', 'K']} label="find" />
          <FooterKey onClick={onOpenCommandLine} keys={[':']} label="cmd" />
          <FooterKey onClick={onOpenHelp} keys={['?']} label="man" />
        </div>
        <div className="flex items-center gap-[1ch] text-fg-faint">
          <span
            aria-hidden="true"
            className={cn(
              syncStatus === 'error'
                ? 'text-red'
                : syncStatus === 'loading'
                  ? 'animate-pulse text-yellow'
                  : 'text-green',
            )}
          >
            ●
          </span>
          <span className={cn('truncate', syncStatus === 'error' && 'text-red')}>
            {syncStatus === 'error'
              ? 'sync error'
              : syncStatus === 'loading'
                ? 'mounting…'
                : syncMode === 'remote'
                  ? 'synced · cloud'
                  : 'local · this device'}
          </span>
          <span className="ml-auto flex items-center gap-[1ch]">
            <Show when="signed-out">
              <a className="text-accent hover:underline" href="/sign-in">
                login
              </a>
            </Show>
            <Show when="signed-in">
              <UserButton appearance={{ elements: { userButtonAvatarBox: 'size-5 rounded-sm' } }} />
            </Show>
            <a
              aria-label="promptrc on GitHub"
              className="hover:text-fg"
              href={SITE_GITHUB_URL}
              rel="noreferrer"
              target="_blank"
            >
              <FaGithub aria-hidden="true" className="size-3.5" />
            </a>
          </span>
        </div>
        <button
          className="mt-1 flex w-full items-center gap-[1ch] text-left text-fg-faint hover:text-fg"
          onClick={colorScheme.cycle}
          title="Cycle colorscheme (or :colorscheme <name>)"
          type="button"
        >
          <span className="text-accent">◐</span>
          <span className="truncate">
            colo{' '}
            {colorScheme.preference === 'system'
              ? `${colorScheme.scheme} (auto)`
              : colorScheme.scheme}
          </span>
        </button>
      </div>
    </Pane>
  )
}

function TreeHeading({ children }: { children: ReactNode }) {
  return <p className="mt-2 font-bold text-fg-dim first:mt-0">{children}</p>
}

type TreeRowProps = {
  active: boolean
  count: number
  glyph?: ReactNode
  label: string
  labelClassName?: string
  last: boolean
  onClick: () => void
}

function TreeRow({ active, count, glyph, label, labelClassName, last, onClick }: TreeRowProps) {
  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex w-full items-center rounded-sm pr-[1ch] text-left text-[13px] leading-[1.75] transition-colors',
        active ? 'bg-accent text-accent-fg' : 'hover:bg-bg-hover',
      )}
      onClick={onClick}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn('shrink-0 whitespace-pre', active ? 'opacity-60' : 'text-fg-faint')}
      >
        {last ? '└─ ' : '├─ '}
      </span>
      {glyph ? (
        <span
          aria-hidden="true"
          className={cn('mr-[1ch] w-[1ch] shrink-0 text-center', active && '[&>*]:text-accent-fg')}
        >
          {glyph}
        </span>
      ) : null}
      <span className={cn('min-w-0 flex-1 truncate', !active && labelClassName)}>{label}</span>
      <span className={cn('tabular-nums', active ? 'opacity-70' : 'text-fg-faint')}>{count}</span>
    </button>
  )
}

function FooterKey({
  keys,
  label,
  onClick,
}: {
  keys: readonly string[]
  label: string
  onClick: () => void
}) {
  return (
    <button
      className="flex items-center gap-[0.5ch] rounded-sm py-0.5 transition-colors hover:bg-bg-hover hover:text-fg"
      onClick={onClick}
      type="button"
    >
      {keys.length === 1 ? <Kbd>{keys[0]}</Kbd> : <KeyCombo keys={keys} />}
      <span>{label}</span>
    </button>
  )
}
