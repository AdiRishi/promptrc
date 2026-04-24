import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'

import {
  assertPromptId,
  assertPromptRecord,
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

export const listPromptsForUser = async (
  db: D1Database,
  extUserId: string,
): Promise<PromptRecord[]> => {
  const { results } = await db
    .prepare(
      `
        SELECT id, title, body, category, tags_json, created_at, updated_at, uses
        FROM prompts
        WHERE ext_user_id = ?
        ORDER BY updated_at DESC
      `,
    )
    .bind(extUserId)
    .all<PromptRow>()

  return results.map(rowToPrompt)
}

export const upsertPromptForUser = async (
  db: D1Database,
  extUserId: string,
  prompt: PromptRecord,
) => {
  const result = await db
    .prepare(
      `
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
      `,
    )
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
    .run()

  if (result.meta.changes === 0) {
    throw new Error('Prompt id already exists')
  }

  return prompt
}

export const deletePromptForUser = async (db: D1Database, extUserId: string, promptId: string) => {
  await db
    .prepare('DELETE FROM prompts WHERE ext_user_id = ? AND id = ?')
    .bind(extUserId, promptId)
    .run()

  return { promptId }
}

export const incrementPromptUsesForUser = async (
  db: D1Database,
  extUserId: string,
  promptId: string,
) => {
  await db
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

  return { promptId }
}

export const listRemotePrompts = createServerFn({ method: 'GET' }).handler(async () => {
  const extUserId = await requireUserId()
  const db = await getDatabase()

  return listPromptsForUser(db, extUserId)
})

export const upsertRemotePrompt = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptRecord)
  .handler(async ({ data: prompt }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    return upsertPromptForUser(db, extUserId, prompt)
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
