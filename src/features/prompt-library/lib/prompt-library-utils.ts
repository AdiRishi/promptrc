import { DEFAULT_PROMPT_CATEGORIES } from '@/features/prompt-library/lib/prompt-library-data'
import {
  type PromptDraft,
  type PromptRecord,
  type PromptSaveInput,
} from '@/features/prompt-library/types'

export const EMPTY_PROMPT_DRAFT: PromptDraft = {
  title: '',
  category: '',
  body: '',
  tagsInput: '',
}

export const parsePromptTags = (input: string): string[] => {
  return Array.from(
    new Set(
      input
        .split(/[,\s#]+/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
}

export const createPromptDraft = (prompt?: PromptRecord): PromptDraft => {
  if (!prompt) {
    return { ...EMPTY_PROMPT_DRAFT }
  }

  return {
    title: prompt.title,
    category: prompt.category,
    body: prompt.body,
    tagsInput: prompt.tags.map((tag) => `#${tag}`).join(' '),
  }
}

export const createPromptInput = (draft: PromptDraft): PromptSaveInput => {
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
    category: draft.category.trim(),
    tags: parsePromptTags(draft.tagsInput),
  }
}

export const filenameOf = (title: string) => {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'untitled'
  )
}

export const relativeTime = (iso: string) => {
  const then = new Date(iso).getTime()
  const diffSeconds = Math.floor((Date.now() - then) / 1000)

  if (diffSeconds < 60) return 'just now'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)}d ago`
  if (diffSeconds < 31536000) return `${Math.floor(diffSeconds / 2592000)}mo ago`

  return `${Math.floor(diffSeconds / 31536000)}y ago`
}

export const generatePromptId = () => {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const matchesPromptQuery = (prompt: PromptRecord, query: string) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [prompt.title, prompt.body, prompt.category, prompt.tags.join(' ')]
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
