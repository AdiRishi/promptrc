import { type ReactNode } from 'react'

import {
  defaultVersionedPromptImageUrlFor,
  promptImageIdFromSrc,
} from '@/features/prompt-library/model/prompt-images'
import { segmentPromptTemplate } from '@/features/prompt-library/model/prompt-templates'
import { type PromptImageUrlResolver } from '@/features/prompt-library/rendering/prompt-body-markdown'
import { PromptVariableSlot } from '@/features/prompt-library/rendering/prompt-variable-slot'
import { type PromptImage } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

type PromptSourceViewProps = {
  body: string
  images?: PromptImage[]
  imageUrlFor?: PromptImageUrlResolver
  /** First line number to show (sequences number each step's lines in place). */
  startLine?: number
  className?: string
}

const STEP_MARKER_PATTERN = /^[ \t]*<!--\s*step\s*-->[ \t]*$/
const IMAGE_LINE_PATTERN = /^\s*!\[[^\]]*]\(\s*(prompt-image:\/\/[A-Za-z0-9_-]+)[^)]*\)\s*$/
const INLINE_PATTERN =
  /(`[^`\n]+`)|(\{\{\s*[A-Za-z][\w.-]{0,47}\s*(?:\|[^}]*)?\}\})|(\*\*[^*\n]+\*\*)|(!?\[[^\]\n]*\]\([^)\n]*\))/g

/**
 * The raw Prompt Body, as `bat` would show it: line numbers in a gutter and
 * light markdown colouring — this is exactly the text that gets copied.
 * `{{variables}}` stay live fill-in fields.
 */
export function PromptSourceView({
  body,
  images = [],
  imageUrlFor = defaultVersionedPromptImageUrlFor,
  startLine = 1,
  className,
}: PromptSourceViewProps) {
  const imagesById = new Map(images.map((image) => [image.id, image]))
  const lines = body.split('\n')
  const gutterWidth = `${String(startLine + lines.length - 1).length + 1.5}ch`
  let inFence = false
  let step = 1
  const rows: ReactNode[] = []

  for (const [index, line] of lines.entries()) {
    const lineNumber = startLine + index
    const isFence = /^\s*```/.test(line)
    let content: ReactNode
    let tone = ''

    if (STEP_MARKER_PATTERN.test(line)) {
      step += 1
      content = <span className="text-green">{`── step ${step} ${'─'.repeat(24)}`}</span>
    } else if (isFence || inFence) {
      tone = isFence ? 'text-fg-faint' : 'text-green'
      content = line || ' '
    } else {
      const image = IMAGE_LINE_PATTERN.exec(line)
      const imageId = image ? promptImageIdFromSrc(image[1]) : null
      const attachment = imageId ? imagesById.get(imageId) : undefined

      content = (
        <>
          {highlightLine(line)}
          {attachment ? (
            <img
              alt={attachment.fileName}
              className="mt-1 mb-1 block max-h-48 rounded-sm border border-line bg-bg-sunken object-contain"
              loading="lazy"
              src={imageUrlFor(attachment.id, attachment)}
            />
          ) : null}
        </>
      )
    }

    if (isFence) {
      inFence = !inFence
    }

    rows.push(
      <div className="group/line flex hover:bg-bg-hover/60" key={lineNumber}>
        <span
          aria-hidden="true"
          className="shrink-0 border-r border-line pr-[1ch] text-right whitespace-nowrap text-fg-faint tabular-nums select-none group-hover/line:text-fg-dim"
          style={{ width: gutterWidth }}
        >
          {lineNumber}
        </span>
        <span className={cn('min-w-0 flex-1 pl-[1.5ch] whitespace-pre-wrap', tone)}>{content}</span>
      </div>,
    )
  }

  return (
    <div className={cn('text-[13px] leading-[1.65] [overflow-wrap:anywhere] text-fg', className)}>
      {rows}
    </div>
  )
}

function highlightLine(line: string): ReactNode {
  if (!line) {
    return ' '
  }

  const heading = /^(#{1,6})(\s.*)$/.exec(line)

  if (heading) {
    return (
      <span className="font-bold text-accent">
        <span className="text-fg-faint">{heading[1]}</span>
        {highlightInline(heading[2] ?? '')}
      </span>
    )
  }

  const quote = /^(\s*>)(.*)$/.exec(line)

  if (quote) {
    return (
      <span className="text-fg-dim">
        <span className="text-magenta">{quote[1]}</span>
        {highlightInline(quote[2] ?? '')}
      </span>
    )
  }

  const list = /^(\s*)([-*+]|\d+[.)])(\s(?:\[[ xX]\]\s)?)(.*)$/.exec(line)

  if (list) {
    return (
      <>
        {list[1]}
        <span className="text-yellow">{list[2]}</span>
        {list[3]}
        {highlightInline(list[4] ?? '')}
      </>
    )
  }

  if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
    return <span className="text-fg-faint">{line}</span>
  }

  return highlightInline(line)
}

function highlightInline(text: string): ReactNode {
  const parts: ReactNode[] = []
  let cursor = 0

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index

    if (index > cursor) {
      parts.push(text.slice(cursor, index))
    }

    const [token, code, variable, bold, link] = match

    if (code) {
      parts.push(
        <span className="text-cyan" key={index}>
          {code}
        </span>,
      )
    } else if (variable) {
      const segment = segmentPromptTemplate(variable)[0]

      parts.push(
        segment?.type === 'variable' ? (
          <PromptVariableSlot
            fallback={segment.fallback ?? undefined}
            key={index}
            name={segment.name}
            raw={variable}
          />
        ) : (
          variable
        ),
      )
    } else if (bold) {
      parts.push(
        <span className="font-bold" key={index}>
          {bold}
        </span>,
      )
    } else if (link) {
      parts.push(
        <span className="text-blue" key={index}>
          {link}
        </span>,
      )
    } else {
      parts.push(token)
    }

    cursor = index + token.length
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }

  return parts
}
