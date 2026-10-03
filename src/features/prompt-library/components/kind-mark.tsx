import { PROMPT_KIND_DEFINITIONS } from '@/features/prompt-library/model/prompt-kinds'
import { type PromptKind } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

/**
 * Each kind gets a glyph and an ANSI colour, the way `ls --color` marks file
 * types: ❯ a prompt you run, “ a fragment you quote, » a sequence you step
 * through, ◆ a benchmark you test against.
 */
export const KIND_GLYPHS: Record<PromptKind, string> = {
  prompt: '❯',
  fragment: '“',
  sequence: '»',
  benchmark: '◆',
}

export const KIND_TEXT_CLASS: Record<PromptKind, string> = {
  prompt: 'text-kind-prompt',
  fragment: 'text-kind-fragment',
  sequence: 'text-kind-sequence',
  benchmark: 'text-kind-benchmark',
}

export const KIND_BG_CLASS: Record<PromptKind, string> = {
  prompt: 'bg-kind-prompt',
  fragment: 'bg-kind-fragment',
  sequence: 'bg-kind-sequence',
  benchmark: 'bg-kind-benchmark',
}

type KindMarkProps = {
  kind: PromptKind
  className?: string
  /** Accessible label. Defaults to the kind's name; `false` hides it from assistive tech. */
  label?: string | false
}

export function KindMark({ kind, className, label }: KindMarkProps) {
  const accessibleLabel =
    label === false ? undefined : (label ?? PROMPT_KIND_DEFINITIONS[kind].label)

  return (
    <span
      aria-hidden={accessibleLabel ? undefined : true}
      aria-label={accessibleLabel}
      className={cn(
        'inline-block w-[1ch] text-center leading-none',
        KIND_TEXT_CLASS[kind],
        className,
      )}
      role={accessibleLabel ? 'img' : undefined}
    >
      {KIND_GLYPHS[kind]}
    </span>
  )
}

/** `❯ prompt` in the kind's colour — used in headers and status lines. */
export function KindTag({ kind, className }: { kind: PromptKind; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[1ch] whitespace-nowrap',
        KIND_TEXT_CLASS[kind],
        className,
      )}
    >
      <KindMark kind={kind} label={false} />
      {kind}
    </span>
  )
}
