import { ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import {
  PromptNoteBody,
  PromptNoteBodyLabel,
  PromptNoteContent,
  PromptNoteFooter,
  PromptNoteHeader,
  PromptNoteHeaderAside,
  PromptNoteHeaderItems,
  PromptNoteMetadata,
  PromptNoteShell,
  PromptNoteTitle,
  PromptNoteTitleRow,
} from '@/features/prompt-library/components/prompt-note-shell'
import { filenameOf } from '@/features/prompt-library/rendering/prompt-library-formatting'
import { type ComposerState, type PromptDraft } from '@/features/prompt-library/types'

export type PromptImagePasteRequest = {
  files: File[]
  selectionEnd: number
  selectionStart: number
}

type PromptComposerProps = {
  composer: ComposerState
  categories: string[]
  titleInputRef: React.RefObject<HTMLInputElement | null>
  onCancelComposer: () => void
  onSaveComposer: () => void
  onDraftChange: <TFieldName extends keyof PromptDraft>(
    field: TFieldName,
    value: PromptDraft[TFieldName],
  ) => void
  onPasteImages: (request: PromptImagePasteRequest) => void
}

export function PromptComposer({
  composer,
  categories,
  titleInputRef,
  onCancelComposer,
  onSaveComposer,
  onDraftChange,
  onPasteImages,
}: PromptComposerProps) {
  const fileName =
    composer.mode === 'new'
      ? 'new.prompt.md'
      : `${filenameOf(composer.draft.title || 'untitled')}.md`
  const category = composer.draft.category.trim() || 'personal'
  const imageCount = composer.draft.images.length

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
    <PromptNoteShell>
      <PromptNoteHeader>
        <PromptNoteHeaderItems>
          <span>
            <span className="text-primary">●</span>{' '}
            {composer.mode === 'new' ? 'new prompt' : 'editing prompt'}
          </span>
          <span className="text-secondary-foreground">@{category.toLowerCase()}</span>
          <span className="text-accent-foreground">unsaved draft</span>
        </PromptNoteHeaderItems>

        <PromptNoteHeaderAside title={fileName}>{fileName}</PromptNoteHeaderAside>
      </PromptNoteHeader>

      <PromptNoteContent>
        <PromptNoteTitleRow>
          <PromptNoteTitle>
            <label className="sr-only" htmlFor="prompt-title">
              title
            </label>
            <Input
              className="h-auto border-0 bg-transparent px-0 py-0 text-[26px] leading-[1.15] font-semibold tracking-normal text-foreground placeholder:text-muted-foreground/65 focus-visible:border-transparent"
              id="prompt-title"
              onChange={(event) => onDraftChange('title', event.target.value)}
              placeholder="Untitled prompt"
              ref={titleInputRef}
              value={composer.draft.title}
            />
          </PromptNoteTitle>
        </PromptNoteTitleRow>

        <PromptNoteMetadata>
          <label className="flex min-w-[12rem] items-center gap-1">
            <span>category:</span>
            <Input
              className="h-5 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-[11px] text-accent-foreground placeholder:text-muted-foreground/70 focus-visible:border-transparent"
              id="prompt-category"
              list="prompt-categories"
              onChange={(event) => onDraftChange('category', event.target.value)}
              placeholder="personal"
              value={composer.draft.category}
            />
          </label>
          <datalist id="prompt-categories">
            {categories.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption} />
            ))}
          </datalist>

          <label className="flex min-w-[16rem] flex-1 items-center gap-1">
            <span>tags:</span>
            <Input
              className="h-5 min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-[11px] text-secondary-foreground placeholder:text-muted-foreground/70 focus-visible:border-transparent"
              id="prompt-tags"
              onChange={(event) => onDraftChange('tagsInput', event.target.value)}
              placeholder="#writing #translation"
              value={composer.draft.tagsInput}
            />
          </label>

          <span>
            state: <span className="text-primary">draft</span>
          </span>
          {imageCount > 0 ? (
            <span>
              images: <span className="text-accent-foreground">{imageCount}</span>
            </span>
          ) : null}
        </PromptNoteMetadata>

        <PromptNoteBody>
          <PromptNoteBodyLabel htmlFor="prompt-body">// PROMPT</PromptNoteBodyLabel>
          <textarea
            className="field-sizing-content min-h-[22rem] w-full resize-y bg-transparent p-0 text-[14px] leading-[1.75] text-foreground outline-none placeholder:text-muted-foreground/65 focus-visible:outline-1 focus-visible:outline-primary"
            id="prompt-body"
            onChange={(event) => onDraftChange('body', event.target.value)}
            onPaste={handleBodyPaste}
            placeholder="Write the prompt body here..."
            value={composer.draft.body}
          />
          {imageCount > 0 ? (
            <div
              aria-label="Draft images"
              className="mt-5 grid gap-2 border-t border-dashed border-border pt-4 sm:grid-cols-2"
            >
              {composer.draft.images.map((image) => (
                <div
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border border-border bg-card/60 px-3 py-2 text-[11px]"
                  key={image.id}
                >
                  <ImageIcon aria-hidden="true" className="size-3.5 text-accent-foreground" />
                  <span className="min-w-0 truncate text-muted-foreground">
                    <span className="text-foreground">{image.fileName}</span> ·{' '}
                    {formatImageSize(image.size)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </PromptNoteBody>
      </PromptNoteContent>

      <PromptNoteFooter>
        <Button onClick={onSaveComposer} size="sm" type="button">
          <Kbd className="mr-1">Cmd</Kbd>
          <Kbd className="mr-2">Enter</Kbd>
          {composer.mode === 'new' ? 'Save Prompt' : 'Save Changes'}
        </Button>
        <Button onClick={onCancelComposer} size="sm" type="button" variant="outline">
          <Kbd className="mr-2">Esc</Kbd>
          Cancel
        </Button>
      </PromptNoteFooter>
    </PromptNoteShell>
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

function formatImageSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
