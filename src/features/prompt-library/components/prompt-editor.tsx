import { ArrowDown, ArrowUp, ImageIcon, Plus, X } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { KeyCombo } from '@/components/ui/kbd'
import { KIND_GLYPHS, KIND_TEXT_CLASS } from '@/features/prompt-library/components/kind-mark'
import {
  PROMPT_KIND_DEFINITIONS,
  PROMPT_KINDS,
  getPromptKindDefinition,
} from '@/features/prompt-library/model/prompt-kinds'
import {
  joinSequenceStepsForEditing,
  splitSequenceStepsForEditing,
} from '@/features/prompt-library/model/prompt-sequences'
import { extractPromptVariables } from '@/features/prompt-library/model/prompt-templates'
import { formatImageSize } from '@/features/prompt-library/rendering/prompt-body-markdown'
import { formatCatalogNumber } from '@/features/prompt-library/rendering/prompt-library-formatting'
import {
  type ComposerState,
  type PromptDraft,
  type PromptKind,
} from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

export type PromptImagePasteRequest = {
  files: File[]
  selectionEnd: number
  selectionStart: number
}

type DraftChangeHandler = <TFieldName extends keyof PromptDraft>(
  field: TFieldName,
  value: PromptDraft[TFieldName],
) => void

type PromptEditorProps = {
  composer: ComposerState
  categories: string[]
  catalogNumber: number | undefined
  titleInputRef: React.RefObject<HTMLInputElement | null>
  onCancel: () => void
  onSave: () => void
  onDraftChange: DraftChangeHandler
  onPasteImages: (request: PromptImagePasteRequest) => void
}

const fieldShell =
  'rounded-xl bg-paper-raised shadow-[inset_0_0_0_1px_var(--rule-strong)] transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--vermilion)]'

