import { useCallback, useEffect, useMemo, useState } from 'react'

import { DEFAULT_CATEGORIES, type Prompt, SEED_PROMPTS } from './data'

const STORAGE_KEY = 'promptlib.prompts.v1'

type DraftInput = {
  title: string
  body: string
  category: string
  tags: string[]
}

const loadFromStorage = (): Prompt[] | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed as Prompt[]
  } catch {
    return null
  }
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>(() => loadFromStorage() ?? SEED_PROMPTS)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts))
    } catch {
      // storage full / disabled — ignore
    }
  }, [prompts])

  const add = useCallback((draft: DraftInput): Prompt => {
    const now = new Date().toISOString()
    const created: Prompt = {
      id: newId(),
      title: draft.title.trim(),
      body: draft.body.trim(),
      category: draft.category.trim() || 'Personal',
      tags: draft.tags,
      createdAt: now,
      updatedAt: now,
      uses: 0,
    }
    setPrompts((ps) => [created, ...ps])
    return created
  }, [])

  const update = useCallback((id: string, draft: DraftInput) => {
    setPrompts((ps) =>
      ps.map((p) =>
        p.id === id
          ? {
              ...p,
              title: draft.title.trim(),
              body: draft.body.trim(),
              category: draft.category.trim() || p.category,
              tags: draft.tags,
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    )
  }, [])

  const remove = useCallback((id: string) => {
    setPrompts((ps) => ps.filter((p) => p.id !== id))
  }, [])

  const duplicate = useCallback(
    (id: string): Prompt | null => {
      const src = prompts.find((p) => p.id === id)
      if (!src) return null
      const now = new Date().toISOString()
      const copy: Prompt = {
        ...src,
        id: newId(),
        title: `${src.title} (copy)`,
        createdAt: now,
        updatedAt: now,
        uses: 0,
      }
      setPrompts((ps) => [copy, ...ps])
      return copy
    },
    [prompts],
  )

  const incrementUses = useCallback((id: string) => {
    setPrompts((ps) => ps.map((p) => (p.id === id ? { ...p, uses: p.uses + 1 } : p)))
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES)
    for (const p of prompts) set.add(p.category)
    return Array.from(set)
  }, [prompts])

  return {
    prompts,
    categories,
    add,
    update,
    remove,
    duplicate,
    incrementUses,
  }
}

// --- utilities ---

export const parseTags = (input: string): string[] => {
  return Array.from(
    new Set(
      input
        .split(/[,\s#]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
}

export const excerpt = (body: string, max = 120): string => {
  const clean = body.trim().replace(/\s+/g, ' ')
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut) + '…'
}

export const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime()
  const diffSec = Math.floor((Date.now() - then) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}d ago`
  if (diffSec < 31536000) return `${Math.floor(diffSec / 2592000)}mo ago`
  return `${Math.floor(diffSec / 31536000)}y ago`
}

export const filenameOf = (title: string): string =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'untitled'

export type PromptDraft = DraftInput
