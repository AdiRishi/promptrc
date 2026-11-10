import { type ReactNode, useId, useState } from 'react'

import { Bracketed, Choice, ChoiceGroup } from '@/components/ui/choice'
import { useModKeyLabel } from '@/components/ui/kbd'
import { KeyAction, KeyActionBar } from '@/components/ui/key-action'
import { Pane } from '@/components/ui/pane'
import { KindMark } from '@/features/prompt-library/components/kind-mark'
import { ProjectPicker } from '@/features/prompt-library/components/project-picker'
import { promptPath } from '@/features/prompt-library/components/prompt-reader'
import { SectionLabel } from '@/features/prompt-library/components/section-label'
import { hasPendingPromptImageUploads } from '@/features/prompt-library/model/prompt-images'
import { PROMPT_KINDS, getPromptKindDefinition } from '@/features/prompt-library/model/prompt-kinds'
import { type PromptProject } from '@/features/prompt-library/model/prompt-projects'
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
  projects: readonly PromptProject[]
  titleInputRef: React.RefObject<HTMLInputElement | null>
  active?: boolean
  onCancel: () => void
  onSave: () => void
  onDraftChange: DraftChangeHandler
  onPasteImages: (request: PromptImagePasteRequest) => void
}

const textareaClass =
  'block w-full resize-none border-l-2 border-line bg-transparent pl-[2ch] text-fg outline-none [field-sizing:content] placeholder:text-fg-faint focus:border-accent max-md:text-[16px]'

const fieldClass =
  'w-full bg-transparent text-fg outline-none placeholder:text-fg-faint max-md:text-[16px]'

