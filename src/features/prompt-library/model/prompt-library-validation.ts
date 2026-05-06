import {
  normalizePromptCategory,
  normalizePromptTags,
} from '@/features/prompt-library/model/prompt-library-integrity'
import {
  type ComposerState,
  type PromptDraft,
  type PromptLibraryPersistedSnapshot,
  type PromptRecord,
} from '@/features/prompt-library/types'

const EMPTY_PERSISTED_DRAFT: PromptDraft = {
  title: '',
  category: '',
  body: '',
  tagsInput: '',
}

const assertObject = (value: unknown, fieldName: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    throw new Error(`${fieldName} must be an object`)
  }

  return value as Record<string, unknown>
}

const assertString = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }

  return value
}

const assertNullableString = (value: unknown, fieldName: string) => {
  if (value !== null && typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string or null`)
  }

  return value
}

const assertStringArray = (value: unknown, fieldName: string) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${fieldName} must be a string array`)
  }

  return value
}

export const assertPromptRecord = (value: unknown): PromptRecord => {
  const prompt = assertObject(value, 'prompt')
  const uses = prompt.uses
  const id = assertString(prompt.id, 'id').trim()
  const title = assertString(prompt.title, 'title').trim()
  const body = assertString(prompt.body, 'body').trim()

  if (typeof uses !== 'number' || !Number.isInteger(uses) || uses < 0) {
    throw new Error('uses must be a non-negative integer')
  }

  if (!id) {
    throw new Error('id is required')
  }

  if (!title) {
    throw new Error('title is required')
  }

  if (!body) {
    throw new Error('body is required')
  }

  return {
    id,
    title,
    body,
    category: normalizePromptCategory(assertString(prompt.category, 'category')),
    tags: normalizePromptTags(assertStringArray(prompt.tags, 'tags')),
    createdAt: assertString(prompt.createdAt, 'createdAt'),
    updatedAt: assertString(prompt.updatedAt, 'updatedAt'),
    uses,
  }
}

export const assertPromptRecords = (value: unknown): PromptRecord[] => {
  if (!Array.isArray(value)) {
    throw new Error('prompts must be an array')
  }

  return value.map(assertPromptRecord)
}

export const assertBoolean = (value: unknown, fieldName = 'value') => {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`)
  }

  return value
}

export const assertPromptId = (value: unknown) => {
  const promptId = assertString(value, 'promptId').trim()

  if (!promptId) {
    throw new Error('promptId is required')
  }

  return promptId
}

const parsePersistedDraft = (value: unknown): PromptDraft => {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_PERSISTED_DRAFT }
  }

  const draft = value as Record<string, unknown>

  return {
    title: typeof draft.title === 'string' ? draft.title : '',
    category: typeof draft.category === 'string' ? draft.category : '',
    body: typeof draft.body === 'string' ? draft.body : '',
    tagsInput: typeof draft.tagsInput === 'string' ? draft.tagsInput : '',
  }
}

const parsePersistedComposer = (value: unknown): ComposerState => {
  if (!value || typeof value !== 'object') {
    return {
      mode: 'view',
      draft: { ...EMPTY_PERSISTED_DRAFT },
    }
  }

  const composer = value as Record<string, unknown>
  const mode =
    composer.mode === 'new' || composer.mode === 'edit' || composer.mode === 'view'
      ? composer.mode
      : 'view'

  return {
    mode,
    draft: parsePersistedDraft(composer.draft),
  }
}

export const parsePromptLibraryPersistedSnapshot = (
  value: unknown,
): PromptLibraryPersistedSnapshot | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const snapshot = value as Record<string, unknown>
  const promptsValue = snapshot.prompts

  if (!Array.isArray(promptsValue)) {
    return null
  }

  try {
    const prompts = promptsValue.map(assertPromptRecord)

    return {
      prompts,
      isFresh: typeof snapshot.isFresh === 'boolean' ? snapshot.isFresh : prompts.length === 0,
      query: typeof snapshot.query === 'string' ? snapshot.query : '',
      selectedPromptId: assertNullableString(snapshot.selectedPromptId ?? null, 'selectedPromptId'),
      composer: parsePersistedComposer(snapshot.composer),
    }
  } catch {
    return null
  }
}
