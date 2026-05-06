export type PromptMentionKind = 'app' | 'directory' | 'file' | 'plugin' | 'skill'

export type PromptMentionToken = {
  columnNumber?: number
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

  if (trimmedLabel.startsWith('$') && isSkillReference(href)) {
    return {
      href,
      kind: 'skill',
      label: humanizeMentionLabel(trimmedLabel.slice(1)),
      rawLabel,
      type: 'mention',
    }
  }

  if (trimmedLabel.startsWith('@') && href.startsWith('plugin://')) {
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
      label: humanizeMentionLabel(trimmedLabel.replace(/^@/, ''), href),
      rawLabel,
      type: 'mention',
    }
  }

  const fileReference = parseLocalFileReference(href)

  if (fileReference) {
    return {
      columnNumber: fileReference.columnNumber,
      href,
      kind: fileReference.kind,
      label: fileReferenceLabel(trimmedLabel, fileReference.label, fileReference.locationSuffix),
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
  const normalizedValue = value.trim() || referenceNameFromHref(href) || 'mention'
  const preferredName = preferredReferenceName(normalizedValue)

  if (preferredName) {
    return preferredName
  }

  const words = normalizedValue.replace(/[_-]+/g, ' ').split(/\s+/).filter(Boolean)

  return words.map(humanizeWord).join(' ')
}

const referenceNameFromHref = (href?: string) => {
  if (!href?.startsWith('plugin://')) {
    if (href?.startsWith('app://')) {
      return href.slice('app://'.length).split(/[/?#@]/)[0] || null
    }

    return null
  }

  return href.slice('plugin://'.length).split(/[/?#@]/)[0] || null
}

const parseLocalFileReference = (href: string) => {
  const localPath = localPathFromHref(href)

  if (!localPath) {
    return null
  }

  const location = parseFileLocation(localPath)
  const path = location.path.replace(/\/+$/, '') || location.path
  const label = path.split('/').filter(Boolean).at(-1) ?? path

  return {
    kind: hasFileExtension(label) ? ('file' as const) : ('directory' as const),
    label,
    ...location,
  }
}

const localPathFromHref = (href: string) => {
  if (href.startsWith('file://')) {
    return decodeURIComponent(href.slice('file://'.length))
  }

  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
    return href
  }

  return null
}

const parseFileLocation = (path: string) => {
  const match = path.match(/(?::|#L)(\d+)(?::(\d+))?$/)

  if (!match) {
    return { path }
  }

  return {
    columnNumber: match[2] ? Number(match[2]) : undefined,
    lineNumber: Number(match[1]),
    locationSuffix: match[0],
    path: path.slice(0, -match[0].length),
  }
}

const hasFileExtension = (value: string) => {
  return /\.[^./\s]+$/.test(value)
}

const fileReferenceLabel = (rawLabel: string, fallbackLabel: string, locationSuffix?: string) => {
  if (!rawLabel) {
    return fallbackLabel
  }

  const label =
    locationSuffix && rawLabel.endsWith(locationSuffix)
      ? rawLabel.slice(0, -locationSuffix.length)
      : rawLabel

  return label.replace(/\/+$/, '') || fallbackLabel
}

const preferredReferenceName = (value: string) => {
  const normalized = value.trim().replace(/^@/, '').toLowerCase()

  switch (normalized) {
    case 'browser-use':
    case 'browser':
      return 'Browser'
    case 'computer-use':
    case 'computer':
      return 'Computer'
    case 'figma':
      return 'Figma'
    case 'gmail':
      return 'Gmail'
    case 'github':
      return 'GitHub'
    case 'google-calendar':
      return 'Google Calendar'
    case 'google-drive':
      return 'Google Drive'
    case 'linear':
      return 'Linear'
    case 'notion':
      return 'Notion'
    case 'outlook-calendar':
      return 'Outlook Calendar'
    case 'outlook-email':
      return 'Outlook Email'
    case 'sharepoint':
      return 'SharePoint'
    case 'slack':
      return 'Slack'
    case 'teams':
      return 'Teams'
    default:
      return null
  }
}

const humanizeWord = (word: string) => {
  const lowerWord = word.toLowerCase()

  if (lowerWord === 'github') {
    return 'GitHub'
  }

  return `${lowerWord.slice(0, 1).toUpperCase()}${lowerWord.slice(1)}`
}
