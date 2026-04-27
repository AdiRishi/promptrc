import { Box, Plug } from 'lucide-react'
import { useMemo } from 'react'
import { FaGithub } from 'react-icons/fa'

import {
  type PromptBodyToken,
  parsePromptBodyMentions,
} from '@/features/prompt-library/lib/prompt-mention-rendering'
import { cn } from '@/lib/utils'

type PromptBodyRendererProps = {
  body: string
}

export function PromptBodyRenderer({ body }: PromptBodyRendererProps) {
  const tokens = useMemo(() => parsePromptBodyMentions(body), [body])

  return (
    <>
      {tokens.map((token, index) =>
        token.type === 'mention' ? (
          <PromptMentionChip key={`${token.rawLabel}-${token.href}-${index}`} token={token} />
        ) : (
          token.text
        ),
      )}
    </>
  )
}

function PromptMentionChip({ token }: { token: Extract<PromptBodyToken, { type: 'mention' }> }) {
  const isGitHubPlugin = token.kind === 'plugin' && token.label.toLowerCase() === 'github'
  const Icon = token.kind === 'skill' ? Box : isGitHubPlugin ? FaGithub : Plug

  return (
    <span
      aria-label={`${token.kind}: ${token.label}`}
      className={cn(
        'mx-0.5 inline-flex max-w-full translate-y-[0.08em] items-center gap-1 rounded-[6px] border px-1.5 py-[0.12rem] align-baseline text-[0.9em] leading-none font-semibold whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]',
        token.kind === 'skill'
          ? 'border-secondary-foreground/20 bg-secondary-foreground/14 text-secondary-foreground'
          : 'border-secondary-foreground/18 bg-secondary-foreground/16 text-secondary-foreground',
      )}
      title={`${token.rawLabel} -> ${token.href}`}
    >
      <Icon
        aria-hidden="true"
        className={cn('size-[0.95em] shrink-0', isGitHubPlugin ? 'text-background' : undefined)}
        strokeWidth={isGitHubPlugin ? undefined : token.kind === 'skill' ? 2.25 : 2.5}
      />
      <span className="min-w-0 truncate">{token.label}</span>
    </span>
  )
}
