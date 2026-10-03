import {
  MAX_PROMPT_IMAGE_BYTES,
  isPromptImageId,
  isSupportedPromptImageContentType,
  normalizePromptImage,
} from '@/features/prompt-library/model/prompt-images'
import { DEFAULT_PROMPT_KIND, isPromptKind } from '@/features/prompt-library/model/prompt-kinds'
import {
  EMPTY_PROMPT_DRAFT,
  normalizePromptCategory,
  normalizePromptTags,
} from '@/features/prompt-library/model/prompt-library-integrity'
import {
  MAX_PROMPT_RUN_MODEL_LENGTH,
  MAX_PROMPT_RUN_NOTE_LENGTH,
  MAX_PROMPT_RUNS,
  isPromptRunVerdict,
  normalizePromptRuns,
} from '@/features/prompt-library/model/prompt-runs'
import {
  type ComposerState,
  type PromptDraft,
  type PromptImage,
  type PromptImageUploadInput,
  type PromptKind,
  type PromptLibraryFilter,
  type PromptLibraryPersistedSnapshot,
  type PromptLibrarySort,
  type PromptRecord,
  type PromptRun,
} from '@/features/prompt-library/types'

const EMPTY_PERSISTED_DRAFT: PromptDraft = { ...EMPTY_PROMPT_DRAFT }

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

const assertPromptImage = (value: unknown): PromptImage => {
  const image = assertObject(value, 'image')
  const id = assertString(image.id, 'image.id').trim()
  const fileName = assertString(image.fileName, 'image.fileName')
  const contentType = assertString(image.contentType, 'image.contentType').trim().toLowerCase()
  const size = image.size

  if (!isPromptImageId(id)) {
    throw new Error('image.id is invalid')
  }

  if (!isSupportedPromptImageContentType(contentType)) {
    throw new Error('image.contentType is unsupported')
  }

  if (typeof size !== 'number' || !Number.isInteger(size) || size <= 0) {
    throw new Error('image.size must be a positive integer')
  }

  if (size > MAX_PROMPT_IMAGE_BYTES) {
    throw new Error('image.size is too large')
  }

  return normalizePromptImage({
    id,
    fileName,
    contentType,
    size,
    createdAt: assertString(image.createdAt, 'image.createdAt'),
  })
}

const assertPromptImages = (value: unknown) => {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new Error('images must be an array')
  }

  return value.map(assertPromptImage)
}

/** Fields added after launch are optional on input so older libraries still load. */
const assertPromptKind = (value: unknown): PromptKind => {
  if (value === undefined) {
    return DEFAULT_PROMPT_KIND
  }

  if (!isPromptKind(value)) {
    throw new Error('kind is invalid')
  }

  return value
}

const assertOptionalString = (value: unknown, fieldName: string) => {
  return value === undefined ? '' : assertString(value, fieldName)
}

const assertOptionalBoolean = (value: unknown, fieldName: string) => {
  return value === undefined ? false : assertBoolean(value, fieldName)
}

export const assertPromptRun = (value: unknown): PromptRun => {
  const run = assertObject(value, 'run')
  const id = assertString(run.id, 'run.id').trim()
  const model = assertString(run.model, 'run.model').trim()
  const note = assertOptionalString(run.note, 'run.note').trim()
  const ranAt = assertString(run.ranAt, 'run.ranAt')

  if (!id || id.length > 96) {
    throw new Error('run.id is invalid')
  }

  if (!model || model.length > MAX_PROMPT_RUN_MODEL_LENGTH) {
    throw new Error('run.model is invalid')
  }

  if (!isPromptRunVerdict(run.verdict)) {
    throw new Error('run.verdict is invalid')
  }

  if (note.length > MAX_PROMPT_RUN_NOTE_LENGTH) {
    throw new Error('run.note is too long')
  }

  if (Number.isNaN(Date.parse(ranAt))) {
    throw new Error('run.ranAt must be a date')
  }

  return { id, model, verdict: run.verdict, note, ranAt }
}

const assertPromptRuns = (value: unknown) => {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new Error('runs must be an array')
  }

  if (value.length > MAX_PROMPT_RUNS) {
    throw new Error('runs has too many entries')
  }

  return normalizePromptRuns(value.map(assertPromptRun))
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
    kind: assertPromptKind(prompt.kind),
    title,
    body,
    notes: assertOptionalString(prompt.notes, 'notes').trim(),
    category: normalizePromptCategory(assertString(prompt.category, 'category')),
    tags: normalizePromptTags(assertStringArray(prompt.tags, 'tags')),
    images: assertPromptImages(prompt.images),
    runs: assertPromptRuns(prompt.runs),
    pinned: assertOptionalBoolean(prompt.pinned, 'pinned'),
    createdAt: assertString(prompt.createdAt, 'createdAt'),
    updatedAt: assertString(prompt.updatedAt, 'updatedAt'),
    uses,
  }
}

/**
 * Upper bounds for what a client may store. Generous for real prompts, but they
 * stop a client from filling D1 (and every list/share response) with junk. Only
 * applied at the server boundary, so an oversized local library still loads.
 */
export const PROMPT_RECORD_LIMITS = {
  title: 300,
  body: 200_000,
  notes: 20_000,
  tags: 50,
  tagLength: 64,
  libraryImport: 2_000,
} as const

