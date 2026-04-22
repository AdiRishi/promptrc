import { createFileRoute } from '@tanstack/react-router'

import DesignInspirationApp from '@/design-inspiration/App'
import { canonicalLink, seo } from '@/lib/seo'
import { SITE_NAME } from '@/lib/site-config'

export const Route = createFileRoute('/design-inspiration')({
  component: DesignInspirationRoute,
  head: () => ({
    meta: seo({
      title: `Design Inspiration | ${SITE_NAME}`,
      description: 'Private visual exploration route for promptrc.',
      path: '/design-inspiration',
      robots: 'noindex, nofollow',
    }),
    links: [
      canonicalLink('/design-inspiration'),
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap',
      },
    ],
  }),
})

function DesignInspirationRoute() {
  return <DesignInspirationApp />
}
