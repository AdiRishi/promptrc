import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ChoiceGroupProps = {
  label: string
  className?: string
  children: ReactNode
}

/** A set of mutually exclusive options built on native radio inputs. */
export function ChoiceGroup({ label, className, children }: ChoiceGroupProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{label}</legend>
      <div className={className}>{children}</div>
    </fieldset>
  )
}

type ChoiceProps<TValue extends string> = {
  name: string
  value: TValue
  checked: boolean
  onSelect: (value: TValue) => void
  /** Accessible name when the visible content isn't plain text. */
  label: string
  title?: string
  className?: string
  children: ReactNode
}

/**
 * One option: a visually hidden radio wrapped in a styled label, so keyboard
 * arrows, focus, and screen readers behave natively.
 */
export function Choice<TValue extends string>({
  name,
  value,
  checked,
  onSelect,
  label,
  title,
  className,
  children,
}: ChoiceProps<TValue>) {
  return (
    <label
      className={cn(
        'cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-accent',
        className,
      )}
      title={title}
    >
      <input
        aria-label={label}
        checked={checked}
        className="sr-only"
        name={name}
        onChange={() => onSelect(value)}
        type="radio"
        value={value}
      />
      {children}
    </label>
  )
}

/**
 * Marks the chosen option in a set, the way a TUI does: `[new] used a-z`.
 * The brackets always take their space, so choosing never shifts the row.
 */
export function Bracketed({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className={active ? 'text-fg-faint' : 'invisible'}>
        [
      </span>
      {children}
      <span aria-hidden="true" className={active ? 'text-fg-faint' : 'invisible'}>
        ]
      </span>
    </>
  )
}
