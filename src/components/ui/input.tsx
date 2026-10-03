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
        'h-9 w-full min-w-0 rounded-lg bg-paper-raised px-3 text-[13.5px] text-ink shadow-[inset_0_0_0_1px_var(--rule-strong)] transition-shadow outline-none placeholder:text-ink-faint focus-visible:shadow-[inset_0_0_0_1.5px_var(--vermilion)] disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:shadow-[inset_0_0_0_1.5px_var(--verdict-fail)]',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
