import { Link } from '@tanstack/react-router'
import { type PropsWithChildren, type ReactNode } from 'react'

import { Pane } from '@/components/ui/pane'
import { KIND_GLYPHS, KIND_TEXT_CLASS } from '@/features/prompt-library/components/kind-mark'
import { Wordmark } from '@/features/prompt-library/components/library-pane'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { cn } from '@/lib/utils'

type AuthShellProps = PropsWithChildren<{
  mode: 'sign-in' | 'sign-up'
}>

/** Sign in / sign up as a login session: the pitch as a transcript, the form as `login:`. */
export function AuthShell({ children, mode }: AuthShellProps) {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-[76rem] flex-col px-2 pt-2 pb-4 sm:px-4">
      <header className="flex h-7 items-center justify-between text-[12px]">
        <Link className="rounded-sm" to="/">
          <Wordmark className="text-[13px]" />
        </Link>
        <span className="text-fg-faint">tty1</span>
      </header>

      <div className="mt-4 grid flex-1 gap-x-4 gap-y-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Pane className="hidden lg:flex" title="~/.promptrc/README">
          <div className="scrollbar-term min-h-0 flex-1 overflow-y-auto px-[3ch] pt-6 pb-6 text-[13px] leading-[1.75]">
            <Line delay={0}>
              <Prompt /> promptrc --about
            </Line>
            <Line delay={1}>
              <span className="voice-title block pt-2 pb-3 text-[clamp(1.6rem,2.6vw,2.3rem)] leading-[1.12] text-fg">
                Keep the words that <span className="text-accent">worked</span>, before they slip
                away.
              </span>
            </Line>
            <Line delay={2} muted>
              A place for the fleeting moments of brilliance from working with AI.
            </Line>

            <Line className="mt-5" delay={3}>
              <Prompt /> ls ~/.promptrc
            </Line>
            <dl className="mt-1 grid grid-cols-[15ch_1fr] gap-x-[2ch]">
              {PROMPT_KINDS.map((kind, index) => (
                <div className="contents" key={kind}>
                  <dt
                    className={cn('animate-type-in', KIND_TEXT_CLASS[kind])}
                    style={{ animationDelay: `${(4 + index) * 90}ms` }}
                  >
                    {KIND_GLYPHS[kind]} {PROMPT_KIND_DEFINITIONS[kind].plural.toLowerCase()}/
                  </dt>
                  <dd
                    className="animate-type-in text-fg-dim"
                    style={{ animationDelay: `${(4 + index) * 90}ms` }}
                  >
                    {PROMPT_KIND_DEFINITIONS[kind].description}
                  </dd>
                </div>
              ))}
            </dl>

            <Line className="mt-5" delay={9}>
              <Prompt /> promptrc sync --status
            </Line>
            <Line delay={10} muted>
              <span className="text-yellow">signed out</span> → entries live in this browser only
            </Line>
            <Line delay={11} muted>
              <span className="text-green">signed in </span> → synced to every browser you use, with
              share links and images
            </Line>

            <Line className="mt-5" delay={12}>
              <Prompt /> <span className="cursor-block" />
            </Line>
          </div>
        </Pane>

        <div className="flex flex-col items-center justify-center">
          <p className="mb-4 w-full max-w-[420px] text-[13px] text-fg-dim">
            <span className="text-fg">promptrc {mode === 'sign-in' ? 'login' : 'useradd'}:</span>{' '}
            {mode === 'sign-in' ? 'welcome back' : 'create an account to sync'}
            <span className="cursor-block" />
          </p>
          <div className="w-full max-w-[420px] animate-boot">{children}</div>
          <Link className="mt-5 text-[12.5px] text-fg-faint hover:text-accent" to="/">
            <span className="text-accent">:q</span> continue without an account
          </Link>
        </div>
      </div>
    </main>
  )
}

function Prompt() {
  return (
    <>
      <span className="text-green">you@promptrc</span>
      <span className="text-fg-faint">:</span>
      <span className="text-blue">~</span>
      <span className="text-fg-faint">$</span>
    </>
  )
}

function Line({
  children,
  delay,
  muted = false,
  className,
}: {
  children: ReactNode
  delay: number
  muted?: boolean
  className?: string
}) {
  return (
    <p
      className={cn('animate-type-in', muted && 'text-fg-dim', className)}
      style={{ animationDelay: `${delay * 90}ms` }}
    >
      {children}
    </p>
  )
}