export function PromptEditor({
  composer,
  categories,
  catalogNumber,
  titleInputRef,
  onCancel,
  onSave,
  onDraftChange,
  onPasteImages,
}: PromptEditorProps) {
  const id = useId()
  const { draft } = composer
  const definition = getPromptKindDefinition(draft.kind)
  const variables = extractPromptVariables(draft.body)
  // The step editor owns its own array while editing so that empty steps and
  // trailing whitespace survive; the draft body is always the joined result.
  const [steps, setSteps] = useState(() => splitSequenceStepsForEditing(draft.body))

  const changeKind = (kind: PromptKind) => {
    if (kind === draft.kind) {
      return
    }

    if (kind === 'sequence') {
      const nextSteps = draft.body.trim() ? [draft.body] : ['']

      setSteps(nextSteps)
      onDraftChange('body', joinSequenceStepsForEditing(nextSteps))
    } else if (draft.kind === 'sequence') {
      onDraftChange('body', steps.filter((step) => step.trim()).join('\n\n'))
    }

    onDraftChange('kind', kind)
  }

  const updateSteps = (nextSteps: string[]) => {
    setSteps(nextSteps)
    onDraftChange('body', joinSequenceStepsForEditing(nextSteps))
  }

  const handleBodyPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageFiles = getClipboardImageFiles(event.clipboardData)

    if (imageFiles.length === 0) {
      return
    }

    event.preventDefault()
    onPasteImages({
      files: imageFiles,
      selectionEnd: event.currentTarget.selectionEnd,
      selectionStart: event.currentTarget.selectionStart,
    })
  }

  return (
    <form
      aria-label={composer.mode === 'new' ? 'New entry' : `Editing ${draft.title || 'entry'}`}
      className="flex h-full min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
    >
      <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-rule bg-paper/85 px-3 backdrop-blur-md md:px-5">
        <span className="font-display text-[18px] text-ink italic">
          {composer.mode === 'new' ? 'New entry' : 'Editing'}
        </span>
        {composer.mode === 'edit' ? (
          <span className="font-mono text-[10.5px] text-ink-faint">
            {formatCatalogNumber(catalogNumber)}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          <Button onClick={onCancel} size="sm" type="button" variant="ghost">
            Cancel
            <KeyCombo className="hidden lg:inline-flex" keys={['Esc']} />
          </Button>
          <Button size="sm" type="submit">
            {composer.mode === 'new' ? 'Keep it' : 'Save'}
            <KeyCombo
              className="hidden lg:inline-flex [&_kbd]:bg-white/15 [&_kbd]:text-primary-foreground [&_kbd]:shadow-none"
              keys={['Mod', 'Enter']}
            />
          </Button>
        </div>
      </div>

      <div className="scrollbar-quiet min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[46rem] animate-rise flex-col gap-7 px-6 pt-8 pb-28 md:px-10 md:pt-10">
          <fieldset>
            <legend className="label-caps mb-2.5">What is it?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PROMPT_KINDS.map((kind) => {
                const selected = draft.kind === kind

                return (
                  // The visible name is dynamic text; the radio carries an aria-label.
                  // oxlint-disable-next-line jsx-a11y/label-has-associated-control
                  <label
                    className={cn(
                      'group relative flex cursor-pointer flex-col gap-1 rounded-xl px-3 py-2.5 transition-[background-color,box-shadow] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60',
                      selected
                        ? 'bg-paper-raised shadow-[inset_0_0_0_1.5px_currentColor]'
                        : 'shadow-[inset_0_0_0_1px_var(--rule)] hover:bg-paper-raised',
                      selected ? KIND_TEXT_CLASS[kind] : 'text-ink-muted',
                    )}
                    key={kind}
                  >
                    <input
                      aria-label={PROMPT_KIND_DEFINITIONS[kind].label}
                      checked={selected}
                      className="sr-only"
                      name={`${id}-kind`}
                      onChange={() => changeKind(kind)}
                      type="radio"
                      value={kind}
                    />
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'font-display text-[20px] leading-none',
                          KIND_TEXT_CLASS[kind],
                        )}
                      >
                        {KIND_GLYPHS[kind]}
                      </span>
                      <span
                        className={cn(
                          'text-[13px] font-medium',
                          selected ? 'text-ink' : 'text-ink-soft',
                        )}
                      >
                        {PROMPT_KIND_DEFINITIONS[kind].label}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            <p className="mt-2 text-[12.5px] text-ink-muted">{definition.description}</p>
          </fieldset>

          <div>
            <label className="sr-only" htmlFor={`${id}-title`}>
              Title
            </label>
            <input
              autoComplete="off"
              className={cn(
                'font-display w-full bg-transparent text-[clamp(1.9rem,4vw,2.6rem)] leading-[1.1] text-ink outline-none placeholder:text-ink-faint/70',
                draft.kind === 'fragment' && 'italic',
              )}
              id={`${id}-title`}
              onChange={(event) => onDraftChange('title', event.target.value)}
              placeholder="Give it a name"
              ref={titleInputRef}
              value={draft.title}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <label className={cn(fieldShell, 'flex h-10 items-center gap-2 px-3')}>
                <span className="label-caps text-[9.5px]">Collection</span>
                <input
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-faint"
                  list={`${id}-categories`}
                  onChange={(event) => onDraftChange('category', event.target.value)}
                  placeholder="Personal"
                  value={draft.category}
                />
              </label>
              <datalist id={`${id}-categories`}>
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <label className={cn(fieldShell, 'flex h-10 items-center gap-2 px-3')}>
                <span className="label-caps text-[9.5px]">Tags</span>
                <input
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-ink outline-none placeholder:text-ink-faint"
                  onChange={(event) => onDraftChange('tagsInput', event.target.value)}
                  placeholder="#writing #review"
                  spellCheck={false}
                  value={draft.tagsInput}
                />
              </label>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="label-caps">{definition.bodyLabel}</span>
              <span className="text-[11.5px] text-ink-faint">
                Markdown · <code className="font-mono">{'{{name}}'}</code> makes a blank
              </span>
            </div>

            {draft.kind === 'sequence' ? (
              <SequenceStepsEditor
                onChange={updateSteps}
                placeholder={definition.bodyPlaceholder}
                steps={steps}
              />
            ) : (
              <div className={fieldShell}>
                <label className="sr-only" htmlFor={`${id}-body`}>
                  {definition.bodyLabel}
                </label>
                <textarea
                  className="block [field-sizing:content] min-h-[16rem] w-full resize-none bg-transparent px-4 py-3.5 font-mono text-[13.5px] leading-[1.7] text-ink outline-none placeholder:text-ink-faint"
                  id={`${id}-body`}
                  onChange={(event) => onDraftChange('body', event.target.value)}
                  onPaste={handleBodyPaste}
                  placeholder={definition.bodyPlaceholder}
                  spellCheck
                  value={draft.body}
                />
              </div>
            )}

            {variables.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="label-caps mr-1 text-[9.5px]">Blanks</span>
                {variables.map((variable) => (
                  <span
                    className="rounded-md bg-vermilion-wash px-1.5 py-0.5 font-mono text-[11.5px] text-vermilion-ink"
                    key={variable.name}
                  >
                    {variable.name}
                    {variable.fallback ? (
                      <span className="opacity-60"> · {variable.fallback}</span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}

            {draft.images.length > 0 ? (
              <div aria-label="Attached images" className="mt-3 grid gap-2 sm:grid-cols-2">
                {draft.images.map((image) => (
                  <div
                    className="flex items-center gap-2 rounded-lg bg-paper-raised px-3 py-2 text-[12.5px] shadow-[inset_0_0_0_1px_var(--rule)]"
                    key={image.id}
                  >
                    <ImageIcon aria-hidden="true" className="size-3.5 text-ink-muted" />
                    <span className="min-w-0 flex-1 truncate text-ink">{image.fileName}</span>
                    <span className="font-mono text-[11px] text-ink-faint">
                      {formatImageSize(image.size)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <label className="label-caps mb-2 block" htmlFor={`${id}-notes`}>
              {definition.notesLabel}
            </label>
            <div className={fieldShell}>
              <textarea
                className="font-reading block [field-sizing:content] min-h-[5.5rem] w-full resize-none bg-transparent px-4 py-3 text-[15.5px] leading-[1.6] text-ink-soft italic outline-none placeholder:text-ink-faint"
                id={`${id}-notes`}
                onChange={(event) => onDraftChange('notes', event.target.value)}
                placeholder={definition.notesPlaceholder}
                value={draft.notes}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

function SequenceStepsEditor({
  steps,
  placeholder,
  onChange,
}: {
  steps: string[]
  placeholder: string
  onChange: (steps: string[]) => void
}) {
  const id = useId()

  const move = (index: number, offset: number) => {
    const target = index + offset

    if (target < 0 || target >= steps.length) {
      return
    }

    const next = [...steps]
    const [step] = next.splice(index, 1)

    next.splice(target, 0, step ?? '')
    onChange(next)
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((step, index) => (
        // Steps have no identity beyond their position while being edited.
        // oxlint-disable-next-line react/no-array-index-key
        <li className="group grid grid-cols-[1.9rem_minmax(0,1fr)] gap-2.5" key={index}>
          <span className="font-display pt-3 text-right text-[17px] text-kind-sequence italic">
            {index + 1}.
          </span>
          <div className={cn(fieldShell, 'relative')}>
            <label className="sr-only" htmlFor={`${id}-step-${index}`}>
              Step {index + 1}
            </label>
            <textarea
              className="block [field-sizing:content] min-h-[5.5rem] w-full resize-none bg-transparent py-3 pr-12 pl-4 font-mono text-[13.5px] leading-[1.7] text-ink outline-none placeholder:text-ink-faint"
              id={`${id}-step-${index}`}
              onChange={(event) =>
                onChange(
                  steps.map((current, stepIndex) =>
                    stepIndex === index ? event.target.value : current,
                  ),
                )
              }
              placeholder={index === 0 ? placeholder : 'Then…'}
              value={step}
            />
            <div className="absolute top-2 right-2 flex flex-col gap-0.5 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <Button
                aria-label={`Move step ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <ArrowUp aria-hidden="true" className="size-3.5" />
              </Button>
              <Button
                aria-label={`Move step ${index + 1} down`}
                disabled={index === steps.length - 1}
                onClick={() => move(index, 1)}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <ArrowDown aria-hidden="true" className="size-3.5" />
              </Button>
              <Button
                aria-label={`Remove step ${index + 1}`}
                disabled={steps.length === 1}
                onClick={() => onChange(steps.filter((_, stepIndex) => stepIndex !== index))}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" className="size-3.5" />
              </Button>
            </div>
          </div>
        </li>
      ))}
      <li className="pl-[2.525rem]">
        <Button onClick={() => onChange([...steps, ''])} size="sm" type="button" variant="outline">
          <Plus aria-hidden="true" />
          Add a step
        </Button>
      </li>
    </ol>
  )
}

function getClipboardImageFiles(data: DataTransfer) {
  const itemFiles = Array.from(data.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file))

  if (itemFiles.length > 0) {
    return itemFiles
  }

  return Array.from(data.files).filter((file) => file.type.startsWith('image/'))
}
