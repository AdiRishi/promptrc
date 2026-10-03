import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useEffectEvent, useState } from 'react'

import { Pane } from '@/components/ui/pane'
import { type PromptViewMode } from '@/features/prompt-library/commands/prompt-library-ex-commands'
import { EchoLine } from '@/features/prompt-library/components/command-line'
import { KindTag } from '@/features/prompt-library/components/kind-mark'
import { Wordmark } from '@/features/prompt-library/components/library-pane'
import {
  BlanksHint,
  PromptBody,
  ViewModeToggle,
  promptPath,
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
import { echo } from '@/lib/echo'
import { cn } from '@/lib/utils'

type SharedPromptPageProps = {
  shareId: string
}

const getPromptShareQueryKey = (shareId: string) => ['prompt-share', shareId] as const

/** A shared entry, printed as if someone ran `cat` on it in their own terminal. */
export function SharedPromptPage({ shareId }: SharedPromptPageProps) {
  const getSharedPrompt = useServerFn(getPublicRemotePromptShare)
  const [values, setValues] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<PromptViewMode>('rendered')
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
  const isMissing = shareQuery.isError || shareQuery.data === null

  const copy = async (request: { stepIndex?: number } = {}) => {
    if (!prompt) {
      return
    }

    try {
      await navigator.clipboard.writeText(getPromptCopyText(prompt, { ...request, values }))
      echo(
        request.stepIndex === undefined
          ? `Yanked “${prompt.title}” to the clipboard`
          : `Yanked step ${request.stepIndex + 1}`,
        'ok',
      )
    } catch {
      echo('Clipboard access is unavailable')
    }
  }

  // `y` yanks here too, as in the app.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null

    if (
      event.key !== 'y' ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      target?.closest('input, textarea, [contenteditable]')
    ) {
      return
    }

    event.preventDefault()
    void copy()
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh max-w-[60rem] flex-col px-2 pt-2 sm:px-4">
      <header className="flex h-7 items-center justify-between text-[12px]">
        <Link className="rounded-sm" to="/">
          <Wordmark className="text-[13px]" />
        </Link>
        <span className="text-fg-faint">read-only · shared entry</span>
      </header>

      <p className="mt-3 mb-4 text-[12.5px] text-fg-dim">
        <span className="text-green">guest@promptrc</span>
        <span className="text-fg-faint">:</span>
        <span className="text-blue">~/shared</span>
        <span className="text-fg-faint">$</span> cat {prompt ? promptPath(prompt) : shareId}
        {shareQuery.isPending ? <span className="cursor-block" /> : null}
      </p>

      {isMissing ? (
        <div className="text-[13px] leading-[1.8]">
          <p className="text-red">cat: {shareId}: No such file or directory</p>
          <p className="text-fg-faint"># the link was revoked by its owner, or never existed</p>
          <p className="mt-4">
            <span className="text-fg-faint">$</span>{' '}
            <Link className="text-accent underline underline-offset-2" to="/">
              promptrc --start-your-own
            </Link>
            <span className="cursor-block" />
          </p>
        </div>
      ) : null}

      {prompt ? (
        <Pane
          aria-labelledby="shared-prompt-title"
          aside={<ViewModeToggle mode={viewMode} onChange={setViewMode} />}
          className="mb-2 flex-1 animate-boot"
          title={promptPath(prompt)}
        >
          <article className="px-[2ch] pt-5 pb-8 sm:px-[4ch]">
            <div className="mb-2 flex flex-wrap items-center gap-x-[2ch] gap-y-1 text-[12px] text-fg-faint">
              <KindTag kind={prompt.kind} />
              <span>~/{prompt.category.toLowerCase()}/</span>
              <span>shared {formatLongDate(shareQuery.data?.createdAt ?? prompt.createdAt)}</span>
            </div>
            <h1
              className={cn(
                'voice-title animate-type-in text-[clamp(1.5rem,4vw,2.2rem)] leading-[1.12] text-balance text-fg',
                prompt.kind === 'fragment' && 'voice-note font-semibold',
              )}
              id="shared-prompt-title"
            >
              {prompt.title}
            </h1>
            {prompt.tags.length > 0 ? (
              <p className="mt-2 flex flex-wrap gap-x-[2ch] text-[12px] text-magenta">
                {prompt.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </p>
            ) : null}

            <div className="my-5 border-t border-dashed border-line" />

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
              <PromptBody
                imageUrlFor={imageUrlFor}
                onCopy={copy}
                prompt={prompt}
                viewMode={viewMode}
              />
            </PromptVariableProvider>

            <PromptImageAttachments imageUrlFor={imageUrlFor} images={prompt.images} />

            <div className="mt-10 flex flex-wrap items-center gap-x-[2ch] gap-y-2 border-t border-line pt-4 text-[13px]">
              <button
                className="rounded-sm bg-accent px-[1ch] py-0.5 font-bold text-accent-fg transition hover:brightness-110"
                onClick={() => void copy()}
                type="button"
              >
                y {filledCount > 0 ? 'yank with your blanks' : 'yank'}
              </button>
              <Link className="text-fg-dim hover:text-accent" to="/">
                ❯ keep your own in promptrc
              </Link>
            </div>
          </article>
        </Pane>
      ) : null}

      <div className="sticky bottom-0 mt-auto bg-bg">
        <EchoLine />
      </div>
    </div>
  )
}
