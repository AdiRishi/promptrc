import {
  MAX_PROMPT_IMAGE_BYTES,
  isPromptImageId,
  sanitizePromptImageFileName,
} from '@/features/prompt-library/model/prompt-images'
import { decodePromptImages } from '@/features/prompt-library/persistence/remote/d1-prompt-library-adapter'
import { type PromptImage, type PromptImageUploadInput } from '@/features/prompt-library/types'

type PromptImageFactoryOptions = {
  generateId?: () => string
  now?: () => Date
}

type PromptShareImageRow = {
  ext_user_id: string
  images_json: string
}

const getTimestamp = (options: PromptImageFactoryOptions) => {
  return (options.now?.() ?? new Date()).toISOString()
}

const getImageId = (options: PromptImageFactoryOptions) => {
  return options.generateId ? options.generateId() : crypto.randomUUID()
}

const decodeBase64 = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

export const getPromptImageObjectKey = (extUserId: string, imageId: string) => {
  return `prompt-images/${extUserId}/${imageId}`
}

export const uploadPromptImageForUser = async (
  bucket: R2Bucket,
  extUserId: string,
  upload: PromptImageUploadInput,
  options: PromptImageFactoryOptions = {},
) => {
  const bytes = decodeBase64(upload.dataBase64)

  if (bytes.byteLength === 0) {
    throw new Error('Image data is required')
  }

  if (bytes.byteLength > MAX_PROMPT_IMAGE_BYTES) {
    throw new Error('Image is too large')
  }

  const image = {
    id: getImageId(options),
    fileName: sanitizePromptImageFileName(upload.fileName),
    contentType: upload.contentType,
    size: bytes.byteLength,
    createdAt: getTimestamp(options),
  } satisfies PromptImage

  await bucket.put(getPromptImageObjectKey(extUserId, image.id), bytes, {
    httpMetadata: {
      contentType: image.contentType,
    },
    customMetadata: {
      fileName: image.fileName,
    },
  })

  return image
}

export const getPromptImageObjectForUser = async (
  bucket: R2Bucket,
  extUserId: string,
  imageId: string,
) => {
  if (!isPromptImageId(imageId)) {
    return null
  }

  return bucket.get(getPromptImageObjectKey(extUserId, imageId))
}

export const getPublicPromptShareImageObject = async (
  db: D1Database,
  bucket: R2Bucket,
  shareId: string,
  imageId: string,
) => {
  if (!isPromptImageId(imageId)) {
    return null
  }

  const { results } = await db
    .prepare(
      `
        SELECT prompts.ext_user_id, prompts.images_json
        FROM prompt_shares AS shares
        INNER JOIN prompts
          ON prompts.id = shares.prompt_id
          AND prompts.ext_user_id = shares.ext_user_id
        WHERE shares.id = ? AND shares.revoked_at IS NULL
        LIMIT 1
      `,
    )
    .bind(shareId)
    .all<PromptShareImageRow>()

  const row = results[0]

  if (!row) {
    return null
  }

  const hasImage = decodePromptImages(row.images_json).some((image) => image.id === imageId)

  if (!hasImage) {
    return null
  }

  return getPromptImageObjectForUser(bucket, row.ext_user_id, imageId)
}

export const promptImageObjectToResponse = (object: R2ObjectBody | null) => {
  if (!object) {
    return new Response('Image not found', { status: 404 })
  }

  const headers = new Headers()
  const metadata = object.httpMetadata

  if (metadata?.contentType) {
    headers.set('content-type', metadata.contentType)
  }

  if (metadata?.contentLanguage) {
    headers.set('content-language', metadata.contentLanguage)
  }

  if (metadata?.contentDisposition) {
    headers.set('content-disposition', metadata.contentDisposition)
  }

  if (metadata?.contentEncoding) {
    headers.set('content-encoding', metadata.contentEncoding)
  }

  if (metadata?.cacheExpiry) {
    headers.set('expires', metadata.cacheExpiry.toUTCString())
  }

  if (metadata?.cacheControl) {
    headers.set('cache-control', metadata.cacheControl)
  }

  headers.set('etag', object.httpEtag)

  if (!headers.has('cache-control')) {
    headers.set('cache-control', 'private, max-age=3600')
  }

  return new Response(object.body, { headers })
}
