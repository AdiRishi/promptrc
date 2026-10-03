import {
  Box,
  Braces,
  FileCode2,
  FileText,
  Folder,
  Globe,
  Monitor,
  Plug,
  Terminal,
} from 'lucide-react'
import { type CSSProperties, createElement } from 'react'
import { FaGithub, FaReact } from 'react-icons/fa'
import { SiJavascript, SiTypescript } from 'react-icons/si'

import { type PromptReferenceToken } from '@/features/prompt-library/rendering/prompt-reference-tokens'
import { cn } from '@/lib/utils'

const appReferenceIconRules = [
  { Icon: Globe, labelIncludes: 'browser' },
  { Icon: Monitor, labelIncludes: 'computer' },
] as const

const fileIconByExtension = {
  js: SiJavascript,
  jsx: FaReact,
  json: Braces,
  jsonc: Braces,
  md: FileText,
  mdx: FileText,
  ts: SiTypescript,
  tsx: FaReact,
  txt: FileText,
} as const

const shellFileExtensions = new Set(['bash', 'fish', 'ps1', 'sh', 'zsh'])

export function PromptReferenceLink({ token }: { token: PromptReferenceToken }) {
  const isGitHub = token.label.toLowerCase() === 'github'
  const label = referenceLabel(token)
  const isIntegration = (token.kind === 'plugin' || token.kind === 'app') && !isGitHub
  const referenceStyle = token.visual?.textColor
    ? ({ color: token.visual.textColor } satisfies CSSProperties)
    : undefined

  return (
    <span
      aria-label={`${token.kind}: ${token.label}`}
      className={cn(
        'mx-[0.08em] inline-flex max-w-full translate-y-[-0.06em] cursor-default items-center gap-1.5 rounded-sm border border-line bg-bg-sunken px-[0.75ch] py-[0.18em] align-middle text-[0.85em] leading-none text-cyan',
        isIntegration && 'text-fg-dim',
        token.visual?.textColor && 'text-current',
      )}
      style={referenceStyle}
    >
      {token.visual?.iconSrc ? (
        <span
          aria-hidden="true"
          className="inline-grid size-[1.15em] shrink-0 place-items-center overflow-hidden rounded-[3px] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]"
        >
          <img
            alt=""
            className="size-[0.95em] object-contain"
            decoding="async"
            loading="lazy"
            src={token.visual.iconSrc}
          />
        </span>
      ) : (
        <ReferenceIcon isGitHub={isGitHub} token={token} />
      )}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}

function ReferenceIcon({ token, isGitHub }: { token: PromptReferenceToken; isGitHub: boolean }) {
  return createElement(referenceIconForToken(token, isGitHub), {
    'aria-hidden': true,
    className: cn(
      'size-[1em] shrink-0',
      (token.kind === 'skill' || token.kind === 'file' || token.kind === 'directory') &&
        'text-kind-fragment',
    ),
    strokeWidth: token.kind === 'skill' ? 2.2 : 2,
  })
}

function referenceIconForToken(token: PromptReferenceToken, isGitHub: boolean) {
  if (isGitHub) {
    return FaGithub
  }

  if (token.kind === 'app' || token.kind === 'plugin') {
    const matchingRule = appReferenceIconRules.find((rule) =>
      token.label.toLowerCase().includes(rule.labelIncludes),
    )

    if (matchingRule) {
      return matchingRule.Icon
    }
  }

  switch (token.kind) {
    case 'app':
    case 'plugin':
      return Plug
    case 'directory':
      return Folder
    case 'file':
      return fileIconForLabel(token.label)
    case 'skill':
      return Box
  }
}

function fileIconForLabel(label: string) {
  const extension = label.split('.').at(-1)?.toLowerCase()

  if (!extension) {
    return FileCode2
  }

  if (shellFileExtensions.has(extension)) {
    return Terminal
  }

  return fileIconByExtension[extension as keyof typeof fileIconByExtension] ?? FileCode2
}

function referenceLabel(token: PromptReferenceToken) {
  if (!token.lineNumber) {
    return token.label
  }

  if (token.columnNumber) {
    return `${token.label} (line ${token.lineNumber}, column ${token.columnNumber})`
  }

  return `${token.label} (line ${token.lineNumber})`
}
