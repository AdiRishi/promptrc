import { Link } from '@tanstack/react-router'
import { ShieldCheck, Terminal } from 'lucide-react'
import { type PropsWithChildren } from 'react'

type AuthShellProps = PropsWithChildren<{
  mode: 'sign-in' | 'sign-up'
}>

export function AuthShell({ children, mode }: AuthShellProps) {
  const command = mode === 'sign-in' ? 'auth --resume-session' : 'auth --create-session'

  return (
    <main className="terminal-app min-h-screen overflow-hidden bg-background text-foreground">
      <div className="relative z-10 flex min-h-[42px] items-center gap-[10px] border-b border-border bg-muted px-4 py-[8px]">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[rgb(255,95,87)]" />
          <span className="size-2.5 rounded-full bg-[rgb(255,189,46)]" />
          <span className="size-2.5 rounded-full bg-[rgb(40,200,64)]" />
        </div>

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
      </div>

      <section className="relative z-10 grid min-h-[calc(100vh-42px)] place-items-center px-4 py-8">
        <div className="w-full max-w-[440px]">
          <div className="mb-4 border border-border bg-card px-4 py-3 text-[12px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Terminal aria-hidden="true" className="size-3.5 text-accent-foreground" />
              <span className="text-accent-foreground">~/.promptrc</span>
              <span className="text-primary">$</span>
              <span>{command}</span>
            </div>
          </div>

          {children}
        </div>
      </section>
    </main>
  )
}
