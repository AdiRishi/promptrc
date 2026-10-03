import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { createPromptImageMarkdown } from '@/features/prompt-library/model/prompt-images'
import { DEFAULT_PROMPT_CATEGORY } from '@/features/prompt-library/model/prompt-library-integrity'
import { createD1PromptLibraryAdapter } from '@/features/prompt-library/persistence/remote/d1-prompt-library-adapter'
import {
  type PromptImage,
  type PromptRecord,
  type PromptRun,
} from '@/features/prompt-library/types'

const image = {
  id: 'image-alpha',
  fileName: 'diagram.png',
  contentType: 'image/png',
  size: 2048,
  createdAt: '2026-04-24T00:01:00.000Z',
} satisfies PromptImage

const createPrompt = (overrides: Partial<PromptRecord> = {}): PromptRecord => ({
  id: 'prompt-alpha',
  title: 'Alpha',
  body: 'Write a concise test plan.',
  category: 'Engineering',
  tags: ['testing', 'd1'],
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
    expect(columns.find((column) => column.name === 'images_json')).toBeTruthy()
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

  it('stores prompt image metadata with the Prompt row', async () => {
    const userA = createD1PromptLibraryAdapter(env.DB, 'user_a')

    await userA.addPrompts([
      createPrompt({
        body: createPromptImageMarkdown(image),
        images: [image, { ...image, id: 'image-unused', fileName: 'unused.png' }],
      }),
    ])

    await expect(userA.listPrompts()).resolves.toMatchObject([
      {
        id: 'prompt-alpha',
        images: [image],
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

  it('round-trips kind, notes, pinning, and the run log through D1', async () => {
    const userA = createD1PromptLibraryAdapter(env.DB, 'user_a')
    const olderRun: PromptRun = {
      id: 'run-older',
      model: 'model-a',
      verdict: 'fail',
      note: 'Missed the boundary.',
      ranAt: '2026-04-25T00:00:00.000Z',
    }
    const newerRun: PromptRun = {
      id: 'run-newer',
      model: 'model-b',
      verdict: 'pass',
      note: '',
      ranAt: '2026-04-26T00:00:00.000Z',
    }
    const benchmark = createPrompt({
      kind: 'benchmark',
      notes: '  Pass: names the off-by-one.  ',
      pinned: true,
      runs: [olderRun, newerRun],
    })

    await expect(userA.upsertPrompt(benchmark)).resolves.toBe(1)
    await expect(userA.findPrompt('prompt-alpha')).resolves.toEqual({
      ...benchmark,
      notes: 'Pass: names the off-by-one.',
      runs: [newerRun, olderRun],
    })

    await userA.upsertPrompt(createPrompt({ kind: 'sequence', notes: '', pinned: false, runs: [] }))

    await expect(userA.findPrompt('prompt-alpha')).resolves.toMatchObject({
      kind: 'sequence',
      notes: '',
      pinned: false,
      runs: [],
    })
  })

  it('reads rows written before the kinds migration with safe defaults', async () => {
    const userA = createD1PromptLibraryAdapter(env.DB, 'user_a')

    await env.DB.prepare(
      `
        INSERT INTO prompts (id, ext_user_id, title, body, category, tags_json, created_at, updated_at, uses)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
      .bind(
        'legacy-prompt',
        'user_a',
        'Legacy',
        'Written before kinds existed.',
        'Engineering',
        '["testing"]',
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z',
        4,
      )
      .run()

    await expect(userA.listPrompts()).resolves.toEqual([
      {
        id: 'legacy-prompt',
        kind: 'prompt',
        title: 'Legacy',
        body: 'Written before kinds existed.',
        notes: '',
        category: 'Engineering',
        tags: ['testing'],
        images: [],
        runs: [],
        pinned: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        uses: 4,
      },
    ])
  })

  it('tolerates corrupt kind and run data in a row instead of failing the whole library', async () => {
    const userA = createD1PromptLibraryAdapter(env.DB, 'user_a')
    const validRun: PromptRun = {
      id: 'run-valid',
      model: 'model-a',
      verdict: 'pass',
      note: '',
      ranAt: '2026-04-25T00:00:00.000Z',
    }

    await userA.addPrompts([
      createPrompt({ id: 'bad-kind' }),
      createPrompt({ id: 'bad-json' }),
      createPrompt({ id: 'bad-runs' }),
    ])
    await env.DB.batch([
      env.DB.prepare("UPDATE prompts SET kind = 'note', pinned = 2 WHERE id = 'bad-kind'"),
      env.DB.prepare("UPDATE prompts SET runs_json = '{not json' WHERE id = 'bad-json'"),
      env.DB.prepare('UPDATE prompts SET runs_json = ? WHERE id = ?').bind(
        JSON.stringify([validRun, { ...validRun, id: 'run-bad', verdict: 'skip' }, 'junk']),
        'bad-runs',
      ),
    ])

    await expect(userA.findPrompt('bad-kind')).resolves.toMatchObject({
      kind: 'prompt',
      pinned: false,
    })
    await expect(userA.findPrompt('bad-json')).resolves.toMatchObject({ runs: [] })
    await expect(userA.findPrompt('bad-runs')).resolves.toMatchObject({ runs: [validRun] })
  })
})
