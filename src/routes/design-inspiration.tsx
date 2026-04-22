import { createFileRoute } from '@tanstack/react-router'

import DesignInspirationApp from '@/design-inspiration/App'

export const Route = createFileRoute('/design-inspiration')({
  component: DesignInspirationRoute,
  head: () => ({
    meta: [
      {
        title: 'Design Inspiration',
      },
    ],
    links: [
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
