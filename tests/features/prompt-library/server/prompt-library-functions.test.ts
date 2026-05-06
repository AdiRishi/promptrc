import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { createStarterPrompts } from '@/features/prompt-library/lib/starter-prompts'
import {
  deletePromptForUser,
  getPromptLibraryForUser,
  incrementPromptUsesForUser,
  listPromptsForUser,
  seedPromptsForUser,
  setPromptLibraryFreshnessForUser,
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

    const { results: stateColumns } = await env.DB.prepare(
      'PRAGMA table_info(prompt_library_state)',
    ).all<{
      name: string
      pk: number
    }>()

    expect(stateColumns.find((column) => column.name === 'ext_user_id')?.pk).toBe(1)
    expect(stateColumns.find((column) => column.name === 'is_fresh')).toBeTruthy()
  })

  it('persists Prompt Library freshness per Clerk user even when the prompt list is empty', async () => {
    await expect(getPromptLibraryForUser(env.DB, 'user_a')).resolves.toMatchObject({
      prompts: [],
      isFresh: true,
    })

    await setPromptLibraryFreshnessForUser(env.DB, 'user_a', false)

    await expect(getPromptLibraryForUser(env.DB, 'user_a')).resolves.toMatchObject({
      prompts: [],
      isFresh: false,
    })
    await expect(getPromptLibraryForUser(env.DB, 'user_b')).resolves.toMatchObject({
      prompts: [],
      isFresh: true,
    })
  })

  it('seeds Starter Prompts without ending remote Prompt Library freshness', async () => {
    const starterPrompts = createStarterPrompts()

    await seedPromptsForUser(env.DB, 'user_a', starterPrompts)

    const library = await getPromptLibraryForUser(env.DB, 'user_a')

    expect(library.prompts.map((prompt) => prompt.title)).toEqual([
      'Start Here',
      'Bug Hunt',
      'PRD Shaper',
      'Executive Summary',
      'Decision Partner',
      'Difficult Reply',
    ])
    expect(library.isFresh).toBe(true)
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

    await expect(incrementPromptUsesForUser(env.DB, 'user_b', 'prompt-alpha')).rejects.toThrow(
      'Prompt not found',
    )
    expect((await listPromptsForUser(env.DB, 'user_a'))[0]?.uses).toBe(0)

    const updatedPrompt = await incrementPromptUsesForUser(env.DB, 'user_a', 'prompt-alpha')
    expect(updatedPrompt.uses).toBe(1)

    await expect(deletePromptForUser(env.DB, 'user_b', 'prompt-alpha')).rejects.toThrow(
      'Prompt not found',
    )
    expect(await listPromptsForUser(env.DB, 'user_a')).toHaveLength(1)

    await deletePromptForUser(env.DB, 'user_a', 'prompt-alpha')
    expect(await listPromptsForUser(env.DB, 'user_a')).toEqual([])
  })
})
