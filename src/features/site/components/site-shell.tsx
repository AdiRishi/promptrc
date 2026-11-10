import { Link } from '@tanstack/react-router'
import { type ReactNode } from 'react'

import { Pane } from '@/components/ui/pane'
import { Wordmark } from '@/features/prompt-library/components/library-pane'
import { SITE_GITHUB_URL } from '@/lib/site-config'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'about', to: '/about', label: 'about' },
  { id: 'manual', to: '/manual', label: 'manual' },
  { id: 'guides', to: '/guides', label: 'guides' },
] as const

export type SiteSection = (typeof SECTIONS)[number]['id']

type SiteShellProps = {
  section: SiteSection
  /** The file the page reads as, set into the frame: `~/.promptrc/ABOUT`. */
  path: string
  children: ReactNode
}

/**
 * The frame around the pages that explain promptrc: the wordmark, the sections
 * as tmux windows, a way into the app, and one pane holding the page.
 */
export function SiteShell({ section, path, children }: SiteShellProps) {
  return (
    <div className="relative z-10 mx-auto flex min-h-dvh max-w-[104ch] flex-col px-2 sm:px-3">
      <header className="flex h-8 shrink-0 items-stretch gap-[2ch] max-md:h-11">
        <Link className="self-center" to="/">
          <Wordmark />
        </Link>
        <nav aria-label="Site" className="flex items-stretch">
          {SECTIONS.map((item) => (
            <Link
              aria-current={item.id === section ? 'page' : undefined}
              className={cn(
                'flex items-center px-[1ch] -outline-offset-2 transition-colors',
                item.id === section
                  ? 'bg-bg-sel text-fg'
                  : 'text-fg-faint hover:bg-bg-hover hover:text-fg',
              )}
              key={item.id}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          className="ml-auto self-center font-semibold whitespace-nowrap text-accent hover:underline"
          to="/"
        >
          open <span className="max-sm:sr-only">promptrc </span>
          <span aria-hidden="true">→</span>
        </Link>
      </header>

      <Pane className="mt-3 flex-1" title={path}>
        <article className="measure mx-auto w-full px-[2ch] pt-7 pb-12 sm:px-[3ch]">
          {children}
        </article>
      </Pane>

      <footer className="flex h-9 shrink-0 items-center gap-[2ch] text-meta text-fg-faint">
        <span>promptrc is free and open source</span>
        <a
          className="ml-auto transition-colors hover:text-fg"
          href={SITE_GITHUB_URL}
          rel="noreferrer"
          target="_blank"
        >
          github <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </div>
  )
}

/** The page's own title, with the line that says what it is about. */
export function PageTitle({ children, lede }: { children: ReactNode; lede?: ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="voice-title text-title text-balance text-fg">{children}</h1>
      {lede ? <p className="mt-3 text-body text-fg-dim">{lede}</p> : null}
    </header>
  )
}

/** A section of a page, headed the way rendered markdown is headed in the reader. */
export function PageSection({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="mt-10 text-body" id={id}>
      <h2 className="mb-3 scroll-mt-4 text-head font-extrabold text-fg">
        <span aria-hidden="true" className="mr-[1ch] text-ui font-normal text-fg-faint">
          ##
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}
