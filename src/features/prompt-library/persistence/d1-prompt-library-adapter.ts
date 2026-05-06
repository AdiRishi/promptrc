import {
  normalizePromptRecord,
  normalizePromptTags,
} from '@/features/prompt-library/model/prompt-library-integrity'
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

type PromptLibraryStateRow = {
  is_fresh: number
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

const decodePromptTags = (tagsJson: string) => {
  try {
    const tags = JSON.parse(tagsJson) as unknown

    return Array.isArray(tags)
      ? normalizePromptTags(tags.filter((tag): tag is string => typeof tag === 'string'))
      : []
  } catch {
    return []
  }
}

const rowToPrompt = (row: PromptRow): PromptRecord => ({
  id: row.id,
  title: row.title,
  body: row.body,
  category: row.category,
  tags: decodePromptTags(row.tags_json),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  uses: row.uses,
})

export const createD1PromptLibraryAdapter = (db: D1Database, extUserId: string) => {
  const preparePromptUpsert = (prompt: PromptRecord) => {
    const normalizedPrompt = normalizePromptRecord(prompt)

    return db
      .prepare(UPSERT_PROMPT_SQL)
      .bind(
        normalizedPrompt.id,
        extUserId,
        normalizedPrompt.title,
        normalizedPrompt.body,
        normalizedPrompt.category,
        JSON.stringify(normalizedPrompt.tags),
        normalizedPrompt.createdAt,
        normalizedPrompt.updatedAt,
        normalizedPrompt.uses,
      )
  }

  const prepareFreshnessUpsert = (isFresh: boolean) => {
    return db
      .prepare(UPSERT_PROMPT_LIBRARY_FRESHNESS_SQL)
      .bind(extUserId, isFresh ? 1 : 0, new Date().toISOString())
  }

  return {
    batch: (statements: D1PreparedStatement[]) => db.batch(statements),
    deletePrompt: (promptId: string) =>
      db.prepare('DELETE FROM prompts WHERE ext_user_id = ? AND id = ?').bind(extUserId, promptId),
    findPrompt: async (promptId: string) => {
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
    },
    getFreshness: async () => {
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
    },
    incrementPromptUses: (promptId: string) =>
      db
        .prepare(
          `
            UPDATE prompts
            SET uses = uses + 1,
                updated_at = ?
            WHERE ext_user_id = ? AND id = ?
          `,
        )
        .bind(new Date().toISOString(), extUserId, promptId),
    listPrompts: async () => {
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
    },
    prepareFreshnessUpsert,
    preparePromptUpsert,
    setFreshness: (isFresh: boolean) => prepareFreshnessUpsert(isFresh).run(),
  }
}
