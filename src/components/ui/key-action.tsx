import { type ReactNode } from 'react'

import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

type KeyActionProps = {
  /** The key that runs it, shown as a keycap. Hidden on touch layouts. */
  keyLabel?: string
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
  keyLabel,
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
      {keyLabel ? (
        <Kbd
          className={cn(
            'font-normal max-md:hidden',
            primary && 'border-current bg-transparent text-current',
          )}
        >
          {keyLabel}
        </Kbd>
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
