import { createFileRoute } from '@tanstack/react-router'

import { GuidesIndexPage } from '@/features/site/components/guide-page'
import { canonicalLink, seo } from '@/lib/seo'

export const Route = createFileRoute('/guides/')({
  component: GuidesIndexPage,
  head: () => ({
    meta: seo({
      title: 'Guides to writing reusable AI prompts | promptrc',
      description:
        'Practical guides to prompt templates with variables, prompt chaining, and benchmarking prompts across AI models.',
      path: '/guides',
    }),
    links: [canonicalLink('/guides')],
  }),
})
