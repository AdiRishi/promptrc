import { describe, expect, it } from 'vitest'

import { normalizeStorageError } from '@/features/prompt-library/persistence/prompt-library-storage'

describe('prompt library storage', () => {
  it('normalizes sync failures into user-facing messages', () => {
    expect(normalizeStorageError(new Error('D1 unavailable'))).toBe('D1 unavailable')
    expect(normalizeStorageError('network failed')).toBe('Unable to sync prompts')
  })
})
