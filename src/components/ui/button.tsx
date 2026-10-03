import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { type VariantProps, cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-px disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-vermilion text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.18)] hover:bg-vermilion-ink',
        ink: 'bg-ink text-paper shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-ink-soft',
        outline:
          'bg-paper-raised text-ink shadow-[inset_0_0_0_1px_var(--rule-strong)] hover:bg-paper-sunken',
        ghost: 'text-ink-muted hover:bg-ink/[0.06] hover:text-ink',
        destructive:
          'bg-verdict-fail/10 text-verdict-fail shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--verdict-fail)_40%,transparent)] hover:bg-verdict-fail/15',
        link: 'px-0 text-vermilion underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 gap-2 px-3.5 text-[13px]',
        xs: 'h-7 gap-1.5 rounded-md px-2 text-[12px]',
        sm: 'h-8 gap-1.5 px-3 text-[12.5px]',
        lg: 'h-11 gap-2 px-5 text-[14px]',
        icon: 'size-9',
        'icon-xs': 'size-7 rounded-md',
        'icon-sm': 'size-8',
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
