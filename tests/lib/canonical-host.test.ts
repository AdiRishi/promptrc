import { describe, expect, it } from 'vitest'

import { getCanonicalHostRedirect } from '@/lib/canonical-host'

describe('canonical host', () => {
  it('sends the www host to the canonical one with its path and query', () => {
    expect(getCanonicalHostRedirect('https://www.promptrc.app/guides/prompt-chaining?ref=hn')).toBe(
      'https://promptrc.app/guides/prompt-chaining?ref=hn',
    )
    expect(getCanonicalHostRedirect('http://www.promptrc.app/')).toBe('https://promptrc.app/')
  })

  it('leaves the canonical host, previews and local development alone', () => {
    expect(getCanonicalHostRedirect('https://promptrc.app/about')).toBeNull()
    expect(getCanonicalHostRedirect('https://1d8052c4-promptrc.arishi.workers.dev/')).toBeNull()
    expect(getCanonicalHostRedirect('http://localhost:8080/')).toBeNull()
  })
})
