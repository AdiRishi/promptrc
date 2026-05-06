import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'

import { generatePromptId } from '@/features/prompt-library/lib/prompt-library-utils'
import {
  assertBoolean,
  assertPromptId,
  assertPromptRecord,
  assertPromptRecords,
} from '@/features/prompt-library/lib/prompt-library-validation'
import { type PromptRecord } from '@/features/prompt-library/types'

type PromptRow = {
  id: string
  title: string
  body: string
  category: string
  tags_json: string
  created_at: string
  updated_at: string
  uses: number
}

const PROMPT_COLUMNS = 'id, title, body, category, tags_json, created_at, updated_at, uses'

const UPSERT_PROMPT_SQL = `
  INSERT INTO prompts (
    id,
    ext_user_id,
    title,
    body,
    category,
    tags_json,
    created_at,
    updated_at,
    uses
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    body = excluded.body,
    category = excluded.category,
    tags_json = excluded.tags_json,
    updated_at = excluded.updated_at,
    uses = excluded.uses
  WHERE prompts.ext_user_id = excluded.ext_user_id
`

const UPSERT_PROMPT_LIBRARY_FRESHNESS_SQL = `
  INSERT INTO prompt_library_state (ext_user_id, is_fresh, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(ext_user_id) DO UPDATE SET
    is_fresh = excluded.is_fresh,
    updated_at = excluded.updated_at
`

type PromptLibraryStateRow = {
  is_fresh: number
}

const getDatabase = async () => {
  const { env } = await import('cloudflare:workers')

  if (!env.DB) {
    throw new Error('D1 binding DB is not configured')
  }

  return env.DB
}

const requireUserId = async () => {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated || !userId) {
    throw new Error('Authentication required')
  }

  return userId
}

const rowToPrompt = (row: PromptRow): PromptRecord => {
  let tags: string[] = []

  try {
    const parsedTags = JSON.parse(row.tags_json) as unknown
    tags = Array.isArray(parsedTags)
      ? parsedTags.filter((tag): tag is string => typeof tag === 'string')
      : []
  } catch {
    tags = []
  }

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uses: row.uses,
  }
}

const preparePromptUpsert = (db: D1Database, extUserId: string, prompt: PromptRecord) => {
  return db
    .prepare(UPSERT_PROMPT_SQL)
    .bind(
      prompt.id,
      extUserId,
      prompt.title,
      prompt.body,
      prompt.category,
      JSON.stringify(prompt.tags),
      prompt.createdAt,
      prompt.updatedAt,
      prompt.uses,
    )
}

const preparePromptLibraryFreshnessUpsert = (
  db: D1Database,
  extUserId: string,
  isFresh: boolean,
) => {
  return db
    .prepare(UPSERT_PROMPT_LIBRARY_FRESHNESS_SQL)
    .bind(extUserId, isFresh ? 1 : 0, new Date().toISOString())
}

export const listPromptsForUser = async (
  db: D1Database,
  extUserId: string,
): Promise<PromptRecord[]> => {
  const { results } = await db
    .prepare(
      `
        SELECT ${PROMPT_COLUMNS}
        FROM prompts
        WHERE ext_user_id = ?
        ORDER BY updated_at DESC
      `,
    )
    .bind(extUserId)
    .all<PromptRow>()

  return results.map(rowToPrompt)
}

const getPromptLibraryFreshnessForUser = async (db: D1Database, extUserId: string) => {
  const { results } = await db
    .prepare(
      `
        SELECT is_fresh
        FROM prompt_library_state
        WHERE ext_user_id = ?
        LIMIT 1
      `,
    )
    .bind(extUserId)
    .all<PromptLibraryStateRow>()

  const row = results[0]

  return row ? row.is_fresh === 1 : true
}

export const setPromptLibraryFreshnessForUser = async (
  db: D1Database,
  extUserId: string,
  isFresh: boolean,
) => {
  await preparePromptLibraryFreshnessUpsert(db, extUserId, isFresh).run()

  return { isFresh }
}

export const getPromptLibraryForUser = async (db: D1Database, extUserId: string) => {
  const [prompts, isFresh] = await Promise.all([
    listPromptsForUser(db, extUserId),
    getPromptLibraryFreshnessForUser(db, extUserId),
  ])

  return { prompts, isFresh }
}

export const seedPromptsForUser = async (
  db: D1Database,
  extUserId: string,
  prompts: PromptRecord[],
) => {
  for (const prompt of prompts) {
    await upsertPromptForUser(db, extUserId, prompt)
  }

  return prompts
}

