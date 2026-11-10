import { CANONICAL_SITE_URL } from '@/lib/site-config'

/**
 * `www.promptrc.app` serves the same site as the canonical host. Returns where
 * a request to it should be sent, with its path and query intact, or `null`
 * for every other host (the canonical one, previews, localhost).
 */
export const getCanonicalHostRedirect = (requestUrl: string) => {
  const url = new URL(requestUrl)
  const canonical = new URL(CANONICAL_SITE_URL)

  if (url.hostname !== `www.${canonical.hostname}`) {
    return null
  }

  url.protocol = canonical.protocol
  url.hostname = canonical.hostname

  return url.toString()
}
