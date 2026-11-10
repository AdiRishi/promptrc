import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/** Terminal buttons: square cells. Solid accent is for the one action that commits. */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-[1ch] font-mono whitespace-nowrap transition-colors outline-none select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: 'bg-accent font-semibold text-accent-fg hover:brightness-110',
        outline: 'border border-line-strong text-fg hover:border-accent hover:text-accent',
        ghost: 'text-fg-dim hover:bg-bg-hover hover:text-fg',
        destructive: 'border border-red/60 text-red hover:bg-red hover:text-bg',
        link: 'px-0 text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-[1.5ch] text-ui',
        xs: 'h-6 px-[1ch] text-meta',
        sm: 'h-7 px-[1.25ch] text-ui',
        lg: 'h-9 px-[2ch] text-ui',
        icon: 'size-8',
        'icon-xs': 'size-6',
        'icon-sm': 'size-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
