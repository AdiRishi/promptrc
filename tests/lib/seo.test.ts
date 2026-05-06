import { describe, expect, it } from 'vitest'

import { getHomePageJsonLd, getWebAppJsonLd, seo } from '@/lib/seo'
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
})
