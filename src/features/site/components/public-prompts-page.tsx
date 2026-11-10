import { Link } from '@tanstack/react-router'

import { KindMark } from '@/features/prompt-library/components/kind-mark'
import { toPlainExcerpt } from '@/features/prompt-library/rendering/prompt-library-formatting'
import { type PublicPromptListing } from '@/features/prompt-library/types'
import { PageTitle, SiteShell } from '@/features/site/components/site-shell'

/** `/prompts`: every Prompt its owner chose to publish, newest first. */
export function PublicPromptsPage({ listings }: { listings: readonly PublicPromptListing[] }) {
  return (
    <SiteShell path="~/.promptrc/public/" section="prompts">
      <PageTitle lede="Prompts, fragments, sequences and benchmarks that promptrc users chose to publish. Open one to read it, fill in its blanks and copy it.">
        Public prompts
      </PageTitle>

      {listings.length === 0 ? (
        <p className="text-body text-fg-dim">
          Nothing has been published yet. To publish one of yours, open it in{' '}
          <Link className="link" to="/">
            promptrc
          </Link>{' '}
          and run <code className="bg-bg-sunken px-[0.5ch] text-fg">:publish</code>.
        </p>
      ) : (
        <ol className="border-t border-line">
          {listings.map((listing) => (
            <li
              className="grid grid-cols-[2ch_minmax(0,1fr)] gap-x-[1ch] border-b border-line py-3"
              key={listing.shareId}
            >
              <KindMark kind={listing.kind} />
              <div className="min-w-0">
                <h2 className="text-body font-semibold">
                  <a className="link" href={`/share/${listing.shareId}`}>
                    {listing.title}
                  </a>
                </h2>
                <p className="mt-1 line-clamp-2 text-body text-fg-dim">
                  {toPlainExcerpt(listing.bodyStart, 200)}
                </p>
                <p className="mt-1 flex gap-x-[1ch] text-meta text-fg-faint">
                  <span className="min-w-0 truncate text-fg-dim">{listing.category}/</span>
                  <span className="min-w-0 flex-1 truncate">
                    {listing.tags.map((tag) => `#${tag}`).join(' ')}
                  </span>
                  <time className="shrink-0 tabular-nums" dateTime={listing.listedAt}>
                    {listing.listedAt.slice(0, 10)}
                  </time>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SiteShell>
  )
}
