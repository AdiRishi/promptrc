import { createContext, use, useId } from 'react'

import { cn } from '@/lib/utils'

export type PromptVariableValues = Readonly<Record<string, string>>

type PromptVariableContextValue = {
  values: PromptVariableValues
  onChange: (name: string, value: string) => void
}

const PromptVariableContext = createContext<PromptVariableContextValue | null>(null)

export const PromptVariableProvider = PromptVariableContext

type PromptVariableSlotProps = {
  name: string
  fallback?: string
  raw: string
}

/**
 * A fill-in blank inside the rendered Prompt Body. Every slot with the same name
 * shares one value; copying the Prompt uses whatever has been filled in.
 * Outside a provider (e.g. read-only previews) it renders as a quiet token.
 */
export function PromptVariableSlot({ name, fallback, raw }: PromptVariableSlotProps) {
  const context = use(PromptVariableContext)
  const id = useId()

  if (!context) {
    return (
      <span className="rounded-[4px] bg-vermilion-wash px-1 font-mono text-[0.86em] text-vermilion-ink">
        {raw}
      </span>
    )
  }

  const value = context.values[name] ?? ''
  const label = fallback ? `${name} (defaults to ${fallback})` : name

  return (
    <span className="relative inline-flex align-baseline">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete="off"
        className={cn(
          'peer mx-[0.1em] [field-sizing:content] max-w-[min(32ch,100%)] min-w-[3ch] rounded-[5px] px-[0.35em] py-0 align-baseline font-sans text-[0.88em] leading-[1.5] transition-[background-color,box-shadow] outline-none',
          value
            ? 'bg-transparent text-ink shadow-[inset_0_-1.5px_0_var(--vermilion)] focus:bg-vermilion-wash/60'
            : 'bg-vermilion-wash text-vermilion-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--vermilion)_35%,transparent)] placeholder:font-mono placeholder:text-[0.92em] placeholder:text-vermilion-ink/80 focus:shadow-[inset_0_0_0_1.5px_var(--vermilion)]',
        )}
        data-prompt-variable={name}
        id={id}
        onChange={(event) => context.onChange(name, event.target.value)}
        placeholder={fallback ? `${name} · ${fallback}` : name}
        spellCheck={false}
        type="text"
        value={value}
      />
    </span>
  )
}
