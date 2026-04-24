import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import {
  deletePromptForUser,
  incrementPromptUsesForUser,
  listPromptsForUser,
  upsertPromptForUser,
} from '@/features/prompt-library/server/prompt-library-functions'
import { type PromptRecord } from '@/features/prompt-library/types'

const createPrompt = (overrides: Partial<PromptRecord> = {}): PromptRecord => ({
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing', 'd1'],
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  uses: 0,
  ...overrides,
})

describe('prompt library server persistence', () => {
  it('applies the prompt migration with id as the primary key and ext_user_id indexed', async () => {
    const { results: columns } = await env.DB.prepare('PRAGMA table_info(prompts)').all<{
      name: string
      pk: number
    }>()
    const { results: indexes } = await env.DB.prepare('PRAGMA index_list(prompts)').all<{
      name: string
    }>()

    expect(columns.find((column) => column.name === 'id')?.pk).toBe(1)
    expect(columns.find((column) => column.name === 'ext_user_id')?.pk).toBe(0)
    expect(indexes.some((index) => index.name === 'idx_prompts_user_updated_at')).toBe(true)
  })

  it('upserts and lists prompts for the authenticated Clerk user only', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt({ id: 'prompt-a' }))
    await upsertPromptForUser(
      env.DB,
      'user_a',
      createPrompt({
        id: 'prompt-b',
        title: 'Beta',
        updatedAt: '2026-04-24T00:01:00.000Z',
      }),
    )
    await upsertPromptForUser(env.DB, 'user_b', createPrompt({ id: 'prompt-c' }))

    const prompts = await listPromptsForUser(env.DB, 'user_a')

    expect(prompts.map((prompt) => prompt.id)).toEqual(['prompt-b', 'prompt-a'])
    expect(prompts[0]).toMatchObject({
      id: 'prompt-b',
      title: 'Beta',
      tags: ['testing', 'd1'],
    })
  })

  it('updates an existing prompt when the id belongs to the same Clerk user', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())
    await upsertPromptForUser(
      env.DB,
      'user_a',
      createPrompt({
        title: 'Updated alpha',
        tags: ['updated'],
        updatedAt: '2026-04-24T00:02:00.000Z',
        uses: 3,
      }),
    )

    const prompts = await listPromptsForUser(env.DB, 'user_a')

    expect(prompts).toHaveLength(1)
    expect(prompts[0]).toMatchObject({
      title: 'Updated alpha',
      tags: ['updated'],
      uses: 3,
    })
  })

  it('does not allow another Clerk user to overwrite an existing prompt id', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())

    await expect(
      upsertPromptForUser(env.DB, 'user_b', createPrompt({ title: 'Cross-user overwrite' })),
    ).rejects.toThrow('Prompt id already exists')

    expect(await listPromptsForUser(env.DB, 'user_b')).toEqual([])
    expect((await listPromptsForUser(env.DB, 'user_a'))[0]?.title).toBe('Alpha')
  })

  it('increments and deletes prompts only for the owning Clerk user', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())

    await incrementPromptUsesForUser(env.DB, 'user_b', 'prompt-alpha')
    expect((await listPromptsForUser(env.DB, 'user_a'))[0]?.uses).toBe(0)

    await incrementPromptUsesForUser(env.DB, 'user_a', 'prompt-alpha')
    expect((await listPromptsForUser(env.DB, 'user_a'))[0]?.uses).toBe(1)

    await deletePromptForUser(env.DB, 'user_b', 'prompt-alpha')
    expect(await listPromptsForUser(env.DB, 'user_a')).toHaveLength(1)

    await deletePromptForUser(env.DB, 'user_a', 'prompt-alpha')
    expect(await listPromptsForUser(env.DB, 'user_a')).toEqual([])
  })
})
