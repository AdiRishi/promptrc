import { GUIDES, type GuideSlug } from '@/features/site/guides/guides'
import { canonicalLink, getArticleJsonLd, jsonLdScripts, seo } from '@/lib/seo'
import { SITE_NAME } from '@/lib/site-config'

/** The `<head>` of a guide's route: its title, description, canonical link and article data. */
export const guideHead = (slug: GuideSlug) => {
  const guide = GUIDES[slug]
  const path = `/guides/${guide.slug}`

  return {
    meta: seo({
      title: `${guide.title} | ${SITE_NAME}`,
      description: guide.description,
      path,
      type: 'article',
    }),
    links: [canonicalLink(path)],
    scripts: jsonLdScripts(
      getArticleJsonLd({
        title: guide.title,
        description: guide.description,
        path,
        published: guide.published,
        updated: guide.updated,
      }),
    ),
  }
}
