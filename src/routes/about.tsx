import { createFileRoute } from '@tanstack/react-router'

import { ABOUT_FAQ, AboutPage } from '@/features/site/components/about-page'
import { canonicalLink, getFaqJsonLd, jsonLdScripts, seo } from '@/lib/seo'

export const Route = createFileRoute('/about')({
  component: AboutPage,
  head: () => ({
    meta: seo({
      title: 'About promptrc: a free, open-source AI prompt manager',
      description:
        'What promptrc is and how it works: a prompt library for ChatGPT and Claude prompts, with fill-in variables, sequences, benchmarks and a key for everything.',
      path: '/about',
    }),
    links: [canonicalLink('/about')],
    scripts: jsonLdScripts(getFaqJsonLd(ABOUT_FAQ)),
  }),
})
