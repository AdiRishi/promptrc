import { Link } from '@tanstack/react-router'
import { type PropsWithChildren } from 'react'

import { KIND_GLYPHS, KIND_TEXT_CLASS } from '@/features/prompt-library/components/kind-mark'
import { Wordmark } from '@/features/prompt-library/components/library-sidebar'
import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { cn } from '@/lib/utils'

type AuthShellProps = PropsWithChildren<{
  mode: 'sign-in' | 'sign-up'
}>

export function AuthShell({ children, mode }: AuthShellProps) {
  return (
    <main className="relative z-10 grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-rule px-14 py-12 lg:flex">
        <Link className="w-fit rounded-md" to="/">
          <Wordmark />
        </Link>

        <div className="max-w-[34rem] animate-rise">
          <p className="label-caps mb-5 text-vermilion">
            {mode === 'sign-in' ? 'Welcome back' : 'Start your book'}
          </p>
          <h1 className="font-display text-[clamp(2.6rem,4.2vw,3.8rem)] leading-[1.02] text-balance text-ink">
            Keep the words that <em className="text-vermilion">worked</em>, before they slip away.
          </h1>
          <p className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-ink-muted">
            Signing in keeps your library in sync across every browser you use. Everything also
            works without an account — it simply stays on this device.
          </p>

          <ul className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4">
            {PROMPT_KINDS.map((kind, index) => (
              <li
                className="flex animate-rise gap-3"
                key={kind}
                style={{ animationDelay: `${120 + index * 60}ms` }}
              >
                <span
                  aria-hidden="true"
                  className={cn('font-display text-[26px] leading-none', KIND_TEXT_CLASS[kind])}
                >
                  {KIND_GLYPHS[kind]}
                </span>
                <span>
                  <span className="block text-[14px] font-medium text-ink">
                    {PROMPT_KIND_DEFINITIONS[kind].plural}
                  </span>
                  <span className="block text-[12.5px] leading-snug text-ink-muted">
                    {PROMPT_KIND_DEFINITIONS[kind].description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="font-display text-[15px] text-ink-faint italic">
          “Commonplace book: a notebook of passages worth keeping.”
        </p>

        <span
          aria-hidden="true"
          className="font-display pointer-events-none absolute -right-16 -bottom-24 text-[420px] leading-none text-ink/[0.035] select-none"
        >
          ¶
        </span>
      </section>

      <section className="flex flex-col items-center justify-center px-4 py-10">
        <Link className="mb-8 rounded-md lg:hidden" to="/">
          <Wordmark />
        </Link>
        <div className="w-full max-w-[420px] animate-rise [animation-delay:80ms]">{children}</div>
        <Link
          className="mt-6 text-[13px] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          to="/"
        >
          Continue without an account
        </Link>
      </section>
    </main>
  )
}
