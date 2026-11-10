import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'

import { getCanonicalHostRedirect } from '@/lib/canonical-host'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

// One address per page: search engines split a site's standing across duplicate hosts.
const canonicalHostMiddleware = createMiddleware().server(({ request, next }) => {
  const location = getCanonicalHostRedirect(request)

  return location ? Response.redirect(location, 301) : next()
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [canonicalHostMiddleware, csrfMiddleware, clerkMiddleware()],
  }
})
