import { type ComponentProps, type ReactNode, isValidElement, memo } from 'react'
import Markdown, { type Components, defaultUrlTransform } from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

import { PromptReferenceLink } from '@/features/prompt-library/rendering/prompt-reference-link'
import {
  createPromptReferenceToken,
  shouldPreservePromptReferenceHref,
} from '@/features/prompt-library/rendering/prompt-reference-tokens'
import { cn } from '@/lib/utils'

type PromptBodyMarkdownProps = {
  body: string
}

const remarkPlugins = [remarkGfm, remarkBreaks]

export const PromptBodyMarkdown = memo(function PromptBodyMarkdownComponent({
  body,
}: PromptBodyMarkdownProps) {
  return (
    <div className="prompt-markdown text-[14px] leading-[1.75] text-foreground">
      <Markdown
        components={markdownComponents}
        remarkPlugins={remarkPlugins}
        urlTransform={urlTransform}
      >
        {body}
      </Markdown>
    </div>
  )
})

const markdownComponents = {
  a({ children, className, href, node: _node, ...props }) {
    const rawLabel = textFromReactNode(children).trim()
    const reference = href ? createPromptReferenceToken(rawLabel, href) : null

    if (reference) {
      return <PromptReferenceLink token={reference} />
    }

    const isExternal = Boolean(href && /^https?:\/\//i.test(href))

    return (
      <a
        className={cn(
          'rounded-[2px] text-[#7eb6f2] underline decoration-[#7eb6f2]/40 underline-offset-[3px] transition-colors hover:text-[#9fcbff] hover:decoration-[#9fcbff]/60 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-primary',
          className,
        )}
        href={href}
        rel={isExternal ? 'noreferrer' : undefined}
        target={isExternal ? '_blank' : undefined}
        {...props}
      >
        {children}
      </a>
    )
  },
  blockquote({ className, node: _node, ...props }) {
    return (
      <blockquote
        className={cn(
          'my-5 border-l-2 border-accent-foreground bg-accent/55 px-4 py-3 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [&>p:first-child]:mt-0 [&>p:last-child]:mb-0',
          className,
        )}
        {...props}
      />
    )
  },
  br({ node: _node, ...props }) {
    return <br {...props} />
  },
  code({ children, className, node: _node, ...props }) {
    const code = String(children)
    const isBlock = Boolean(className?.startsWith('language-') || code.includes('\n'))

    if (isBlock) {
      return (
        <code
          className={cn('block min-w-max text-[12px] leading-[1.7] whitespace-pre', className)}
          {...props}
        >
          {children}
        </code>
      )
    }

    return (
      <code
        className={cn(
          'rounded-[3px] border border-border bg-muted px-1.5 py-[0.08rem] text-[0.9em] text-accent-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </code>
    )
  },
  del({ className, node: _node, ...props }) {
    return (
      <del
        className={cn('text-muted-foreground decoration-destructive/70', className)}
        {...props}
      />
    )
  },
  em({ className, node: _node, ...props }) {
    return <em className={cn('text-foreground/95 italic', className)} {...props} />
  },
  h1({ className, node: _node, ...props }) {
    return <MarkdownHeading className={className} marker="#" rank={1} {...props} />
  },
  h2({ className, node: _node, ...props }) {
    return <MarkdownHeading className={className} marker="##" rank={2} {...props} />
  },
  h3({ className, node: _node, ...props }) {
    return <MarkdownHeading className={className} marker="###" rank={3} {...props} />
  },
  h4({ className, node: _node, ...props }) {
    return <MarkdownHeading className={className} marker="####" rank={4} {...props} />
  },
  h5({ className, node: _node, ...props }) {
    return <MarkdownHeading className={className} marker="#####" rank={5} {...props} />
  },
  h6({ className, node: _node, ...props }) {
    return <MarkdownHeading className={className} marker="######" rank={6} {...props} />
  },
  hr({ className, node: _node, ...props }) {
    return (
      <hr
        className={cn(
          'my-7 h-px border-0 bg-gradient-to-r from-transparent via-border to-transparent',
          className,
        )}
        {...props}
      />
    )
  },
  img({ alt, className, node: _node, ...props }) {
    return (
      <img
        alt={alt ?? ''}
        className={cn(
          'my-4 max-h-[420px] max-w-full border border-border bg-muted object-contain shadow-[0_12px_32px_rgba(0,0,0,0.28)]',
          className,
        )}
        loading="lazy"
        {...props}
      />
    )
  },
  input({ checked, className, disabled, node: _node, type, ...props }) {
    if (type === 'checkbox') {
      return (
        <input
          checked={checked}
          className={cn(
            'mr-2 size-3.5 translate-y-[0.18em] rounded-[2px] border border-border bg-background accent-primary disabled:opacity-90',
            className,
          )}
          disabled={disabled ?? true}
          readOnly
          type="checkbox"
          {...props}
        />
      )
    }

    return <input className={className} disabled={disabled} type={type} {...props} />
  },
  li({ className, node: _node, ...props }) {
    const isTaskItem = className?.split(/\s+/).includes('task-list-item') ?? false

    return (
      <li
        className={cn(
          'pl-1 marker:font-semibold marker:text-accent-foreground',
          isTaskItem && 'list-none pl-0 has-[:checked]:text-muted-foreground',
          className,
        )}
        {...props}
      />
    )
  },
  ol({ className, node: _node, ...props }) {
    return (
      <ol
        className={cn('my-4 list-decimal space-y-1.5 pl-5 marker:text-primary', className)}
        {...props}
      />
    )
  },
  p({ className, node: _node, ...props }) {
    return <p className={cn('my-3 first:mt-0 last:mb-0', className)} {...props} />
  },
  pre({ className, node: _node, ...props }) {
    return (
      <pre
        className={cn(
          'my-5 overflow-x-auto border border-border bg-muted/80 px-4 py-4 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] focus-visible:outline-1 focus-visible:outline-primary',
          className,
        )}
        tabIndex={0}
        {...props}
      />
    )
  },
  section({ className, node: _node, ...props }) {
    return (
      <section
        className={cn(
          'mt-7 border-t border-dashed border-border pt-4 text-[12px] text-muted-foreground',
          className,
        )}
        {...props}
      />
    )
  },
  strong({ className, node: _node, ...props }) {
    return <strong className={cn('font-semibold text-foreground', className)} {...props} />
  },
  sup({ className, node: _node, ...props }) {
    return (
      <sup
        className={cn(
          'ml-0.5 text-[0.72em] leading-none text-primary [&_a]:no-underline',
          className,
        )}
        {...props}
      />
    )
  },
  table({ className, node: _node, ...props }) {
    return (
      <div className="my-5 overflow-x-auto border border-border bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <table
          className={cn('w-full min-w-[520px] border-collapse text-left text-[12px]', className)}
          {...props}
        />
      </div>
    )
  },
  tbody({ className, node: _node, ...props }) {
    return <tbody className={className} {...props} />
  },
  td({ className, node: _node, ...props }) {
    return (
      <td
        className={cn(
          'border-t border-border px-3 py-2 align-top text-foreground/90 [&[align=center]]:text-center [&[align=right]]:text-right',
          className,
        )}
        {...props}
      />
    )
  },
  th({ className, node: _node, ...props }) {
    return (
      <th
        className={cn(
          'border-b border-border bg-card px-3 py-2 align-bottom text-[11px] font-semibold tracking-[0.08em] text-primary uppercase [&[align=center]]:text-center [&[align=right]]:text-right',
          className,
        )}
        {...props}
      />
    )
  },
  thead({ className, node: _node, ...props }) {
    return <thead className={className} {...props} />
  },
  tr({ className, node: _node, ...props }) {
    return <tr className={cn('odd:bg-card/30', className)} {...props} />
  },
  ul({ className, node: _node, ...props }) {
    return (
      <ul
        className={cn('my-4 list-disc space-y-1.5 pl-5 marker:text-accent-foreground', className)}
        {...props}
      />
    )
  },
} satisfies Components

type HeadingRank = 1 | 2 | 3 | 4 | 5 | 6

type MarkdownHeadingProps = ComponentProps<'h1'> & {
  marker: string
  rank: HeadingRank
}

function MarkdownHeading({ children, className, marker, rank, ...props }: MarkdownHeadingProps) {
  const Heading = `h${rank}` as const

  if (className?.split(/\s+/).includes('sr-only')) {
    return (
      <Heading className={className} {...props}>
        {children}
      </Heading>
    )
  }

  return (
    <Heading
      className={cn(
        'mt-6 mb-3 flex scroll-mt-4 items-baseline gap-2 font-semibold tracking-normal first:mt-0',
        rank === 1 && 'text-[18px] leading-[1.35] text-primary',
        rank === 2 && 'text-[16px] leading-[1.4] text-foreground',
        rank === 3 && 'text-[14px] leading-[1.45] text-accent-foreground',
        rank >= 4 && 'text-[13px] leading-[1.45] text-secondary-foreground',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="shrink-0 text-[0.8em] text-muted-foreground">
        {marker}
      </span>
      <span>{children}</span>
    </Heading>
  )
}

function textFromReactNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(textFromReactNode).join('')
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textFromReactNode(node.props.children)
  }

  return ''
}

function urlTransform(url: string, key: string) {
  if (key === 'href' && shouldPreservePromptReferenceHref(url)) {
    return url
  }

  return defaultUrlTransform(url)
}
