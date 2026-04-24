import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

import { queryClient } from '@/lib/query-client'

import { routeTree } from './routeTree.gen'

export const getRouter = () => {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    context: { queryClient },
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
