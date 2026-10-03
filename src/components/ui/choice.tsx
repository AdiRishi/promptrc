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
        'cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60 has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-paper',
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
