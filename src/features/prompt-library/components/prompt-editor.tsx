import { type ReactNode, useId, useState } from 'react'

import { Choice, ChoiceGroup } from '@/components/ui/choice'
import { KeyCombo } from '@/components/ui/kbd'
import { Pane } from '@/components/ui/pane'
import { KIND_GLYPHS, KIND_TEXT_CLASS } from '@/features/prompt-library/components/kind-mark'
import { promptPath } from '@/features/prompt-library/components/prompt-reader'
import { hasPendingPromptImageUploads } from '@/features/prompt-library/model/prompt-images'
import { PROMPT_KINDS, getPromptKindDefinition } from '@/features/prompt-library/model/prompt-kinds'
import {
  joinSequenceStepsForEditing,
  splitSequenceStepsForEditing,
} from '@/features/prompt-library/model/prompt-sequences'
import { extractPromptVariables } from '@/features/prompt-library/model/prompt-templates'
import { formatImageSize } from '@/features/prompt-library/rendering/prompt-body-markdown'
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
  titleInputRef: React.RefObject<HTMLInputElement | null>
  onCancel: () => void
  onSave: () => void
  onDraftChange: DraftChangeHandler
  onPasteImages: (request: PromptImagePasteRequest) => void
}

const textareaClass =
  'block w-full resize-none bg-transparent text-[13px] leading-[1.65] text-fg outline-none [field-sizing:content] placeholder:text-fg-faint'

