import { describe, expect, it } from 'vitest'

import { getCanonicalHostRedirect, WWW_LIBRARY_BRIDGE_PATH } from '@/lib/canonical-host'

const visit = (url: string, method = 'GET') => getCanonicalHostRedirect({ url, method })

describe('canonical host', () => {
  it('sends the www host to the canonical one with its path and query', () => {
    expect(visit('https://www.promptrc.app/guides/prompt-chaining?ref=hn')).toBe(
      'https://promptrc.app/guides/prompt-chaining?ref=hn',
    )
    expect(visit('http://www.promptrc.app/')).toBe('https://promptrc.app/')
    expect(visit('https://www.promptrc.app/about', 'HEAD')).toBe('https://promptrc.app/about')
  })

  it('leaves the canonical host, previews and local development alone', () => {
    expect(visit('https://promptrc.app/about')).toBeNull()
    expect(visit('https://1d8052c4-promptrc.arishi.workers.dev/')).toBeNull()
    expect(visit('http://localhost:8080/')).toBeNull()
  })

  it('lets a tab that is still open on the www host finish its saves and reads', () => {
    expect(visit('https://www.promptrc.app/_serverFn/abc123', 'POST')).toBeNull()
    expect(visit('https://www.promptrc.app/_serverFn/abc123?payload=1')).toBeNull()
    expect(visit('https://www.promptrc.app/', 'POST')).toBeNull()
  })

  it('keeps serving the page that hands over the www host’s saved library', () => {
    expect(visit(`https://www.promptrc.app${WWW_LIBRARY_BRIDGE_PATH}`)).toBeNull()
  })
})
