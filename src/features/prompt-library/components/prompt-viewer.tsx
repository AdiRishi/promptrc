import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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
    <Card className="gap-0">
      <CardHeader className="grid-cols-[1fr_auto] border-b border-border bg-card/95 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            <span className="text-primary">●</span> prompt
          </span>
          <span className="text-secondary-foreground">@{prompt.category.toLowerCase()}</span>
          {prompt.uses > 0 ? (
            <span className="text-accent-foreground">
              +{prompt.uses} {prompt.uses === 1 ? 'use' : 'uses'}
            </span>
          ) : null}
        </div>

        <span
          className="truncate text-[11px] text-muted-foreground"
          title={new Date(prompt.updatedAt).toLocaleString()}
        >
          updated {relativeTime(prompt.updatedAt)}
        </span>
      </CardHeader>

      <CardContent className="px-8 py-7">
        <CardTitle className="mb-[10px] text-[26px] leading-[1.15] font-semibold tracking-[-0.01em] before:mr-2 before:text-accent-foreground before:content-['>']">
          {prompt.title}
        </CardTitle>

        <div className="mb-6 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
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
        </div>

        <div className="relative border-l-2 border-l-primary bg-background px-5 py-5 text-[14px] leading-[1.75]">
          <span className="absolute -top-2 left-3 bg-card px-2 text-[10px] tracking-[0.2em] text-accent-foreground">
            // PROMPT
          </span>
          <PromptBodyMarkdown body={prompt.body} />
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 px-8 pb-7">
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
      </CardFooter>
    </Card>
  )
}
