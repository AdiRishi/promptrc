import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import {
  createPromptShareForUser,
  getActivePromptShareForUser,
  getPublicPromptShare,
  revokePromptShareForUser,
} from '@/features/prompt-library/persistence/remote/prompt-share-persistence'
import {
  deletePromptForUser,
  upsertPromptForUser,
} from '@/features/prompt-library/persistence/remote/remote-prompt-library-persistence'
import { type PromptRecord } from '@/features/prompt-library/types'

const createPrompt = (overrides: Partial<PromptRecord> = {}): PromptRecord => ({
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing', 'sharing'],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
  ...overrides,
})

const createDate = (isoDate: string) => () => new Date(isoDate)

describe('prompt share persistence', () => {
  it('runs against a migration schema that supports public Prompt shares', async () => {
    const { results: columns } = await env.DB.prepare('PRAGMA table_info(prompt_shares)').all<{
      name: string
      pk: number
    }>()
    const { results: indexes } = await env.DB.prepare('PRAGMA index_list(prompt_shares)').all<{
      name: string
    }>()

    expect(columns.find((column) => column.name === 'id')?.pk).toBe(1)
    expect(columns.find((column) => column.name === 'ext_user_id')).toBeTruthy()
    expect(columns.find((column) => column.name === 'prompt_id')).toBeTruthy()
    expect(columns.find((column) => column.name === 'revoked_at')).toBeTruthy()
    expect(indexes.some((index) => index.name === 'idx_prompt_shares_active_prompt')).toBe(true)
    expect(indexes.some((index) => index.name === 'idx_prompt_shares_public_active')).toBe(true)
  })

  it('creates one active public share for an owned Prompt', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())

    const share = await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-alpha',
      now: createDate('2026-04-24T00:01:00.000Z'),
    })
    const retryShare = await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-beta',
      now: createDate('2026-04-24T00:02:00.000Z'),
    })

    expect(share).toEqual({
      id: 'share-alpha',
      promptId: 'prompt-alpha',
      createdAt: '2026-04-24T00:01:00.000Z',
      revokedAt: null,
    })
    expect(retryShare).toEqual(share)
    await expect(getPublicPromptShare(env.DB, 'share-alpha')).resolves.toMatchObject({
      shareId: 'share-alpha',
      createdAt: '2026-04-24T00:01:00.000Z',
      prompt: {
        id: 'prompt-alpha',
        title: 'Alpha',
        tags: ['testing', 'sharing'],
      },
    })
  })

  it('scopes share creation and revocation to the owning Clerk user', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())
    await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-alpha',
    })

    await expect(
      createPromptShareForUser(env.DB, 'user_b', 'prompt-alpha', {
        generateId: () => 'share-beta',
      }),
    ).rejects.toThrow('Prompt not found')
    await expect(revokePromptShareForUser(env.DB, 'user_b', 'prompt-alpha')).resolves.toEqual({
      promptId: 'prompt-alpha',
      revoked: false,
    })
    await expect(getPublicPromptShare(env.DB, 'share-alpha')).resolves.toMatchObject({
      prompt: {
        id: 'prompt-alpha',
      },
    })
  })

  it('revokes a public share and recreates a new stable link', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())
    await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-alpha',
    })

    await expect(
      revokePromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
        now: createDate('2026-04-24T00:03:00.000Z'),
      }),
    ).resolves.toEqual({
      promptId: 'prompt-alpha',
      revoked: true,
    })
    await expect(getPublicPromptShare(env.DB, 'share-alpha')).resolves.toBeNull()
    await expect(getActivePromptShareForUser(env.DB, 'user_a', 'prompt-alpha')).resolves.toBeNull()

    await expect(
      createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
        generateId: () => 'share-beta',
        now: createDate('2026-04-24T00:04:00.000Z'),
      }),
    ).resolves.toMatchObject({
      id: 'share-beta',
      createdAt: '2026-04-24T00:04:00.000Z',
    })
    await expect(getPublicPromptShare(env.DB, 'share-beta')).resolves.toMatchObject({
      shareId: 'share-beta',
      prompt: {
        title: 'Alpha',
      },
    })
  })

  it('stops resolving public shares when the underlying Prompt is deleted', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())
    await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-alpha',
    })

    await deletePromptForUser(env.DB, 'user_a', 'prompt-alpha')

    await expect(getPublicPromptShare(env.DB, 'share-alpha')).resolves.toBeNull()
  })
})
