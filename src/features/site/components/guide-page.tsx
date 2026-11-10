import { Link } from '@tanstack/react-router'

import { PromptBodyMarkdown } from '@/features/prompt-library/rendering/prompt-body-markdown'
import { PageTitle, SiteShell } from '@/features/site/components/site-shell'
import { GUIDE_LIST, type Guide } from '@/features/site/guides/guides'

/** One guide, set like a markdown file open in the reader. */
export function GuidePage({ guide }: { guide: Guide }) {
  const others = GUIDE_LIST.filter((other) => other.slug !== guide.slug)

  return (
    <SiteShell path={`~/.promptrc/guides/${guide.slug}.md`} section="guides">
      <PageTitle lede={guide.description}>{guide.title}</PageTitle>

      {/* Section headings step up from the size they have inside an entry, and the
          examples are prose, so they wrap where an entry's code would scroll. */}
      <PromptBodyMarkdown
        body={guide.body}
        className="[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-head [&_h3]:mt-8 [&_pre_code]:min-w-0 [&_pre_code]:whitespace-pre-wrap"
      />

      <nav
        aria-label="More guides"
        className="mt-12 border-t border-line pt-4 text-meta text-fg-faint"
      >
        <p>more guides</p>
        <ul className="mt-2 text-ui">
          {others.map((other) => (
            <li key={other.slug}>
              <a className="link" href={`/guides/${other.slug}`}>
                {other.title}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-ui">
          <Link className="link" to="/">
            Open promptrc
          </Link>{' '}
          and keep the prompts that worked.
        </p>
      </nav>
    </SiteShell>
  )
}

/** The list of guides. */
export function GuidesIndexPage() {
  return (
    <SiteShell path="~/.promptrc/guides/" section="guides">
      <PageTitle lede="Short, practical guides to the prompt techniques promptrc is built around.">
        Guides to writing prompts you can reuse
      </PageTitle>

      <ul className="flex flex-col gap-6">
        {GUIDE_LIST.map((guide) => (
          <li key={guide.slug}>
            <h2 className="text-body font-semibold">
              <a className="link" href={`/guides/${guide.slug}`}>
                {guide.title}
              </a>
            </h2>
            <p className="mt-1 text-body text-fg-dim">{guide.description}</p>
          </li>
        ))}
      </ul>
    </SiteShell>
  )
}
