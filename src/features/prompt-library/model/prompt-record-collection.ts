import { type PromptRecord } from '@/features/prompt-library/types'

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
