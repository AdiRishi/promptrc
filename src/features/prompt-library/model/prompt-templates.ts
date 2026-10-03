/**
 * Template variables let one Prompt Body cover many situations:
 *
 *   Review {{file}} for {{focus | correctness}}.
 *
 * `{{name}}` is a slot to fill before copying; `{{name | fallback}}` uses the
 * fallback when the slot is left empty. Unfilled slots without a fallback are
 * copied verbatim so nothing silently disappears.
 */
export type PromptVariable = {
  name: string
  fallback: string | null
}

const VARIABLE_PATTERN = /\{\{\s*([A-Za-z][\w.-]{0,47})\s*(?:\|\s*([^}]*?)\s*)?\}\}/g

export const extractPromptVariables = (body: string): PromptVariable[] => {
  const variables = new Map<string, PromptVariable>()

  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    const name = match[1]

    if (!name) {
      continue
    }

    const existing = variables.get(name)
    const fallback = match[2] ? match[2] : null

    if (!existing) {
      variables.set(name, { name, fallback })
    } else if (existing.fallback === null && fallback !== null) {
      existing.fallback = fallback
    }
  }

  return Array.from(variables.values())
}

export const hasPromptVariables = (body: string) => {
  VARIABLE_PATTERN.lastIndex = 0
  const hasMatch = VARIABLE_PATTERN.test(body)
  VARIABLE_PATTERN.lastIndex = 0

  return hasMatch
}

export const fillPromptVariables = (body: string, values: Readonly<Record<string, string>>) => {
  return body.replace(VARIABLE_PATTERN, (placeholder, name: string, fallback?: string) => {
    const value = values[name]?.trim()

    if (value) {
      return value
    }

    if (fallback) {
      return fallback
    }

    return placeholder
  })
}

export type PromptTemplateSegment =
  | { type: 'text'; text: string }
  | { type: 'variable'; name: string; fallback: string | null; raw: string }

/** Splits text into literal runs and variable slots, for highlighting. */
export const segmentPromptTemplate = (text: string): PromptTemplateSegment[] => {
  const segments: PromptTemplateSegment[] = []
  let cursor = 0

  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const index = match.index
    const name = match[1]

    if (!name) {
      continue
    }

    if (index > cursor) {
      segments.push({ type: 'text', text: text.slice(cursor, index) })
    }

    segments.push({ type: 'variable', name, fallback: match[2] ? match[2] : null, raw: match[0] })
    cursor = index + match[0].length
  }

  if (cursor < text.length) {
    segments.push({ type: 'text', text: text.slice(cursor) })
  }

  return segments
}
