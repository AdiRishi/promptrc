import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function TerminalChromeBar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'relative z-10 flex min-h-[42px] items-center gap-[10px] border-b border-border bg-muted px-4 py-[8px]',
        className,
      )}
      {...props}
    />
  )
}

function TerminalTrafficLights({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div aria-hidden="true" className={cn('flex items-center gap-1.5', className)} {...props}>
      <span className="size-2.5 rounded-full bg-[rgb(255,95,87)]" />
      <span className="size-2.5 rounded-full bg-[rgb(255,189,46)]" />
      <span className="size-2.5 rounded-full bg-[rgb(40,200,64)]" />
    </div>
  )
}

function TerminalCommandFrame({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('border border-border bg-card px-4 py-3 text-[12px]', className)}
      {...props}
    />
  )
}

export { TerminalChromeBar, TerminalCommandFrame, TerminalTrafficLights }
