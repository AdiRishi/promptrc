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
 *
 * It gives no `lastmod`. Nothing records when a Prompt's public text last
 * changed (`updated_at` also moves on every copy, pin and logged run), and a
 * date a crawler finds wrong is worse than none.
 */
export const buildPublicPromptSitemap = (
  listings: ReadonlyArray<Pick<PublicPromptListing, 'shareId'>>,
  rawSiteUrl?: string | null,
) => {
  const paths =
    listings.length > 0
      ? ['/prompts', ...listings.map((listing) => `/share/${listing.shareId}`)]
      : []
  const urls = paths
    .map(
      (path) => `  <url>
    <loc>${escapeXml(getCanonicalAbsoluteUrl(path, rawSiteUrl))}</loc>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}
