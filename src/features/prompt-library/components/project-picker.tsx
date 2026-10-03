import { useState } from 'react'

import {
  type PromptProject,
  findNearProject,
  findProject,
  projectKey,
  suggestProjects,
} from '@/features/prompt-library/model/prompt-projects'
import { cn } from '@/lib/utils'

type ProjectPickerProps = {
  id: string
  value: string
  projects: readonly PromptProject[]
  onChange: (value: string) => void
  /** Keys the picker doesn't use (⌘⏎ to save, say) still reach the form. */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
}

type PickerOption = { type: 'project'; project: PromptProject } | { type: 'new'; label: string }

/**
 * Picks a Project with as little typing as possible, and makes a slightly-off
 * spelling hard to save by accident: matches are offered as you type, a near
 * miss asks "did you mean …?", and starting a new Project is an explicit
 * choice. Leaving the field snaps "Render MD" to an existing "render-md".
 */
export function ProjectPicker({
  id,
  value,
  projects,
  onChange,
  onKeyDown,
  placeholder = 'personal',
  className,
}: ProjectPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const typed = value.trim()
  const exact = findProject(typed, projects)
  const near = exact ? null : findNearProject(typed, projects)
  const suggestions = suggestProjects(typed, projects, 8)
  // A near miss goes first so ⏎ fixes the typo; a genuinely new Project is
  // always one ↓ away, never the default when something close exists.
  const options: PickerOption[] = [
    ...(near && !suggestions.includes(near) ? [{ type: 'project' as const, project: near }] : []),
    ...suggestions.map((project) => ({ type: 'project' as const, project })),
    ...(typed && projectKey(typed) && !exact ? [{ type: 'new' as const, label: typed }] : []),
  ]
  const showMenu = isOpen && options.length > 0
  const activeIndex = Math.min(highlighted, options.length - 1)
  const listId = `${id}-projects`

  const choose = (option: PickerOption | undefined) => {
    if (!option) {
      return
    }

    onChange(option.type === 'project' ? option.project.label : option.label)
    setIsOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey) {
      onKeyDown?.(event)
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()

      if (!isOpen) {
        setIsOpen(true)
        setHighlighted(0)
        return
      }

      const step = event.key === 'ArrowDown' ? 1 : -1
      setHighlighted((activeIndex + step + options.length) % Math.max(options.length, 1))
      return
    }

    if (showMenu && (event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey && typed))) {
      // Enter picks and stays; Tab picks and moves on to the next field.
      if (event.key === 'Enter') {
        event.preventDefault()
      }

      choose(options[activeIndex])
      return
    }

    if (event.key === 'Escape' && showMenu) {
      // Close the list, not the dialog or the editor around it.
      event.preventDefault()
      event.stopPropagation()
      setIsOpen(false)
      return
    }

    onKeyDown?.(event)
  }

  return (
    <div className={cn('relative min-w-0', className)}>
      <div className="flex min-w-0 items-baseline gap-[1ch]">
        <input
          aria-autocomplete="list"
          aria-controls={showMenu ? listId : undefined}
          aria-describedby={`${id}-hint`}
          aria-expanded={showMenu}
          autoComplete="off"
          className="w-full min-w-0 bg-transparent text-blue outline-none placeholder:text-fg-faint"
          id={id}
          onBlur={() => {
            setIsOpen(false)

            // Same Project, different spelling: keep the library's spelling.
            if (exact && exact.label !== value) {
              onChange(exact.label)
            }
          }}
          onChange={(event) => {
            onChange(event.target.value)
            setIsOpen(true)
            setHighlighted(0)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          spellCheck={false}
          value={value}
        />
        <ProjectHint
          exact={exact}
          id={`${id}-hint`}
          near={near}
          onAccept={(label) => onChange(label)}
          typed={typed}
        />
      </div>

      {showMenu ? (
        <ul
          className="absolute top-full left-0 z-40 mt-1 max-h-60 w-[min(30ch,100%)] min-w-[24ch] animate-pop overflow-y-auto rounded-sm border border-line-strong bg-bg-raised py-1 text-[12.5px] shadow-[0_12px_30px_rgb(0_0_0/0.35)]"
          id={listId}
        >
          {options.map((option, index) => {
            const active = index === activeIndex

            return (
              <li key={option.type === 'project' ? option.project.key : `new-${option.label}`}>
                <button
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-[1ch] px-[1ch] text-left',
                    active ? 'bg-accent text-accent-fg' : 'text-fg-dim hover:bg-bg-hover',
                  )}
                  // Keep focus in the input while picking with the mouse.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    choose(option)
                  }}
                  onMouseEnter={() => setHighlighted(index)}
                  tabIndex={-1}
                  type="button"
                >
                  {option.type === 'project' ? (
                    <>
                      <span className={active ? undefined : 'text-blue'}>▸</span>
                      <span className="min-w-0 flex-1 truncate">{option.project.label}/</span>
                      <span className={cn('tabular-nums', active ? 'opacity-70' : 'text-fg-faint')}>
                        {option.project.count}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={active ? undefined : 'text-yellow'}>+</span>
                      <span className="min-w-0 flex-1 truncate">new project “{option.label}”</span>
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function ProjectHint({
  id,
  typed,
  exact,
  near,
  onAccept,
}: {
  id: string
  typed: string
  exact: PromptProject | null
  near: PromptProject | null
  onAccept: (label: string) => void
}) {
  if (!typed) {
    return <span className="sr-only" id={id} />
  }

  if (exact) {
    return (
      <span className="shrink-0 text-[11.5px] whitespace-nowrap text-green" id={id}>
        {exact.label === typed ? '✓' : `→ ${exact.label}`}
        <span className="sr-only"> existing project</span>
      </span>
    )
  }

  if (near) {
    return (
      <span className="shrink-0 text-[11.5px] whitespace-nowrap text-yellow" id={id}>
        did you mean{' '}
        <button
          className="underline underline-offset-2 hover:text-fg"
          // A click must not blur the field first and snap anything.
          onMouseDown={(event) => {
            event.preventDefault()
            onAccept(near.label)
          }}
          tabIndex={-1}
          type="button"
        >
          {near.label}
        </button>
        ?
      </span>
    )
  }

  return (
    <span className="shrink-0 text-[11.5px] whitespace-nowrap text-yellow" id={id}>
      + new project
    </span>
  )
}
