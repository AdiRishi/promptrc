import { createFileRoute } from '@tanstack/react-router'

import { listPublicRemotePromptShares } from '@/features/prompt-library/server/prompt-library-functions'
import { buildPublicPromptSitemap } from '@/features/site/public-prompt-sitemap'

export const Route = createFileRoute('/sitemap-prompts.xml')({
  server: {
    handlers: {
      GET: async () => {
        const listings = await listPublicRemotePromptShares()

        return new Response(buildPublicPromptSitemap(listings, import.meta.env.VITE_SITE_URL), {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
