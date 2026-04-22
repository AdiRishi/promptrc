'use client'

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      duration={1600}
      expand={false}
      position="bottom-center"
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'rgba(14, 15, 19, 0.96)',
          '--normal-text': 'var(--foreground)',
          '--normal-border': 'var(--primary)',
          '--border-radius': '6px',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            'cn-toast border border-primary/70 bg-card/95 px-[18px] py-[10px] font-sans text-[12px] text-primary shadow-[0_10px_30px_rgba(0,0,0,0.4),0_0_30px_rgba(255,180,84,0.15)] backdrop-blur-md',
          title:
            "text-center leading-[1.55] tracking-[0.04em] before:mr-1 before:text-accent-foreground before:content-['>']",
          icon: 'text-accent-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
