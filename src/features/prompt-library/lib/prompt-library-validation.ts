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
    return {
      prompts: promptsValue.map(assertPromptRecord),
      query: typeof snapshot.query === 'string' ? snapshot.query : '',
      selectedPromptId: assertNullableString(snapshot.selectedPromptId ?? null, 'selectedPromptId'),
      composer: parsePersistedComposer(snapshot.composer),
    }
  } catch {
    return null
  }
}
