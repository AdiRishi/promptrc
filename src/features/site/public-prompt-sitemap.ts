import { type PublicPromptListing } from '@/features/prompt-library/types'
import { getCanonicalAbsoluteUrl } from '@/lib/site-config'

const escapeXml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/**
 * The sitemap for published Prompts. The static sitemap is written at build
 * time and cannot know them, so this one is built per request: the public list
 * page, then each published share. With nothing published it lists no URLs.
 */
export const buildPublicPromptSitemap = (
  listings: readonly PublicPromptListing[],
  rawSiteUrl?: string | null,
) => {
  const newest = listings[0]
  const entries = newest
    ? [
        { path: '/prompts', lastModified: newest.listedAt },
        ...listings.map((listing) => ({
          path: `/share/${listing.shareId}`,
          lastModified: listing.listedAt,
        })),
      ]
    : []
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(getCanonicalAbsoluteUrl(entry.path, rawSiteUrl))}</loc>
    <lastmod>${escapeXml(entry.lastModified)}</lastmod>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}
