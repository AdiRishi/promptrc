import { auth } from '@clerk/tanstack-react-start/server'
import { createServerFn } from '@tanstack/react-start'

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

const assertString = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }

  return value
}

const assertStringArray = (value: unknown, fieldName: string) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${fieldName} must be a string array`)
  }

  return value
}

const assertPromptRecord = (value: unknown): PromptRecord => {
  if (!value || typeof value !== 'object') {
    throw new Error('prompt must be an object')
  }

  const prompt = value as Record<string, unknown>
  const uses = prompt.uses

  if (typeof uses !== 'number' || !Number.isInteger(uses) || uses < 0) {
    throw new Error('uses must be a non-negative integer')
  }

  return {
    id: assertString(prompt.id, 'id'),
    title: assertString(prompt.title, 'title'),
    body: assertString(prompt.body, 'body'),
    category: assertString(prompt.category, 'category'),
    tags: assertStringArray(prompt.tags, 'tags'),
    createdAt: assertString(prompt.createdAt, 'createdAt'),
    updatedAt: assertString(prompt.updatedAt, 'updatedAt'),
    uses,
  }
}

const assertPromptId = (value: unknown) => {
  const promptId = assertString(value, 'promptId').trim()

  if (!promptId) {
    throw new Error('promptId is required')
  }

  return promptId
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

export const listRemotePrompts = createServerFn({ method: 'GET' }).handler(async () => {
  const extUserId = await requireUserId()
  const db = await getDatabase()
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
})

export const upsertRemotePrompt = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptRecord)
  .handler(async ({ data: prompt }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    const result = await db
      .prepare(
        `
          INSERT INTO prompts (
            ext_user_id,
            id,
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
        extUserId,
        prompt.id,
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
  })

export const deleteRemotePrompt = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

    await db
      .prepare('DELETE FROM prompts WHERE ext_user_id = ? AND id = ?')
      .bind(extUserId, promptId)
      .run()

    return { promptId }
  })

export const incrementRemotePromptUses = createServerFn({ method: 'POST' })
  .inputValidator(assertPromptId)
  .handler(async ({ data: promptId }) => {
    const extUserId = await requireUserId()
    const db = await getDatabase()

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
  })
