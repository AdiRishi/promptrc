export const SITE_NAME = 'promptrc'
export const SITE_AUTHOR = SITE_NAME
export const SITE_DEFAULT_TITLE = 'promptrc | terminal-inspired AI prompt library'
export const SITE_DESCRIPTION =
  'A terminal-inspired prompt library for storing, searching, and reusing your best AI prompts.'
export const SITE_KEYWORDS =
  'promptrc, prompt library, AI prompts, prompt manager, terminal UI, prompt workflow'
export const SITE_THEME_COLOR = '#0b0c0e'
export const SITE_BACKGROUND_COLOR = '#0b0c0e'
export const SITE_SOCIAL_IMAGE_PATH = '/og-preview.png'
export const SITE_URL_ENV_KEY = 'VITE_SITE_URL'
export const DEFAULT_SITE_URL = 'http://localhost:8080'
export const CANONICAL_SITE_URL = 'https://promptrc.app'
export const SITEMAP_EXCLUDED_PATHS = ['/design-inspiration']

export function getSiteUrl(rawSiteUrl?: string | null) {
  const trimmedSiteUrl = rawSiteUrl?.trim()

  if (!trimmedSiteUrl) {
    return DEFAULT_SITE_URL
  }

  return trimmedSiteUrl.replace(/\/+$/, '')
}

export function getCanonicalSiteUrl(rawSiteUrl?: string | null) {
  const siteUrl = getSiteUrl(rawSiteUrl)

  if (siteUrl === DEFAULT_SITE_URL) {
    return siteUrl
  }

  const url = new URL(siteUrl)
  const canonicalUrl = new URL(CANONICAL_SITE_URL)

  if (url.hostname === canonicalUrl.hostname || url.hostname === `www.${canonicalUrl.hostname}`) {
    url.protocol = canonicalUrl.protocol
    url.hostname = canonicalUrl.hostname
  }

  return url.toString().replace(/\/$/, '')
}

export function getAbsoluteUrl(path = '/', rawSiteUrl?: string | null) {
  return new URL(path, `${getSiteUrl(rawSiteUrl)}/`).toString()
}

export function getCanonicalAbsoluteUrl(path = '/', rawSiteUrl?: string | null) {
  return new URL(path, `${getCanonicalSiteUrl(rawSiteUrl)}/`).toString()
}

export function getSocialImageUrl(rawSiteUrl?: string | null) {
  return getAbsoluteUrl(SITE_SOCIAL_IMAGE_PATH, rawSiteUrl)
}

export function getCanonicalSocialImageUrl(rawSiteUrl?: string | null) {
  return getCanonicalAbsoluteUrl(SITE_SOCIAL_IMAGE_PATH, rawSiteUrl)
}
