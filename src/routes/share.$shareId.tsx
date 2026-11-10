import { createFileRoute, notFound } from '@tanstack/react-router'

import { SharedPromptPage } from '@/features/prompt-library/components/shared-prompt-page'
import { isPromptShareId } from '@/features/prompt-library/model/prompt-library-validation'
import { toPlainExcerpt } from '@/features/prompt-library/rendering/prompt-library-formatting'
import { getPublicRemotePromptShare } from '@/features/prompt-library/server/prompt-library-functions'
import { canonicalLink, seo } from '@/lib/seo'
import { SITE_NAME } from '@/lib/site-config'

export const Route = createFileRoute('/share/$shareId')({
  // Loaded with the page, so a first visit (and a crawler) gets the Prompt in the HTML,
  // and a dead link answers 404 instead of a page that says so with a 200.
  loader: async ({ params }) => {
    const share = isPromptShareId(params.shareId)
      ? await getPublicRemotePromptShare({ data: params.shareId })
      : null

    if (!share) {
      throw notFound()
    }

    return share
  },
  component: SharedPromptRoute,
  notFoundComponent: MissingSharedPromptRoute,
  head: ({ params, loaderData: share }) => {
    const path = `/share/${params.shareId}`

    return {
      meta: seo({
        title: share ? `${share.prompt.title} | ${SITE_NAME}` : `Shared prompt | ${SITE_NAME}`,
        description:
          (share && toPlainExcerpt(share.prompt.body, 155)) || 'A prompt shared from promptrc.',
        path,
        type: 'article',
        // Only a share its owner published is offered to search engines.
        robots: share?.listed ? undefined : 'noindex, nofollow',
      }),
      links: [canonicalLink(path)],
    }
  },
})

function SharedPromptRoute() {
  const { shareId } = Route.useParams()
  const share = Route.useLoaderData()

  return <SharedPromptPage share={share} shareId={shareId} />
}

function MissingSharedPromptRoute() {
  const { shareId } = Route.useParams()

  return <SharedPromptPage share={null} shareId={shareId} />
}
