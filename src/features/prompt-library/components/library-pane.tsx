import { Show, UserButton } from '@clerk/tanstack-react-start'
import { type ReactNode } from 'react'

import { Kbd } from '@/components/ui/kbd'
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
  active: boolean
  className?: string
  /** Changes some parts of the filter; the rest stay. */
  onFilterChange: (patch: Partial<PromptLibraryFilter>) => void
  onCapture: () => void
}

const MAX_TAGS = 18

/** The prompt glyph + `rc`, as it would sit at the start of a shell line. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline font-extrabold tracking-tight', className)}>
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
  active,
  className,
  onFilterChange,
  onCapture,
}: LibraryPaneProps) {
  const colorScheme = useColorScheme()
  const tags = facets.here.tags.slice(0, MAX_TAGS)

  return (
    <Pane active={active} className={cn('h-full', className)} index={1} title="library">
      <nav
        aria-label="Projects"
        className="scrollbar-term min-h-0 flex-1 overflow-y-auto pt-4 pb-2"
        data-pane-focus
      >
        <TreeHeading>projects/</TreeHeading>
        <TreeRow
          active={filter.project === null}
          count={facets.total}
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
            last={index === facets.projects.length - 1}
            onClick={() => onFilterChange({ project: project.label, tag: null })}
          />
        ))}

        {tags.length > 0 ? (
          <>
            <TreeHeading>
              {filter.project === null ? 'tags/' : `tags in ${filter.project}/`}
            </TreeHeading>
            {tags.map((tag, index) => {
              const selected = filter.tag === tag.key

              return (
                <TreeRow
                  active={selected}
                  count={tag.count}
                  key={tag.key}
                  label={`#${tag.label}`}
                  last={index === tags.length - 1}
                  onClick={() => onFilterChange({ tag: selected ? null : tag.key })}
                  pressed={selected}
                />
              )
            })}
          </>
        ) : null}
      </nav>

      <div className="border-t border-line py-1.5 text-fg-dim">
        <button
          className="flex h-7 w-full items-center gap-[1ch] px-[2ch] text-left font-semibold text-accent transition-colors hover:bg-bg-hover max-md:h-11"
          onClick={onCapture}
          type="button"
        >
          <span aria-hidden="true">+</span>
          <span className="flex-1">capture</span>
          <Kbd className="font-normal max-md:hidden">c</Kbd>
        </button>
        <FooterRow label="sync">
          <span
            aria-hidden="true"
            className={cn(
              'mr-[1ch]',
              syncStatus === 'error'
                ? 'text-red'
                : syncStatus === 'loading'
                  ? 'animate-pulse text-yellow'
                  : 'text-green',
            )}
          >
            ●
          </span>
          <span className={cn(syncStatus === 'error' && 'text-red')}>
            {syncStatus === 'error'
              ? 'error'
              : syncStatus === 'loading'
                ? 'mounting…'
                : syncMode === 'remote'
                  ? 'cloud'
                  : 'local'}
          </span>
        </FooterRow>
        <FooterRow label="scheme">
          <button
            className="-mx-[1ch] min-w-0 truncate px-[1ch] text-left transition-colors hover:bg-bg-hover hover:text-fg max-md:h-11"
            onClick={colorScheme.cycle}
            title="Cycle colorscheme (or :colorscheme <name>)"
            type="button"
          >
            {colorScheme.scheme}
            {colorScheme.preference === 'system' ? (
              <span className="text-fg-faint"> · auto</span>
            ) : null}
          </button>
        </FooterRow>
        <FooterRow label="account">
          <Show when="signed-out">
            <a className="link" href="/sign-in">
              login
            </a>
          </Show>
          <Show when="signed-in">
            <UserButton appearance={{ elements: { userButtonAvatarBox: 'size-5 rounded-sm' } }} />
          </Show>
        </FooterRow>
        <FooterRow label="source">
          <a className="link" href={SITE_GITHUB_URL} rel="noreferrer" target="_blank">
            github <span aria-hidden="true">↗</span>
          </a>
        </FooterRow>
      </div>
    </Pane>
  )
}

/** One line of the footer: what it is, then its value. */
function FooterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="flex h-6 items-center px-[2ch] max-md:h-11">
      <span className="w-[8ch] shrink-0 text-fg-faint">{label}</span>
      <span className="flex min-w-0 items-center whitespace-nowrap">{children}</span>
    </p>
  )
}

function TreeHeading({ children }: { children: ReactNode }) {
  return <p className="mt-4 mb-1 px-[2ch] text-meta text-fg-faint first:mt-0">{children}</p>
}

type TreeRowProps = {
  active: boolean
  count: number
  label: string
  last: boolean
  onClick: () => void
  /** Set for toggles (tags); rows that move you (Projects) leave it out. */
  pressed?: boolean
}

function TreeRow({ active, count, label, last, onClick, pressed }: TreeRowProps) {
  return (
    <button
      aria-current={pressed === undefined && active ? 'page' : undefined}
      aria-pressed={pressed}
      className={cn(
        'flex h-6 w-full items-center px-[2ch] text-left -outline-offset-2 transition-colors max-md:h-11',
        active
          ? 'row-selected font-semibold text-fg'
          : 'text-fg-dim hover:bg-bg-hover hover:text-fg',
      )}
      onClick={onClick}
      type="button"
    >
      {/* The branch is drawn, not typed, so it stays unbroken at any row height. */}
      <span
        aria-hidden="true"
        className={cn(
          'relative mr-[1ch] w-[2ch] shrink-0 self-stretch before:absolute before:top-0 before:left-[0.5ch] before:w-px before:bg-line-strong after:absolute after:top-1/2 after:left-[0.5ch] after:h-px after:w-[1.5ch] after:bg-line-strong',
          last ? 'before:h-1/2' : 'before:h-full',
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="pl-[1ch] font-normal text-fg-faint tabular-nums">{count}</span>
    </button>
  )
}
