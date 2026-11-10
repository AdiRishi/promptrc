import { createFileRoute } from '@tanstack/react-router'

import { ManualPage } from '@/features/site/components/manual-page'
import { canonicalLink, seo } from '@/lib/seo'

export const Route = createFileRoute('/manual')({
  component: ManualPage,
  head: () => ({
    meta: seo({
      title: 'promptrc manual: every key and command',
      description:
        'Keyboard shortcuts, command-line commands, template syntax and colorschemes for promptrc, the keyboard-first AI prompt manager.',
      path: '/manual',
    }),
    links: [canonicalLink('/manual')],
  }),
})