export function PromptEditor({
  composer,
  projects,
  titleInputRef,
  active,
  onCancel,
  onSave,
  onDraftChange,
  onPasteImages,
}: PromptEditorProps) {
  const id = useId()
  const modLabel = useModKeyLabel()
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
      active={active}
      className="h-full"
      index={3}
      title={
        <span>
          {path} <span className="text-fg">[+]</span>
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
        <div className="border-b border-line px-[2ch] pt-4 pb-3 md:px-[3ch]">
          <KeyActionBar>
            <KeyAction
              keyLabel={`${modLabel} ⏎`}
              label={composer.mode === 'new' ? 'keep it' : 'save'}
              primary
              type="submit"
            />
            <KeyAction keyLabel="esc" label="cancel" onClick={onCancel} />
          </KeyActionBar>
        </div>

        <div className="scrollbar-term min-h-0 flex-1 overflow-y-auto px-[2ch] pt-5 pb-10 md:px-[3ch]">
          <div className="measure">
            <p aria-hidden="true" className="text-line-strong">
              ---
            </p>
            <FrontmatterRow label="kind">
              <ChoiceGroup
                className="-mx-[0.75ch] flex flex-wrap items-center gap-y-1"
                label="Kind"
              >
                {PROMPT_KINDS.map((kind) => {
                  const selected = draft.kind === kind

                  return (
                    <Choice
                      checked={selected}
                      className={cn(
                        'inline-flex h-6 items-center transition-colors max-md:h-11',
                        selected ? 'font-semibold text-fg' : 'text-fg-dim hover:text-fg',
                        isUploading && !selected && 'pointer-events-none opacity-40',
                      )}
                      key={kind}
                      label={getPromptKindDefinition(kind).label}
                      name={`${id}-kind`}
                      onSelect={changeKind}
                      title={getPromptKindDefinition(kind).description}
                      value={kind}
                    >
                      <Bracketed active={selected}>
                        <KindMark className="mr-[1ch] w-[1ch]" kind={kind} label={false} />
                        {kind}
                      </Bracketed>
                    </Choice>
                  )
                })}
              </ChoiceGroup>
            </FrontmatterRow>
            <FrontmatterRow field htmlFor={`${id}-title`} label="title">
              <input
                autoComplete="off"
                className={cn(
                  fieldClass,
                  'voice-title text-head placeholder:font-normal',
                  draft.kind === 'fragment' && 'voice-note',
                )}
                id={`${id}-title`}
                onChange={(event) => onDraftChange('title', event.target.value)}
                placeholder="give it a name"
                ref={titleInputRef}
                value={draft.title}
              />
            </FrontmatterRow>
            <FrontmatterRow field htmlFor={`${id}-project`} label="project">
              <ProjectPicker
                id={`${id}-project`}
                onChange={(value) => onDraftChange('category', value)}
                projects={projects}
                value={draft.category}
              />
            </FrontmatterRow>
            <FrontmatterRow field htmlFor={`${id}-tags`} label="tags">
              <input
                autoComplete="off"
                className={fieldClass}
                id={`${id}-tags`}
                onChange={(event) => onDraftChange('tagsInput', event.target.value)}
                placeholder="#writing #review"
                spellCheck={false}
                value={draft.tagsInput}
              />
            </FrontmatterRow>
            <p aria-hidden="true" className="text-line-strong">
              ---
            </p>
            <p className="mt-2 text-meta text-fg-faint">
              {isUploading
                ? 'Images are still uploading. The kind can change once they finish.'
                : definition.description}
            </p>

            <div className="mt-6">
              <SectionLabel
                aside={
                  <span className="max-sm:hidden">
                    markdown, <span className="text-fg-dim">{'{{name}}'}</span> makes a blank
                  </span>
                }
                htmlFor={draft.kind === 'sequence' ? undefined : `${id}-body`}
              >
                {definition.bodyLabel.toLowerCase()}
              </SectionLabel>

              {draft.kind === 'sequence' ? (
                <SequenceStepsEditor
                  onChange={updateSteps}
                  placeholder={definition.bodyPlaceholder}
                  steps={steps}
                />
              ) : (
                <textarea
                  className={cn(textareaClass, 'min-h-[12rem]')}
                  id={`${id}-body`}
                  onChange={(event) => onDraftChange('body', event.target.value)}
                  onPaste={handleBodyPaste}
                  placeholder={definition.bodyPlaceholder}
                  spellCheck
                  value={draft.body}
                />
              )}

              {variables.length > 0 ? (
                <p className="mt-2 text-meta text-fg-faint">
                  blanks{' '}
                  {variables.map((variable) => (
                    <span className="ml-[1ch] text-fg-dim" key={variable.name}>
                      ‹{variable.name}
                      {variable.fallback ? `=${variable.fallback}` : ''}›
                    </span>
                  ))}
                </p>
              ) : null}

              {draft.images.length > 0 ? (
                <ul aria-label="Attached images" className="mt-2 text-meta text-fg-dim">
                  {draft.images.map((image) => (
                    <li key={image.id}>
                      <span className="text-fg-faint">attached </span>
                      {image.fileName}{' '}
                      <span className="text-fg-faint">({formatImageSize(image.size)})</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="mt-6">
              <SectionLabel htmlFor={`${id}-notes`}>
                {definition.notesLabel.toLowerCase()}
              </SectionLabel>
              <textarea
                className={cn(textareaClass, 'voice-note min-h-[4.5rem] text-fg-dim')}
                id={`${id}-notes`}
                onChange={(event) => onDraftChange('notes', event.target.value)}
                placeholder={definition.notesPlaceholder}
                value={draft.notes}
              />
            </div>

            <div aria-hidden="true" className="mt-6 text-line-strong">
              <p>~</p>
              <p>~</p>
              <p>~</p>
            </div>
          </div>
        </div>
      </form>
    </Pane>
  )
}

function FrontmatterRow({
  label,
  htmlFor,
  field = false,
  children,
}: {
  label: string
  htmlFor?: string
  /** A typed value: sits on a rule that lights up while it has the cursor. */
  field?: boolean
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[9ch_minmax(0,1fr)] items-center gap-x-[1ch]">
      {htmlFor ? (
        <label className="text-fg-faint" htmlFor={htmlFor}>
          {label}:
        </label>
      ) : (
        <span className="text-fg-faint">{label}:</span>
      )}
      <div
        className={cn(
          'flex min-h-8 min-w-0 items-center max-md:min-h-11',
          field && 'border-b border-line transition-colors focus-within:border-accent',
        )}
      >
        <div className="min-w-0 flex-1">{children}</div>
      </div>
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
    <ol className="flex flex-col gap-4">
      {steps.map((step, index) => (
        // Steps have no identity beyond their position while being edited.
        // oxlint-disable-next-line react/no-array-index-key
        <li key={index}>
          <div className="mb-1 flex items-center gap-[1ch] text-meta">
            <label className="font-semibold text-kind-sequence" htmlFor={`${id}-step-${index}`}>
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
            className={cn(textareaClass, 'min-h-[4.5rem] border-kind-sequence/60')}
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
          className="text-fg-dim hover:text-fg hover:underline"
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
      className="inline-flex h-6 min-w-[3ch] items-center justify-center px-[0.5ch] text-fg-faint transition-colors hover:bg-bg-hover hover:text-fg disabled:opacity-30 max-md:h-11 max-md:min-w-[5ch]"
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
