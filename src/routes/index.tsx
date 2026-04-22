import { createFileRoute } from '@tanstack/react-router'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({ component: App })

const commands = ['pnpm dev', 'pnpm typecheck', 'pnpm test', 'pnpm check'] as const

function App() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <section className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">TanStack Start Launchpad</p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          A barebones TanStack Start starter.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          React Query, routing, Tailwind, and the existing DX are wired up. Add your routes,
          loaders, server functions, or data layer from here.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-medium text-foreground">Useful commands</h2>
        <ul className="space-y-2">
          {commands.map((command) => (
            <li key={command} className="font-mono text-sm text-muted-foreground">
              {command}
            </li>
          ))}
        </ul>
      </section>

      <div>
        <a
          className={cn(buttonVariants({ variant: 'outline' }))}
          href="https://tanstack.com/start/latest/docs/framework/react/overview"
          rel="noreferrer"
          target="_blank"
        >
          Open TanStack docs
        </a>
      </div>
    </main>
  )
}
