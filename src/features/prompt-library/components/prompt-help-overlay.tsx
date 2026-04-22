import { useEffect, useRef } from 'react'

import { Kbd, KbdGroup } from '@/components/ui/kbd'

type HelpRow = {
  keys: string[]
  label: string
}

type HelpGroup = {
  heading: string
  rows: HelpRow[]
}

const HELP_GROUPS: HelpGroup[] = [
  {
    heading: 'navigate',
    rows: [
      { keys: ['j'], label: 'next prompt' },
      { keys: ['k'], label: 'previous prompt' },
      { keys: ['/'], label: 'focus search' },
    ],
  },
  {
    heading: 'edit',
    rows: [
      { keys: ['n'], label: 'new prompt' },
      { keys: ['e'], label: 'edit selected' },
      { keys: ['d'], label: 'duplicate' },
      { keys: ['⌘', 'C'], label: 'copy body' },
      { keys: ['x'], label: 'delete (twice to confirm)' },
    ],
  },
  {
    heading: 'meta',
    rows: [
      { keys: ['?'], label: 'toggle this help' },
      { keys: ['esc'], label: 'cancel · dismiss' },
    ],
  },
]

type PromptHelpOverlayProps = {
  isOpen: boolean
  onClose: () => void
}

export function PromptHelpOverlay({ isOpen, onClose }: PromptHelpOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    panelRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <div
      aria-labelledby="prompt-help-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex animate-[help-backdrop-in_0.16s_ease] items-center justify-center bg-background/72 px-4 py-8 backdrop-blur-[3px]"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative w-[min(560px,100%)] origin-center animate-[help-panel-in_0.22s_cubic-bezier(0.22,1,0.36,1)] border border-primary/70 bg-card shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_56px_rgba(255,180,84,0.18)]"
        onClick={(event) => event.stopPropagation()}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="flex items-center gap-2.5 border-b border-border bg-muted px-4 py-2.5">
          <div aria-hidden="true" className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[rgb(255,95,87)]" />
            <span className="size-2.5 rounded-full bg-[rgb(255,189,46)]" />
            <span className="size-2.5 rounded-full bg-[rgb(40,200,64)]" />
          </div>
          <h2
            className="ml-3 text-[12px] tracking-[0.05em] text-muted-foreground"
            id="prompt-help-title"
          >
            <span className="text-accent-foreground">$</span>{' '}
            <span className="text-foreground">promptrc</span>{' '}
            <span className="text-primary">--help</span>
          </h2>
          <span className="ml-auto font-sans text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            keymap
          </span>
        </div>

        <div className="flex flex-col gap-5 px-6 py-6">
          {HELP_GROUPS.map((group, groupIndex) => (
            <section
              className="animate-[help-row-in_0.22s_ease_both]"
              key={group.heading}
              style={{ animationDelay: `${60 + groupIndex * 60}ms` }}
            >
              <h3 className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.22em] text-accent-foreground uppercase">
                <span aria-hidden="true" className="opacity-60">
                  #
                </span>
                <span>{group.heading}</span>
                <span aria-hidden="true" className="ml-1 h-px flex-1 bg-border" />
              </h3>

              <ul className="flex flex-col gap-[3px]">
                {group.rows.map((row) => (
                  <li
                    className="group grid grid-cols-[92px_1fr] items-center gap-4 rounded-[2px] px-1 py-[3px] transition-colors hover:bg-primary/8"
                    key={row.label}
                  >
                    <KbdGroup className="flex-wrap justify-start gap-1">
                      {row.keys.map((key) => (
                        <Kbd className="min-w-[22px]" key={key}>
                          {key}
                        </Kbd>
                      ))}
                    </KbdGroup>

                    <span className="text-[13px] text-foreground/85 transition-colors group-hover:text-foreground">
                      {row.label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-dashed border-border bg-background/40 px-6 py-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            press <Kbd>?</Kbd> or <Kbd>esc</Kbd> to close
          </span>
          <span className="text-accent-foreground/80">// help</span>
        </div>
      </div>
    </div>
  )
}
