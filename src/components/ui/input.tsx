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
        'h-8 w-full min-w-0 rounded-sm border border-line bg-bg-sunken px-[1ch] font-mono text-[13px] text-fg transition-colors outline-none placeholder:text-fg-faint focus-visible:border-accent disabled:opacity-40 aria-invalid:border-red',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
