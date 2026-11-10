import { type ReactNode } from 'react'

type SectionLabelProps = {
  children: ReactNode
  /** Makes it the label of a field. */
  htmlFor?: string
  /** Sits after the rule, at the right edge. */
  aside?: ReactNode
}

/**
 * Names a part of an entry that promptrc adds around the author's words:
 * `why it works ┄┄┄┄`. The rule keeps it apart from a markdown heading.
 */
export function SectionLabel({ children, htmlFor, aside }: SectionLabelProps) {
  return (
    <div className="mb-2 flex items-center gap-[1ch] text-meta text-fg-faint">
      {htmlFor ? <label htmlFor={htmlFor}>{children}</label> : <p>{children}</p>}
      <span aria-hidden="true" className="h-0 flex-1 border-t border-dashed border-line" />
      {aside}
    </div>
  )
}
