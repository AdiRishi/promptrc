import { DEFAULT_PROMPT_CATEGORIES } from '@/features/prompt-library/model/prompt-library-data'
import { type PromptRecord } from '@/features/prompt-library/types'

export type PromptLibraryVisibleState = {
  activePrompt: PromptRecord | null
  categories: string[]
  categoryKeys: string[]
  emptyReason: 'no-prompts' | 'no-query-matches' | null
  filteredPrompts: PromptRecord[]
  groupedPrompts: Record<string, PromptRecord[]>
  orderedPromptIds: string[]
  visiblePromptId: string | null
  getNearestPromptIdAfterRemoval: (promptId: string) => string | null
  getNextPromptId: () => string | null
  getPreviousPromptId: () => string | null
}

export const selectPromptLibraryVisibleState = ({
  prompts,
  query,
  selectedPromptId,
}: {
  prompts: PromptRecord[]
  query: string
  selectedPromptId: string | null
}): PromptLibraryVisibleState => {
  const promptsInTreeOrder = orderPromptsForTree(prompts)
  const filteredPrompts = promptsInTreeOrder.filter((prompt) => matchesPromptQuery(prompt, query))
  const groupedPrompts = groupPromptsByCategory(filteredPrompts)
  const categoryKeys = Object.keys(groupedPrompts).sort(comparePromptLibraryText)
  const orderedPromptIds = categoryKeys.flatMap((category) =>
    (groupedPrompts[category] ?? []).map((prompt) => prompt.id),
  )
  const activePrompt =
    filteredPrompts.find((prompt) => prompt.id === selectedPromptId) ?? filteredPrompts[0] ?? null
  const categories = getPromptCategories(prompts)
  const visiblePromptId = activePrompt?.id ?? null
  const emptyReason =
    prompts.length === 0 ? 'no-prompts' : filteredPrompts.length === 0 ? 'no-query-matches' : null

  const getCurrentPromptIndex = () =>
    visiblePromptId ? orderedPromptIds.indexOf(visiblePromptId) : -1

  return {
    activePrompt,
    categories,
    categoryKeys,
    emptyReason,
    filteredPrompts,
    groupedPrompts,
    orderedPromptIds,
    visiblePromptId,
    getNearestPromptIdAfterRemoval: (promptId) => {
      const fallbackPromptIds = orderedPromptIds.includes(promptId)
        ? orderedPromptIds
        : promptsInTreeOrder.map((prompt) => prompt.id)
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

      const currentIndex = getCurrentPromptIndex()

      return orderedPromptIds[Math.max(currentIndex - 1, 0)] ?? orderedPromptIds[0] ?? null
    },
  }
}

const promptLibrarySortCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

const comparePromptLibraryText = (left: string, right: string) => {
  const normalizedLeft = left.trim()
  const normalizedRight = right.trim()
  const result = promptLibrarySortCollator.compare(normalizedLeft, normalizedRight)

  return result === 0 ? normalizedLeft.localeCompare(normalizedRight) : result
}

const orderPromptsForTree = (prompts: PromptRecord[]) => {
  return [...prompts].sort(
    (left, right) =>
      comparePromptLibraryText(left.category, right.category) ||
      comparePromptLibraryText(right.createdAt, left.createdAt) ||
      comparePromptLibraryText(left.title, right.title) ||
      comparePromptLibraryText(left.id, right.id),
  )
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
  const defaultCategories = new Set<string>(DEFAULT_PROMPT_CATEGORIES)

  for (const prompt of prompts) {
    categories.add(prompt.category)
  }

  const customCategories = Array.from(categories)
    .filter((category) => !defaultCategories.has(category))
    .sort(comparePromptLibraryText)

  return [...DEFAULT_PROMPT_CATEGORIES, ...customCategories]
}
