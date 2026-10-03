import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { DEFAULT_PROMPT_CATEGORIES } from '@/features/prompt-library/model/prompt-library-data'
import {
  type PromptKind,
  type PromptLibraryFilter,
  type PromptLibrarySort,
  type PromptRecord,
} from '@/features/prompt-library/types'

export type PromptLibraryEmptyReason = 'no-prompts' | 'no-query-matches' | 'empty-filter'

export type PromptLibraryFacet = {
  key: string
  label: string
  count: number
}

export type PromptLibraryVisibleState = {
  activePrompt: PromptRecord | null
  /** Category names for the composer (defaults first, then the library's own). */
  categories: string[]
  emptyReason: PromptLibraryEmptyReason | null
  /** Prompts in the current filter + query, in list order. */
  filteredPrompts: PromptRecord[]
  orderedPromptIds: string[]
  visiblePromptId: string | null
  facets: PromptLibraryFacets
  getNearestPromptIdAfterRemoval: (promptId: string) => string | null
  getNextPromptId: () => string | null
  getPreviousPromptId: () => string | null
}

export type PromptLibraryFacets = {
  total: number
  pinned: number
  kinds: Record<PromptKind, number>
  /** Categories in Category Order: alphabetical and independent of recency. */
  categories: PromptLibraryFacet[]
  /** Most-used tags first. */
  tags: PromptLibraryFacet[]
}

type SelectPromptLibraryVisibleStateInput = {
  prompts: PromptRecord[]
  query: string
  selectedPromptId: string | null
  filter?: PromptLibraryFilter
  sort?: PromptLibrarySort
}

const ALL_FILTER: PromptLibraryFilter = { type: 'all' }

export const selectPromptLibraryVisibleState = ({
  prompts,
  query,
  selectedPromptId,
  filter = ALL_FILTER,
  sort = 'created',
}: SelectPromptLibraryVisibleStateInput): PromptLibraryVisibleState => {
  const orderedPrompts = orderPrompts(prompts, sort)
  const inFilter = orderedPrompts.filter((prompt) => matchesPromptFilter(prompt, filter))
  const filteredPrompts = inFilter.filter((prompt) => matchesPromptQuery(prompt, query))
  const orderedPromptIds = filteredPrompts.map((prompt) => prompt.id)
  const activePrompt =
    filteredPrompts.find((prompt) => prompt.id === selectedPromptId) ?? filteredPrompts[0] ?? null
  const visiblePromptId = activePrompt?.id ?? null
  const emptyReason: PromptLibraryEmptyReason | null =
    prompts.length === 0
      ? 'no-prompts'
      : inFilter.length === 0
        ? 'empty-filter'
        : filteredPrompts.length === 0
          ? 'no-query-matches'
          : null

  const getCurrentPromptIndex = () =>
    visiblePromptId ? orderedPromptIds.indexOf(visiblePromptId) : -1

  return {
    activePrompt,
    categories: getPromptCategories(prompts),
    emptyReason,
    filteredPrompts,
    orderedPromptIds,
    visiblePromptId,
    facets: getPromptLibraryFacets(prompts),
    getNearestPromptIdAfterRemoval: (promptId) => {
      const fallbackPromptIds = orderedPromptIds.includes(promptId)
        ? orderedPromptIds
        : orderedPrompts.map((prompt) => prompt.id)
      const promptIndex = fallbackPromptIds.indexOf(promptId)

      return fallbackPromptIds[promptIndex + 1] ?? fallbackPromptIds[promptIndex - 1] ?? null
    },
    getNextPromptId: () => {
      if (!orderedPromptIds.length) {
        return null
      }

      const currentIndex = getCurrentPromptIndex()

      return orderedPromptIds[Math.min(currentIndex + 1, orderedPromptIds.length - 1)] ?? null
    },
    getPreviousPromptId: () => {
      if (!orderedPromptIds.length) {
        return null
      }

      const currentIndex = getCurrentPromptIndex()

      return orderedPromptIds[Math.max(currentIndex - 1, 0)] ?? null
    },
  }
}

const promptLibrarySortCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

export const comparePromptLibraryText = (left: string, right: string) => {
  const normalizedLeft = left.trim()
  const normalizedRight = right.trim()
  const result = promptLibrarySortCollator.compare(normalizedLeft, normalizedRight)

  return result === 0 ? normalizedLeft.localeCompare(normalizedRight) : result
}

