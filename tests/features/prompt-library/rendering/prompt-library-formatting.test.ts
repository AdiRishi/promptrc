import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  countWords,
  estimateTokens,
  formatCatalogNumber,
  relativeTime,
  toPlainExcerpt,
} from '@/features/prompt-library/rendering/prompt-library-formatting'

describe('prompt library formatting', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats recent timestamps into compact relative labels', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-24T12:00:00.000Z'))

    expect(relativeTime('2026-04-24T11:59:30.000Z')).toBe('just now')
    expect(relativeTime('2026-04-24T11:54:00.000Z')).toBe('6m ago')
    expect(relativeTime('2026-04-24T09:00:00.000Z')).toBe('3h ago')
    expect(relativeTime('2026-04-21T12:00:00.000Z')).toBe('3d ago')
  })

  it('pads catalog numbers like accession numbers', () => {
    expect(formatCatalogNumber(7)).toBe('№ 007')
    expect(formatCatalogNumber(1234)).toBe('№ 1234')
    expect(formatCatalogNumber(undefined)).toBe('№ —')
  })

  it('builds markdown-free excerpts that hide sequence markers', () => {
    expect(
      toPlainExcerpt(
        '## Step\n\nRead **this** [doc](https://x.dev).\n\n<!-- step -->\n\nThen `ship`.',
      ),
    ).toBe('Step Read this doc. Then ship .')
    expect(toPlainExcerpt('a'.repeat(30), 10)).toBe(`${'a'.repeat(10)}…`)
  })

  it('counts words and estimates tokens without step markers', () => {
    expect(countWords('one two\n\n<!-- step -->\n\nthree')).toBe(3)
    expect(estimateTokens('12345678')).toBe(2)
  })
})
