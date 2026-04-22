import { Input as InputPrimitive } from '@base-ui/react/input'
import * as React from 'react'

import { cn } from '@/lib/utils'

type InputProps = React.ComponentProps<'input'> & InputPrimitive.Props

function Input({ className, type, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-[2px] border border-input bg-background px-3 py-2 text-[13px] text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
