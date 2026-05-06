import { describe, expect, it } from 'vitest'

import {
  canonicalLink,
  getHomePageJsonLd,
  getOrganizationJsonLd,
  getWebAppJsonLd,
  getWebsiteJsonLd,
  jsonLdScripts,
  seo,
} from '@/lib/seo'
import { SITE_DEFAULT_TITLE, SITE_DESCRIPTION } from '@/lib/site-config'

describe('seo metadata', () => {
  it('emits useful page metadata without the legacy meta keywords tag', () => {
    const meta = seo({
      title: SITE_DEFAULT_TITLE,
      description: SITE_DESCRIPTION,
      path: '/',
    })

    expect(meta).toContainEqual({ title: SITE_DEFAULT_TITLE })
    expect(meta).toContainEqual({ name: 'description', content: SITE_DESCRIPTION })
    expect(meta).toContainEqual({ property: 'og:image:width', content: '1200' })
    expect(meta).toContainEqual({ property: 'og:image:height', content: '630' })
    expect(meta).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'keywords' })]),
    )
  })

  it('supports noindex metadata for public auth routes', () => {
    const meta = seo({
      title: 'Sign in | promptrc',
      description: 'Sign in to promptrc.',
      path: '/sign-in',
      robots: 'noindex, follow',
    })

    expect(meta).toContainEqual({ name: 'robots', content: 'noindex, follow' })
    expect(meta).toContainEqual({
      property: 'og:url',
      content: expect.stringContaining('/sign-in'),
    })
  })

  it('resolves custom social metadata and canonical links to public URLs', () => {
    const meta = seo({
      title: 'Prompt Detail | promptrc',
      description: 'Inspect a reusable prompt.',
      path: '/prompts/alpha',
      image: '/custom-preview.png',
      imageAlt: 'Custom prompt preview',
      type: 'article',
    })
    const openGraphImage = meta.find(
      (entry) => 'property' in entry && entry.property === 'og:image',
    )
    const canonical = canonicalLink('/prompts/alpha')

    expect(openGraphImage).toEqual({
      property: 'og:image',
      content: expect.any(String),
    })
    expect(new URL(openGraphImage?.content ?? '').pathname).toBe('/custom-preview.png')
    expect(meta).toContainEqual({
      name: 'twitter:image:alt',
      content: 'Custom prompt preview',
    })
    expect(meta).toContainEqual({ property: 'og:type', content: 'article' })
    expect(canonical).toEqual({
      rel: 'canonical',
      href: expect.any(String),
    })
    expect(new URL(canonical.href).pathname).toBe('/prompts/alpha')
  })

  it('describes the app and homepage with accurate structured data', () => {
    const webAppJsonLd = getWebAppJsonLd()
    const homePageJsonLd = getHomePageJsonLd()

    expect(webAppJsonLd).toMatchObject({
      '@type': 'WebApplication',
      applicationSubCategory: 'AI prompt management',
      description: SITE_DESCRIPTION,
      isAccessibleForFree: true,
      keywords: expect.stringContaining('AI prompt manager'),
    })
    expect(webAppJsonLd.featureList).toEqual(
      expect.arrayContaining([expect.stringContaining('ChatGPT')]),
    )

    expect(homePageJsonLd).toMatchObject({
      '@type': 'WebPage',
      description: SITE_DESCRIPTION,
      keywords: expect.stringContaining('Claude prompts'),
      mainEntity: {
        '@id': expect.stringContaining('#software'),
      },
    })
  })

  it('serializes structured data scripts for the site publisher graph', () => {
    const organizationJsonLd = getOrganizationJsonLd()
    const websiteJsonLd = getWebsiteJsonLd()

    expect(organizationJsonLd).toMatchObject({
      '@type': 'Organization',
      '@id': expect.stringContaining('#organization'),
      logo: {
        '@type': 'ImageObject',
        url: expect.stringContaining('/logo512.png'),
      },
    })
    expect(websiteJsonLd).toMatchObject({
      '@type': 'WebSite',
      '@id': expect.stringContaining('#website'),
      publisher: {
        '@id': expect.stringContaining('#organization'),
      },
    })

    expect(jsonLdScripts([organizationJsonLd, websiteJsonLd])).toEqual([
      {
        type: 'application/ld+json',
        children: JSON.stringify(organizationJsonLd),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify(websiteJsonLd),
      },
    ])
  })
})
