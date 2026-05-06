import { DEFAULT_PROMPT_CATEGORIES } from '@/features/prompt-library/lib/prompt-library-data'
import { type PromptRecord } from '@/features/prompt-library/types'

export type PromptLibraryProjection = {
  activePrompt: PromptRecord | null
  categories: string[]
  categoryKeys: string[]
  filteredPrompts: PromptRecord[]
  groupedPrompts: Record<string, PromptRecord[]>
  orderedPromptIds: string[]
  getNearestPromptIdAfterRemoval: (promptId: string) => string | null
  getNextPromptId: () => string | null
  getPreviousPromptId: () => string | null
}

export const createPromptLibraryProjection = ({
  prompts,
  query,
  selectedPromptId,
}: {
  prompts: PromptRecord[]
  query: string
  selectedPromptId: string | null
}): PromptLibraryProjection => {
  const filteredPrompts = prompts.filter((prompt) => matchesPromptQuery(prompt, query))
  const groupedPrompts = groupPromptsByCategory(filteredPrompts)
  const orderedPromptIds = filteredPrompts.map((prompt) => prompt.id)
  const activePrompt = prompts.find((prompt) => prompt.id === selectedPromptId) ?? null
  const categories = getPromptCategories(prompts)
  const categoryKeys = Object.keys(groupedPrompts)

  const getCurrentPromptIndex = () =>
    selectedPromptId ? orderedPromptIds.indexOf(selectedPromptId) : -1

  return {
    activePrompt,
    categories,
    categoryKeys,
    filteredPrompts,
    groupedPrompts,
    orderedPromptIds,
    getNearestPromptIdAfterRemoval: (promptId) => {
      const fallbackPromptIds = orderedPromptIds.includes(promptId)
        ? orderedPromptIds
        : prompts.map((prompt) => prompt.id)
      const promptIndex = fallbackPromptIds.indexOf(promptId)

      return fallbackPromptIds[promptIndex + 1] ?? fallbackPromptIds[promptIndex - 1] ?? null
    },
    getNextPromptId: () => {
      if (!orderedPromptIds.length) {
        return null
      }

      const currentIndex = getCurrentPromptIndex()

      return (
        orderedPromptIds[Math.min(currentIndex + 1, orderedPromptIds.length - 1)] ??
        orderedPromptIds[0] ??
        null
      )
    },
    getPreviousPromptId: () => {
      if (!orderedPromptIds.length) {
        return null
      }

      const currentIndex = selectedPromptId ? orderedPromptIds.indexOf(selectedPromptId) : 0

      return orderedPromptIds[Math.max(currentIndex - 1, 0)] ?? orderedPromptIds[0] ?? null
    },
  }
}

export const matchesPromptQuery = (prompt: PromptRecord, query: string) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [
    prompt.title,
    prompt.body,
    prompt.category,
    prompt.tags.join(' '),
    prompt.tags.map((tag) => `#${tag}`).join(' '),
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
}

export const groupPromptsByCategory = (prompts: PromptRecord[]) => {
  return prompts.reduce<Record<string, PromptRecord[]>>((groups, prompt) => {
    const key = prompt.category
    const existing = groups[key] ?? []

    groups[key] = [...existing, prompt]

    return groups
  }, {})
}

export const getPromptCategories = (prompts: PromptRecord[]) => {
  const categories = new Set<string>(DEFAULT_PROMPT_CATEGORIES)

  for (const prompt of prompts) {
    categories.add(prompt.category)
  }

  return Array.from(categories)
}
