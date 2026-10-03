import { type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type PaneProps = Omit<ComponentProps<'section'>, 'title'> & {
  /** Pane number shown as `[n]`; pressing that digit focuses the pane. */
  index?: number
  title: ReactNode
  /** Extra info set into the right side of the top border. */
  aside?: ReactNode
}

/**
 * A TUI pane: a rounded single-line frame with its title set into the border,
 * lazygit-style. The frame lights up while focus is inside it.
 */
export function Pane({ index, title, aside, className, children, ...props }: PaneProps) {
  return (
    <section
      className={cn('pane flex min-h-0 min-w-0 flex-col', className)}
      data-pane={index}
      {...props}
    >
      <div className="pane-title">
        {index ? <span className="text-fg-faint">[{index}]</span> : null}
        <span className="min-w-0 truncate">{title}</span>
      </div>
      {aside ? <div className="pane-title-right">{aside}</div> : null}
      {children}
    </section>
  )
}
