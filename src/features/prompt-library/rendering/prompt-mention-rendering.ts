export type PromptMentionKind = 'skill' | 'plugin'

export type PromptBodyToken =
  | {
      text: string
      type: 'text'
    }
  | {
      href: string
      kind: PromptMentionKind
      label: string
      rawLabel: string
      type: 'mention'
    }

const CODEX_MENTION_LINK_PATTERN = /\[([@$][^\]\n]+)\]\(([^)\n]+)\)/g

export const parsePromptBodyMentions = (body: string): PromptBodyToken[] => {
  const tokens: PromptBodyToken[] = []
  let lastIndex = 0

  for (const match of body.matchAll(CODEX_MENTION_LINK_PATTERN)) {
    const matchIndex = match.index
    const fullMatch = match[0]
    const rawLabel = match[1]
    const href = match[2]

    if (matchIndex === undefined || !rawLabel || !href) {
      continue
    }

    const mention = createMentionToken(rawLabel, href)

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

const createMentionToken = (rawLabel: string, href: string): PromptBodyToken | null => {
  if (rawLabel.startsWith('$') && isSkillReference(href)) {
    return {
      href,
      kind: 'skill',
      label: humanizeMentionLabel(rawLabel.slice(1)),
      rawLabel,
      type: 'mention',
    }
  }

  if (rawLabel.startsWith('@') && href.startsWith('plugin://')) {
    return {
      href,
      kind: 'plugin',
      label: humanizeMentionLabel(rawLabel.slice(1), href),
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
    return null
  }

  return href.slice('plugin://'.length).split('@')[0] || null
}

const humanizeWord = (word: string) => {
  const lowerWord = word.toLowerCase()

  if (lowerWord === 'github') {
    return 'GitHub'
  }

  return `${lowerWord.slice(0, 1).toUpperCase()}${lowerWord.slice(1)}`
}
