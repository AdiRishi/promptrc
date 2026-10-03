import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ArrowUpRight, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { KindBadge } from '@/features/prompt-library/components/kind-mark'
import { Wordmark } from '@/features/prompt-library/components/library-sidebar'
import {
  BlanksHint,
  Ornament,
  PromptBody,
} from '@/features/prompt-library/components/prompt-reader'
import { getPromptCopyText } from '@/features/prompt-library/model/prompt-copy'
import { appendPromptImageCacheKey } from '@/features/prompt-library/model/prompt-images'
import { extractFillablePromptVariables } from '@/features/prompt-library/model/prompt-templates'
import {
  PromptImageAttachments,
  type PromptImageUrlResolver,
} from '@/features/prompt-library/rendering/prompt-body-markdown'
import { formatLongDate } from '@/features/prompt-library/rendering/prompt-library-formatting'
import { PromptVariableProvider } from '@/features/prompt-library/rendering/prompt-variable-slot'
import { getPublicRemotePromptShare } from '@/features/prompt-library/server/prompt-library-functions'
import { cn } from '@/lib/utils'

type SharedPromptPageProps = {
  shareId: string
}

const getPromptShareQueryKey = (shareId: string) => ['prompt-share', shareId] as const

/** A shared entry, presented like a single card lifted out of someone's book. */
export function SharedPromptPage({ shareId }: SharedPromptPageProps) {
  const getSharedPrompt = useServerFn(getPublicRemotePromptShare)
  const [values, setValues] = useState<Record<string, string>>({})
  const imageUrlFor: PromptImageUrlResolver = (imageId, image) =>
    appendPromptImageCacheKey(
      `/api/shared-prompt-images/${encodeURIComponent(shareId)}/${encodeURIComponent(imageId)}`,
      image,
    )
  const shareQuery = useQuery({
    queryKey: getPromptShareQueryKey(shareId),
    queryFn: () => getSharedPrompt({ data: shareId }),
    retry: false,
  })
  const prompt = shareQuery.data?.prompt ?? null
  const variables = prompt ? extractFillablePromptVariables(prompt.body) : []
  const filledCount = variables.filter((variable) => values[variable.name]?.trim()).length

  const copy = async (request: { stepIndex?: number } = {}) => {
    if (!prompt) {
      return
    }

    try {
      await navigator.clipboard.writeText(getPromptCopyText(prompt, { ...request, values }))
      toast(
        request.stepIndex === undefined
          ? `Copied “${prompt.title}”`
          : `Copied step ${request.stepIndex + 1}`,
      )
    } catch {
      toast('Clipboard access is unavailable')
    }
  }

  return (
    <div className="relative z-10 min-h-dvh">
      <header className="mx-auto flex max-w-[52rem] items-center justify-between px-6 pt-6">
        <Link className="rounded-md" to="/">
          <Wordmark className="text-[22px]" />
        </Link>
        <span className="label-caps text-[9.5px]">Shared entry</span>
      </header>

      <main className="mx-auto max-w-[52rem] px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        {shareQuery.isPending ? (
          <div className="animate-pulse rounded-3xl bg-paper-raised p-10 shadow-card ring-1 ring-rule">
            <div className="mb-6 h-6 w-28 rounded-full bg-rule" />
            <div className="mb-3 h-10 w-3/4 rounded-full bg-rule" />
            <div className="h-4 w-full rounded-full bg-rule/70" />
          </div>
        ) : null}

        {shareQuery.isError || shareQuery.data === null ? (
          <div className="rounded-3xl bg-paper-raised px-8 py-14 text-center shadow-card ring-1 ring-rule">
            <p
              aria-hidden="true"
              className="font-display text-[72px] leading-none text-rule-strong"
            >
              ※
            </p>
            <h1 className="font-display mt-4 text-[28px] text-ink">This page has been taken out</h1>
            <p className="mx-auto mt-2 max-w-[40ch] text-[14px] leading-relaxed text-ink-muted">
              The link was revoked by its owner, or never existed.
            </p>
            <Link
              className="mt-6 inline-flex h-9 items-center rounded-lg bg-ink px-4 text-[13px] font-medium text-paper"
              to="/"
            >
              Start your own commonplace book
            </Link>
          </div>
        ) : null}

        {prompt ? (
          <article
            aria-labelledby="shared-prompt-title"
            className="animate-rise rounded-3xl bg-paper-raised px-6 py-10 shadow-card ring-1 ring-rule sm:px-12 sm:py-14"
          >
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <KindBadge kind={prompt.kind} />
              <span className="label-caps text-[10px]">
                Shared {formatLongDate(shareQuery.data?.createdAt ?? prompt.createdAt)}
              </span>
            </div>
            <h1
              className={cn(
                'font-display text-[clamp(2rem,5vw,3rem)] leading-[1.04] text-balance text-ink',
                prompt.kind === 'fragment' && 'italic',
              )}
              id="shared-prompt-title"
            >
              {prompt.title}
            </h1>
            {prompt.tags.length > 0 ? (
              <p className="mt-4 flex flex-wrap gap-x-3 font-mono text-[11.5px] text-ink-muted">
                {prompt.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </p>
            ) : null}

            <Ornament />

            <PromptVariableProvider
              value={{
                values,
                onChange: (name, value) => setValues((current) => ({ ...current, [name]: value })),
              }}
            >
              {variables.length > 0 ? (
                <BlanksHint
                  filledCount={filledCount}
                  onReset={() => setValues({})}
                  total={variables.length}
                />
              ) : null}
              <PromptBody imageUrlFor={imageUrlFor} onCopy={copy} prompt={prompt} />
            </PromptVariableProvider>

            <PromptImageAttachments imageUrlFor={imageUrlFor} images={prompt.images} />

            <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-rule pt-6">
              <Button onClick={() => void copy()}>
                <Copy aria-hidden="true" />
                {filledCount > 0 ? 'Copy with your blanks' : 'Copy'}
              </Button>
              <Link
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
                to="/"
              >
                Keep your own in promptrc
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </article>
        ) : null}
      </main>
    </div>
  )
}
