import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[2px] border text-[12px] font-medium transition-colors outline-none select-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'border-primary bg-primary text-primary-foreground hover:border-[var(--primary-hover)] hover:bg-[var(--primary-hover)] focus-visible:border-primary',
        outline:
          'border-border bg-transparent text-foreground hover:border-primary hover:text-primary focus-visible:border-primary',
        secondary:
          'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground focus-visible:border-primary',
        ghost:
          'border-transparent bg-transparent text-muted-foreground hover:text-primary focus-visible:border-primary',
        destructive:
          'border-destructive bg-destructive/12 text-destructive hover:bg-destructive/20 focus-visible:border-destructive',
        link: 'border-transparent px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: 'h-7 gap-1.5 px-2.5 text-[11px]',
        sm: 'h-9 gap-2 px-3.5',
        lg: 'h-11 gap-2 px-5 text-[13px]',
        icon: 'size-10',
        'icon-xs': 'size-7',
        'icon-sm': 'size-9',
        'icon-lg': 'size-11',
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
