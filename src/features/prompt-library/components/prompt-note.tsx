import { type ReactNode } from 'react'

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
import { cn } from '@/lib/utils'

type PromptNoteProps = {
  prompt: PromptRecord
  className?: string
  footer?: ReactNode
}

export function PromptNote({ prompt, className, footer }: PromptNoteProps) {
  return (
    <PromptNoteShell className={cn('gap-0', className)}>
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

      {footer ? <PromptNoteFooter>{footer}</PromptNoteFooter> : null}
    </PromptNoteShell>
  )
}
