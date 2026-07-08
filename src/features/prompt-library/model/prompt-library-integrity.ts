import { getImagesReferencedByBody } from '@/features/prompt-library/model/prompt-images'
import {
  type ComposerState,
  type PromptDraft,
  type PromptRecord,
  type PromptSaveInput,
} from '@/features/prompt-library/types'

export const DEFAULT_PROMPT_CATEGORY = 'Personal'

export const EMPTY_PROMPT_DRAFT: PromptDraft = {
  title: '',
  category: '',
  body: '',
  images: [],
  tagsInput: '',
}

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
    title: prompt.title,
    category: prompt.category,
    body: prompt.body,
    images: prompt.images,
    tagsInput: prompt.tags.map((tag) => `#${tag}`).join(' '),
  }
}

export const createPromptInput = (draft: PromptDraft): PromptSaveInput => {
  const body = draft.body.trim()

  return {
    title: draft.title.trim(),
    body,
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
    title: promptInput.title,
    body: promptInput.body,
    category: normalizePromptCategory(promptInput.category),
    tags: promptInput.tags,
    images: promptInput.images,
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
    title: promptInput.title,
    body: promptInput.body,
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
    createdAt: now,
    updatedAt: now,
    uses: 0,
  } satisfies PromptRecord
}

export const normalizePromptRecord = (prompt: PromptRecord): PromptRecord => ({
  id: prompt.id.trim(),
  title: prompt.title.trim(),
  body: prompt.body.trim(),
  category: normalizePromptCategory(prompt.category),
  tags: normalizePromptTags(prompt.tags),
  images: getImagesReferencedByBody(prompt.body.trim(), prompt.images),
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
