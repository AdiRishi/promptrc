import { PROMPT_KIND_DEFINITIONS } from '@/features/prompt-library/model/prompt-kinds'
import { type PromptKind } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

/**
 * Each kind is marked with a printer's sign rather than an icon — the library
 * reads like a well-kept book, not a dashboard.
 */
export const KIND_GLYPHS: Record<PromptKind, string> = {
  prompt: '¶',
  fragment: '“',
  sequence: '§',
  benchmark: '※',
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
  /** Visually hidden label for assistive tech. Defaults to the kind's name. */
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
        'inline-block font-serif leading-none font-medium not-italic',
        KIND_TEXT_CLASS[kind],
        className,
      )}
      role={accessibleLabel ? 'img' : undefined}
    >
      {KIND_GLYPHS[kind]}
    </span>
  )
}

/** Small pill: mark + kind name, used in metadata rows. */
export function KindBadge({ kind, className }: { kind: PromptKind; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full pr-2.5 pl-2 font-mono text-[10.5px] font-medium tracking-[0.12em] uppercase',
        'bg-[color-mix(in_oklab,currentColor_10%,transparent)]',
        KIND_TEXT_CLASS[kind],
        className,
      )}
    >
      <KindMark className="text-[14px]" kind={kind} label={false} />
      {PROMPT_KIND_DEFINITIONS[kind].label}
    </span>
  )
}
