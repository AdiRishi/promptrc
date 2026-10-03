import { comparePromptLibraryText } from '@/features/prompt-library/model/prompt-library-text'
import { type PromptRecord } from '@/features/prompt-library/types'

/**
 * A Project is where a Prompt lives — its single primary home. It is stored on
 * the Prompt as `category` (the D1 column and record field keep that name).
 */
export type PromptProject = {
  /** Spelling-insensitive identity: "Render MD", "render-md" and "render_md" are one Project. */
  key: string
  /** The spelling shown in the interface: the one most Prompts use. */
  label: string
  count: number
}

/** Lowercase letters and digits only, so case, spaces and punctuation never split a Project. */
export const projectKey = (name: string) =>
  name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')

export const isSameProject = (left: string, right: string) => {
  const leftKey = projectKey(left)

  return leftKey !== '' && leftKey === projectKey(right)
}

/** Every Project in the library, A–Z (Category Order never follows recency). */
export const getPromptProjects = (prompts: readonly PromptRecord[]): PromptProject[] => {
  const byKey = new Map<string, { count: number; spellings: Map<string, number> }>()

  for (const prompt of prompts) {
    const key = projectKey(prompt.category)

    if (!key) {
      continue
    }

    const entry = byKey.get(key) ?? { count: 0, spellings: new Map<string, number>() }
    const spelling = prompt.category.trim()

    entry.count += 1
    entry.spellings.set(spelling, (entry.spellings.get(spelling) ?? 0) + 1)
    byKey.set(key, entry)
  }

  return Array.from(byKey, ([key, entry]) => ({
    key,
    label: mostCommonSpelling(entry.spellings),
    count: entry.count,
  })).sort((left, right) => comparePromptLibraryText(left.label, right.label))
}

const mostCommonSpelling = (spellings: Map<string, number>) => {
  let best = ''
  let bestCount = -1

  for (const [spelling, count] of spellings) {
    if (
      count > bestCount ||
      (count === bestCount && comparePromptLibraryText(spelling, best) < 0)
    ) {
      best = spelling
      bestCount = count
    }
  }

  return best
}

export const findProject = (name: string, projects: readonly PromptProject[]) => {
  const key = projectKey(name)

  return key ? (projects.find((project) => project.key === key) ?? null) : null
}

/**
 * The spelling to save: an existing Project's own spelling when the input is the
 * same Project typed differently, otherwise the input as typed (trimmed).
 */
export const resolveProjectName = (name: string, projects: readonly PromptProject[]) => {
  return findProject(name, projects)?.label ?? name.trim()
}

/**
 * Projects for a picker, best first: exact, then prefix, then contains, then
 * in-order letters ("rmd" → render-md). With no input, every Project A–Z.
 */
export const suggestProjects = (
  input: string,
  projects: readonly PromptProject[],
  limit = 8,
): PromptProject[] => {
  const key = projectKey(input)

  if (!key) {
    return projects.slice(0, limit)
  }

  const rank = (project: PromptProject) => {
    if (project.key === key) {
      return 0
    }

    if (project.key.startsWith(key)) {
      return 1
    }

    if (project.key.includes(key)) {
      return 2
    }

    return isSubsequence(key, project.key) ? 3 : -1
  }

  return projects
    .map((project) => ({ project, rank: rank(project) }))
    .filter((entry) => entry.rank !== -1)
    .sort(
      (left, right) =>
        left.rank - right.rank || comparePromptLibraryText(left.project.label, right.project.label),
    )
    .slice(0, limit)
    .map((entry) => entry.project)
}

const isSubsequence = (needle: string, haystack: string) => {
  let index = 0

  for (const char of haystack) {
    if (char === needle[index]) {
      index += 1
    }

    if (index === needle.length) {
      return true
    }
  }

  return false
}

/**
 * A Project that is probably what was meant when the input matches none — a
 * typo or two away ("rendr-md", "promtprc"). Short inputs never guess.
 */
export const findNearProject = (input: string, projects: readonly PromptProject[]) => {
  const key = projectKey(input)

  if (key.length < 3 || findProject(input, projects)) {
    return null
  }

  const maxDistance = key.length <= 5 ? 1 : 2
  let best: PromptProject | null = null
  let bestDistance = maxDistance + 1

  for (const project of projects) {
    const distance = editDistance(key, project.key, maxDistance)

    if (distance < bestDistance) {
      best = project
      bestDistance = distance
    }
  }

  return best
}

/** Damerau-Levenshtein (an adjacent swap counts once), giving up past `limit`. */
const editDistance = (left: string, right: string, limit: number) => {
  if (Math.abs(left.length - right.length) > limit) {
    return limit + 1
  }

  // Three rolling rows: two back (for swaps), previous, and current.
  let twoBack: number[] = []
  let previous = Array.from({ length: right.length + 1 }, (_value, column) => column)

  for (let row = 1; row <= left.length; row += 1) {
    const current = [row]

    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1
      let distance = Math.min(
        (previous[column] ?? Infinity) + 1,
        (current[column - 1] ?? Infinity) + 1,
        (previous[column - 1] ?? Infinity) + cost,
      )

      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        distance = Math.min(distance, (twoBack[column - 2] ?? Infinity) + 1)
      }

      current.push(distance)
    }

    twoBack = previous
    previous = current
  }

  return previous[right.length] ?? limit + 1
}
