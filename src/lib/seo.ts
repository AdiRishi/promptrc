import {
  SITE_ALTERNATE_NAMES,
  SITE_APPLICATION_CATEGORY,
  SITE_APPLICATION_SUB_CATEGORY,
  SITE_AUDIENCE,
  SITE_AUTHOR,
  SITE_BROWSER_REQUIREMENTS,
  SITE_DEFAULT_TITLE,
  SITE_DESCRIPTION,
  SITE_FEATURE_LIST,
  SITE_GITHUB_URL,
  SITE_IN_LANGUAGE,
  SITE_KEYWORDS,
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
    { property: 'og:image:type', content: 'image/png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
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
    alternateName: [...SITE_ALTERNATE_NAMES],
    url: siteUrl,
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
    applicationCategory: SITE_APPLICATION_CATEGORY,
    applicationSubCategory: SITE_APPLICATION_SUB_CATEGORY,
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
    audience: {
      '@type': 'Audience',
      audienceType: SITE_AUDIENCE,
    },
    sameAs: [SITE_GITHUB_URL],
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
    description: SITE_DESCRIPTION,
    logo: {
      '@type': 'ImageObject',
      url: logoUrl,
    },
    image: imageUrl,
    sameAs: [SITE_GITHUB_URL],
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
    alternateName: [...SITE_ALTERNATE_NAMES],
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
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
    '@type': 'WebPage',
    '@id': schemaIds.homepage,
    url: siteUrl,
    name: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
    inLanguage: SITE_IN_LANGUAGE,
    isPartOf: {
      '@id': schemaIds.website,
    },
    about: {
      '@id': schemaIds.software,
    },
    mainEntity: {
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
