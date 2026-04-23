import {
  SITE_AUTHOR,
  SITE_NAME,
  SITE_THEME_COLOR,
  getCanonicalAbsoluteUrl,
  getCanonicalSiteUrl,
  getCanonicalSocialImageUrl,
} from '@/lib/site-config'

type SeoParams = {
  title: string
  description: string
  path?: string
  keywords?: string
  image?: string
  type?: 'website' | 'article'
  robots?: string
}

type JsonLdSchema = Record<string, unknown>

const siteUrlEnv = import.meta.env.VITE_SITE_URL

function resolveImageUrl(image?: string) {
  if (!image) {
    return getCanonicalSocialImageUrl(siteUrlEnv)
  }

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image
  }

  return getCanonicalAbsoluteUrl(image, siteUrlEnv)
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
  type = 'website',
  robots,
}: SeoParams) {
  const pageUrl = getCanonicalAbsoluteUrl(path, siteUrlEnv)
  const imageUrl = resolveImageUrl(image)

  return [
    { title },
    { name: 'description', content: description },
    ...(keywords ? [{ name: 'keywords', content: keywords }] : []),
    ...(robots ? [{ name: 'robots', content: robots }] : []),
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: imageUrl },
    { property: 'og:url', content: pageUrl },
    { property: 'og:type', content: type },
    { property: 'og:site_name', content: SITE_NAME },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
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

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: siteUrl,
    description:
      'A terminal-inspired prompt library for storing, searching, and reusing your best AI prompts.',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Any',
    image: getCanonicalSocialImageUrl(siteUrlEnv),
    author: {
      '@type': 'Organization',
      name: SITE_AUTHOR,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }
}
