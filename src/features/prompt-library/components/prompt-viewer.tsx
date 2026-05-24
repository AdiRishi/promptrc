import { Button } from '@/components/ui/button'
import {
  PromptNoteBody,
  PromptNoteBodyMarker,
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
import { PromptBodyMarkdown } from '@/features/prompt-library/rendering/prompt-body-markdown'
import { relativeTime } from '@/features/prompt-library/rendering/prompt-library-formatting'
import { type PromptRecord } from '@/features/prompt-library/types'

type PromptViewerProps = {
  prompt: PromptRecord
  confirmDeleteId: string | null
  onCopyPrompt: () => void | Promise<void>
  onStartEdit: () => void
  onDuplicatePrompt: () => void
  onDeletePrompt: () => void
}

export function PromptViewer({
  prompt,
  confirmDeleteId,
  onCopyPrompt,
  onStartEdit,
  onDuplicatePrompt,
  onDeletePrompt,
}: PromptViewerProps) {
  return (
    <PromptNoteShell>
      <PromptNoteHeader>
        <PromptNoteHeaderItems>
          <span>
            <span className="text-primary">●</span> prompt
          </span>
          <span className="text-secondary-foreground">@{prompt.category.toLowerCase()}</span>
          {prompt.uses > 0 ? (
            <span className="text-accent-foreground">
              +{prompt.uses} {prompt.uses === 1 ? 'use' : 'uses'}
            </span>
          ) : null}
        </PromptNoteHeaderItems>

        <PromptNoteHeaderAside title={new Date(prompt.updatedAt).toLocaleString()}>
          updated {relativeTime(prompt.updatedAt)}
        </PromptNoteHeaderAside>
      </PromptNoteHeader>

      <PromptNoteContent>
        <PromptNoteTitleRow>
          <PromptNoteTitle>{prompt.title}</PromptNoteTitle>
        </PromptNoteTitleRow>

        <PromptNoteMetadata>
          <span>
            category:{' '}
            <span className="text-accent-foreground">{prompt.category.toLowerCase()}</span>
          </span>

          {prompt.tags.length > 0 ? (
            <span>
              tags:{' '}
              {prompt.tags.map((tag) => (
                <span className="text-secondary-foreground" key={tag}>
                  #{tag}{' '}
                </span>
              ))}
            </span>
          ) : null}

          <span>
            created:{' '}
            <span className="text-primary">
              {new Date(prompt.createdAt).toISOString().slice(0, 10)}
            </span>
          </span>
        </PromptNoteMetadata>

        <PromptNoteBody>
          <PromptNoteBodyMarker>// PROMPT</PromptNoteBodyMarker>
          <PromptBodyMarkdown body={prompt.body} />
        </PromptNoteBody>
      </PromptNoteContent>

      <PromptNoteFooter>
        <Button onClick={onCopyPrompt} size="sm" type="button">
          Cmd+C - Copy Prompt Body
        </Button>
        <Button onClick={onStartEdit} size="sm" type="button" variant="outline">
          e - Edit
        </Button>
        <Button onClick={onDuplicatePrompt} size="sm" type="button" variant="outline">
          d - Duplicate
        </Button>
        <Button
          className="md:ml-auto"
          onClick={onDeletePrompt}
          size="sm"
          type="button"
          variant={confirmDeleteId === prompt.id ? 'destructive' : 'outline'}
        >
          {confirmDeleteId === prompt.id ? 'press again to confirm' : 'Delete'}
        </Button>
      </PromptNoteFooter>
    </PromptNoteShell>
  )
}
