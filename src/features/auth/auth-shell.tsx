import { Link } from '@tanstack/react-router'
import { ShieldCheck, Terminal } from 'lucide-react'
import { type PropsWithChildren } from 'react'

import {
  TerminalChromeBar,
  TerminalCommandFrame,
  TerminalTrafficLights,
} from '@/components/terminal-chrome'

type AuthShellProps = PropsWithChildren<{
  mode: 'sign-in' | 'sign-up'
}>

export function AuthShell({ children, mode }: AuthShellProps) {
  const command = mode === 'sign-in' ? 'auth --resume-session' : 'auth --create-session'

  return (
    <main className="terminal-app min-h-screen overflow-hidden bg-background text-foreground">
      <TerminalChromeBar>
        <TerminalTrafficLights />

        <Link
          className="ml-[14px] min-w-0 text-[12px] tracking-[0.05em] text-muted-foreground transition-colors hover:text-foreground"
          to="/"
        >
          <span className="font-medium text-foreground">~/.promptrc</span>{' '}
          <span className="text-primary">·</span> zsh
        </Link>

        <div className="ml-auto flex items-center gap-1.5 text-[11px] tracking-[0.04em] text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="size-3 text-accent-foreground" />
          <span>clerk local</span>
        </div>
      </TerminalChromeBar>

      <section className="relative z-10 grid min-h-[calc(100vh-42px)] place-items-center px-4 py-8">
        <div className="w-full max-w-[440px]">
          <TerminalCommandFrame className="mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Terminal aria-hidden="true" className="size-3.5 text-accent-foreground" />
              <span className="text-accent-foreground">~/.promptrc</span>
              <span className="text-primary">$</span>
              <span>{command}</span>
            </div>
          </TerminalCommandFrame>

          {children}
        </div>
      </section>
    </main>
  )
}
