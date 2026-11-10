import { describe, expect, it } from 'vitest'

import { buildPublicPromptSitemap } from '@/features/site/public-prompt-sitemap'

const locations = (sitemap: string) =>
  [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])

describe('the sitemap for published Prompts', () => {
  it('lists the public page and each published share on the canonical host', () => {
    const sitemap = buildPublicPromptSitemap(
      [{ shareId: 'share-beta' }, { shareId: 'share-alpha' }],
      'https://www.promptrc.app',
    )

    expect(locations(sitemap)).toEqual([
      'https://promptrc.app/prompts',
      'https://promptrc.app/share/share-beta',
      'https://promptrc.app/share/share-alpha',
    ])
  })

  it('claims no modification dates, since none is recorded for the public text', () => {
    const sitemap = buildPublicPromptSitemap([{ shareId: 'share-alpha' }], 'https://promptrc.app')

    expect(sitemap).not.toContain('<lastmod>')
  })

  it('offers nothing while nothing is published', () => {
    const sitemap = buildPublicPromptSitemap([], 'https://promptrc.app')

    expect(locations(sitemap)).toEqual([])
    expect(sitemap).toContain('<urlset')
  })

  it('escapes a share id that is not XML-safe', () => {
    const sitemap = buildPublicPromptSitemap([{ shareId: 'a&b' }], 'https://promptrc.app')

    expect(sitemap).toContain('https://promptrc.app/share/a&amp;b')
  })
})
