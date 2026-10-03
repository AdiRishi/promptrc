import { useRef, useState } from 'react'

import { KeyCombo } from '@/components/ui/kbd'
import { completeExCommand } from '@/features/prompt-library/commands/prompt-library-ex-commands'
import { useEcho } from '@/lib/echo'
import { cn } from '@/lib/utils'

type CommandLineProps = {
  open: boolean
  projects: readonly string[]
  tags: readonly string[]
  onOpen: () => void
  onClose: () => void
  onSubmit: (input: string) => void
}

const MAX_HISTORY = 50
/** Shared across openings so ↑ recalls what you ran before, like vim's history. */
const history: string[] = []

/**
 * The bottom row of the screen. Closed, it prints the latest message (vim's
 * echo area). Open, it's the `:` command line with a wildmenu of completions.
 */
export function CommandLine({ open, ...props }: CommandLineProps) {
  return open ? <CommandLineInput {...props} /> : <EchoLine onOpen={props.onOpen} />
}

/** vim's message area: the latest echo, fading after a moment. */
export function EchoLine({ onOpen }: { onOpen?: () => void }) {
  const message = useEcho()

  return (
    <div className="flex h-6 shrink-0 items-center gap-[2ch] px-[1ch] text-[12.5px]">
      <p
        aria-live="polite"
        className={cn(
          'min-w-0 flex-1 truncate',
          message?.tone === 'error'
            ? 'text-red'
            : message?.tone === 'ok'
              ? 'text-green'
              : 'text-fg',
        )}
        key={message?.id}
      >
        {message ? <span className="animate-type-in">{message.text}</span> : null}
      </p>
      {onOpen ? (
        <>
          <button
            className="hidden shrink-0 items-center gap-[1ch] text-[11.5px] text-fg-faint hover:text-fg sm:flex"
            onClick={onOpen}
            type="button"
          >
            <KeyCombo keys={[':']} /> command
          </button>
          <span className="hidden shrink-0 items-center gap-[1ch] text-[11.5px] text-fg-faint md:flex">
            <KeyCombo keys={['?']} /> manual
          </span>
        </>
      ) : null}
    </div>
  )
}

function CommandLineInput({
  projects,
  tags,
  onClose,
  onSubmit,
}: Omit<CommandLineProps, 'open' | 'onOpen'>) {
  const [value, setValue] = useState('')
  const [highlighted, setHighlighted] = useState(-1)
  const historyIndexRef = useRef<number | null>(null)
  const typedRef = useRef('')
  const completions = completeExCommand(value, { projects, tags }).slice(0, 10)

  const submit = (text: string) => {
    const trimmed = text.trim()

    if (trimmed) {
      const existing = history.indexOf(trimmed)

      if (existing !== -1) {
        history.splice(existing, 1)
      }

      history.push(trimmed)
      history.splice(0, Math.max(0, history.length - MAX_HISTORY))
    }

    onClose()

    if (trimmed) {
      onSubmit(trimmed)
    }
  }

  const accept = (index: number) => {
    const completion = completions[index]

    if (completion) {
      setValue(completion.value)
      setHighlighted(-1)
    }
  }

  const recall = (direction: -1 | 1) => {
    if (history.length === 0) {
      return
    }

    if (historyIndexRef.current === null) {
      if (direction === 1) {
        return
      }

      typedRef.current = value
      historyIndexRef.current = history.length
    }

    const nextIndex = historyIndexRef.current + direction

    if (nextIndex >= history.length) {
      historyIndexRef.current = null
      setValue(typedRef.current)
      return
    }

    historyIndexRef.current = Math.max(0, nextIndex)
    setValue(history[historyIndexRef.current] ?? '')
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        onClose()
        return
      case 'Backspace':
        // Backspacing past the colon leaves the command line, as in vim.
        if (value === '') {
          event.preventDefault()
          onClose()
        }
        return
      case 'Tab': {
        event.preventDefault()

        if (completions.length === 0) {
          return
        }

        if (completions.length === 1) {
          accept(0)
          return
        }

        setHighlighted((index) =>
          event.shiftKey
            ? index <= 0
              ? completions.length - 1
              : index - 1
            : (index + 1) % completions.length,
        )
        return
      }
      case 'ArrowUp':
        event.preventDefault()
        recall(-1)
        return
      case 'ArrowDown':
        event.preventDefault()
        recall(1)
        return
      case 'Enter': {
        event.preventDefault()
        const completion = highlighted >= 0 ? completions[highlighted] : undefined

        if (completion && completion.value.endsWith(' ')) {
          // Accepting a command that takes an argument: keep typing.
          setValue(completion.value)
          setHighlighted(-1)
          return
        }

        submit(completion?.value ?? value)
        return
      }
      default:
    }
  }

  return (
    <div className="relative h-6 shrink-0">
      {completions.length > 0 ? (
        <ul
          aria-label="Completions"
          className="scrollbar-term absolute bottom-full left-0 z-30 mb-7 max-h-[50vh] w-[min(560px,100%)] animate-pop overflow-y-auto rounded-sm border border-line-strong bg-bg-raised py-1 text-[12.5px] shadow-[0_-8px_30px_rgb(0_0_0/0.35)]"
        >
          {completions.map((completion, index) => (
            <li key={completion.value}>
              <button
                aria-current={index === highlighted ? 'true' : undefined}
                className={cn(
                  'flex w-full gap-[2ch] px-[1ch] text-left',
                  index === highlighted
                    ? 'bg-accent text-accent-fg'
                    : 'text-fg-dim hover:bg-bg-hover',
                )}
                // Keep focus in the input while clicking a completion.
                onMouseDown={(event) => {
                  event.preventDefault()
                  accept(index)
                }}
                tabIndex={-1}
                type="button"
              >
                <span className="w-[24ch] shrink-0 truncate font-bold">{completion.label}</span>
                <span
                  className={cn('truncate', index === highlighted ? 'opacity-80' : 'text-fg-faint')}
                >
                  {completion.detail}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex h-6 items-center px-[1ch] text-[13px]">
        <span className="text-accent">:</span>
        <input
          aria-label="Command line"
          // The command line exists only while you're typing into it.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="min-w-0 flex-1 bg-transparent text-fg outline-none"
          onBlur={onClose}
          onChange={(event) => {
            historyIndexRef.current = null
            setHighlighted(-1)
            setValue(event.target.value)
          }}
          onKeyDown={onKeyDown}
          spellCheck={false}
          value={highlighted >= 0 ? (completions[highlighted]?.value ?? value) : value}
        />
      </div>
    </div>
  )
}
