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
  const Icon = referenceIconForToken(token, isGitHub)
  const label = referenceLabel(token)

  return (
    <a
      aria-label={`${token.kind}: ${token.label}`}
      className={cn(
        'inline-flex max-w-full translate-y-[0.08em] items-center gap-1.5 rounded-[3px] align-baseline text-[1em] leading-none font-medium text-[#7eb6f2] no-underline decoration-transparent underline-offset-[3px] transition-colors hover:text-[#9fcbff] hover:decoration-[#9fcbff]/55 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-primary',
        (token.kind === 'plugin' || token.kind === 'app') &&
          !isGitHub &&
          'text-[#6f7890] hover:text-[#9fcbff]',
      )}
      href={token.href}
      title={`${token.rawLabel} -> ${token.href}`}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          'size-[0.92em] shrink-0',
          (token.kind === 'skill' || token.kind === 'file' || token.kind === 'directory') &&
            'text-[#7eb6f2]',
          (token.kind === 'plugin' || token.kind === 'app') && !isGitHub && 'text-current',
          isGitHub && 'text-current',
        )}
        strokeWidth={token.kind === 'skill' ? 2.2 : 2}
      />
      <span className="min-w-0 truncate">{label}</span>
    </a>
  )
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
