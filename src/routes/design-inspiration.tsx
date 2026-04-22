import { createFileRoute } from '@tanstack/react-router'

import DesignInspirationApp from '@/design-inspiration/App'

export const Route = createFileRoute('/design-inspiration')({
  ssr: false,
  component: DesignInspirationRoute,
  head: () => ({
    meta: [
      {
        title: 'Design Inspiration',
      },
    ],
  }),
})

function DesignInspirationRoute() {
  return <DesignInspirationApp />
}
