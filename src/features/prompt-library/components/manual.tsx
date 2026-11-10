import { type ReactNode, useRef } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { KeyCombo } from '@/components/ui/kbd'
import {
  PROMPT_LIBRARY_HELP_GROUPS,
  getPromptLibraryCommand,
} from '@/features/prompt-library/commands/prompt-library-command-surface'
import { EX_COMMANDS } from '@/features/prompt-library/commands/prompt-library-ex-commands'
import { KindTag } from '@/features/prompt-library/components/kind-mark'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { SITE_GITHUB_URL } from '@/lib/site-config'
import { COLOR_SCHEMES } from '@/lib/theme'

type ManualProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** `man promptrc` — every key, command and convention on one scrolling page. */
export function Manual({ open, onOpenChange }: ManualProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="top-[6vh] max-h-[88dvh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-[min(96ch,calc(100%-2rem))]"
        initialFocus={scrollRef}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">promptrc manual</DialogTitle>
        <DialogDescription className="sr-only">
          Keyboard shortcuts, commands, template syntax and colorschemes.
        </DialogDescription>
        <div className="flex h-9 items-center justify-between border-b border-line px-[3ch] text-meta text-fg-dim">
          <span>PROMPTRC(1)</span>
          <span className="hidden sm:inline">General Commands Manual</span>
          <span>PROMPTRC(1)</span>
        </div>

        <div
          className="scrollbar-term max-h-[calc(88dvh-2.25rem)] overflow-y-auto px-[3ch] pt-5 pb-8 outline-none"
          ref={scrollRef}
          tabIndex={-1}
        >
          <Section title="NAME">
            <p>
              <b className="text-fg">promptrc</b> — a place for the prompts that worked
            </p>
          </Section>

          <Section title="SYNOPSIS">
            <p>
              <b className="text-fg">c</b> capture · <b className="text-fg">⌘K</b> find ·{' '}
              <b className="text-fg">:</b>
              <u className="decoration-fg-faint underline-offset-2">command</u> [
              <u className="decoration-fg-faint underline-offset-2">args</u>]
            </p>
          </Section>

          <Section title="DESCRIPTION">
            <p className="max-w-[72ch]">
              Keep the fleeting moments of brilliance from working with AI: the wording that landed,
              the sequence of instructions that gets exactly what you want, the benchmark you can
              rerun on the next model. Everything is markdown. Signed out, entries stay in this
              browser; signed in, they sync to the cloud.
            </p>
          </Section>

          <Section title="KINDS">
            <dl className="grid grid-cols-[16ch_minmax(0,1fr)] gap-x-[2ch]">
              {PROMPT_KINDS.map((kind) => (
                <Row key={kind} term={<KindTag kind={kind} />}>
                  {PROMPT_KIND_DEFINITIONS[kind].description}
                </Row>
              ))}
            </dl>
          </Section>

          <Section title="KEYS">
            {PROMPT_LIBRARY_HELP_GROUPS.map((group) => (
              <div className="mb-3 last:mb-0" key={group.heading}>
                <p className="text-fg-faint">{group.heading.toLowerCase()}</p>
                <dl className="grid grid-cols-[16ch_minmax(0,1fr)] gap-x-[2ch]">
                  {group.commandIds.map((commandId) => {
                    const command = getPromptLibraryCommand(commandId)

                    return (
                      <Row key={commandId} term={<KeyCombo keys={command.keys} />}>
                        {command.label}
                      </Row>
                    )
                  })}
                  {('rows' in group ? group.rows : []).map((row) => (
                    <Row key={row.label} term={<KeyCombo keys={row.keys} />}>
                      {row.label}
                    </Row>
                  ))}
                </dl>
              </div>
            ))}
          </Section>

          <Section title="COMMANDS">
            <p className="mb-1 max-w-[72ch] text-fg-dim">
              Press <b className="text-fg">:</b>, type, <b className="text-fg">⏎</b>.{' '}
              <b className="text-fg">⇥</b> completes, <b className="text-fg">↑</b> recalls history.
            </p>
            <dl className="grid gap-x-[2ch] sm:grid-cols-[30ch_minmax(0,1fr)]">
              {EX_COMMANDS.map((command) => (
                <Row
                  key={command.name}
                  term={
                    <span className="text-fg">
                      <span className="text-accent">:</span>
                      {command.usage}
                    </span>
                  }
                >
                  {command.summary}
                  {command.aliases?.length ? (
                    <span className="text-fg-faint">
                      {' '}
                      ({command.aliases.map((alias) => `:${alias}`).join(' ')})
                    </span>
                  ) : null}
                </Row>
              ))}
              <Row term={<span className="text-fg">:prompts :sequences …</span>}>
                show one kind here
              </Row>
            </dl>
          </Section>

          <Section title="TEMPLATES">
            <dl className="grid gap-x-[2ch] sm:grid-cols-[30ch_minmax(0,1fr)]">
              <Row term={<code className="text-fg">{'{{audience}}'}</code>}>
                a blank, filled in before copying
              </Row>
              <Row term={<code className="text-fg">{'{{tone | warm}}'}</code>}>
                a blank with a fallback
              </Row>
              <Row term={<code className="text-fg">{'<!-- step -->'}</code>}>
                separates the steps of a sequence
              </Row>
              <Row term={<span className="text-fg">paste an image</span>}>
                attaches it while editing (signed in)
              </Row>
            </dl>
          </Section>

          <Section title="COLORSCHEMES">
            <dl className="grid grid-cols-[16ch_minmax(0,1fr)] gap-x-[2ch]">
              {COLOR_SCHEMES.map((scheme) => (
                <Row key={scheme.id} term={<span className="text-fg">{scheme.id}</span>}>
                  {scheme.description}
                </Row>
              ))}
            </dl>
          </Section>

          <Section title="SEE ALSO">
            <p>
              <a
                className="text-accent underline underline-offset-2"
                href={SITE_GITHUB_URL}
                rel="noreferrer"
                target="_blank"
              >
                github.com/AdiRishi/promptrc
              </a>
            </p>
          </Section>

          <p className="mt-6 text-meta text-fg-faint">
            Manual page promptrc(1), press <b>q</b> or <b>esc</b> to quit
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="font-extrabold text-fg">{title}</h2>
      <div className="pl-[4ch] text-fg-dim max-sm:pl-[2ch]">{children}</div>
    </section>
  )
}

function Row({ term, children }: { term: ReactNode; children: ReactNode }) {
  return (
    <>
      <dt className="[overflow-wrap:anywhere]">{term}</dt>
      <dd className="max-sm:mb-2 max-sm:pl-[2ch]">{children}</dd>
    </>
  )
}
