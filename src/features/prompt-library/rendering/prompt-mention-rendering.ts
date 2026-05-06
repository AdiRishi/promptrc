export type PromptMentionKind = 'app' | 'directory' | 'file' | 'plugin' | 'skill'

export type PromptMentionToken = {
  href: string
  kind: PromptMentionKind
  label: string
  lineNumber?: number
  rawLabel: string
  type: 'mention'
}

export type PromptBodyToken =
  | {
      text: string
      type: 'text'
    }
  | PromptMentionToken

const MARKDOWN_LINK_PATTERN = /\[([^\]\n]+)\]\(([^)\n]+)\)/g

export const parsePromptBodyMentions = (body: string): PromptBodyToken[] => {
  const tokens: PromptBodyToken[] = []
  let lastIndex = 0

  for (const match of body.matchAll(MARKDOWN_LINK_PATTERN)) {
    const matchIndex = match.index
    const fullMatch = match[0]
    const rawLabel = match[1]
    const href = match[2]

    if (matchIndex === undefined || !rawLabel || !href) {
      continue
    }

    const mention = createPromptMentionToken(rawLabel, href)

    if (!mention) {
      continue
    }

    if (matchIndex > lastIndex) {
      tokens.push({
        text: body.slice(lastIndex, matchIndex),
        type: 'text',
      })
    }

    tokens.push(mention)
    lastIndex = matchIndex + fullMatch.length
  }

  if (lastIndex < body.length) {
    tokens.push({
      text: body.slice(lastIndex),
      type: 'text',
    })
  }

  return tokens.length ? tokens : [{ text: body, type: 'text' }]
}

export const createPromptMentionToken = (
  rawLabel: string,
  href: string,
): PromptMentionToken | null => {
  const trimmedLabel = rawLabel.trim()

  if (rawLabel.startsWith('$') && isSkillReference(href)) {
    return {
      href,
      kind: 'skill',
      label: humanizeMentionLabel(trimmedLabel.slice(1)),
      rawLabel,
      type: 'mention',
    }
  }

  if (rawLabel.startsWith('@') && href.startsWith('plugin://')) {
    return {
      href,
      kind: 'plugin',
      label: humanizeMentionLabel(trimmedLabel.slice(1), href),
      rawLabel,
      type: 'mention',
    }
  }

  if (href.startsWith('app://')) {
    return {
      href,
      kind: 'app',
      label: humanizeMentionLabel(trimmedLabel, href),
      rawLabel,
      type: 'mention',
    }
  }

  const fileReference = parseLocalFileReference(href)

  if (fileReference) {
    return {
      href,
      kind: fileReference.kind,
      label: fileReferenceLabel(trimmedLabel, fileReference.label, fileReference.lineNumber),
      lineNumber: fileReference.lineNumber,
      rawLabel,
      type: 'mention',
    }
  }

  return null
}

const isSkillReference = (href: string) => {
  return href.endsWith('/SKILL.md') || href.includes('/skills/')
}

const humanizeMentionLabel = (value: string, href?: string) => {
  const normalizedValue = value.trim() || pluginNameFromHref(href) || 'mention'
  const words = normalizedValue.replace(/[_-]+/g, ' ').split(/\s+/).filter(Boolean)

  return words.map(humanizeWord).join(' ')
}

const pluginNameFromHref = (href?: string) => {
  if (!href?.startsWith('plugin://')) {
    if (href?.startsWith('app://')) {
      return href.slice('app://'.length).split('@')[0] || null
    }

    return null
  }

  return href.slice('plugin://'.length).split('@')[0] || null
}

const parseLocalFileReference = (href: string) => {
  if (!isLocalPath(href)) {
    return null
  }

  const lineMatch = href.match(/:(\d+)$/)
  const lineNumber = lineMatch ? Number(lineMatch[1]) : undefined
  const path = lineMatch ? href.slice(0, -lineMatch[0].length) : href
  const label = path.split('/').filter(Boolean).at(-1) ?? path

  return {
    kind: hasFileExtension(label) ? ('file' as const) : ('directory' as const),
    label,
    lineNumber,
  }
}

const isLocalPath = (href: string) => {
  return href.startsWith('/') || href.startsWith('./') || href.startsWith('../')
}

const hasFileExtension = (value: string) => {
  return /\.[^./\s]+$/.test(value)
}

const fileReferenceLabel = (rawLabel: string, fallbackLabel: string, lineNumber?: number) => {
  if (!rawLabel) {
    return fallbackLabel
  }

  return lineNumber ? rawLabel.replace(new RegExp(`:${lineNumber}$`), '') : rawLabel
}

const humanizeWord = (word: string) => {
  const lowerWord = word.toLowerCase()

  if (lowerWord === 'github') {
    return 'GitHub'
  }

  return `${lowerWord.slice(0, 1).toUpperCase()}${lowerWord.slice(1)}`
}
