import { describe, expect, it } from 'vitest'

import {
  getCanonicalAbsoluteUrl,
  getCanonicalSiteUrl,
  getSiteUrl,
  getSocialImageUrl,
} from '@/lib/site-config'

describe('site config', () => {
  it('normalizes configured site URLs for canonical metadata', () => {
    expect(getSiteUrl(' https://www.promptrc.app/// ')).toBe('https://www.promptrc.app')
    expect(getCanonicalSiteUrl('https://www.promptrc.app')).toBe('https://promptrc.app')
    expect(getCanonicalAbsoluteUrl('/sign-in', 'https://www.promptrc.app')).toBe(
      'https://promptrc.app/sign-in',
    )
    expect(getSocialImageUrl('https://preview.promptrc.app')).toBe(
      'https://preview.promptrc.app/og-preview.png',
    )
  })
})