export function PromptEditor({
  composer,
  categories,
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
  // Uploads resolve by rewriting the draft body; changing kind mid-upload would
  // let the step editor's copy of the body resurrect the pending marker.
  const isUploading = hasPendingPromptImageUploads(draft.body)
  const path =
    composer.mode === 'new'
      ? draft.title.trim()
        ? promptPath({ category: draft.category || 'personal', title: draft.title })
        : '[No Name]'
      : promptPath({ category: draft.category || 'personal', title: draft.title || 'untitled' })

  const changeKind = (kind: PromptKind) => {
    if (kind === draft.kind || isUploading) {
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
    <Pane
      aside={<span className="font-bold text-green">-- INSERT --</span>}
      className="h-full"
      index={3}
      title={
        <span>
          {path} <span className="text-accent">[+]</span>
        </span>
      }
    >
      <form
        aria-label={composer.mode === 'new' ? 'New entry' : `Editing ${draft.title || 'entry'}`}
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <div className="flex flex-wrap items-center gap-x-[2ch] gap-y-1 border-b border-line bg-bg-sunken/60 px-[2ch] pt-3 pb-1.5 text-[12.5px]">
          <button
            className="inline-flex items-center gap-[1ch] rounded-sm bg-accent px-[1ch] font-bold text-accent-fg hover:brightness-110"
            type="submit"
          >
            :w {composer.mode === 'new' ? 'keep it' : 'save'}
          </button>
          <button className="text-fg-dim hover:text-fg" onClick={onCancel} type="button">
            :q cancel
          </button>
          <span className="ml-auto hidden items-center gap-[1ch] text-fg-faint lg:flex">
            <KeyCombo keys={['Mod', 'Enter']} /> save
            <KeyCombo keys={['Esc']} /> cancel
          </span>
        </div>

        <div className="scrollbar-term min-h-0 flex-1 overflow-y-auto px-[2ch] pt-3 pb-6 text-[13px]">
          <p className="text-fg-faint">---</p>
          <FrontmatterRow label="kind">
            <ChoiceGroup className="flex flex-wrap items-center gap-x-[1ch] gap-y-1" label="Kind">
              {PROMPT_KINDS.map((kind) => {
                const selected = draft.kind === kind

                return (
                  <Choice
                    checked={selected}
                    className={cn(
                      'rounded-sm px-[0.75ch] transition-colors',
                      selected
                        ? cn('bg-bg-sel font-bold', KIND_TEXT_CLASS[kind])
                        : 'text-fg-faint hover:text-fg',
                      isUploading && !selected && 'pointer-events-none opacity-40',
                    )}
                    key={kind}
                    label={getPromptKindDefinition(kind).label}
                    name={`${id}-kind`}
                    onSelect={changeKind}
                    title={getPromptKindDefinition(kind).description}
                    value={kind}
                  >
                    <span className={KIND_TEXT_CLASS[kind]}>{KIND_GLYPHS[kind]}</span> {kind}
                  </Choice>
                )
              })}
            </ChoiceGroup>
          </FrontmatterRow>
          <FrontmatterRow htmlFor={`${id}-title`} label="title">
            <input
              autoComplete="off"
              className={cn(
                'voice-title w-full bg-transparent text-[18px] leading-[1.4] text-fg outline-none placeholder:font-normal placeholder:text-fg-faint',
                draft.kind === 'fragment' && 'voice-note',
              )}
              id={`${id}-title`}
              onChange={(event) => onDraftChange('title', event.target.value)}
              placeholder="give it a name"
              ref={titleInputRef}
              value={draft.title}
            />
          </FrontmatterRow>
          <FrontmatterRow htmlFor={`${id}-category`} label="category">
            <input
              autoComplete="off"
              className="w-full bg-transparent text-blue outline-none placeholder:text-fg-faint"
              id={`${id}-category`}
              list={`${id}-categories`}
              onChange={(event) => onDraftChange('category', event.target.value)}
              placeholder="personal"
              value={draft.category}
            />
            <datalist id={`${id}-categories`}>
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </FrontmatterRow>
          <FrontmatterRow htmlFor={`${id}-tags`} label="tags">
            <input
              autoComplete="off"
              className="w-full bg-transparent text-magenta outline-none placeholder:text-fg-faint"
              id={`${id}-tags`}
              onChange={(event) => onDraftChange('tagsInput', event.target.value)}
              placeholder="#writing #review"
              spellCheck={false}
              value={draft.tagsInput}
            />
          </FrontmatterRow>
          <p className="text-fg-faint">---</p>
          <p className="mt-1 text-[12px] text-fg-faint">
            #{' '}
            {isUploading
              ? 'images are still uploading — the kind can change once they finish'
              : definition.description}
          </p>

          <div className="mt-4">
            <div className="mb-1 flex items-baseline justify-between gap-[2ch] text-[12px]">
              <label
                className="text-cyan"
                htmlFor={draft.kind === 'sequence' ? undefined : `${id}-body`}
              >
                ## {definition.bodyLabel.toLowerCase()}
              </label>
              <span className="text-fg-faint">
                markdown · <span className="text-accent">{'{{name}}'}</span> makes a blank
              </span>
            </div>

            {draft.kind === 'sequence' ? (
              <SequenceStepsEditor
                onChange={updateSteps}
                placeholder={definition.bodyPlaceholder}
                steps={steps}
              />
            ) : (
              <textarea
                className={cn(
                  textareaClass,
                  'min-h-[12rem] border-l-2 border-line pl-[1.5ch] focus:border-accent',
                )}
                id={`${id}-body`}
                onChange={(event) => onDraftChange('body', event.target.value)}
                onPaste={handleBodyPaste}
                placeholder={definition.bodyPlaceholder}
                spellCheck
                value={draft.body}
              />
            )}

            {variables.length > 0 ? (
              <p className="mt-2 text-[12px] text-fg-faint">
                # blanks:{' '}
                {variables.map((variable, index) => (
                  <span key={variable.name}>
                    <span className="text-accent">
                      ‹{variable.name}
                      {variable.fallback ? `=${variable.fallback}` : ''}›
                    </span>
                    {index < variables.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
            ) : null}

            {draft.images.length > 0 ? (
              <ul aria-label="Attached images" className="mt-2 text-[12px] text-fg-dim">
                {draft.images.map((image) => (
                  <li key={image.id}>
                    <span className="text-fg-faint"># attached </span>
                    {image.fileName}{' '}
                    <span className="text-fg-faint">({formatImageSize(image.size)})</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="mt-6">
            <label className="mb-1 block text-[12px] text-cyan" htmlFor={`${id}-notes`}>
              ## {definition.notesLabel.toLowerCase()}
            </label>
            <textarea
              className={cn(
                textareaClass,
                'voice-note min-h-[4.5rem] border-l-2 border-line pl-[1.5ch] text-fg-dim focus:border-accent',
              )}
              id={`${id}-notes`}
              onChange={(event) => onDraftChange('notes', event.target.value)}
              placeholder={definition.notesPlaceholder}
              value={draft.notes}
            />
          </div>

          <div aria-hidden="true" className="mt-4 text-blue/60">
            {Array.from({ length: 4 }, (_, index) => (
              <p key={index}>~</p>
            ))}
          </div>
        </div>
      </form>
    </Pane>
  )
}

function FrontmatterRow({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[10ch_minmax(0,1fr)] items-baseline gap-x-[1ch] py-0.5">
      {htmlFor ? (
        <label className="text-yellow" htmlFor={htmlFor}>
          {label}:
        </label>
      ) : (
        <span className="text-yellow">{label}:</span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
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
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => (
        // Steps have no identity beyond their position while being edited.
        // oxlint-disable-next-line react/no-array-index-key
        <li key={index}>
          <div className="mb-0.5 flex items-center gap-[1ch] text-[12px]">
            <label className="font-semibold text-green" htmlFor={`${id}-step-${index}`}>
              » step {index + 1}
            </label>
            <span aria-hidden="true" className="h-0 flex-1 border-t border-dashed border-line" />
            <StepButton
              disabled={index === 0}
              label={`Move step ${index + 1} up`}
              onClick={() => move(index, -1)}
            >
              ↑
            </StepButton>
            <StepButton
              disabled={index === steps.length - 1}
              label={`Move step ${index + 1} down`}
              onClick={() => move(index, 1)}
            >
              ↓
            </StepButton>
            <StepButton
              disabled={steps.length === 1}
              label={`Remove step ${index + 1}`}
              onClick={() => onChange(steps.filter((_, stepIndex) => stepIndex !== index))}
            >
              rm
            </StepButton>
          </div>
          <textarea
            className={cn(
              textareaClass,
              'min-h-[4.5rem] border-l-2 border-green/50 pl-[1.5ch] focus:border-accent',
            )}
            id={`${id}-step-${index}`}
            onChange={(event) =>
              onChange(
                steps.map((current, stepIndex) =>
                  stepIndex === index ? event.target.value : current,
                ),
              )
            }
            placeholder={index === 0 ? placeholder : 'then…'}
            value={step}
          />
        </li>
      ))}
      <li>
        <button
          className="text-[12.5px] text-green hover:underline"
          onClick={() => onChange([...steps, ''])}
          type="button"
        >
          + add a step
        </button>
      </li>
    </ol>
  )
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      aria-label={label}
      className="rounded-sm px-[0.5ch] text-fg-faint transition-colors hover:bg-bg-hover hover:text-fg disabled:opacity-30"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
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
