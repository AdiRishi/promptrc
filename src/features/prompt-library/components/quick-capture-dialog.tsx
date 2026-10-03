import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Choice, ChoiceGroup } from '@/components/ui/choice'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { KeyCombo } from '@/components/ui/kbd'
import { type PromptCaptureInput } from '@/features/prompt-library/commands/prompt-library-command-executor'
import { KIND_GLYPHS, KIND_TEXT_CLASS } from '@/features/prompt-library/components/kind-mark'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { deriveTitleFromBody } from '@/features/prompt-library/model/prompt-library-integrity'
import { formatLongDate } from '@/features/prompt-library/rendering/prompt-library-formatting'
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

/**
 * The fastest way in: paste or type, pick what it is, keep it. Title, collection
 * and tags are optional — a title is derived from the first line when blank.
 */
export function QuickCaptureDialog({ open, onOpenChange, ...props }: QuickCaptureDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[560px]" showCloseButton={false}>
        {/* Remount per opening so every capture starts from a clean card. */}
        {open ? <CaptureCard onClose={() => onOpenChange(false)} {...props} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function CaptureCard({
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
  const [today] = useState(() => formatLongDate(new Date().toISOString()))
  const derivedTitle = deriveTitleFromBody(body)

  // ⌘/Ctrl+Enter keeps the card from any field.
  const submitOnModEnter = (event: React.KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  const submit = () => {
    if (onCapture({ kind, body, title, category, tagsInput })) {
      onClose()
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-rule px-6 pt-5 pb-4">
        <div>
          <DialogTitle className="text-[26px] italic">Capture</DialogTitle>
          <DialogDescription className="mt-0.5 text-[12.5px]">
            Keep it now, tidy it later.
          </DialogDescription>
        </div>
        <span className="mt-1.5 rotate-[-2deg] rounded-[4px] px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-vermilion uppercase shadow-[inset_0_0_0_1.5px_var(--vermilion)]">
          {today}
        </span>
      </div>

      <div className="px-6 pt-4">
        <ChoiceGroup className="flex flex-wrap gap-1.5" label="Kind">
          {PROMPT_KINDS.map((option) => {
            const selected = option === kind

            return (
              <Choice
                checked={selected}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full pr-3 pl-2.5 text-[12.5px] font-medium transition-[background-color,box-shadow]',
                  selected
                    ? cn(
                        'bg-paper shadow-[inset_0_0_0_1.5px_currentColor]',
                        KIND_TEXT_CLASS[option],
                      )
                    : 'text-ink-muted shadow-[inset_0_0_0_1px_var(--rule)] hover:text-ink',
                )}
                key={option}
                label={PROMPT_KIND_DEFINITIONS[option].label}
                name={`${id}-kind`}
                onSelect={setKind}
                title={PROMPT_KIND_DEFINITIONS[option].description}
                value={option}
              >
                <span
                  aria-hidden="true"
                  className={cn('font-display text-[16px] leading-none', KIND_TEXT_CLASS[option])}
                >
                  {KIND_GLYPHS[option]}
                </span>
                <span className={selected ? 'text-ink' : undefined}>
                  {PROMPT_KIND_DEFINITIONS[option].label}
                </span>
              </Choice>
            )
          })}
        </ChoiceGroup>

        <label className="sr-only" htmlFor={`${id}-body`}>
          {PROMPT_KIND_DEFINITIONS[kind].bodyLabel}
        </label>
        <textarea
          // The whole point of capture is zero friction: focus the writing surface.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className="ruled font-reading mt-4 block [field-sizing:content] max-h-[45vh] min-h-[10rem] w-full resize-none bg-transparent pt-[0.35rem] text-[17px] leading-[2rem] text-ink outline-none placeholder:text-ink-faint placeholder:italic"
          id={`${id}-body`}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={submitOnModEnter}
          placeholder={
            kind === 'fragment'
              ? 'The exact words that worked…'
              : kind === 'benchmark'
                ? 'The test prompt, exactly as you send it…'
                : kind === 'sequence'
                  ? 'The first step — add the rest when you edit it…'
                  : 'What just worked?'
          }
          value={body}
        />
      </div>

      <div className="grid gap-2 px-6 pt-3 pb-4 sm:grid-cols-[1.4fr_1fr_1fr]">
        <CaptureField label="Title">
          <input
            autoComplete="off"
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={submitOnModEnter}
            placeholder={derivedTitle || 'From the first line'}
            value={title}
          />
        </CaptureField>
        <CaptureField label="Collection">
          <input
            autoComplete="off"
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
            onChange={(event) => setCategory(event.target.value)}
            onKeyDown={submitOnModEnter}
            placeholder="Personal"
            value={category}
          />
        </CaptureField>
        <CaptureField label="Tags">
          <input
            autoComplete="off"
            className="w-full bg-transparent font-mono text-[12px] text-ink outline-none placeholder:text-ink-faint"
            onChange={(event) => setTagsInput(event.target.value)}
            onKeyDown={submitOnModEnter}
            placeholder="#idea"
            spellCheck={false}
            value={tagsInput}
          />
        </CaptureField>
      </div>

      <div className="flex items-center gap-3 border-t border-rule bg-paper-sunken/60 px-6 py-3">
        <span className="hidden text-[12px] text-ink-muted sm:inline">
          <KeyCombo keys={['Mod', 'Enter']} /> to keep · <KeyCombo keys={['Esc']} /> to discard
        </span>
        <div className="ml-auto flex gap-2">
          <Button onClick={onClose} size="sm" type="button" variant="ghost">
            Discard
          </Button>
          <Button disabled={!body.trim()} size="sm" type="submit">
            Keep it
          </Button>
        </div>
      </div>
    </form>
  )
}

function CaptureField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex h-10 flex-col justify-center rounded-lg bg-paper px-3 shadow-[inset_0_0_0_1px_var(--rule)] focus-within:shadow-[inset_0_0_0_1.5px_var(--vermilion)]">
      <span className="label-caps text-[8.5px] leading-none">{label}</span>
      {children}
    </label>
  )
}
