import { Show, UserButton } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import {
  BookOpen,
  CircleHelp,
  Cloud,
  HardDrive,
  Monitor,
  Moon,
  Pin,
  Plus,
  Search,
  Sun,
} from 'lucide-react'
import { type ReactNode } from 'react'
import { FaGithub } from 'react-icons/fa'

import { Button } from '@/components/ui/button'
import { Kbd, KeyCombo } from '@/components/ui/kbd'
import { KindMark } from '@/features/prompt-library/components/kind-mark'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import {
  type PromptLibraryFacets,
  isSamePromptLibraryFilter,
} from '@/features/prompt-library/selectors/prompt-library-selectors'
import {
  type PromptLibraryFilter,
  type PromptSyncMode,
  type PromptSyncStatus,
} from '@/features/prompt-library/types'
import { SITE_GITHUB_URL } from '@/lib/site-config'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

type LibrarySidebarProps = {
  facets: PromptLibraryFacets
  filter: PromptLibraryFilter
  syncMode: PromptSyncMode
  syncStatus: PromptSyncStatus
  onFilterChange: (filter: PromptLibraryFilter) => void
  onCapture: () => void
  onOpenPalette: () => void
  onOpenHelp: () => void
}

const MAX_SIDEBAR_TAGS = 16

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn('font-display text-[26px] leading-none tracking-[-0.02em] text-ink', className)}
    >
      prompt<span className="text-vermilion italic">rc</span>
    </span>
  )
}

export function LibrarySidebar({
  facets,
  filter,
  syncMode,
  syncStatus,
  onFilterChange,
  onCapture,
  onOpenPalette,
  onOpenHelp,
}: LibrarySidebarProps) {
  const isActive = (candidate: PromptLibraryFilter) => isSamePromptLibraryFilter(filter, candidate)

  return (
    <nav aria-label="Library" className="flex h-full min-h-0 flex-col">
      <div className="px-5 pt-6 pb-5">
        <Link className="inline-flex flex-col gap-1.5 rounded-md" to="/">
          <Wordmark />
          <span className="label-caps text-[9.5px] text-ink-faint">A commonplace book for AI</span>
        </Link>
      </div>

      <div className="flex flex-col gap-2 px-3">
        <Button className="w-full justify-between pr-2" onClick={onCapture} size="lg">
          <span className="inline-flex items-center gap-2">
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.4} />
            Capture
          </span>
          <Kbd className="bg-white/15 text-primary-foreground/90 shadow-none">C</Kbd>
        </Button>
        <button
          className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] text-ink-muted shadow-[inset_0_0_0_1px_var(--rule)] transition-colors hover:bg-paper-raised hover:text-ink"
          onClick={onOpenPalette}
          type="button"
        >
          <Search aria-hidden="true" className="size-3.5" />
          <span className="flex-1">Search</span>
          <KeyCombo keys={['Mod', 'K']} />
        </button>
      </div>

      <div className="scrollbar-quiet mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <SidebarSection>
          <SidebarItem
            active={isActive({ type: 'all' })}
            count={facets.total}
            icon={<BookOpen aria-hidden="true" className="size-[15px]" />}
            label="Everything"
            onClick={() => onFilterChange({ type: 'all' })}
          />
          <SidebarItem
            active={isActive({ type: 'pinned' })}
            count={facets.pinned}
            icon={<Pin aria-hidden="true" className="size-[15px]" />}
            label="Pinned"
            onClick={() => onFilterChange({ type: 'pinned' })}
          />
        </SidebarSection>

        <SidebarSection heading="Kinds">
          {PROMPT_KINDS.map((kind) => (
            <SidebarItem
              active={isActive({ type: 'kind', kind })}
              count={facets.kinds[kind]}
              icon={
                <KindMark className="w-[15px] text-center text-[17px]" kind={kind} label={false} />
              }
              key={kind}
              label={PROMPT_KIND_DEFINITIONS[kind].plural}
              onClick={() => onFilterChange({ type: 'kind', kind })}
            />
          ))}
        </SidebarSection>

        {facets.categories.length > 0 ? (
          <SidebarSection heading="Categories">
            {facets.categories.map((category) => (
              <SidebarItem
                active={isActive({ type: 'category', category: category.key })}
                count={category.count}
                icon={
                  <span
                    aria-hidden="true"
                    className="block size-[7px] translate-x-[4px] rounded-full bg-rule-strong"
                  />
                }
                key={category.key}
                label={category.label}
                onClick={() => onFilterChange({ type: 'category', category: category.key })}
              />
            ))}
          </SidebarSection>
        ) : null}

        {facets.tags.length > 0 ? (
          <SidebarSection heading="Tags">
            <div className="flex flex-wrap gap-1 px-1.5 pt-0.5">
              {facets.tags.slice(0, MAX_SIDEBAR_TAGS).map((tag) => {
                const active = isActive({ type: 'tag', tag: tag.key })

                return (
                  <button
                    aria-pressed={active}
                    className={cn(
                      'h-6 rounded-full px-2 font-mono text-[11px] transition-colors',
                      active
                        ? 'bg-ink text-paper'
                        : 'text-ink-muted shadow-[inset_0_0_0_1px_var(--rule)] hover:bg-paper-raised hover:text-ink',
                    )}
                    key={tag.key}
                    onClick={() =>
                      onFilterChange(active ? { type: 'all' } : { type: 'tag', tag: tag.key })
                    }
                    type="button"
                  >
                    #{tag.label}
                  </button>
                )
              })}
            </div>
          </SidebarSection>
        ) : null}
      </div>

      <SidebarFooter onOpenHelp={onOpenHelp} syncMode={syncMode} syncStatus={syncStatus} />
    </nav>
  )
}

