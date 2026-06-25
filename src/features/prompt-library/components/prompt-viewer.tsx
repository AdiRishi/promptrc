import { Link2Off, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PromptNote } from '@/features/prompt-library/components/prompt-note'
import { type PromptRecord } from '@/features/prompt-library/types'

type PromptViewerProps = {
  prompt: PromptRecord
  canSharePrompts: boolean
  confirmDeleteId: string | null
  onCopyPrompt: () => void | Promise<void>
  onStartEdit: () => void
  onDuplicatePrompt: () => void
  onSharePrompt: () => void | Promise<void>
  onRevokePromptShare: () => void | Promise<void>
  onDeletePrompt: () => void
}

export function PromptViewer({
  prompt,
  canSharePrompts,
  confirmDeleteId,
  onCopyPrompt,
  onStartEdit,
  onDuplicatePrompt,
  onSharePrompt,
  onRevokePromptShare,
  onDeletePrompt,
}: PromptViewerProps) {
  return (
    <PromptNote
      prompt={prompt}
      footer={
        <>
          <Button onClick={onCopyPrompt} size="sm" type="button">
            Cmd+C - Copy Prompt Body
          </Button>
          <Button onClick={onStartEdit} size="sm" type="button" variant="outline">
            e - Edit
          </Button>
          <Button onClick={onDuplicatePrompt} size="sm" type="button" variant="outline">
            d - Duplicate
          </Button>
          {canSharePrompts ? (
            <>
              <Button onClick={onSharePrompt} size="sm" type="button" variant="outline">
                <Share2 aria-hidden="true" className="size-3.5" />s - Share Link
              </Button>
              <Button onClick={onRevokePromptShare} size="sm" type="button" variant="outline">
                <Link2Off aria-hidden="true" className="size-3.5" />
                Revoke Link
              </Button>
            </>
          ) : null}
          <Button
            className="md:ml-auto"
            onClick={onDeletePrompt}
            size="sm"
            type="button"
            variant={confirmDeleteId === prompt.id ? 'destructive' : 'outline'}
          >
            {confirmDeleteId === prompt.id ? 'press again to confirm' : 'Delete'}
          </Button>
        </>
      }
    />
  )
}