const compareBySort = (sort: PromptLibrarySort) => (left: PromptRecord, right: PromptRecord) => {
  switch (sort) {
    case 'used':
      return right.uses - left.uses || right.createdAt.localeCompare(left.createdAt)
    case 'title':
      return comparePromptLibraryText(left.title, right.title)
    case 'created':
      return right.createdAt.localeCompare(left.createdAt)
  }
}

/** Pinned Prompts lead; the rest follow the chosen sort with stable tie-breaks. */
export const orderPrompts = (prompts: readonly PromptRecord[], sort: PromptLibrarySort) => {
  const compare = compareBySort(sort)

  return [...prompts].sort(
    (left, right) =>
      Number(right.pinned) - Number(left.pinned) ||
      compare(left, right) ||
      comparePromptLibraryText(left.title, right.title) ||
      left.id.localeCompare(right.id),
  )
}

export const matchesPromptFilter = (prompt: PromptRecord, filter: PromptLibraryFilter) => {
  switch (filter.type) {
    case 'all':
      return true
    case 'pinned':
      return prompt.pinned
    case 'kind':
      return prompt.kind === filter.kind
    case 'category':
      return prompt.category.toLowerCase() === filter.category.toLowerCase()
    case 'tag':
      return prompt.tags.includes(filter.tag)
  }
}

/**
 * Every whitespace-separated term must match. `#term` matches tag prefixes only;
 * anything else matches title, body, notes, category, tags, kind, or image names.
 */
export const matchesPromptQuery = (prompt: PromptRecord, query: string) => {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)

  if (terms.length === 0) {
    return true
  }

  const haystack = [
    prompt.title,
    prompt.body,
    prompt.notes,
    prompt.category,
    PROMPT_KIND_DEFINITIONS[prompt.kind].label,
    prompt.images.map((image) => image.fileName).join(' '),
    prompt.tags.join(' '),
    prompt.tags.map((tag) => `#${tag}`).join(' '),
  ]
    .join(' ')
    .toLowerCase()

  return terms.every((term) => {
    if (term.startsWith('#') && term.length > 1) {
      const tagTerm = term.slice(1)

      return prompt.tags.some((tag) => tag.startsWith(tagTerm))
    }

    return haystack.includes(term)
  })
}

export const getPromptLibraryFacets = (prompts: readonly PromptRecord[]): PromptLibraryFacets => {
  const kinds = Object.fromEntries(PROMPT_KINDS.map((kind) => [kind, 0])) as Record<
    PromptKind,
    number
  >
  const categories = new Map<string, PromptLibraryFacet>()
  const tags = new Map<string, number>()
  let pinned = 0

  for (const prompt of prompts) {
    kinds[prompt.kind] += 1
    pinned += prompt.pinned ? 1 : 0

    const categoryKey = prompt.category.toLowerCase()
    const category = categories.get(categoryKey)

    if (category) {
      category.count += 1
    } else {
      categories.set(categoryKey, { key: prompt.category, label: prompt.category, count: 1 })
    }

    for (const tag of prompt.tags) {
      tags.set(tag, (tags.get(tag) ?? 0) + 1)
    }
  }

  return {
    total: prompts.length,
    pinned,
    kinds,
    categories: Array.from(categories.values()).sort((left, right) =>
      comparePromptLibraryText(left.label, right.label),
    ),
    tags: Array.from(tags.entries())
      .map(([tag, count]) => ({ key: tag, label: tag, count }))
      .sort(
        (left, right) => right.count - left.count || comparePromptLibraryText(left.key, right.key),
      ),
  }
}

export const getPromptCategories = (prompts: readonly PromptRecord[]) => {
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

export const describePromptLibraryFilter = (filter: PromptLibraryFilter) => {
  switch (filter.type) {
    case 'all':
      return 'Everything'
    case 'pinned':
      return 'Pinned'
    case 'kind':
      return PROMPT_KIND_DEFINITIONS[filter.kind].plural
    case 'category':
      return filter.category
    case 'tag':
      return `#${filter.tag}`
  }
}

export const isSamePromptLibraryFilter = (
  left: PromptLibraryFilter,
  right: PromptLibraryFilter,
) => {
  return JSON.stringify(left) === JSON.stringify(right)
}

/**
 * Accession numbers: the order things entered the library, oldest = 1. They
 * never change when a Prompt is edited, so a number is a stable way to refer
 * to an entry.
 */
export const getCatalogNumbers = (prompts: readonly PromptRecord[]) => {
  const ordered = [...prompts].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
  )

  return new Map(ordered.map((prompt, index) => [prompt.id, index + 1]))
}
