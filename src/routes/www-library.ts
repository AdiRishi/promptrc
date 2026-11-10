import { createFileRoute } from '@tanstack/react-router'

import { LOCAL_STORAGE_KEY } from '@/features/prompt-library/persistence/local/local-prompt-library-storage'
import { getWwwLibraryBridgeHtml } from '@/features/prompt-library/persistence/local/www-host-library'
import { CANONICAL_SITE_URL } from '@/lib/site-config'

export const Route = createFileRoute('/www-library')({
  server: {
    handlers: {
      GET: () =>
        new Response(getWwwLibraryBridgeHtml(LOCAL_STORAGE_KEY), {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            // Only the canonical host may frame it, and it tells no one else what it reads.
            'content-security-policy': `frame-ancestors ${CANONICAL_SITE_URL}`,
            'x-robots-tag': 'noindex',
          },
        }),
    },
  },
})
