'use client'

import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { TerminalChromeBar, TerminalTrafficLights } from '@/components/terminal-chrome'
import { Button, buttonVariants } from '@/components/ui/button'
import { PromptNote } from '@/features/prompt-library/components/prompt-note'
import { getPublicRemotePromptShare } from '@/features/prompt-library/server/prompt-library-functions'

type SharedPromptPageProps = {
  shareId: string
}

const getPromptShareQueryKey = (shareId: string) => ['prompt-share', shareId] as const

export function SharedPromptPage({ shareId }: SharedPromptPageProps) {
  const getSharedPrompt = useServerFn(getPublicRemotePromptShare)
  const shareQuery = useQuery({
    queryKey: getPromptShareQueryKey(shareId),
    queryFn: () => getSharedPrompt({ data: shareId }),
    retry: false,
  })

  const copyPromptBody = async () => {
    const prompt = shareQuery.data?.prompt

    if (!prompt) {
      return
    }

    try {
      await navigator.clipboard.writeText(prompt.body)
      toast(`copied -> ${prompt.title}`)
    } catch {
      toast('clipboard access is unavailable')
    }
  }

  return (
    <div className="terminal-app min-h-screen bg-background text-foreground">
      <TerminalChromeBar>
        <TerminalTrafficLights />

        <div className="ml-[14px] min-w-0 text-[12px] tracking-[0.05em] text-muted-foreground">
          <span className="font-medium text-foreground">~/.promptrc/share</span>{' '}
          <span className="text-primary">·</span> public
        </div>

        <a
          className="ml-auto hidden h-7 items-center rounded-[2px] border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:inline-flex"
          href="/"
        >
          open promptrc
        </a>
      </TerminalChromeBar>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-42px)] w-full max-w-4xl flex-col px-4 py-6 md:px-6 md:py-10">
        {shareQuery.isPending ? (
          <div className="border border-border bg-card px-6 py-5 text-[12px] text-muted-foreground">
            resolving share link...
          </div>
        ) : null}

        {shareQuery.isError || shareQuery.data === null ? (
          <div className="border border-border bg-card px-6 py-5">
            <p className="text-[12px] tracking-[0.12em] text-destructive uppercase">
              share link unavailable
            </p>
            <p className="mt-3 max-w-[54ch] text-[13px] leading-6 text-muted-foreground">
              This prompt share was revoked or does not exist.
            </p>
          </div>
        ) : null}

        {shareQuery.data ? (
          <PromptNote
            prompt={shareQuery.data.prompt}
            footer={
              <>
                <Button onClick={copyPromptBody} size="sm" type="button">
                  <Copy aria-hidden="true" className="size-3.5" />
                  Copy Prompt Body
                </Button>
                <a className={buttonVariants({ size: 'sm', variant: 'outline' })} href="/">
                  Open promptrc
                </a>
              </>
            }
          />
        ) : null}
      </main>
    </div>
  )
}
