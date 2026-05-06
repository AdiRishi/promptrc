export type PromptReferenceKind = 'app' | 'directory' | 'file' | 'plugin' | 'skill'

export type PromptReferenceToken = {
  columnNumber?: number
  href: string
  kind: PromptReferenceKind
  label: string
  lineNumber?: number
  rawLabel: string
  type: 'reference'
}

const WINDOWS_DRIVE_PATH_PATTERN = /^[A-Za-z]:[\\/]/

const preferredReferenceNames = {
  browser: 'Browser',
  'browser-use': 'Browser',
  computer: 'Computer',
  'computer-use': 'Computer',
  figma: 'Figma',
  gmail: 'Gmail',
  github: 'GitHub',
  'google-calendar': 'Google Calendar',
  'google-drive': 'Google Drive',
  linear: 'Linear',
  notion: 'Notion',
  'outlook-calendar': 'Outlook Calendar',
  'outlook-email': 'Outlook Email',
  sharepoint: 'SharePoint',
  slack: 'Slack',
  teams: 'Teams',
} as const

export const createPromptReferenceToken = (
  rawLabel: string,
  href: string,
): PromptReferenceToken | null => {
  const trimmedLabel = rawLabel.trim()

  return (
    createSkillReferenceToken(trimmedLabel, rawLabel, href) ??
    createPluginReferenceToken(trimmedLabel, rawLabel, href) ??
    createAppReferenceToken(trimmedLabel, rawLabel, href) ??
    createLocalPathReferenceToken(trimmedLabel, rawLabel, href)
  )
}

export const shouldPreservePromptReferenceHref = (href: string) => {
  return (
    href.startsWith('app://') ||
    href.startsWith('file://') ||
    href.startsWith('plugin://') ||
    isWindowsDrivePath(href)
  )
}

const createSkillReferenceToken = (trimmedLabel: string, rawLabel: string, href: string) => {
  if (!trimmedLabel.startsWith('$') || !isSkillReference(href)) {
    return null
  }

  return referenceToken({
    href,
    kind: 'skill',
    label: humanizeReferenceLabel(trimmedLabel.slice(1)),
    rawLabel,
  })
}

const createPluginReferenceToken = (trimmedLabel: string, rawLabel: string, href: string) => {
  if (!trimmedLabel.startsWith('@') || !href.startsWith('plugin://')) {
    return null
  }

  return referenceToken({
    href,
    kind: 'plugin',
    label: humanizeReferenceLabel(trimmedLabel.slice(1), href),
    rawLabel,
  })
}

const createAppReferenceToken = (trimmedLabel: string, rawLabel: string, href: string) => {
  if (!href.startsWith('app://')) {
    return null
  }

  return referenceToken({
    href,
    kind: 'app',
    label: humanizeReferenceLabel(trimmedLabel.replace(/^@/, ''), href),
    rawLabel,
  })
}

const createLocalPathReferenceToken = (trimmedLabel: string, rawLabel: string, href: string) => {
  const fileReference = parseLocalFileReference(href)

  if (!fileReference) {
    return null
  }

  return referenceToken({
    columnNumber: fileReference.columnNumber,
    href,
    kind: fileReference.kind,
    label: fileReferenceLabel(trimmedLabel, fileReference.label, fileReference.locationSuffix),
    lineNumber: fileReference.lineNumber,
    rawLabel,
  })
}

const referenceToken = ({
  columnNumber,
  href,
  kind,
  label,
  lineNumber,
  rawLabel,
}: Omit<PromptReferenceToken, 'type'>): PromptReferenceToken => {
  return {
    href,
    kind,
    label,
    rawLabel,
    type: 'reference',
    ...(lineNumber ? { lineNumber } : {}),
    ...(columnNumber ? { columnNumber } : {}),
  }
}

const isSkillReference = (href: string) => {
  const normalizedHref = href.replaceAll('\\', '/')

  return normalizedHref.endsWith('/SKILL.md') || normalizedHref.includes('/skills/')
}

const humanizeReferenceLabel = (value: string, href?: string) => {
  const normalizedValue = value.trim() || referenceNameFromHref(href) || 'reference'
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
  const path = location.path.replace(/[\\/]+$/, '') || location.path
  const label = path.split(/[\\/]/).filter(Boolean).at(-1) ?? path

  return {
    kind: hasFileExtension(label) ? ('file' as const) : ('directory' as const),
    label,
    ...location,
  }
}

const localPathFromHref = (href: string) => {
  if (href.startsWith('file://')) {
    return safeDecodeURIComponent(href.slice('file://'.length))
  }

  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
    return href
  }

  if (isWindowsDrivePath(href)) {
    return href
  }

  return null
}

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
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

  return label.replace(/[\\/]+$/, '') || fallbackLabel
}

const preferredReferenceName = (value: string) => {
  const normalized = value.trim().replace(/^@/, '').toLowerCase()

  return preferredReferenceNames[normalized as keyof typeof preferredReferenceNames] ?? null
}

const humanizeWord = (word: string) => {
  const lowerWord = word.toLowerCase()

  if (lowerWord === 'github') {
    return 'GitHub'
  }

  return `${lowerWord.slice(0, 1).toUpperCase()}${lowerWord.slice(1)}`
}

const isWindowsDrivePath = (href: string) => {
  return WINDOWS_DRIVE_PATH_PATTERN.test(href)
}
