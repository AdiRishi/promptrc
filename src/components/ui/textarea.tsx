import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'field-sizing-content min-h-40 w-full rounded-[2px] border border-input bg-background px-3 py-3 text-[13px] leading-[1.6] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
