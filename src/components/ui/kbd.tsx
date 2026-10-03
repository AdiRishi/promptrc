import { cn } from '@/lib/utils'

const IS_APPLE_PLATFORM =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

const KEY_GLYPHS: Record<string, string> = {
  Mod: IS_APPLE_PLATFORM ? '⌘' : 'Ctrl',
  Enter: '↵',
  Esc: 'Esc',
  Shift: '⇧',
  ArrowUp: '↑',
  ArrowDown: '↓',
}

/** Renders a key name with platform-aware glyphs (`Mod` is ⌘ on Apple, Ctrl elsewhere). */
export const formatKey = (key: string) => KEY_GLYPHS[key] ?? key

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
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key) => (
        <Kbd key={key}>{formatKey(key)}</Kbd>
      ))}
    </span>
  )
}

export { Kbd, KeyCombo }
