import { useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'

const KEY_GLYPHS: Record<string, string> = {
  Enter: '⏎',
  Esc: 'esc',
  Shift: '⇧',
  Tab: '⇥',
  ArrowUp: '↑',
  ArrowDown: '↓',
}

const subscribeToNothing = () => () => {}
const isApplePlatform = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform)

/**
 * `Mod` is ⌘ on Apple platforms and ctrl elsewhere. The server can't know which,
 * so it renders ctrl and the client corrects it after hydration (no mismatch).
 */
export function useModKeyLabel() {
  const isApple = useSyncExternalStore(subscribeToNothing, isApplePlatform, () => false)

  return isApple ? '⌘' : 'ctrl'
}

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'inline-flex h-[18px] min-w-[2.25ch] items-center justify-center rounded-sm border border-line-strong bg-bg px-[0.5ch] font-mono text-meta leading-none text-fg-dim select-none',
        className,
      )}
      {...props}
    />
  )
}

function KeyCombo({
  keys,
  className,
  capClassName,
}: {
  keys: readonly string[]
  className?: string
  /** Applied to every keycap of the chord. */
  capClassName?: string
}) {
  const modLabel = useModKeyLabel()

  return (
    <span className={cn('inline-flex items-center gap-[0.5ch]', className)}>
      {keys.map((key) => (
        <Kbd className={capClassName} key={key}>
          {key === 'Mod' ? modLabel : (KEY_GLYPHS[key] ?? key)}
        </Kbd>
      ))}
    </span>
  )
}

export { Kbd, KeyCombo }
