import {
  SITE_APPLICATION_CATEGORY,
  SITE_AUTHOR,
  SITE_BROWSER_REQUIREMENTS,
  SITE_DEFAULT_TITLE,
  SITE_FEATURE_LIST,
  SITE_IN_LANGUAGE,
  SITE_NAME,
  SITE_OG_LOCALE,
  SITE_SOCIAL_IMAGE_ALT,
  SITE_THEME_COLOR,
  getCanonicalAbsoluteUrl,
  getCanonicalLogoUrl,
  getCanonicalSiteUrl,
  getCanonicalSocialImageUrl,
} from '@/lib/site-config'

type SeoParams = {
  title: string
  description: string
  path?: string
  keywords?: string
  image?: string
  imageAlt?: string
  type?: 'website' | 'article'
  robots?: string
}

type JsonLdSchema = Record<string, unknown>

const siteUrlEnv = import.meta.env.VITE_SITE_URL
const DEFAULT_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

function resolveImageUrl(image?: string) {
  if (!image) {
    return getCanonicalSocialImageUrl(siteUrlEnv)
  }

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image
  }

  return getCanonicalAbsoluteUrl(image, siteUrlEnv)
}

function resolveImageAlt(imageAlt?: string) {
  return imageAlt ?? SITE_SOCIAL_IMAGE_ALT
}

function getSchemaIds(siteUrl: string) {
  return {
    organization: `${siteUrl}/#organization`,
    website: `${siteUrl}/#website`,
    software: `${siteUrl}/#software`,
    homepage: `${siteUrl}/#webpage`,
  }
}

export function jsonLdScripts(schemas: JsonLdSchema | JsonLdSchema[]) {
  const schemaList = Array.isArray(schemas) ? schemas : [schemas]

  return schemaList.map((schema) => ({
    type: 'application/ld+json',
    children: JSON.stringify(schema),
  }))
}

export function seo({
  title,
  description,
  path = '/',
  keywords,
  image,
  imageAlt,
  type = 'website',
  robots,
}: SeoParams) {
  const pageUrl = getCanonicalAbsoluteUrl(path, siteUrlEnv)
  const imageUrl = resolveImageUrl(image)
  const resolvedImageAlt = resolveImageAlt(imageAlt)

  return [
    { title },
    { name: 'description', content: description },
    ...(keywords ? [{ name: 'keywords', content: keywords }] : []),
    { name: 'robots', content: robots ?? DEFAULT_ROBOTS },
    { name: 'referrer', content: 'strict-origin-when-cross-origin' },
    { name: 'application-name', content: SITE_NAME },
    { name: 'apple-mobile-web-app-title', content: SITE_NAME },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'format-detection', content: 'telephone=no' },
    { name: 'creator', content: SITE_AUTHOR },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:alt', content: resolvedImageAlt },
    { property: 'og:url', content: pageUrl },
    { property: 'og:type', content: type },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: SITE_OG_LOCALE },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
    { name: 'twitter:image:alt', content: resolvedImageAlt },
    { name: 'theme-color', content: SITE_THEME_COLOR },
    { name: 'author', content: SITE_AUTHOR },
  ]
}

export function canonicalLink(path = '/') {
  return {
    rel: 'canonical',
    href: getCanonicalAbsoluteUrl(path, siteUrlEnv),
  }
}

export function getWebAppJsonLd() {
  const siteUrl = getCanonicalSiteUrl(siteUrlEnv)
  const schemaIds = getSchemaIds(siteUrl)

  return {
    '@id': schemaIds.software,
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: siteUrl,
    description:
      'A terminal-inspired prompt library for storing, searching, and reusing your best AI prompts.',
    applicationCategory: SITE_APPLICATION_CATEGORY,
    operatingSystem: 'Any',
    inLanguage: SITE_IN_LANGUAGE,
    isAccessibleForFree: true,
    browserRequirements: SITE_BROWSER_REQUIREMENTS,
    featureList: [...SITE_FEATURE_LIST],
    screenshot: getCanonicalSocialImageUrl(siteUrlEnv),
    image: getCanonicalSocialImageUrl(siteUrlEnv),
    mainEntityOfPage: {
      '@id': schemaIds.homepage,
    },
    publisher: {
      '@id': schemaIds.organization,
    },
    author: {
      '@id': schemaIds.organization,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }
}

export function getOrganizationJsonLd() {
  const siteUrl = getCanonicalSiteUrl(siteUrlEnv)
  const schemaIds = getSchemaIds(siteUrl)
  const logoUrl = getCanonicalLogoUrl(siteUrlEnv)
  const imageUrl = getCanonicalSocialImageUrl(siteUrlEnv)

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': schemaIds.organization,
    name: SITE_NAME,
    url: siteUrl,
    description:
      'A terminal-inspired prompt library for storing, searching, and reusing AI prompts.',
    logo: {
      '@type': 'ImageObject',
      url: logoUrl,
    },
    image: imageUrl,
  }
}

export function getWebsiteJsonLd() {
  const siteUrl = getCanonicalSiteUrl(siteUrlEnv)
  const schemaIds = getSchemaIds(siteUrl)

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': schemaIds.website,
    url: siteUrl,
    name: SITE_NAME,
    description:
      'A terminal-inspired prompt library for storing, searching, and reusing your best AI prompts.',
    inLanguage: SITE_IN_LANGUAGE,
    publisher: {
      '@id': schemaIds.organization,
    },
  }
}

export function getHomePageJsonLd() {
  const siteUrl = getCanonicalSiteUrl(siteUrlEnv)
  const schemaIds = getSchemaIds(siteUrl)

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': schemaIds.homepage,
    url: siteUrl,
    name: SITE_DEFAULT_TITLE,
    description:
      'Browse, search, edit, and reuse your best AI prompts in a terminal-inspired prompt library.',
    inLanguage: SITE_IN_LANGUAGE,
    isPartOf: {
      '@id': schemaIds.website,
    },
    about: {
      '@id': schemaIds.software,
    },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: getCanonicalSocialImageUrl(siteUrlEnv),
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: SITE_NAME,
          item: siteUrl,
        },
      ],
    },
  }
}
