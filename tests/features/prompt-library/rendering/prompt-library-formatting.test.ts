import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  filenameOf,
  relativeTime,
} from '@/features/prompt-library/rendering/prompt-library-formatting'

describe('prompt library formatting', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats Prompt titles as stable filenames', () => {
    expect(filenameOf('  Release Notes / Support Playbook!  ')).toBe(
      'release_notes_support_playbook',
    )
    expect(filenameOf('!!!')).toBe('untitled')
    expect(filenameOf('A very long title that should be clipped before it becomes noisy')).toBe(
      'a_very_long_title_that_should_be_clipped',
    )
  })

  it('formats recent timestamps into compact relative labels', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-24T12:00:00.000Z'))

    expect(relativeTime('2026-04-24T11:59:30.000Z')).toBe('just now')
    expect(relativeTime('2026-04-24T11:54:00.000Z')).toBe('6m ago')
    expect(relativeTime('2026-04-24T09:00:00.000Z')).toBe('3h ago')
    expect(relativeTime('2026-04-21T12:00:00.000Z')).toBe('3d ago')
  })
})
