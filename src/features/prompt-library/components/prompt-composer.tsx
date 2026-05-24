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
}

export function PromptComposer({
  composer,
  categories,
  titleInputRef,
  onCancelComposer,
  onSaveComposer,
  onDraftChange,
}: PromptComposerProps) {
  const fileName =
    composer.mode === 'new'
      ? 'new.prompt.md'
      : `${filenameOf(composer.draft.title || 'untitled')}.md`
  const category = composer.draft.category.trim() || 'personal'

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
        </PromptNoteMetadata>

        <PromptNoteBody>
          <PromptNoteBodyLabel htmlFor="prompt-body">// PROMPT</PromptNoteBodyLabel>
          <textarea
            className="field-sizing-content min-h-[22rem] w-full resize-y bg-transparent p-0 text-[14px] leading-[1.75] text-foreground outline-none placeholder:text-muted-foreground/65 focus-visible:outline-1 focus-visible:outline-primary"
            id="prompt-body"
            onChange={(event) => onDraftChange('body', event.target.value)}
            placeholder="Write the prompt body here..."
            value={composer.draft.body}
          />
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
