import { CANONICAL_SITE_URL } from '@/lib/site-config'

/**
 * The one page the www host still serves: it hands that host's saved library
 * to the canonical host, which a redirect alone would leave out of reach.
 */
export const WWW_LIBRARY_BRIDGE_PATH = '/www-library'

const SERVER_FUNCTION_PREFIX = '/_serverFn/'

/**
 * `www.promptrc.app` serves the same site as the canonical host. Returns where
 * a page visit to it should be sent, with its path and query intact, or `null`
 * for every other host (the canonical one, previews, localhost).
 *
 * Only page visits move. A tab opened on the www host before the redirect
 * existed keeps calling server functions there, and a redirected POST arrives
 * as a GET without its body.
 */
export const getCanonicalHostRedirect = (request: Pick<Request, 'url' | 'method'>) => {
  const url = new URL(request.url)
  const canonical = new URL(CANONICAL_SITE_URL)

  if (url.hostname !== `www.${canonical.hostname}`) {
    return null
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return null
  }

  if (url.pathname.startsWith(SERVER_FUNCTION_PREFIX) || url.pathname === WWW_LIBRARY_BRIDGE_PATH) {
    return null
  }

  url.protocol = canonical.protocol
  url.hostname = canonical.hostname

  return url.toString()
}
