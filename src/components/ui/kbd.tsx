import { useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'

const KEY_GLYPHS: Record<string, string> = {
  Enter: '↵',
  Esc: 'Esc',
  Shift: '⇧',
  ArrowUp: '↑',
  ArrowDown: '↓',
}

const subscribeToNothing = () => () => {}
const isApplePlatform = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform)

/**
 * `Mod` is ⌘ on Apple platforms and Ctrl elsewhere. The server can't know which,
 * so it renders Ctrl and the client corrects it after hydration (no mismatch).
 */
export function useModKeyLabel() {
  const isApple = useSyncExternalStore(subscribeToNothing, isApplePlatform, () => false)

  return isApple ? '⌘' : 'Ctrl'
}

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-[5px] bg-paper-raised px-1 font-mono text-[10.5px] leading-none font-medium text-ink-muted shadow-[inset_0_0_0_1px_var(--rule-strong),inset_0_-1.5px_0_var(--rule-strong)] select-none',
        className,
      )}
      {...props}
    />
  )
}

function KeyCombo({ keys, className }: { keys: readonly string[]; className?: string }) {
  const modLabel = useModKeyLabel()

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key) => (
        <Kbd key={key}>{key === 'Mod' ? modLabel : (KEY_GLYPHS[key] ?? key)}</Kbd>
      ))}
    </span>
  )
}

export { Kbd, KeyCombo }
