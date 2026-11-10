import { type ReactNode, useId, useState } from 'react'

import { Bracketed, Choice, ChoiceGroup } from '@/components/ui/choice'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { KeyAction, KeyActionBar } from '@/components/ui/key-action'
import { type PromptCaptureInput } from '@/features/prompt-library/commands/prompt-library-command-executor'
import { KindMark } from '@/features/prompt-library/components/kind-mark'
import { ProjectPicker } from '@/features/prompt-library/components/project-picker'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { deriveTitleFromBody } from '@/features/prompt-library/model/prompt-library-integrity'
import { type PromptProject } from '@/features/prompt-library/model/prompt-projects'
import { type PromptKind } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

type QuickCaptureDialogProps = {
  open: boolean
  defaultKind: PromptKind
  defaultCategory: string
  defaultTags: string
  projects: readonly PromptProject[]
  onOpenChange: (open: boolean) => void
  onCapture: (input: PromptCaptureInput) => boolean
}

const PLACEHOLDERS: Record<PromptKind, string> = {
  prompt: 'what just worked?',
  fragment: 'the exact words that landed…',
  sequence: 'the first step — add the rest in the editor…',
  benchmark: 'the test prompt, exactly as you send it…',
}

/**
 * The fastest way in: a floating shell. Type or paste, pick the kind, ⌘⏎.
 * Title, category and tags are optional; the title comes from the first line.
 */
export function QuickCaptureDialog({ open, onOpenChange, ...props }: QuickCaptureDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="top-[18vh] max-h-[calc(100dvh-18vh-1rem)] translate-y-0 gap-0 p-0 max-sm:top-[3vh] max-sm:max-h-[calc(100dvh-3vh-1rem)] sm:max-w-[76ch]"
        showCloseButton={false}
      >
        {/* Remount per opening so every capture starts from a clean prompt. */}
        {open ? <CaptureShell onClose={() => onOpenChange(false)} {...props} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function CaptureShell({
  defaultKind,
  defaultCategory,
  defaultTags,
  projects,
  onCapture,
  onClose,
}: Omit<QuickCaptureDialogProps, 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const id = useId()
  const [kind, setKind] = useState<PromptKind>(defaultKind)
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const [tagsInput, setTagsInput] = useState(defaultTags)
  const [now] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
  )
  const derivedTitle = deriveTitleFromBody(body)

  const submit = () => {
    if (onCapture({ kind, body, title, category, tagsInput })) {
      onClose()
    }
  }

  // ⌘/Ctrl+Enter keeps the capture from any field.
  const submitOnModEnter = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  return (
    // The body line gives up height first, so keep and discard stay on screen.
    <form
      className="relative flex max-h-[inherit] flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <DialogTitle className="pane-title text-meta font-normal text-fg-dim">capture</DialogTitle>
      <span className="pane-title-right">{now}</span>
      <DialogDescription className="sr-only">
        Capture a prompt, fragment, sequence or benchmark. Press Command or Control with Enter to
        keep it.
      </DialogDescription>

      <div className="flex min-h-0 flex-col px-[3ch] pt-5">
        <ChoiceGroup className="-mx-[1ch] flex flex-wrap items-center" label="Kind">
          {PROMPT_KINDS.map((option) => {
            const selected = option === kind

            return (
              <Choice
                checked={selected}
                className={cn(
                  'inline-flex h-6 items-center transition-colors max-md:h-11',
                  selected ? 'font-semibold text-fg' : 'text-fg-dim hover:text-fg',
                )}
                key={option}
                label={PROMPT_KIND_DEFINITIONS[option].label}
                name={`${id}-kind`}
                onSelect={setKind}
                title={PROMPT_KIND_DEFINITIONS[option].description}
                value={option}
              >
                <Bracketed active={selected}>
                  <KindMark className="mr-[1ch] w-[1ch]" kind={option} label={false} />
                  {option}
                </Bracketed>
              </Choice>
            )
          })}
        </ChoiceGroup>

        <div className="mt-4 flex min-h-[3lh] gap-[1ch]">
          <span aria-hidden="true" className="-ml-[0.25ch] font-bold text-accent">
            ❯
          </span>
          <label className="sr-only" htmlFor={`${id}-body`}>
            {PROMPT_KIND_DEFINITIONS[kind].bodyLabel}
          </label>
          <textarea
            // The whole point of capture is zero friction: focus the prompt line.
            // oxlint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="[field-sizing:content] max-h-[40vh] min-h-[3lh] w-full resize-none bg-transparent text-body text-fg outline-none placeholder:text-fg-faint max-md:text-[16px]"
            id={`${id}-body`}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={submitOnModEnter}
            placeholder={PLACEHOLDERS[kind]}
            value={body}
          />
        </div>
      </div>

      <div className="shrink-0 px-[3ch] pt-2 pb-3">
        <CaptureField label="title">
          <input
            autoComplete="off"
            className="w-full bg-transparent text-fg outline-none placeholder:text-fg-faint max-md:text-[16px]"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={submitOnModEnter}
            placeholder={derivedTitle || 'from the first line'}
            value={title}
          />
        </CaptureField>
        <CaptureField htmlFor={`${id}-project`} label="project">
          <ProjectPicker
            id={`${id}-project`}
            onChange={setCategory}
            onKeyDown={submitOnModEnter}
            projects={projects}
            value={category}
          />
        </CaptureField>
        <CaptureField label="tags">
          <input
            autoComplete="off"
            className="w-full bg-transparent text-fg outline-none placeholder:text-fg-faint max-md:text-[16px]"
            onChange={(event) => setTagsInput(event.target.value)}
            onKeyDown={submitOnModEnter}
            placeholder="#idea"
            spellCheck={false}
            value={tagsInput}
          />
        </CaptureField>
      </div>

      <KeyActionBar className="mx-0 shrink-0 border-t border-line px-[2ch] py-2">
        <KeyAction
          disabled={!body.trim()}
          keys={['Mod', 'Enter']}
          label="keep it"
          primary
          type="submit"
        />
        <KeyAction keys={['Esc']} label="discard" onClick={onClose} />
      </KeyActionBar>
    </form>
  )
}

function CaptureField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string
  /** For fields that are more than one input (the project picker). */
  htmlFor?: string
  className?: string
  children: ReactNode
}) {
  const rowClass = cn(
    'flex min-h-8 min-w-0 items-center gap-[1ch] border-b border-line transition-colors focus-within:border-accent max-md:min-h-11',
    className,
  )

  if (htmlFor) {
    return (
      <div className={rowClass}>
        <label className="w-[9ch] shrink-0 text-fg-faint" htmlFor={htmlFor}>
          {label}:
        </label>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    )
  }

  return (
    <label className={rowClass}>
      <span className="w-[9ch] shrink-0 text-fg-faint">{label}:</span>
      {children}
    </label>
  )
}
