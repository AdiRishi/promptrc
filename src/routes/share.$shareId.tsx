import { createFileRoute } from '@tanstack/react-router'

import { SharedPromptPage } from '@/features/prompt-library/components/shared-prompt-page'
import { canonicalLink, seo } from '@/lib/seo'
import { SITE_NAME } from '@/lib/site-config'

export const Route = createFileRoute('/share/$shareId')({
  component: SharedPromptRoute,
  head: ({ params }) => ({
    meta: seo({
      title: `Shared prompt | ${SITE_NAME}`,
      description: 'A shared promptrc prompt.',
      path: `/share/${params.shareId}`,
      robots: 'noindex, nofollow',
    }),
    links: [canonicalLink(`/share/${params.shareId}`)],
  }),
})

function SharedPromptRoute() {
  const { shareId } = Route.useParams()

  return <SharedPromptPage shareId={shareId} />
}
