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
    return <span className="bg-bg-sel px-[0.5ch] text-accent">{raw}</span>
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
          'mx-[0.25ch] [field-sizing:content] max-w-[min(40ch,100%)] min-w-[4ch] border-b bg-bg-sel px-[0.5ch] py-0 align-baseline font-mono text-[1em] leading-[1.5] transition-colors outline-none focus:border-solid focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent',
          value
            ? 'border-line-strong text-fg'
            : 'border-dashed border-accent text-accent placeholder:text-accent',
        )}
        data-prompt-variable={name}
        id={id}
        onChange={(event) => context.onChange(name, event.target.value)}
        placeholder={fallback ? `‹${name}=${fallback}›` : `‹${name}›`}
        spellCheck={false}
        type="text"
        value={value}
      />
    </span>
  )
}
