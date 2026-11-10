import { type ReactNode } from 'react'

import { KeyCombo } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

type KeyActionProps = {
  /** The keys that run it, one keycap each (`Mod` is ⌘ or ctrl). Hidden on touch layouts. */
  keys?: readonly string[]
  label: string
  onClick?: () => void | Promise<void>
  /** The action the bar exists for. One per bar. */
  primary?: boolean
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  ariaLabel?: string
}

/** `[y] yank`: the key that does it, then what it does. The pattern for every action bar. */
export function KeyAction({
  keys,
  label,
  onClick,
  primary = false,
  type = 'button',
  disabled,
  className,
  ariaLabel,
}: KeyActionProps) {
  return (
    <button
      aria-label={ariaLabel ?? label}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-[1ch] px-[1ch] transition-colors disabled:pointer-events-none disabled:opacity-40 max-md:h-11',
        primary
          ? 'bg-bg-sel font-semibold text-accent hover:bg-accent hover:text-accent-fg'
          : 'text-fg hover:bg-bg-hover',
        className,
      )}
      disabled={disabled}
      onClick={onClick ? () => void onClick() : undefined}
      type={type}
    >
      {keys ? (
        <KeyCombo
          capClassName={primary ? 'border-current bg-transparent text-current' : undefined}
          className="font-normal max-md:hidden"
          keys={keys}
        />
      ) : null}
      {label}
    </button>
  )
}

/** A row of key actions. Buttons keep their shape and wrap whole. */
export function KeyActionBar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('-mx-[1ch] flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {children}
    </div>
  )
}
