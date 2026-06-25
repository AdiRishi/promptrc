import {
  PROMPT_COLUMNS,
  type PromptRow,
  rowToPrompt,
} from '@/features/prompt-library/persistence/remote/d1-prompt-library-adapter'
import { type PromptShareRecord, type PublicPromptShare } from '@/features/prompt-library/types'

type PromptShareRow = {
  id: string
  prompt_id: string
  created_at: string
  revoked_at: string | null
}

type PublicPromptShareRow = PromptRow & {
  share_created_at: string
  share_id: string
}

type PromptShareFactoryOptions = {
  generateId?: () => string
  now?: () => Date
}

const rowToPromptShare = (row: PromptShareRow): PromptShareRecord => ({
  id: row.id,
  promptId: row.prompt_id,
  createdAt: row.created_at,
  revokedAt: row.revoked_at,
})

const getTimestamp = (options: PromptShareFactoryOptions) => {
  return (options.now?.() ?? new Date()).toISOString()
}

const getShareId = (options: PromptShareFactoryOptions) => {
  return options.generateId ? options.generateId() : crypto.randomUUID()
}

const findPromptForUser = async (db: D1Database, extUserId: string, promptId: string) => {
  const { results } = await db
    .prepare(
      `
        SELECT id
        FROM prompts
        WHERE ext_user_id = ? AND id = ?
        LIMIT 1
      `,
    )
    .bind(extUserId, promptId)
    .all<{ id: string }>()

  return Boolean(results[0])
}

export const getActivePromptShareForUser = async (
  db: D1Database,
  extUserId: string,
  promptId: string,
) => {
  const { results } = await db
    .prepare(
      `
        SELECT id, prompt_id, created_at, revoked_at
        FROM prompt_shares
        WHERE ext_user_id = ? AND prompt_id = ? AND revoked_at IS NULL
        LIMIT 1
      `,
    )
    .bind(extUserId, promptId)
    .all<PromptShareRow>()

  const row = results[0]

  return row ? rowToPromptShare(row) : null
}

export const createPromptShareForUser = async (
  db: D1Database,
  extUserId: string,
  promptId: string,
  options: PromptShareFactoryOptions = {},
) => {
  const promptExists = await findPromptForUser(db, extUserId, promptId)

  if (!promptExists) {
    throw new Error('Prompt not found')
  }

  const existingShare = await getActivePromptShareForUser(db, extUserId, promptId)

  if (existingShare) {
    return existingShare
  }

  const createdAt = getTimestamp(options)
  const shareId = getShareId(options)

  try {
    await db
      .prepare(
        `
          INSERT INTO prompt_shares (id, ext_user_id, prompt_id, created_at, revoked_at)
          VALUES (?, ?, ?, ?, NULL)
        `,
      )
      .bind(shareId, extUserId, promptId, createdAt)
      .run()
  } catch (error) {
    const racedShare = await getActivePromptShareForUser(db, extUserId, promptId)

    if (racedShare) {
      return racedShare
    }

    throw error
  }

  return {
    id: shareId,
    promptId,
    createdAt,
    revokedAt: null,
  } satisfies PromptShareRecord
}

export const revokePromptShareForUser = async (
  db: D1Database,
  extUserId: string,
  promptId: string,
  options: Pick<PromptShareFactoryOptions, 'now'> = {},
) => {
  const result = await db
    .prepare(
      `
        UPDATE prompt_shares
        SET revoked_at = ?
        WHERE ext_user_id = ? AND prompt_id = ? AND revoked_at IS NULL
      `,
    )
    .bind(getTimestamp(options), extUserId, promptId)
    .run()

  return {
    promptId,
    revoked: result.meta.changes > 0,
  }
}

export const getPublicPromptShare = async (
  db: D1Database,
  shareId: string,
): Promise<PublicPromptShare | null> => {
  const { results } = await db
    .prepare(
      `
        SELECT
          shares.id AS share_id,
          shares.created_at AS share_created_at,
          prompts.${PROMPT_COLUMNS.replaceAll(', ', ', prompts.')}
        FROM prompt_shares AS shares
        INNER JOIN prompts
          ON prompts.id = shares.prompt_id
          AND prompts.ext_user_id = shares.ext_user_id
        WHERE shares.id = ? AND shares.revoked_at IS NULL
        LIMIT 1
      `,
    )
    .bind(shareId)
    .all<PublicPromptShareRow>()

  const row = results[0]

  if (!row) {
    return null
  }

  return {
    shareId: row.share_id,
    createdAt: row.share_created_at,
    prompt: rowToPrompt(row),
  }
}
