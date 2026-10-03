import { getImagesReferencedByBody } from '@/features/prompt-library/model/prompt-images'
import { DEFAULT_PROMPT_KIND } from '@/features/prompt-library/model/prompt-kinds'
import { normalizePromptRuns } from '@/features/prompt-library/model/prompt-runs'
import {
  type ComposerState,
  type PromptDraft,
  type PromptKind,
  type PromptRecord,
  type PromptSaveInput,
} from '@/features/prompt-library/types'

export const DEFAULT_PROMPT_CATEGORY = 'Personal'

export const EMPTY_PROMPT_DRAFT: PromptDraft = {
  kind: DEFAULT_PROMPT_KIND,
  title: '',
  category: '',
  body: '',
  notes: '',
  images: [],
  tagsInput: '',
}

export const createEmptyPromptDraft = (kind: PromptKind = DEFAULT_PROMPT_KIND): PromptDraft => ({
  ...EMPTY_PROMPT_DRAFT,
  kind,
})

type PromptRecordFactoryOptions = {
  generateId?: () => string
  now?: () => Date
}

const unique = <TValue>(values: TValue[]) => Array.from(new Set(values))

export const normalizePromptTags = (value: string | readonly string[]) => {
  const rawTags =
    typeof value === 'string'
      ? value.split(/[,\s#]+/)
      : value.flatMap((tag) => tag.split(/[,\s#]+/))

  return unique(rawTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))
}

export const normalizePromptCategory = (category: string) => {
  return category.trim() || DEFAULT_PROMPT_CATEGORY
}

export const createInitialComposerState = (): ComposerState => ({
  mode: 'view',
  draft: { ...EMPTY_PROMPT_DRAFT },
})

export const createPromptDraft = (prompt?: PromptRecord): PromptDraft => {
  if (!prompt) {
    return { ...EMPTY_PROMPT_DRAFT }
  }

  return {
    kind: prompt.kind,
    title: prompt.title,
    category: prompt.category,
    body: prompt.body,
    notes: prompt.notes,
    images: prompt.images,
    tagsInput: prompt.tags.map((tag) => `#${tag}`).join(' '),
  }
}

export const createPromptInput = (draft: PromptDraft): PromptSaveInput => {
  const body = draft.body.trim()

  return {
    kind: draft.kind,
    title: draft.title.trim(),
    body,
    notes: draft.notes.trim(),
    category: draft.category.trim(),
    tags: normalizePromptTags(draft.tagsInput),
    images: getImagesReferencedByBody(body, draft.images),
  }
}

const hasPromptRequiredFields = (promptInput: PromptSaveInput) => {
  return Boolean(promptInput.title && promptInput.body)
}

const getTimestamp = (options: PromptRecordFactoryOptions) => {
  return (options.now?.() ?? new Date()).toISOString()
}

const getPromptId = (options: PromptRecordFactoryOptions) => {
  return options.generateId ? options.generateId() : crypto.randomUUID()
}

export const generatePromptId = () => crypto.randomUUID()

export const createPromptRecordFromDraft = (
  draft: PromptDraft,
  options: PromptRecordFactoryOptions = {},
) => {
  const promptInput = createPromptInput(draft)

  if (!hasPromptRequiredFields(promptInput)) {
    return null
  }

  const now = getTimestamp(options)

  return {
    id: getPromptId(options),
    kind: promptInput.kind,
    title: promptInput.title,
    body: promptInput.body,
    notes: promptInput.notes,
    category: normalizePromptCategory(promptInput.category),
    tags: promptInput.tags,
    images: promptInput.images,
    runs: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
    uses: 0,
  } satisfies PromptRecord
}

export const updatePromptRecordFromDraft = (
  prompt: PromptRecord,
  draft: PromptDraft,
  options: Pick<PromptRecordFactoryOptions, 'now'> = {},
) => {
  const promptInput = createPromptInput(draft)

  if (!hasPromptRequiredFields(promptInput)) {
    return null
  }

  return {
    ...prompt,
    kind: promptInput.kind,
    title: promptInput.title,
    body: promptInput.body,
    notes: promptInput.notes,
    category: normalizePromptCategory(promptInput.category || prompt.category),
    tags: promptInput.tags,
    images: promptInput.images,
    updatedAt: getTimestamp(options),
  } satisfies PromptRecord
}

export const duplicatePromptRecord = (
  sourcePrompt: PromptRecord,
  options: PromptRecordFactoryOptions = {},
) => {
  const now = getTimestamp(options)

  return {
    ...sourcePrompt,
    id: getPromptId(options),
    title: `${sourcePrompt.title} (copy)`,
    runs: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
    uses: 0,
  } satisfies PromptRecord
}

export const normalizePromptRecord = (prompt: PromptRecord): PromptRecord => ({
  id: prompt.id.trim(),
  kind: prompt.kind,
  title: prompt.title.trim(),
  body: prompt.body.trim(),
  notes: prompt.notes.trim(),
  category: normalizePromptCategory(prompt.category),
  tags: normalizePromptTags(prompt.tags),
  images: getImagesReferencedByBody(prompt.body.trim(), prompt.images),
  runs: normalizePromptRuns(prompt.runs),
  pinned: prompt.pinned,
  createdAt: prompt.createdAt,
  updatedAt: prompt.updatedAt,
  uses: prompt.uses,
})

export const copyPromptForRemoteLibrary = (
  prompt: PromptRecord,
  options: Pick<PromptRecordFactoryOptions, 'generateId'> = {},
) => ({
  ...normalizePromptRecord(prompt),
  id: getPromptId(options),
})

export const incrementPromptRecordUses = (prompts: PromptRecord[], promptId: string) => {
  return prompts.map((prompt) =>
    prompt.id === promptId ? { ...prompt, uses: prompt.uses + 1 } : prompt,
  )
}

export const setPromptRecordPinned = (prompt: PromptRecord, pinned: boolean): PromptRecord => ({
  ...prompt,
  pinned,
})

const MAX_DERIVED_TITLE_LENGTH = 64

/** A title for quick captures: the first meaningful line, trimmed to a word boundary. */
export const deriveTitleFromBody = (body: string) => {
  const firstLine =
    body
      .split('\n')
      .map((line) =>
        line
          .replace(/<!--.*?-->/g, '')
          // Only structural markers: headings, quotes, bullets, and "1." / "1)" list numbers.
          .replace(/^\s*(?:#{1,6}\s+|>\s*|[-*+]\s+|\d+[.)]\s+)+/, '')
          // Emphasis and code markers, without touching identifiers like user_id.
          .replace(/(\*\*|__)(.+?)\1/g, '$2')
          .replace(/(^|\W)[*_](\S(?:.*?\S)?)[*_](?=\W|$)/g, '$1$2')
          .replace(/`/g, '')
          .trim(),
      )
      .find((line) => /[\p{L}\p{N}]/u.test(line)) ?? ''

  if (firstLine.length <= MAX_DERIVED_TITLE_LENGTH) {
    return firstLine.replace(/[.:;,]$/, '')
  }

  const clipped = firstLine.slice(0, MAX_DERIVED_TITLE_LENGTH)
  const lastSpace = clipped.lastIndexOf(' ')

  return `${(lastSpace > 24 ? clipped.slice(0, lastSpace) : clipped).replace(/[.:;,]$/, '')}…`
}
