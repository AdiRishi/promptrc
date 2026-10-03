export const SITE_NAME = 'promptrc'
export const SITE_AUTHOR = SITE_NAME
export const SITE_APP_HEADING = 'promptrc — a commonplace book for working with AI'
export const SITE_DEFAULT_TITLE = 'promptrc | a commonplace book for working with AI'
export const SITE_DESCRIPTION =
  'A local-first commonplace book for working with AI: capture reusable prompts with fill-in variables, phrasing that landed, multi-step sequences, and reproducible benchmarks — then find and reuse them in seconds.'
export const SITE_KEYWORD_LIST = [
  'promptrc',
  'AI prompt manager',
  'AI prompt library',
  'prompt organizer',
  'ChatGPT prompts',
  'Claude prompts',
  'reusable prompts',
  'prompt workflow',
  'local-first prompt library',
] as const
export const SITE_KEYWORDS = SITE_KEYWORD_LIST.join(', ')
export const SITE_ALTERNATE_NAMES = [
  'promptrc prompt library',
  'promptrc prompt manager',
  'promptrc AI prompt organizer',
] as const
export const SITE_AUDIENCE =
  'AI power users, developers, writers, product managers, and operators who reuse prompts across ChatGPT, Claude, and other AI tools.'
export const SITE_THEME_COLOR = '#f4f0e8'
export const SITE_THEME_COLOR_DARK = '#121110'
export const SITE_BACKGROUND_COLOR = '#f4f0e8'
export const SITE_IN_LANGUAGE = 'en'
export const SITE_OG_LOCALE = 'en_US'
export const SITE_SOCIAL_IMAGE_PATH = '/og-preview.png'
export const SITE_SOCIAL_IMAGE_ALT =
  'promptrc interface showing a searchable AI prompt manager with categories, tags, and copy actions'
export const SITE_LOGO_PATH = '/logo512.png'
export const SITE_URL_ENV_KEY = 'VITE_SITE_URL'
export const DEFAULT_SITE_URL = 'http://localhost:8080'
export const CANONICAL_SITE_URL = 'https://promptrc.app'
export const SITE_GITHUB_URL = 'https://github.com/AdiRishi/promptrc'
export const SITE_APPLICATION_CATEGORY = 'ProductivityApplication'
export const SITE_APPLICATION_SUB_CATEGORY = 'AI prompt management'
export const SITE_BROWSER_REQUIREMENTS =
  'Requires JavaScript and works in current evergreen desktop and mobile browsers.'
export const SITE_FEATURE_LIST = [
  'Save reusable AI prompts with fill-in {{variables}} you complete before copying',
  'Keep fragments of phrasing, multi-step sequences, and reproducible benchmarks with run logs',
  'Capture an idea in seconds and find anything with a keyboard-first command palette',
  'Search prompt titles, bodies, notes, collections, and tags instantly',
  'Organize prompts by category and tag without heavyweight content management',
  'Copy prompt bodies into ChatGPT, Claude, coding tools, and writing workflows',
  'Use local-first browser storage with optional signed-in cloud sync',
  'Move quickly with keyboard-first prompt retrieval',
] as const

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

export function getCanonicalLogoUrl(rawSiteUrl?: string | null) {
  return getCanonicalAbsoluteUrl(SITE_LOGO_PATH, rawSiteUrl)
}
