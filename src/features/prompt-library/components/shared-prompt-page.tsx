import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useEffectEvent, useState } from 'react'

import { KeyAction } from '@/components/ui/key-action'
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
    <div className="relative z-10 mx-auto flex min-h-dvh max-w-[96ch] flex-col px-2 sm:px-3">
      <header className="flex h-8 items-center justify-between max-md:h-11">
        <Link to="/">
          <Wordmark />
        </Link>
        <span className="text-meta text-fg-faint">read-only · shared entry</span>
      </header>

      <p className="mt-3 mb-5 text-meta text-fg-faint">
        guest@promptrc:~/shared$ <span className="text-fg-dim">cat</span>{' '}
        <span className="text-fg-dim">{prompt ? promptPath(prompt) : shareId}</span>
        {shareQuery.isPending ? <span className="cursor-block cursor-blink" /> : null}
      </p>

      {isMissing ? (
        <div>
          <p className="text-fg">This link no longer works.</p>
          <p className="mt-1 text-fg-dim">Its owner revoked it, or it never existed.</p>
          <p className="mt-4">
            <Link className="link" to="/">
              Start your own library
            </Link>
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
          <article className="measure mx-auto w-full px-[2ch] pt-6 pb-10 sm:px-[3ch]">
            <h1
              className={cn(
                'voice-title text-title text-balance text-fg',
                prompt.kind === 'fragment' && 'voice-note',
              )}
              id="shared-prompt-title"
            >
              {prompt.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-[2ch] text-meta text-fg-faint">
              <KindTag kind={prompt.kind} />
              <span>{prompt.category}/</span>
              {prompt.tags.length > 0 ? (
                <span className="text-fg-dim">{prompt.tags.map((tag) => `#${tag}`).join(' ')}</span>
              ) : null}
              <span className="whitespace-nowrap">
                shared {formatLongDate(shareQuery.data?.createdAt ?? prompt.createdAt)}
              </span>
            </div>

            <div className="my-6 border-t border-line" />

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

            <div className="mt-10 flex flex-wrap items-center gap-x-[2ch] gap-y-2 border-t border-line pt-3">
              <KeyAction
                className="-ml-[1ch]"
                keyLabel="y"
                label={filledCount > 0 ? 'yank with your blanks' : 'yank'}
                onClick={() => copy()}
                primary
              />
              <Link className="link" to="/">
                Keep your own in promptrc
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