export const copyPromptsForUser = async (
  db: D1Database,
  extUserId: string,
  localPrompts: PromptRecord[],
) => {
  const existingLibrary = await getPromptLibraryForUser(db, extUserId)

  if (!existingLibrary.isFresh || existingLibrary.prompts.length > 0) {
    return existingLibrary.prompts
  }

  const copiedPrompts = localPrompts.map((prompt) => ({
    ...prompt,
    id: generatePromptId(),
  }))

  if (!copiedPrompts.length) {
    await setPromptLibraryFreshnessForUser(db, extUserId, false)
    return copiedPrompts
  }

  await db.batch([
    ...copiedPrompts.map((prompt) => preparePromptUpsert(db, extUserId, prompt)),
    preparePromptLibraryFreshnessUpsert(db, extUserId, false),
  ])

  return copiedPrompts
}

const findPromptForUser = async (db: D1Database, extUserId: string, promptId: string) => {
  const { results } = await db
    .prepare(
      `
        SELECT ${PROMPT_COLUMNS}
        FROM prompts
        WHERE ext_user_id = ? AND id = ?
        LIMIT 1
      `,
    )
    .bind(extUserId, promptId)
    .all<PromptRow>()

  const row = results[0]

  return row ? rowToPrompt(row) : null
}

export const upsertPromptForUser = async (
  db: D1Database,
  extUserId: string,
  prompt: PromptRecord,
  options: { markLibraryNotFresh?: boolean } = {},
) => {
  const result = await preparePromptUpsert(db, extUserId, prompt).run()

  if (result.meta.changes === 0) {
    throw new Error('Prompt id already exists')
  }

  if (options.markLibraryNotFresh) {
    await setPromptLibraryFreshnessForUser(db, extUserId, false)
  }

  return prompt
}

export const deletePromptForUser = async (db: D1Database, extUserId: string, promptId: string) => {
  const result = await db
    .prepare('DELETE FROM prompts WHERE ext_user_id = ? AND id = ?')
    .bind(extUserId, promptId)
    .run()

  if (result.meta.changes === 0) {
    throw new Error('Prompt not found')
  }

  await setPromptLibraryFreshnessForUser(db, extUserId, false)

  return { promptId }
}

export const incrementPromptUsesForUser = async (
  db: D1Database,
  extUserId: string,
  promptId: string,
) => {
  const result = await db
    .prepare(
      `
        UPDATE prompts
        SET uses = uses + 1,
            updated_at = ?
        WHERE ext_user_id = ? AND id = ?
      `,
    )
    .bind(new Date().toISOString(), extUserId, promptId)
    .run()

  if (result.meta.changes === 0) {
    throw new Error('Prompt not found')
  }

  await setPromptLibraryFreshnessForUser(db, extUserId, false)

  const prompt = await findPromptForUser(db, extUserId, promptId)

  if (!prompt) {
    throw new Error('Prompt not found')
  }

  return prompt
}

export const listRemotePrompts = createServerFn({ method: 'GET' }).handler(async () => {
  const extUserId = await requireUserId()
  const db = await getDatabase()

  return listPromptsForUser(db, extUserId)
})

export const getRemotePromptLibrary = createServerFn({ method: 'GET' }).handler(async () => {
  const extUserId = await requireUserId()
  const db = await getDatabase()

  return getPromptLibraryForUser(db, extUserId)
})

export const setRemotePromptLibraryFreshness = createServerFn({ method: 'POST' })
  .inputValidator((value) => assertBoolean(value, 'isFresh'))
  .handler(async ({ data: isFresh }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return setPromptLibraryFreshnessForUser(db, extUserId, isFresh)
  })

export const seedRemoteStarterPrompts = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptRecords)
  .handler(async ({ data: prompts }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return seedPromptsForUser(db, extUserId, prompts)
  })

export const copyRemotePromptsToPromptLibrary = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptRecords)
  .handler(async ({ data: prompts }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return copyPromptsForUser(db, extUserId, prompts)
  })

export const upsertRemotePrompt = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptRecord)
  .handler(async ({ data: prompt }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return upsertPromptForUser(db, extUserId, prompt, { markLibraryNotFresh: true })
  })

export const deleteRemotePrompt = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return deletePromptForUser(db, extUserId, promptId)
  })

export const incrementRemotePromptUses = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return incrementPromptUsesForUser(db, extUserId, promptId)
  })
