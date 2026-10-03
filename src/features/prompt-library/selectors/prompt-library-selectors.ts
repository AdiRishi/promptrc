import { PROMPT_KIND_DEFINITIONS, PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { comparePromptLibraryText } from '@/features/prompt-library/model/prompt-library-text'
import {
  type PromptProject,
  getPromptProjects,
  isSameProject,
} from '@/features/prompt-library/model/prompt-projects'
import {
  type PromptKind,
  type PromptLibraryFilter,
  type PromptLibrarySort,
  type PromptRecord,
} from '@/features/prompt-library/types'

export { comparePromptLibraryText }

export type PromptLibraryEmptyReason = 'no-prompts' | 'no-query-matches' | 'empty-filter'

export type PromptLibraryFacet = {
  key: string
  label: string
  count: number
}

export type PromptLibraryVisibleState = {
  activePrompt: PromptRecord | null
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
  /** Every Prompt in the library. */
  total: number
  /** Every Project, A–Z (Category Order never follows recency). */
  projects: PromptProject[]
  /** Every Tag in the library, most used first. */
  tags: PromptLibraryFacet[]
  /** Counts inside the current Project — the whole library when there is none. */
  here: {
    total: number
    pinned: number
    kinds: Record<PromptKind, number>
    tags: PromptLibraryFacet[]
  }
}

export const EMPTY_PROMPT_LIBRARY_FILTER: PromptLibraryFilter = {
  project: null,
  kind: null,
  pinned: false,
  tag: null,
}

type SelectPromptLibraryVisibleStateInput = {
  prompts: PromptRecord[]
  query: string
  selectedPromptId: string | null
  filter?: PromptLibraryFilter
  sort?: PromptLibrarySort
}

export const selectPromptLibraryVisibleState = ({
  prompts,
  query,
  selectedPromptId,
  filter = EMPTY_PROMPT_LIBRARY_FILTER,
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
    emptyReason,
    filteredPrompts,
    orderedPromptIds,
    visiblePromptId,
    facets: getPromptLibraryFacets(prompts, filter.project),
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

/** Every part of the filter that is set must hold. */
export const matchesPromptFilter = (prompt: PromptRecord, filter: PromptLibraryFilter) => {
  return (
    (filter.project === null || isSameProject(prompt.category, filter.project)) &&
    (filter.kind === null || prompt.kind === filter.kind) &&
    (!filter.pinned || prompt.pinned) &&
    (filter.tag === null || prompt.tags.includes(filter.tag))
  )
}

/**
 * The filter to switch to so `prompt` shows up: drop the narrowing first, and
 * follow the Prompt to its own Project only if it lives somewhere else.
 */
export const getFilterShowingPrompt = (
  prompt: PromptRecord,
  filter: PromptLibraryFilter,
): PromptLibraryFilter => {
  if (matchesPromptFilter(prompt, filter)) {
    return filter
  }

  const sameProject = { ...EMPTY_PROMPT_LIBRARY_FILTER, project: filter.project }

  return matchesPromptFilter(prompt, sameProject)
    ? sameProject
    : { ...EMPTY_PROMPT_LIBRARY_FILTER, project: prompt.category }
}

export const isPromptLibraryFilterEmpty = (filter: PromptLibraryFilter) => {
  return filter.project === null && filter.kind === null && !filter.pinned && filter.tag === null
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

const countTags = (prompts: readonly PromptRecord[]): PromptLibraryFacet[] => {
  const tags = new Map<string, number>()

  for (const prompt of prompts) {
    for (const tag of prompt.tags) {
      tags.set(tag, (tags.get(tag) ?? 0) + 1)
    }
  }

  return Array.from(tags, ([tag, count]) => ({ key: tag, label: tag, count })).sort(
    (left, right) => right.count - left.count || comparePromptLibraryText(left.key, right.key),
  )
}

export const getPromptLibraryFacets = (
  prompts: readonly PromptRecord[],
  project: string | null = null,
): PromptLibraryFacets => {
  const here =
    project === null ? prompts : prompts.filter((prompt) => isSameProject(prompt.category, project))
  const kinds = Object.fromEntries(PROMPT_KINDS.map((kind) => [kind, 0])) as Record<
    PromptKind,
    number
  >
  let pinned = 0

  for (const prompt of here) {
    kinds[prompt.kind] += 1
    pinned += prompt.pinned ? 1 : 0
  }

  return {
    total: prompts.length,
    projects: getPromptProjects(prompts),
    tags: countTags(prompts),
    here: { total: here.length, pinned, kinds, tags: countTags(here) },
  }
}

/** "Pinned sequences in render-md tagged #review", or "Everything". */
export const describePromptLibraryFilter = (filter: PromptLibraryFilter) => {
  const what = filter.kind ? PROMPT_KIND_DEFINITIONS[filter.kind].plural : 'Everything'
  const pinned = filter.pinned ? `Pinned ${filter.kind ? what.toLowerCase() : 'entries'}` : what

  return [
    pinned,
    filter.project ? `in ${filter.project}` : '',
    filter.tag ? `tagged #${filter.tag}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export const isSamePromptLibraryFilter = (
  left: PromptLibraryFilter,
  right: PromptLibraryFilter,
) => {
  const sameProject =
    left.project === right.project ||
    (left.project !== null && right.project !== null && isSameProject(left.project, right.project))

  return (
    sameProject &&
    left.kind === right.kind &&
    left.pinned === right.pinned &&
    left.tag === right.tag
  )
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
