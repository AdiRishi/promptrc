import { type PromptSyncMode, type PromptSyncStatus } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

type SyncMarkProps = {
  mode: PromptSyncMode
  status?: PromptSyncStatus
  className?: string
}

/**
 * Where the library lives, as one mark used everywhere: hollow while it is
 * only in this browser, green once it syncs to the cloud, yellow while it
 * loads, red when sync fails.
 */
export function SyncMark({ mode, status = 'ready', className }: SyncMarkProps) {
  const settled = status === 'idle' || status === 'ready'
  const tone =
    status === 'error'
      ? 'text-red'
      : status === 'loading'
        ? 'animate-pulse text-yellow'
        : mode === 'remote'
          ? 'text-green'
          : 'text-fg-dim'

  return (
    <span aria-hidden="true" className={cn(tone, className)}>
      {mode === 'local' && settled ? '○' : '●'}
    </span>
  )
}
