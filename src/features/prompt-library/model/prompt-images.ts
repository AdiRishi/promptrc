import { type PromptImage } from '@/features/prompt-library/types'

export const PROMPT_IMAGE_SRC_PREFIX = 'prompt-image://'
export const PENDING_PROMPT_IMAGE_SRC_PREFIX = 'prompt-image-pending://'
export const MAX_PROMPT_IMAGE_BYTES = 5 * 1024 * 1024
export const SUPPORTED_PROMPT_IMAGE_CONTENT_TYPES = [
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const PROMPT_IMAGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,96}$/
const IMAGE_MARKDOWN_SRC_PATTERN = /!\[[^\]]*]\((prompt-image:\/\/([A-Za-z0-9_-]{1,96}))\)/g

export const sanitizePromptImageFileName = (fileName: string) => {
  const normalizedName = fileName
    .trim()
    .replace(/[^\w. -]+/g, '-')
    .replace(/\s+/g, ' ')

  return normalizedName || 'pasted-image.png'
}

export const isSupportedPromptImageContentType = (contentType: string) => {
  return SUPPORTED_PROMPT_IMAGE_CONTENT_TYPES.includes(contentType.toLowerCase())
}

export const isPromptImageId = (value: string) => {
  return PROMPT_IMAGE_ID_PATTERN.test(value)
}

export const promptImageIdFromSrc = (src: string | undefined) => {
  if (!src?.startsWith(PROMPT_IMAGE_SRC_PREFIX)) {
    return null
  }

  const imageId = src.slice(PROMPT_IMAGE_SRC_PREFIX.length)

  return isPromptImageId(imageId) ? imageId : null
}

export const shouldPreservePromptImageSrc = (src: string) => {
  return src.startsWith(PROMPT_IMAGE_SRC_PREFIX) || src.startsWith(PENDING_PROMPT_IMAGE_SRC_PREFIX)
}

export const hasPendingPromptImageUploads = (body: string) => {
  return body.includes(PENDING_PROMPT_IMAGE_SRC_PREFIX)
}

export const defaultPromptImageUrlFor = (imageId: string) => {
  return `/api/prompt-images/${encodeURIComponent(imageId)}`
}

export const appendPromptImageCacheKey = (
  url: string,
  image?: Pick<PromptImage, 'createdAt' | 'size'>,
) => {
  if (!image) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  const cacheKey = encodeURIComponent(`${image.createdAt}-${image.size}`)

  return `${url}${separator}v=${cacheKey}`
}

export const defaultVersionedPromptImageUrlFor = (
  imageId: string,
  image?: Pick<PromptImage, 'createdAt' | 'size'>,
) => {
  return appendPromptImageCacheKey(defaultPromptImageUrlFor(imageId), image)
}

const escapeImageAltText = (value: string) => {
  return value.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]')
}

export const createPromptImageMarkdown = (image: Pick<PromptImage, 'fileName' | 'id'>) => {
  return `![${escapeImageAltText(image.fileName)}](${PROMPT_IMAGE_SRC_PREFIX}${image.id})`
}

export const createPendingPromptImageMarkdown = (fileName: string, pendingId: string) => {
  return `![uploading ${escapeImageAltText(fileName)}](${PENDING_PROMPT_IMAGE_SRC_PREFIX}${pendingId})`
}

export const getPromptImageIdsFromBody = (body: string) => {
  const imageIds = new Set<string>()

  for (const match of body.matchAll(IMAGE_MARKDOWN_SRC_PATTERN)) {
    const imageId = match[2]

    if (imageId) {
      imageIds.add(imageId)
    }
  }

  return imageIds
}

export const normalizePromptImage = (image: PromptImage): PromptImage => ({
  id: image.id.trim(),
  fileName: sanitizePromptImageFileName(image.fileName),
  contentType: image.contentType.trim().toLowerCase(),
  size: image.size,
  createdAt: image.createdAt,
})

export const normalizePromptImages = (images: readonly PromptImage[]) => {
  const seen = new Set<string>()
  const normalizedImages: PromptImage[] = []

  for (const image of images) {
    const normalizedImage = normalizePromptImage(image)

    if (!isPromptImageId(normalizedImage.id) || seen.has(normalizedImage.id)) {
      continue
    }

    seen.add(normalizedImage.id)
    normalizedImages.push(normalizedImage)
  }

  return normalizedImages
}

export const getImagesReferencedByBody = (body: string, images: readonly PromptImage[]) => {
  const referencedImageIds = getPromptImageIdsFromBody(body)

  if (referencedImageIds.size === 0) {
    return []
  }

  return normalizePromptImages(images).filter((image) => referencedImageIds.has(image.id))
}
