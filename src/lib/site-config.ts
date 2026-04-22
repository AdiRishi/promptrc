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
export const SITEMAP_EXCLUDED_PATHS = ['/design-inspiration']

export function getSiteUrl(rawSiteUrl?: string | null) {
  const trimmedSiteUrl = rawSiteUrl?.trim()

  if (!trimmedSiteUrl) {
    return DEFAULT_SITE_URL
  }

  return trimmedSiteUrl.replace(/\/+$/, '')
}

export function getAbsoluteUrl(path = '/', rawSiteUrl?: string | null) {
  return new URL(path, `${getSiteUrl(rawSiteUrl)}/`).toString()
}

export function getSocialImageUrl(rawSiteUrl?: string | null) {
  return getAbsoluteUrl(SITE_SOCIAL_IMAGE_PATH, rawSiteUrl)
}
