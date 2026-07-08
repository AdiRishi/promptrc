import { describe, expect, it } from 'vitest'

import {
  createPendingPromptImageMarkdown,
  createPromptImageMarkdown,
  getImagesReferencedByBody,
  getPromptImageIdsFromBody,
  hasPendingPromptImageUploads,
  promptImageIdFromSrc,
  sanitizePromptImageFileName,
} from '@/features/prompt-library/model/prompt-images'
import { type PromptImage } from '@/features/prompt-library/types'

const image = {
  id: 'image-alpha',
  fileName: 'diagram.png',
  contentType: 'image/png',
  size: 2048,
  createdAt: '2026-04-24T00:00:00.000Z',
} satisfies PromptImage

describe('prompt images', () => {
  it('creates and parses stable markdown image tokens', () => {
    const markdown = createPromptImageMarkdown(image)

    expect(markdown).toBe('![diagram.png](prompt-image://image-alpha)')
    expect(promptImageIdFromSrc('prompt-image://image-alpha')).toBe('image-alpha')
    expect(getPromptImageIdsFromBody(`Before\n\n${markdown}\n\nAfter`)).toEqual(
      new Set(['image-alpha']),
    )
  })

  it('keeps only attached images that are still referenced by the body', () => {
    expect(
      getImagesReferencedByBody('![diagram.png](prompt-image://image-alpha)', [
        image,
        { ...image, id: 'image-beta', fileName: 'unused.png' },
      ]),
    ).toEqual([image])
  })

  it('detects pending image upload placeholders', () => {
    expect(
      hasPendingPromptImageUploads(createPendingPromptImageMarkdown('diagram.png', 'pending-1')),
    ).toBe(true)
    expect(hasPendingPromptImageUploads(createPromptImageMarkdown(image))).toBe(false)
  })

  it('sanitizes pasted file names', () => {
    expect(sanitizePromptImageFileName('  a/b:c.png  ')).toBe('a-b-c.png')
    expect(sanitizePromptImageFileName('')).toBe('pasted-image.png')
  })
})
