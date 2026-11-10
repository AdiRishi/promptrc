import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import {
  createPromptShareForUser,
  getActivePromptShareForUser,
  getPublicPromptShare,
  listPublicPromptShares,
  revokePromptShareForUser,
  setPromptShareListedForUser,
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
  kind: 'prompt',
  notes: '',
  runs: [],
  pinned: false,
  images: [],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
  ...overrides,
})

const createDate = (isoDate: string) => () => new Date(isoDate)

const publish = (extUserId: string, promptId: string, shareId: string, publishedAt?: string) =>
  setPromptShareListedForUser(
    env.DB,
    extUserId,
    { promptId, listed: true, shareId },
    publishedAt ? { now: createDate(publishedAt) } : {},
  )

const unpublish = (extUserId: string, promptId: string) =>
  setPromptShareListedForUser(env.DB, extUserId, { promptId, listed: false })

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
      listedAt: null,
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

  it('publishes the Prompt but keeps notes, runs, pins and usage private', async () => {
    await upsertPromptForUser(
      env.DB,
      'user_a',
      createPrompt({
        kind: 'benchmark',
        notes: 'Private rubric',
        pinned: true,
        uses: 9,
        runs: [
          {
            id: 'run-1',
            model: 'internal-model',
            verdict: 'fail',
            note: 'Leaked a customer name',
            ranAt: '2026-04-25T00:00:00.000Z',
          },
        ],
      }),
    )
    await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-alpha',
    })

    const share = await getPublicPromptShare(env.DB, 'share-alpha')

    expect(share?.prompt).toMatchObject({
      kind: 'benchmark',
      title: 'Alpha',
      body: 'Write a concise test plan.',
      notes: '',
      runs: [],
      pinned: false,
      uses: 0,
    })
  })

  it('keeps a share out of the public list until its owner publishes it', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())
    await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-alpha',
    })

    await expect(listPublicPromptShares(env.DB)).resolves.toEqual([])
    await expect(getPublicPromptShare(env.DB, 'share-alpha')).resolves.toMatchObject({
      listed: false,
    })

    await expect(
      publish('user_a', 'prompt-alpha', 'share-alpha', '2026-04-24T00:05:00.000Z'),
    ).resolves.toMatchObject({ id: 'share-alpha', listedAt: '2026-04-24T00:05:00.000Z' })

    await expect(getPublicPromptShare(env.DB, 'share-alpha')).resolves.toMatchObject({
      listed: true,
    })
    await expect(listPublicPromptShares(env.DB)).resolves.toEqual([
      {
        shareId: 'share-alpha',
        listedAt: '2026-04-24T00:05:00.000Z',
        kind: 'prompt',
        title: 'Alpha',
        category: 'Engineering',
        tags: ['testing', 'sharing'],
        bodyStart: 'Write a concise test plan.',
      },
    ])
  })

  it('takes a Prompt out of the public list when it is unpublished or its share is revoked', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())
    await upsertPromptForUser(env.DB, 'user_a', createPrompt({ id: 'prompt-beta', title: 'Beta' }))
    await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-alpha',
    })
    await createPromptShareForUser(env.DB, 'user_a', 'prompt-beta', {
      generateId: () => 'share-beta',
    })
    await publish('user_a', 'prompt-alpha', 'share-alpha')
    await publish('user_a', 'prompt-beta', 'share-beta')

    await expect(unpublish('user_a', 'prompt-alpha')).resolves.toMatchObject({
      id: 'share-alpha',
      listedAt: null,
    })
    await revokePromptShareForUser(env.DB, 'user_a', 'prompt-beta')

    await expect(listPublicPromptShares(env.DB)).resolves.toEqual([])
    // Unpublishing keeps the link working; revoking does not.
    await expect(getPublicPromptShare(env.DB, 'share-alpha')).resolves.toMatchObject({
      listed: false,
    })
    await expect(getPublicPromptShare(env.DB, 'share-beta')).resolves.toBeNull()
  })

  it('lets only the owner publish, and only a Prompt that has a share', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())

    await expect(publish('user_a', 'prompt-alpha', 'share-alpha')).resolves.toBeNull()

    await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-alpha',
    })

    await expect(publish('user_b', 'prompt-alpha', 'share-alpha')).resolves.toBeNull()
    await expect(listPublicPromptShares(env.DB)).resolves.toEqual([])
  })

  it('publishes only the share the owner confirmed, not a link made since', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())
    await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-alpha',
    })
    await revokePromptShareForUser(env.DB, 'user_a', 'prompt-alpha')
    await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-beta',
    })

    await expect(publish('user_a', 'prompt-alpha', 'share-alpha')).resolves.toBeNull()

    await expect(listPublicPromptShares(env.DB)).resolves.toEqual([])
    await expect(getPublicPromptShare(env.DB, 'share-beta')).resolves.toMatchObject({
      listed: false,
    })
  })

  it('lists published Prompts newest first without their private notes', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt({ notes: 'Private rubric' }))
    await upsertPromptForUser(
      env.DB,
      'user_b',
      createPrompt({ id: 'prompt-beta', title: 'Beta', kind: 'sequence', body: 'x'.repeat(2000) }),
    )
    await createPromptShareForUser(env.DB, 'user_a', 'prompt-alpha', {
      generateId: () => 'share-alpha',
    })
    await createPromptShareForUser(env.DB, 'user_b', 'prompt-beta', {
      generateId: () => 'share-beta',
    })
    await publish('user_a', 'prompt-alpha', 'share-alpha', '2026-04-24T00:05:00.000Z')
    await publish('user_b', 'prompt-beta', 'share-beta', '2026-04-25T00:05:00.000Z')

    const listings = await listPublicPromptShares(env.DB)

    expect(listings.map((listing) => listing.shareId)).toEqual(['share-beta', 'share-alpha'])
    expect(listings[0]).toMatchObject({ kind: 'sequence', title: 'Beta' })
    expect(listings[0]?.bodyStart).toHaveLength(600)
    expect(JSON.stringify(listings)).not.toContain('Private rubric')
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
