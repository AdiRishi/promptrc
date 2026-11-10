import { Link } from '@tanstack/react-router'
import { type PropsWithChildren } from 'react'

import { Pane } from '@/components/ui/pane'
import { KindMark } from '@/features/prompt-library/components/kind-mark'
import { Wordmark } from '@/features/prompt-library/components/library-pane'
import { SyncMark } from '@/features/prompt-library/components/sync-mark'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'

type AuthShellProps = PropsWithChildren<{
  mode: 'sign-in' | 'sign-up'
}>

/** Sign in / sign up as a login session: the pitch as a transcript, the form as `login:`. */
export function AuthShell({ children, mode }: AuthShellProps) {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-[150ch] flex-col px-2 pb-6 sm:px-3">
      <header className="flex h-8 items-center justify-between max-md:h-11">
        <Link to="/">
          <Wordmark />
        </Link>
        <span className="text-meta text-fg-faint">tty1</span>
      </header>

      <div className="grid flex-1 content-center items-start gap-x-[6ch] gap-y-8 py-8 lg:grid-cols-[minmax(0,84ch)_minmax(0,1fr)]">
        <Pane className="hidden lg:flex" title="~/.promptrc/README">
          <div className="px-[3ch] pt-7 pb-8">
            <p className="text-meta">
              <Prompt /> promptrc --about
            </p>
            <p className="voice-title mt-3 max-w-[22ch] text-display text-balance text-fg">
              Keep the words that <span className="text-accent">worked</span>, before they slip
              away.
            </p>
            <p className="mt-3 text-body text-fg-dim">
              A place for the fleeting moments of brilliance from working with AI.
            </p>

            <p className="mt-8 text-meta">
              <Prompt /> ls ~/.promptrc
            </p>
            <dl className="mt-2 grid grid-cols-[16ch_minmax(0,1fr)] gap-x-[2ch] gap-y-1">
              {PROMPT_KINDS.map((kind) => (
                <div className="contents" key={kind}>
                  <dt className="flex gap-[0.5ch] text-fg">
                    <KindMark kind={kind} label={false} />
                    {PROMPT_KIND_DEFINITIONS[kind].plural.toLowerCase()}/
                  </dt>
                  <dd className="text-fg-dim">{PROMPT_KIND_DEFINITIONS[kind].description}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-8 text-meta">
              <Prompt /> promptrc sync --status
            </p>
            <dl className="mt-2 grid grid-cols-[16ch_minmax(0,1fr)] gap-x-[2ch] gap-y-1">
              <dt className="flex gap-[1ch] text-fg">
                <SyncMark mode="local" /> signed out
              </dt>
              <dd className="text-fg-dim">entries live in this browser only</dd>
              <dt className="flex gap-[1ch] text-fg">
                <SyncMark mode="remote" /> signed in
              </dt>
              <dd className="text-fg-dim">
                synced to every browser you use, with share links and images
              </dd>
            </dl>
          </div>
        </Pane>

        {/* Starts level with the first line inside the README frame. */}
        <div className="mx-auto flex w-full max-w-[400px] flex-col lg:max-w-none lg:pt-[29px]">
          <p className="mb-4 text-meta text-fg-dim">
            <span className="text-fg">promptrc {mode === 'sign-in' ? 'login' : 'useradd'}:</span>{' '}
            {mode === 'sign-in' ? 'welcome back' : 'create an account to sync'}
            <span className="cursor-block cursor-blink" />
          </p>
          <div className="w-full animate-boot">{children}</div>
          <Link className="link mt-5 self-start" to="/">
            Continue without an account
          </Link>
        </div>
      </div>
    </main>
  )
}

function Prompt() {
  return <span className="text-fg-faint">you@promptrc:~$</span>
}
