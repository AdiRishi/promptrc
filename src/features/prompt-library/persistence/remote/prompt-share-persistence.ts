import { DEFAULT_PROMPT_KIND, isPromptKind } from '@/features/prompt-library/model/prompt-kinds'
import {
  PROMPT_COLUMNS,
  type PromptRow,
  decodePromptTags,
  rowToPrompt,
} from '@/features/prompt-library/persistence/remote/d1-prompt-library-adapter'
import {
  type PromptRecord,
  type PromptShareRecord,
  type PublicPromptListing,
  type PublicPromptShare,
} from '@/features/prompt-library/types'

type PromptShareRow = {
  id: string
  prompt_id: string
  created_at: string
  revoked_at: string | null
  listed_at: string | null
}

type PublicPromptShareRow = PromptRow & {
  share_created_at: string
  share_id: string
  share_listed_at: string | null
}

type PublicPromptListingRow = {
  share_id: string
  listed_at: string
  kind: string
  title: string
  category: string
  tags_json: string
  body_start: string
}

type PromptShareFactoryOptions = {
  generateId?: () => string
  now?: () => Date
}

const SHARE_COLUMNS = 'id, prompt_id, created_at, revoked_at, listed_at'

/** The public list is a page, not an export: newest first, and bounded. */
const PUBLIC_LISTING_LIMIT = 500
const PUBLIC_LISTING_BODY_START = 600

const rowToPromptShare = (row: PromptShareRow): PromptShareRecord => ({
  id: row.id,
  promptId: row.prompt_id,
  createdAt: row.created_at,
  revokedAt: row.revoked_at,
  listedAt: row.listed_at,
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
        SELECT ${SHARE_COLUMNS}
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
    listedAt: null,
  } satisfies PromptShareRecord
}

/**
 * Publishes or unpublishes a Prompt's active share. Returns the share as it
 * now stands, or `null` when the Prompt has no active share to change.
 */
export const setPromptShareListedForUser = async (
  db: D1Database,
  extUserId: string,
  promptId: string,
  listed: boolean,
  options: Pick<PromptShareFactoryOptions, 'now'> = {},
) => {
  await db
    .prepare(
      `
        UPDATE prompt_shares
        SET listed_at = ?
        WHERE ext_user_id = ? AND prompt_id = ? AND revoked_at IS NULL
      `,
    )
    .bind(listed ? getTimestamp(options) : null, extUserId, promptId)
    .run()

  return getActivePromptShareForUser(db, extUserId, promptId)
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
          shares.listed_at AS share_listed_at,
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
    listed: row.share_listed_at !== null,
    prompt: toPublicPrompt(rowToPrompt(row)),
  }
}

/**
 * Every published share, most recently published first. Only shares whose
 * owner published them appear here; a plain share link never does.
 */
export const listPublicPromptShares = async (db: D1Database): Promise<PublicPromptListing[]> => {
  const { results } = await db
    .prepare(
      `
        SELECT
          shares.id AS share_id,
          shares.listed_at AS listed_at,
          prompts.kind AS kind,
          prompts.title AS title,
          prompts.category AS category,
          prompts.tags_json AS tags_json,
          substr(prompts.body, 1, ${PUBLIC_LISTING_BODY_START}) AS body_start
        FROM prompt_shares AS shares
        INNER JOIN prompts
          ON prompts.id = shares.prompt_id
          AND prompts.ext_user_id = shares.ext_user_id
        WHERE shares.listed_at IS NOT NULL AND shares.revoked_at IS NULL
        ORDER BY shares.listed_at DESC
        LIMIT ${PUBLIC_LISTING_LIMIT}
      `,
    )
    .all<PublicPromptListingRow>()

  return results.map((row) => ({
    shareId: row.share_id,
    listedAt: row.listed_at,
    kind: isPromptKind(row.kind) ? row.kind : DEFAULT_PROMPT_KIND,
    title: row.title,
    category: row.category,
    tags: decodePromptTags(row.tags_json),
    bodyStart: row.body_start,
  }))
}

/**
 * A share link publishes the Prompt itself — title, body, kind, tags, images —
 * not the owner's private marginalia: notes, benchmark runs, pins and usage stay
 * in their library.
 */
export const toPublicPrompt = (prompt: PromptRecord): PromptRecord => ({
  ...prompt,
  notes: '',
  runs: [],
  pinned: false,
  uses: 0,
})
