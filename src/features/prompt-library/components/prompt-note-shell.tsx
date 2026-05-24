import { type ComponentProps } from 'react'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function PromptNoteShell({ className, ...props }: ComponentProps<typeof Card>) {
  return <Card className={cn('gap-0', className)} {...props} />
}

function PromptNoteHeader({ className, ...props }: ComponentProps<typeof CardHeader>) {
  return (
    <CardHeader
      className={cn('grid-cols-[1fr_auto] border-b border-border bg-card/95 py-3', className)}
      {...props}
    />
  )
}

function PromptNoteHeaderItems({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function PromptNoteHeaderAside({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('truncate text-[11px] text-muted-foreground', className)} {...props} />
}

function PromptNoteContent({ className, ...props }: ComponentProps<typeof CardContent>) {
  return <CardContent className={cn('px-8 py-7', className)} {...props} />
}

function PromptNoteTitleRow({ children, className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('mb-[10px] flex min-w-0 items-baseline gap-2', className)} {...props}>
      <span aria-hidden="true" className="text-[26px] leading-[1.15] text-accent-foreground">
        &gt;
      </span>
      {children}
    </div>
  )
}

function PromptNoteTitle({ className, ...props }: ComponentProps<typeof CardTitle>) {
  return (
    <CardTitle
      className={cn(
        'min-w-0 flex-1 text-[26px] leading-[1.15] font-semibold tracking-normal',
        className,
      )}
      {...props}
    />
  )
}

function PromptNoteMetadata({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function PromptNoteBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'relative border-l-2 border-l-primary bg-background px-5 py-5 text-[14px] leading-[1.75]',
        className,
      )}
      {...props}
    />
  )
}

function PromptNoteBodyMarker({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'absolute -top-2 left-3 bg-card px-2 text-[10px] tracking-[0.2em] text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}

function PromptNoteBodyLabel({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn(
        'absolute -top-2 left-3 bg-card px-2 text-[10px] tracking-[0.2em] text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}

function PromptNoteFooter({ className, ...props }: ComponentProps<typeof CardFooter>) {
  return <CardFooter className={cn('flex flex-wrap gap-2 px-8 pb-7', className)} {...props} />
}

export {
  PromptNoteBody,
  PromptNoteBodyLabel,
  PromptNoteBodyMarker,
  PromptNoteContent,
  PromptNoteFooter,
  PromptNoteHeader,
  PromptNoteHeaderAside,
  PromptNoteHeaderItems,
  PromptNoteMetadata,
  PromptNoteShell,
  PromptNoteTitle,
  PromptNoteTitleRow,
}
