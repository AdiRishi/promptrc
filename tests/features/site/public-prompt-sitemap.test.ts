import { describe, expect, it } from 'vitest'

import { type PublicPromptListing } from '@/features/prompt-library/types'
import { buildPublicPromptSitemap } from '@/features/site/public-prompt-sitemap'

const listing = (overrides: Partial<PublicPromptListing> = {}): PublicPromptListing => ({
  shareId: 'share-alpha',
  listedAt: '2026-04-24T00:05:00.000Z',
  kind: 'prompt',
  title: 'Alpha',
  category: 'Engineering',
  tags: [],
  bodyStart: 'Write a concise test plan.',
  ...overrides,
})

const locations = (sitemap: string) =>
  [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])

describe('the sitemap for published Prompts', () => {
  it('lists the public page and each published share on the canonical host', () => {
    const sitemap = buildPublicPromptSitemap(
      [
        listing({ shareId: 'share-beta', listedAt: '2026-04-25T00:05:00.000Z' }),
        listing({ shareId: 'share-alpha' }),
      ],
      'https://www.promptrc.app',
    )

    expect(locations(sitemap)).toEqual([
      'https://promptrc.app/prompts',
      'https://promptrc.app/share/share-beta',
      'https://promptrc.app/share/share-alpha',
    ])
    expect(sitemap).toContain('<lastmod>2026-04-25T00:05:00.000Z</lastmod>')
  })

  it('offers nothing while nothing is published', () => {
    const sitemap = buildPublicPromptSitemap([], 'https://promptrc.app')

    expect(locations(sitemap)).toEqual([])
    expect(sitemap).toContain('<urlset')
  })

  it('escapes a share id that is not XML-safe', () => {
    const sitemap = buildPublicPromptSitemap([listing({ shareId: 'a&b' })], 'https://promptrc.app')

    expect(sitemap).toContain('https://promptrc.app/share/a&amp;b')
  })
})
