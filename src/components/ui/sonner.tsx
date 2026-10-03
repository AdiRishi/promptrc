import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTheme } from '@/lib/theme'

const Toaster = (props: ToasterProps) => {
  const { resolved } = useTheme()

  return (
    <Sonner
      duration={2200}
      expand={false}
      gap={8}
      position="bottom-center"
      theme={resolved}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-xl bg-ink px-4 py-3 text-[13px] text-paper shadow-float [&_[data-icon]]:text-vermilion',
          title: 'leading-snug font-medium',
          description: 'text-paper/70',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
