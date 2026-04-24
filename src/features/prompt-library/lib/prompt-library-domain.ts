import {
  EMPTY_PROMPT_DRAFT,
  createPromptInput,
  generatePromptId,
} from '@/features/prompt-library/lib/prompt-library-utils'
import {
  type ComposerState,
  type PromptDraft,
  type PromptRecord,
} from '@/features/prompt-library/types'

export const createInitialComposerState = (): ComposerState => ({
  mode: 'view',
  draft: { ...EMPTY_PROMPT_DRAFT },
})

export const getExistingSelectedPromptId = (
  prompts: PromptRecord[],
  selectedPromptId: string | null,
) => {
  if (selectedPromptId && prompts.some((prompt) => prompt.id === selectedPromptId)) {
    return selectedPromptId
  }

  return prompts[0]?.id ?? null
}

export const upsertPromptRecord = (prompts: PromptRecord[], replacementPrompt: PromptRecord) => {
  const promptExists = prompts.some((prompt) => prompt.id === replacementPrompt.id)

  return promptExists
    ? prompts.map((prompt) => (prompt.id === replacementPrompt.id ? replacementPrompt : prompt))
    : [replacementPrompt, ...prompts]
}

export const createPromptRecordFromDraft = (draft: PromptDraft) => {
  const promptInput = createPromptInput(draft)

  if (!promptInput.title || !promptInput.body) {
    return null
  }

  const now = new Date().toISOString()

  return {
    id: generatePromptId(),
    title: promptInput.title,
    body: promptInput.body,
    category: promptInput.category || 'Personal',
    tags: promptInput.tags,
    createdAt: now,
    updatedAt: now,
    uses: 0,
  } satisfies PromptRecord
}

export const updatePromptRecordFromDraft = (prompt: PromptRecord, draft: PromptDraft) => {
  const promptInput = createPromptInput(draft)

  if (!promptInput.title || !promptInput.body) {
    return null
  }

  return {
    ...prompt,
    title: promptInput.title,
    body: promptInput.body,
    category: promptInput.category || prompt.category,
    tags: promptInput.tags,
    updatedAt: new Date().toISOString(),
  } satisfies PromptRecord
}

export const duplicatePromptRecord = (sourcePrompt: PromptRecord) => {
  const now = new Date().toISOString()

  return {
    ...sourcePrompt,
    id: generatePromptId(),
    title: `${sourcePrompt.title} (copy)`,
    createdAt: now,
    updatedAt: now,
    uses: 0,
  } satisfies PromptRecord
}

export const incrementPromptRecordUses = (prompts: PromptRecord[], promptId: string) => {
  return prompts.map((prompt) =>
    prompt.id === promptId ? { ...prompt, uses: prompt.uses + 1 } : prompt,
  )
}