export const assertPromptRecordWithinLimits = (value: unknown): PromptRecord => {
  const prompt = assertPromptRecord(value)

  if (prompt.title.length > PROMPT_RECORD_LIMITS.title) {
    throw new Error(`title must be at most ${PROMPT_RECORD_LIMITS.title} characters`)
  }

  if (prompt.body.length > PROMPT_RECORD_LIMITS.body) {
    throw new Error(`body must be at most ${PROMPT_RECORD_LIMITS.body} characters`)
  }

  if (prompt.notes.length > PROMPT_RECORD_LIMITS.notes) {
    throw new Error(`notes must be at most ${PROMPT_RECORD_LIMITS.notes} characters`)
  }

  if (prompt.tags.length > PROMPT_RECORD_LIMITS.tags) {
    throw new Error(`a prompt can have at most ${PROMPT_RECORD_LIMITS.tags} tags`)
  }

  if (prompt.tags.some((tag) => tag.length > PROMPT_RECORD_LIMITS.tagLength)) {
    throw new Error(`tags must be at most ${PROMPT_RECORD_LIMITS.tagLength} characters`)
  }

  return prompt
}

export const assertPromptRecordsWithinLimits = (value: unknown): PromptRecord[] => {
  if (!Array.isArray(value)) {
    throw new Error('prompts must be an array')
  }

  if (value.length > PROMPT_RECORD_LIMITS.libraryImport) {
    throw new Error(`at most ${PROMPT_RECORD_LIMITS.libraryImport} prompts can be copied at once`)
  }

  return value.map(assertPromptRecordWithinLimits)
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

export const assertPromptShareId = (value: unknown) => {
  const shareId = assertString(value, 'shareId').trim()

  if (!shareId) {
    throw new Error('shareId is required')
  }

  if (shareId.length > 80) {
    throw new Error('shareId is too long')
  }

  return shareId
}

export const assertPromptImageId = (value: unknown) => {
  const imageId = assertString(value, 'imageId').trim()

  if (!isPromptImageId(imageId)) {
    throw new Error('imageId is invalid')
  }

  return imageId
}

export const assertPromptImageUploadInput = (value: unknown): PromptImageUploadInput => {
  const upload = assertObject(value, 'upload')
  const fileName = assertString(upload.fileName, 'fileName')
  const contentType = assertString(upload.contentType, 'contentType').trim().toLowerCase()
  const dataBase64 = assertString(upload.dataBase64, 'dataBase64')

  if (!isSupportedPromptImageContentType(contentType)) {
    throw new Error('image type is unsupported')
  }

  if (!dataBase64) {
    throw new Error('image data is required')
  }

  return {
    fileName,
    contentType,
    dataBase64,
  }
}

const parsePersistedDraft = (value: unknown): PromptDraft => {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_PERSISTED_DRAFT }
  }

  const draft = value as Record<string, unknown>

  return {
    kind: isPromptKind(draft.kind) ? draft.kind : DEFAULT_PROMPT_KIND,
    title: typeof draft.title === 'string' ? draft.title : '',
    category: typeof draft.category === 'string' ? draft.category : '',
    body: typeof draft.body === 'string' ? draft.body : '',
    notes: typeof draft.notes === 'string' ? draft.notes : '',
    images: Array.isArray(draft.images)
      ? draft.images.flatMap((image) => {
          try {
            return [assertPromptImage(image)]
          } catch {
            return []
          }
        })
      : [],
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

const EMPTY_FILTER: PromptLibraryFilter = { project: null, kind: null, pinned: false, tag: null }

const nonEmptyString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const parsePersistedFilter = (value: unknown): PromptLibraryFilter => {
  if (!value || typeof value !== 'object') {
    return EMPTY_FILTER
  }

  const filter = value as Record<string, unknown>

  // Earlier builds stored one filter at a time: `{ type: 'kind', kind }` and so on.
  if (typeof filter.type === 'string') {
    switch (filter.type) {
      case 'pinned':
        return { ...EMPTY_FILTER, pinned: true }
      case 'kind':
        return { ...EMPTY_FILTER, kind: isPromptKind(filter.kind) ? filter.kind : null }
      case 'category':
        return { ...EMPTY_FILTER, project: nonEmptyString(filter.category) }
      case 'tag':
        return { ...EMPTY_FILTER, tag: nonEmptyString(filter.tag) }
      default:
        return EMPTY_FILTER
    }
  }

  return {
    project: nonEmptyString(filter.project),
    kind: isPromptKind(filter.kind) ? filter.kind : null,
    pinned: filter.pinned === true,
    tag: nonEmptyString(filter.tag),
  }
}

const parsePersistedSort = (value: unknown): PromptLibrarySort => {
  return value === 'used' || value === 'title' ? value : 'created'
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
      filter: parsePersistedFilter(snapshot.filter),
      sort: parsePersistedSort(snapshot.sort),
      isFresh: typeof snapshot.isFresh === 'boolean' ? snapshot.isFresh : prompts.length === 0,
      query: typeof snapshot.query === 'string' ? snapshot.query : '',
      selectedPromptId: assertNullableString(snapshot.selectedPromptId ?? null, 'selectedPromptId'),
      composer: parsePersistedComposer(snapshot.composer),
    }
  } catch {
    return null
  }
}
