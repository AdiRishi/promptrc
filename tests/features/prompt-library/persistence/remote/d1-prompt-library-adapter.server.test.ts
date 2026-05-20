import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { DEFAULT_PROMPT_CATEGORY } from '@/features/prompt-library/model/prompt-library-integrity'
import { createD1PromptLibraryAdapter } from '@/features/prompt-library/persistence/remote/d1-prompt-library-adapter'
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

describe('D1 Prompt Library adapter', () => {
  it('runs against a migration schema that supports Clerk-user Prompt Libraries', async () => {
    const { results: columns } = await env.DB.prepare('PRAGMA table_info(prompts)').all<{
      name: string
      pk: number
    }>()
    const { results: indexes } = await env.DB.prepare('PRAGMA index_list(prompts)').all<{
      name: string
    }>()
    const { results: stateColumns } = await env.DB.prepare(
      'PRAGMA table_info(prompt_library_state)',
    ).all<{
      name: string
      pk: number
    }>()

    expect(columns.find((column) => column.name === 'id')?.pk).toBe(1)
    expect(columns.find((column) => column.name === 'ext_user_id')?.pk).toBe(0)
    expect(indexes.some((index) => index.name === 'idx_prompts_user_updated_at')).toBe(true)
    expect(stateColumns.find((column) => column.name === 'ext_user_id')?.pk).toBe(1)
    expect(stateColumns.find((column) => column.name === 'is_fresh')).toBeTruthy()
  })

  it('stores normalized Prompt records scoped to one Clerk user', async () => {
    const userA = createD1PromptLibraryAdapter(env.DB, 'user_a')
    const userB = createD1PromptLibraryAdapter(env.DB, 'user_b')

    await userA.addPrompts([
      createPrompt({
        id: 'prompt-a',
        category: '',
        tags: [' Testing ', '#D1', 'testing'],
      }),
    ])
    await userB.addPrompts([
      createPrompt({
        id: 'prompt-b',
        title: 'Beta',
      }),
    ])

    await expect(userA.listPrompts()).resolves.toMatchObject([
      {
        id: 'prompt-a',
        category: DEFAULT_PROMPT_CATEGORY,
        tags: ['testing', 'd1'],
      },
    ])
    await expect(userB.listPrompts()).resolves.toMatchObject([
      {
        id: 'prompt-b',
        title: 'Beta',
      },
    ])
  })

  it('allows owner updates without letting another Clerk user claim the same Prompt id', async () => {
    const userA = createD1PromptLibraryAdapter(env.DB, 'user_a')
    const userB = createD1PromptLibraryAdapter(env.DB, 'user_b')

    await expect(userA.upsertPrompt(createPrompt())).resolves.toBe(1)
    await expect(userB.upsertPrompt(createPrompt({ title: 'Cross-user overwrite' }))).resolves.toBe(
      0,
    )
    await expect(
      userA.upsertPrompt(
        createPrompt({
          title: 'Updated alpha',
          updatedAt: '2026-04-24T00:01:00.000Z',
        }),
      ),
    ).resolves.toBe(1)

    await expect(userA.findPrompt('prompt-alpha')).resolves.toMatchObject({
      title: 'Updated alpha',
    })
    await expect(userB.findPrompt('prompt-alpha')).resolves.toBeNull()
  })

  it('copies Prompts and freshness together for First-Sign-In Copy', async () => {
    const userA = createD1PromptLibraryAdapter(env.DB, 'user_a')

    await userA.addPromptsAndSetFreshness([createPrompt()], false)

    await expect(userA.listPrompts()).resolves.toMatchObject([
      {
        id: 'prompt-alpha',
        title: 'Alpha',
      },
    ])
    await expect(userA.getFreshness()).resolves.toBe(false)
  })

  it('increments and deletes only Prompts owned by the adapter user', async () => {
    const userA = createD1PromptLibraryAdapter(env.DB, 'user_a')
    const userB = createD1PromptLibraryAdapter(env.DB, 'user_b')

    await userA.addPrompts([createPrompt()])

    await expect(userB.incrementPromptUses('prompt-alpha')).resolves.toBe(0)
    await expect(userA.incrementPromptUses('prompt-alpha')).resolves.toBe(1)
    await expect(userA.findPrompt('prompt-alpha')).resolves.toMatchObject({
      uses: 1,
    })

    await expect(userB.deletePrompt('prompt-alpha')).resolves.toBe(0)
    await expect(userA.deletePrompt('prompt-alpha')).resolves.toBe(1)
    await expect(userA.findPrompt('prompt-alpha')).resolves.toBeNull()
  })
})
