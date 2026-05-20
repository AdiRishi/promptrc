import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { createStarterPrompts } from '@/features/prompt-library/model/starter-prompts'
import {
  copyPromptsForUser,
  declineFirstSignInCopyForUser,
  deletePromptForUser,
  getPromptLibraryForUser,
  incrementPromptUsesForUser,
  listPromptsForUser,
  markPromptLibraryNotFreshForUser,
  seedPromptsForUser,
  upsertPromptForUser,
} from '@/features/prompt-library/persistence/remote/remote-prompt-library-persistence'
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

describe('remote Prompt Library persistence', () => {
  it('persists Prompt Library freshness per Clerk user even when the prompt list is empty', async () => {
    await expect(getPromptLibraryForUser(env.DB, 'user_a')).resolves.toMatchObject({
      prompts: [],
      isFresh: true,
    })

    await markPromptLibraryNotFreshForUser(env.DB, 'user_a')

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

  it('adds Starter Prompts only once to an eligible Fresh Prompt Library', async () => {
    const starterPrompts = createStarterPrompts()
    const firstSeed = await seedPromptsForUser(env.DB, 'user_a', starterPrompts)
    const retrySeed = await seedPromptsForUser(env.DB, 'user_a', createStarterPrompts())
    const library = await getPromptLibraryForUser(env.DB, 'user_a')

    expect(firstSeed.map((prompt) => prompt.id)).toEqual(starterPrompts.map((prompt) => prompt.id))
    expect(retrySeed.map((prompt) => prompt.id)).toEqual(firstSeed.map((prompt) => prompt.id))
    expect(library.prompts).toHaveLength(starterPrompts.length)
    expect(library.isFresh).toBe(true)
  })

  it('copies local Prompts into a fresh remote Prompt Library and marks it non-fresh', async () => {
    const localPrompts = [
      createPrompt({
        id: 'local-prompt-alpha',
        updatedAt: '2026-04-24T00:01:00.000Z',
      }),
      createPrompt({
        id: 'local-prompt-beta',
        title: 'Beta',
        updatedAt: '2026-04-24T00:02:00.000Z',
      }),
    ]

    const copiedPrompts = await copyPromptsForUser(env.DB, 'user_a', localPrompts)
    const library = await getPromptLibraryForUser(env.DB, 'user_a')

    expect(copiedPrompts).toHaveLength(2)
    expect(copiedPrompts.map((prompt) => prompt.id)).not.toContain('local-prompt-alpha')
    expect(copiedPrompts.map((prompt) => prompt.id)).not.toContain('local-prompt-beta')
    expect(copiedPrompts.map((prompt) => prompt.title)).toEqual(['Alpha', 'Beta'])
    expect(library.prompts.map((prompt) => prompt.title)).toEqual(['Beta', 'Alpha'])
    expect(library.isFresh).toBe(false)
  })

  it('returns existing remote Prompts instead of duplicating local copies on retry', async () => {
    const localPrompts = [
      createPrompt({
        id: 'local-prompt-alpha',
        updatedAt: '2026-04-24T00:01:00.000Z',
      }),
      createPrompt({
        id: 'local-prompt-beta',
        title: 'Beta',
        updatedAt: '2026-04-24T00:02:00.000Z',
      }),
    ]

    const firstCopy = await copyPromptsForUser(env.DB, 'user_a', localPrompts)
    const retryCopy = await copyPromptsForUser(env.DB, 'user_a', localPrompts)
    const library = await getPromptLibraryForUser(env.DB, 'user_a')

    expect(retryCopy.map((prompt) => prompt.id).sort()).toEqual(
      firstCopy.map((prompt) => prompt.id).sort(),
    )
    expect(library.prompts).toHaveLength(2)
    expect(library.isFresh).toBe(false)
  })

  it('declines First-Sign-In Copy by keeping the remote Prompt Library empty and non-fresh', async () => {
    await declineFirstSignInCopyForUser(env.DB, 'user_a')

    await expect(getPromptLibraryForUser(env.DB, 'user_a')).resolves.toMatchObject({
      prompts: [],
      isFresh: false,
    })
    await expect(seedPromptsForUser(env.DB, 'user_a', createStarterPrompts())).resolves.toEqual([])
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

  it('marks the remote Prompt Library non-fresh after user-owned mutations', async () => {
    await upsertPromptForUser(env.DB, 'user_a', createPrompt())
    await expect(getPromptLibraryForUser(env.DB, 'user_a')).resolves.toMatchObject({
      isFresh: false,
    })

    const promptsForUse = await seedPromptsForUser(env.DB, 'user_b', createStarterPrompts())
    const promptForUse = promptsForUse[0]

    if (!promptForUse) {
      throw new Error('Expected Starter Prompts for Prompt use')
    }

    await expect(getPromptLibraryForUser(env.DB, 'user_b')).resolves.toMatchObject({
      isFresh: true,
    })
    await incrementPromptUsesForUser(env.DB, 'user_b', promptForUse.id)
    await expect(getPromptLibraryForUser(env.DB, 'user_b')).resolves.toMatchObject({
      isFresh: false,
    })

    const promptsForDelete = await seedPromptsForUser(env.DB, 'user_c', createStarterPrompts())
    const promptForDelete = promptsForDelete[0]

    if (!promptForDelete) {
      throw new Error('Expected Starter Prompts for Prompt deletion')
    }

    await deletePromptForUser(env.DB, 'user_c', promptForDelete.id)
    await expect(getPromptLibraryForUser(env.DB, 'user_c')).resolves.toMatchObject({
      isFresh: false,
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
