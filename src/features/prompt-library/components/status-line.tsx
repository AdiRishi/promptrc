import { KindMark } from '@/features/prompt-library/components/kind-mark'
import { listPath } from '@/features/prompt-library/components/prompt-list'
import { promptPath } from '@/features/prompt-library/components/prompt-reader'
import { SyncMark } from '@/features/prompt-library/components/sync-mark'
import {
  type PromptLibraryFilter,
  type PromptRecord,
  type PromptSyncMode,
  type PromptSyncStatus,
} from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

export type ScreenMode = 'NORMAL' | 'INSERT' | 'CAPTURE' | 'FIND' | 'COMMAND' | 'HELP'

const MODE_CLASS: Record<ScreenMode, string> = {
  NORMAL: 'bg-accent text-accent-fg',
  INSERT: 'bg-green text-bg',
  CAPTURE: 'bg-magenta text-bg',
  FIND: 'bg-blue text-bg',
  COMMAND: 'bg-yellow text-bg',
  HELP: 'bg-cyan text-bg',
}

type StatusLineProps = {
  mode: ScreenMode
  filter: PromptLibraryFilter
  query: string
  prompt: PromptRecord | null
  isDirty: boolean
  position: number
  total: number
  blanks: { filled: number; total: number }
  syncMode: PromptSyncMode
  syncStatus: PromptSyncStatus
}

/**
 * The editor's status line: mode, where you are, what you're looking at, and
 * whether it's safe. Purely informational — every part has a key elsewhere.
 */
export function StatusLine({
  mode,
  filter,
  query,
  prompt,
  isDirty,
  position,
  total,
  blanks,
  syncMode,
  syncStatus,
}: StatusLineProps) {
  return (
    <footer
      aria-label="Status line"
      className="flex h-7 shrink-0 items-stretch overflow-hidden bg-bg-sunken text-meta leading-7 [text-shadow:none]"
    >
      <span className={cn('shrink-0 px-[1.5ch] font-extrabold tracking-wide', MODE_CLASS[mode])}>
        {mode}
      </span>
      <span className="hidden shrink-0 items-center bg-bg-hover px-[1.5ch] text-fg-dim sm:flex">
        {listPath(filter)}
        {query ? <span className="text-fg">/{query}</span> : null}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-[0.5ch] px-[1ch] text-fg-dim">
        {prompt ? (
          <>
            <KindMark kind={prompt.kind} label={false} />
            <span className="min-w-0 truncate">{promptPath(prompt)}</span>
            {prompt.pinned ? <span className="ml-[0.5ch] text-yellow">★</span> : null}
          </>
        ) : (
          <span className="px-[0.5ch] text-fg-faint">[No Name]</span>
        )}
        {isDirty ? <span className="ml-[0.5ch] text-fg">[+]</span> : null}
      </span>
      {blanks.total > 0 ? (
        <span
          className={cn(
            'hidden shrink-0 px-[1ch] md:block',
            blanks.filled === blanks.total ? 'text-green' : 'text-fg-dim',
          )}
        >
          {blanks.filled}/{blanks.total} blanks
        </span>
      ) : null}
      <span className="hidden shrink-0 items-center gap-[1ch] px-[1ch] text-fg-dim md:flex">
        <SyncMark mode={syncMode} status={syncStatus} />
        {syncStatus === 'error' ? 'sync error' : syncMode === 'remote' ? 'cloud' : 'local'}
      </span>
      <span className="shrink-0 bg-bg-hover px-[1.5ch] text-fg tabular-nums">
        {position}/{total}
      </span>
    </footer>
  )
}