function SidebarSection({ heading, children }: { heading?: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      {heading ? <h2 className="label-caps mb-1.5 px-2.5 text-[10px]">{heading}</h2> : null}
      <div className="flex flex-col gap-px">{children}</div>
    </section>
  )
}

type SidebarItemProps = {
  active: boolean
  count: number
  icon: ReactNode
  label: string
  onClick: () => void
}

function SidebarItem({ active, count, icon, label, onClick }: SidebarItemProps) {
  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13.5px] transition-colors',
        active
          ? 'bg-paper-raised text-ink shadow-[inset_0_0_0_1px_var(--rule),0_1px_2px_rgb(0_0_0/0.04)]'
          : 'text-ink-soft hover:bg-ink/[0.045] hover:text-ink',
      )}
      onClick={onClick}
      type="button"
    >
      <span className="grid w-[15px] shrink-0 place-items-center text-ink-muted group-aria-[current=page]:text-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={cn(
          'font-mono text-[11px] tabular-nums',
          active ? 'text-vermilion' : 'text-ink-faint',
        )}
      >
        {count}
      </span>
    </button>
  )
}

type SidebarFooterProps = {
  syncMode: PromptSyncMode
  syncStatus: PromptSyncStatus
  onOpenHelp: () => void
}

function SidebarFooter({ syncMode, syncStatus, onOpenHelp }: SidebarFooterProps) {
  const theme = useTheme()
  const ThemeIcon =
    theme.preference === 'light' ? Sun : theme.preference === 'dark' ? Moon : Monitor
  const syncLabel =
    syncStatus === 'error'
      ? 'Sync problem'
      : syncStatus === 'loading'
        ? 'Opening library…'
        : syncMode === 'remote'
          ? 'Synced to your account'
          : 'Kept on this device'

  return (
    <div className="border-t border-rule px-3 py-3">
      <div className="mb-2 flex items-center gap-2 px-2.5 text-[12px] text-ink-muted">
        <span
          aria-hidden="true"
          className={cn(
            'size-1.5 rounded-full',
            syncStatus === 'error'
              ? 'bg-verdict-fail'
              : syncStatus === 'loading'
                ? 'animate-pulse bg-verdict-mixed'
                : 'bg-verdict-pass',
          )}
        />
        {syncMode === 'remote' ? (
          <Cloud aria-hidden="true" className="size-3.5" />
        ) : (
          <HardDrive aria-hidden="true" className="size-3.5" />
        )}
        <span className={cn('truncate', syncStatus === 'error' && 'text-verdict-fail')}>
          {syncLabel}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Show when="signed-out">
          <a
            className="mr-auto inline-flex h-8 items-center rounded-lg px-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-ink/[0.05]"
            href="/sign-in"
          >
            Sign in to sync
          </a>
        </Show>
        <Show when="signed-in">
          <div className="mr-auto pl-1.5">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: 'size-7',
                },
              }}
            />
          </div>
        </Show>

        <Button
          aria-label={`Theme: ${theme.preference}. Switch theme`}
          onClick={theme.cycle}
          size="icon-sm"
          title={`Theme: ${theme.preference}`}
          variant="ghost"
        >
          <ThemeIcon aria-hidden="true" className="size-4" />
        </Button>
        <Button
          aria-label="Keyboard shortcuts"
          onClick={onOpenHelp}
          size="icon-sm"
          title="Keyboard shortcuts (?)"
          variant="ghost"
        >
          <CircleHelp aria-hidden="true" className="size-4" />
        </Button>
        <a
          aria-label="promptrc on GitHub"
          className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
          href={SITE_GITHUB_URL}
          rel="noreferrer"
          target="_blank"
          title="Source on GitHub"
        >
          <FaGithub aria-hidden="true" className="size-4" />
        </a>
      </div>
    </div>
  )
}
