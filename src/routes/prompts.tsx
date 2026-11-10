import { createFileRoute } from '@tanstack/react-router'

import { listPublicRemotePromptShares } from '@/features/prompt-library/server/prompt-library-functions'
import { PublicPromptsPage } from '@/features/site/components/public-prompts-page'
import { canonicalLink, seo } from '@/lib/seo'

export const Route = createFileRoute('/prompts')({
  loader: () => listPublicRemotePromptShares(),
  component: PublicPromptsRoute,
  head: ({ loaderData: listings }) => ({
    meta: seo({
      title: 'Public prompts for ChatGPT, Claude and more | promptrc',
      description:
        'Prompts, fragments, sequences and benchmarks published by promptrc users. Read one, fill in its blanks and copy it.',
      path: '/prompts',
      // An empty list is not worth a place in search results.
      robots: listings?.length ? undefined : 'noindex, follow',
    }),
    links: [canonicalLink('/prompts')],
  }),
})

function PublicPromptsRoute() {
  return <PublicPromptsPage listings={Route.useLoaderData()} />
}
