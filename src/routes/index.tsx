import { createFileRoute } from '@tanstack/react-router'

import { PromptLibraryApp } from '@/features/prompt-library/components/prompt-library-app'
import { canonicalLink, getWebAppJsonLd, jsonLdScripts, seo } from '@/lib/seo'
import { SITE_DEFAULT_TITLE, SITE_DESCRIPTION, SITE_KEYWORDS } from '@/lib/site-config'

export const Route = createFileRoute('/')({
  component: HomeRoute,
  head: () => ({
    meta: seo({
      title: SITE_DEFAULT_TITLE,
      description: SITE_DESCRIPTION,
      keywords: SITE_KEYWORDS,
      path: '/',
    }),
    links: [canonicalLink('/')],
    scripts: jsonLdScripts(getWebAppJsonLd()),
  }),
})

function HomeRoute() {
  return <PromptLibraryApp />
}
