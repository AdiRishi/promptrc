import { type ReactNode, useId, useState } from 'react'

import { Choice, ChoiceGroup } from '@/components/ui/choice'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { KeyCombo } from '@/components/ui/kbd'
import { type PromptCaptureInput } from '@/features/prompt-library/commands/prompt-library-command-executor'
import { KIND_GLYPHS, KIND_TEXT_CLASS } from '@/features/prompt-library/components/kind-mark'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { deriveTitleFromBody } from '@/features/prompt-library/model/prompt-library-integrity'
import { type PromptKind } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

type QuickCaptureDialogProps = {
  open: boolean
  defaultKind: PromptKind
  defaultCategory: string
  defaultTags: string
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
        className="top-[18vh] translate-y-0 gap-0 p-0 sm:max-w-[680px]"
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
  onCapture,
  onClose,
}: Omit<QuickCaptureDialogProps, 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const id = useId()
  const [kind, setKind] = useState<PromptKind>(defaultKind)
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const [tagsInput, setTagsInput] = useState(defaultTags)
  const [now] = useState(() => new Date().toISOString().slice(0, 16).replace('T', ' '))
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
    <form
      className="relative"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <DialogTitle className="pane-title text-accent">capture</DialogTitle>
      <span className="pane-title-right">{now}</span>
      <DialogDescription className="sr-only">
        Capture a prompt, fragment, sequence or benchmark. Press Command or Control with Enter to
        keep it.
      </DialogDescription>

      <div className="px-[2ch] pt-4">
        <ChoiceGroup
          className="flex flex-wrap items-center gap-x-[1ch] gap-y-1 text-[12.5px]"
          label="Kind"
        >
          <span className="text-yellow">kind:</span>
          {PROMPT_KINDS.map((option) => {
            const selected = option === kind

            return (
              <Choice
                checked={selected}
                className={cn(
                  'rounded-sm px-[0.75ch] transition-colors',
                  selected
                    ? cn('bg-bg-sel font-bold', KIND_TEXT_CLASS[option])
                    : 'text-fg-faint hover:text-fg',
                )}
                key={option}
                label={PROMPT_KIND_DEFINITIONS[option].label}
                name={`${id}-kind`}
                onSelect={setKind}
                title={PROMPT_KIND_DEFINITIONS[option].description}
                value={option}
              >
                <span className={KIND_TEXT_CLASS[option]}>{KIND_GLYPHS[option]}</span> {option}
              </Choice>
            )
          })}
        </ChoiceGroup>

        <div className="mt-3 flex gap-[1ch]">
          <span
            aria-hidden="true"
            className={cn('pt-[0.1em] text-[15px] font-bold', KIND_TEXT_CLASS[kind])}
          >
            {KIND_GLYPHS[kind]}
          </span>
          <label className="sr-only" htmlFor={`${id}-body`}>
            {PROMPT_KIND_DEFINITIONS[kind].bodyLabel}
          </label>
          <textarea
            // The whole point of capture is zero friction: focus the prompt line.
            // oxlint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="[field-sizing:content] max-h-[40vh] min-h-[7.5rem] w-full resize-none bg-transparent text-[14px] leading-[1.65] text-fg outline-none placeholder:text-fg-faint"
            id={`${id}-body`}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={submitOnModEnter}
            placeholder={PLACEHOLDERS[kind]}
            value={body}
          />
        </div>
      </div>

      <div className="grid gap-x-[2ch] gap-y-1 border-t border-dashed border-line px-[2ch] py-2.5 text-[12.5px] sm:grid-cols-[1.4fr_1fr_1fr]">
        <CaptureField label="title">
          <input
            autoComplete="off"
            className="w-full bg-transparent text-fg outline-none placeholder:text-fg-faint"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={submitOnModEnter}
            placeholder={derivedTitle || 'from the first line'}
            value={title}
          />
        </CaptureField>
        <CaptureField label="category">
          <input
            autoComplete="off"
            className="w-full bg-transparent text-blue outline-none placeholder:text-fg-faint"
            onChange={(event) => setCategory(event.target.value)}
            onKeyDown={submitOnModEnter}
            placeholder="personal"
            value={category}
          />
        </CaptureField>
        <CaptureField label="tags">
          <input
            autoComplete="off"
            className="w-full bg-transparent text-magenta outline-none placeholder:text-fg-faint"
            onChange={(event) => setTagsInput(event.target.value)}
            onKeyDown={submitOnModEnter}
            placeholder="#idea"
            spellCheck={false}
            value={tagsInput}
          />
        </CaptureField>
      </div>

      <div className="flex items-center gap-[2ch] border-t border-line bg-bg-sunken/60 px-[2ch] py-2 text-[12px] text-fg-faint">
        <span className="hidden items-center gap-[1ch] sm:flex">
          <KeyCombo keys={['Mod', 'Enter']} /> keep
        </span>
        <span className="hidden items-center gap-[1ch] sm:flex">
          <KeyCombo keys={['Esc']} /> discard
        </span>
        <span className="ml-auto flex items-center gap-[1ch]">
          <button className="px-[1ch] text-fg-dim hover:text-fg" onClick={onClose} type="button">
            :q!
          </button>
          <button
            className="rounded-sm bg-accent px-[1ch] font-bold text-accent-fg transition hover:brightness-110 disabled:opacity-40"
            disabled={!body.trim()}
            type="submit"
          >
            :w keep it
          </button>
        </span>
      </div>
    </form>
  )
}

function CaptureField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 items-baseline gap-[1ch]">
      <span className="shrink-0 text-yellow">{label}:</span>
      {children}
    </label>
  )
}
