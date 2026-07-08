import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { createPromptImageMarkdown } from '@/features/prompt-library/model/prompt-images'
import {
  getPromptImageObjectForUser,
  getPublicPromptShareImageObject,
  promptImageObjectToResponse,
  uploadPromptImageForUser,
} from '@/features/prompt-library/persistence/remote/prompt-image-persistence'
import { createPromptShareForUser } from '@/features/prompt-library/persistence/remote/prompt-share-persistence'
import {
  deletePromptAndPruneImagesForUser,
  savePromptAndPruneImagesForUser,
  upsertPromptForUser,
} from '@/features/prompt-library/persistence/remote/remote-prompt-library-persistence'
import { type PromptRecord } from '@/features/prompt-library/types'

const createPrompt = (overrides: Partial<PromptRecord> = {}): PromptRecord => ({
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing'],
  images: [],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
  ...overrides,
})

const uploadImage = (extUserId: string, imageId: string, data: string) =>
  uploadPromptImageForUser(
    env.PROMPT_IMAGES,
    extUserId,
    {
      fileName: `${imageId}.png`,
      contentType: 'image/png',
      dataBase64: btoa(data),
    },
    {
      generateId: () => imageId,
      now: () => new Date('2026-04-24T00:01:00.000Z'),
    },
  )

describe('prompt image persistence', () => {
  it('uploads pasted images into the user-scoped R2 prefix', async () => {
    const image = await uploadPromptImageForUser(
      env.PROMPT_IMAGES,
      'user_a',
      {
        fileName: 'diagram.png',
        contentType: 'image/png',
        dataBase64: btoa('prompt image bytes'),
      },
      {
        generateId: () => 'image-alpha',
        now: () => new Date('2026-04-24T00:01:00.000Z'),
      },
    )

    expect(image).toEqual({
      id: 'image-alpha',
      fileName: 'diagram.png',
      contentType: 'image/png',
      size: 18,
      createdAt: '2026-04-24T00:01:00.000Z',
    })

    const object = await getPromptImageObjectForUser(env.PROMPT_IMAGES, 'user_a', image.id)

    await expect(object?.text()).resolves.toBe('prompt image bytes')
    expect(object?.httpMetadata?.contentType).toBe('image/png')
    await expect(getPromptImageObjectForUser(env.PROMPT_IMAGES, 'user_b', image.id)).resolves.toBe(
      null,
    )
  })

  it('streams shared prompt images only when the share references that image', async () => {
    const image = await uploadPromptImageForUser(
      env.PROMPT_IMAGES,
      'user_a',
      {
        fileName: 'diagram.png',
        contentType: 'image/png',
        dataBase64: btoa('shared image bytes'),
      },
      {
        generateId: () => 'image-shared',
      },
    )

    await upsertPromptForUser(
      env.DB,
      'user_a',
      createPrompt({
        body: createPromptImageMarkdown(image),
        images: [image],
      }),
    )
    await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-alpha',
    })

    const object = await getPublicPromptShareImageObject(
      env.DB,
      env.PROMPT_IMAGES,
      'share-alpha',
      image.id,
    )

    await expect(object?.text()).resolves.toBe('shared image bytes')
    await expect(
      getPublicPromptShareImageObject(env.DB, env.PROMPT_IMAGES, 'share-alpha', 'image-missing'),
    ).resolves.toBe(null)
  })

  it('deletes R2 objects when a saved Prompt stops referencing an image', async () => {
    const extUserId = 'user_cleanup_edit'
    const keptImage = await uploadImage(extUserId, 'image-cleanup-kept', 'kept image bytes')
    const removedImage = await uploadImage(
      extUserId,
      'image-cleanup-removed',
      'removed image bytes',
    )

    await savePromptAndPruneImagesForUser(
      env.DB,
      env.PROMPT_IMAGES,
      extUserId,
      createPrompt({
        body: [createPromptImageMarkdown(keptImage), createPromptImageMarkdown(removedImage)].join(
          '\n\n',
        ),
        images: [keptImage, removedImage],
      }),
    )
    await savePromptAndPruneImagesForUser(
      env.DB,
      env.PROMPT_IMAGES,
      extUserId,
      createPrompt({
        body: createPromptImageMarkdown(keptImage),
        images: [keptImage, removedImage],
        updatedAt: '2026-04-24T00:02:00.000Z',
      }),
    )

    await expect(
      getPromptImageObjectForUser(env.PROMPT_IMAGES, extUserId, keptImage.id),
    ).resolves.not.toBeNull()
    await expect(
      getPromptImageObjectForUser(env.PROMPT_IMAGES, extUserId, removedImage.id),
    ).resolves.toBe(null)
  })

  it('deletes R2 objects when deleting the last Prompt reference', async () => {
    const extUserId = 'user_cleanup_delete'
    const image = await uploadImage(extUserId, 'image-cleanup-delete', 'delete image bytes')

    await savePromptAndPruneImagesForUser(
      env.DB,
      env.PROMPT_IMAGES,
      extUserId,
      createPrompt({
        body: createPromptImageMarkdown(image),
        images: [image],
      }),
    )
    await deletePromptAndPruneImagesForUser(env.DB, env.PROMPT_IMAGES, extUserId, 'prompt-alpha')

    await expect(getPromptImageObjectForUser(env.PROMPT_IMAGES, extUserId, image.id)).resolves.toBe(
      null,
    )
  })

  it('keeps R2 objects while another Prompt still references the image', async () => {
    const extUserId = 'user_cleanup_shared'
    const image = await uploadImage(extUserId, 'image-cleanup-shared', 'shared image bytes')
    const imageBody = createPromptImageMarkdown(image)

    await savePromptAndPruneImagesForUser(
      env.DB,
      env.PROMPT_IMAGES,
      extUserId,
      createPrompt({
        id: 'prompt-a',
        body: imageBody,
        images: [image],
      }),
    )
    await savePromptAndPruneImagesForUser(
      env.DB,
      env.PROMPT_IMAGES,
      extUserId,
      createPrompt({
        id: 'prompt-b',
        body: imageBody,
        images: [image],
      }),
    )

    await deletePromptAndPruneImagesForUser(env.DB, env.PROMPT_IMAGES, extUserId, 'prompt-a')

    await expect(
      getPromptImageObjectForUser(env.PROMPT_IMAGES, extUserId, image.id),
    ).resolves.not.toBeNull()

    await deletePromptAndPruneImagesForUser(env.DB, env.PROMPT_IMAGES, extUserId, 'prompt-b')

    await expect(getPromptImageObjectForUser(env.PROMPT_IMAGES, extUserId, image.id)).resolves.toBe(
      null,
    )
  })

  it('creates image responses from R2 object metadata without proxy serialization', async () => {
    const image = await uploadPromptImageForUser(
      env.PROMPT_IMAGES,
      'user_a',
      {
        fileName: 'diagram.png',
        contentType: 'image/png',
        dataBase64: btoa('response image bytes'),
      },
      {
        generateId: () => 'image-response',
      },
    )

    const object = await getPromptImageObjectForUser(env.PROMPT_IMAGES, 'user_a', image.id)
    const response = promptImageObjectToResponse(object)

    await expect(response.text()).resolves.toBe('response image bytes')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toBe('private, max-age=3600')
    expect(response.headers.get('etag')).toBeTruthy()
  })
})
