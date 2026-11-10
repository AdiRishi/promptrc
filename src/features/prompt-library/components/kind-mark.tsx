import { PROMPT_KIND_DEFINITIONS } from '@/features/prompt-library/model/prompt-kinds'
import { type PromptKind } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

/**
 * Each kind gets a glyph, the way `ls --color` marks file types: ❯ a prompt
 * you run, “ a fragment you quote, » a sequence you step through, ◆ a benchmark
 * you test against. Prompts are the default and stay neutral; the others carry
 * an ANSI colour.
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

/**
 * The glyphs come from two fonts and sit at different heights and weights.
 * These nudges give them one optical size and centre them on the x-height;
 * the quote mark hangs at cap height by nature, so it is enlarged and lowered.
 */
const KIND_OPTICAL_CLASS: Record<PromptKind, string> = {
  prompt: 'font-bold',
  fragment: 'translate-y-[0.3em] scale-[1.55] font-extrabold',
  sequence: 'scale-110 font-bold',
  benchmark: 'scale-90',
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
      className={cn('inline-block w-[2ch] shrink-0 text-center', KIND_TEXT_CLASS[kind], className)}
      role={accessibleLabel ? 'img' : undefined}
    >
      <span className={cn('inline-block', KIND_OPTICAL_CLASS[kind])}>{KIND_GLYPHS[kind]}</span>
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
      <KindMark className="w-[1ch]" kind={kind} label={false} />
      {kind}
    </span>
  )
}
