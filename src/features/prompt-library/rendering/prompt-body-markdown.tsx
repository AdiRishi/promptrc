import { type ComponentProps, type ReactNode, isValidElement, memo, useMemo } from 'react'
import Markdown, { type Components, defaultUrlTransform } from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

import {
  defaultVersionedPromptImageUrlFor,
  promptImageIdFromSrc,
  shouldPreservePromptImageSrc,
} from '@/features/prompt-library/model/prompt-images'
import { PromptReferenceLink } from '@/features/prompt-library/rendering/prompt-reference-link'
import {
  createPromptReferenceToken,
  shouldPreservePromptReferenceHref,
} from '@/features/prompt-library/rendering/prompt-reference-tokens'
import { PromptVariableSlot } from '@/features/prompt-library/rendering/prompt-variable-slot'
import {
  PROMPT_VARIABLE_ELEMENT,
  remarkPromptVariables,
} from '@/features/prompt-library/rendering/remark-prompt-variables'
import { type PromptImage } from '@/features/prompt-library/types'
import { cn } from '@/lib/utils'

type PromptBodyMarkdownProps = {
  body: string
  className?: string
  images?: PromptImage[]
  imageUrlFor?: PromptImageUrlResolver
}

export type PromptImageUrlResolver = (imageId: string, image?: PromptImage) => string

const remarkPlugins = [remarkGfm, remarkBreaks, remarkPromptVariables]

export const PromptBodyMarkdown = memo(function PromptBodyMarkdownComponent({
  body,
  className,
  images = [],
  imageUrlFor = defaultVersionedPromptImageUrlFor,
}: PromptBodyMarkdownProps) {
  const imagesById = useMemo(() => new Map(images.map((image) => [image.id, image])), [images])
  const components = useMemo(
    () => createMarkdownComponents(imagesById, imageUrlFor),
    [imageUrlFor, imagesById],
  )

  return (
    <div className={cn('prompt-markdown text-body [overflow-wrap:anywhere] text-fg', className)}>
      <Markdown components={components} remarkPlugins={remarkPlugins} urlTransform={urlTransform}>
        {body}
      </Markdown>
    </div>
  )
})

export function PromptImageAttachments({
  images,
  imageUrlFor = defaultVersionedPromptImageUrlFor,
}: {
  images: PromptImage[]
  imageUrlFor?: PromptImageUrlResolver
}) {
  if (images.length === 0) {
    return null
  }

  return (
    <section aria-label="Prompt images" className="mt-6">
      <p className="mb-2 text-meta text-fg-faint">attachments/</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {images.map((image) => {
          const imageUrl = imageUrlFor(image.id, image)

          return (
            <a
              className="group grid grid-cols-[72px_minmax(0,1fr)] items-center gap-[1.5ch] border border-line bg-bg-sunken p-1.5 transition-colors hover:border-accent"
              href={imageUrl}
              key={image.id}
              rel="noreferrer"
              target="_blank"
            >
              <img
                alt=""
                className="h-14 w-[72px] bg-bg object-cover"
                loading="eager"
                src={imageUrl}
              />
              <span className="min-w-0">
                <span className="block truncate text-meta text-fg group-hover:text-accent">
                  {image.fileName}
                </span>
                <span className="block text-meta text-fg-faint">{formatImageSize(image.size)}</span>
              </span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

type PromptVariableElementProps = {
  name?: string
  fallback?: string
  children?: ReactNode
}

const createMarkdownComponents = (
  imagesById: Map<string, PromptImage>,
  imageUrlFor: PromptImageUrlResolver,
) => {
  const components = {
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
            'text-accent underline decoration-accent/40 underline-offset-[3px] transition-colors hover:decoration-accent',
            className,
          )}
          href={href}
          // An entry's body is its author's, and can be published: its links earn no credit here.
          rel={isExternal ? 'noreferrer nofollow ugc' : undefined}
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
            'my-4 border-l-2 border-line-strong pl-[2ch] text-fg-dim [&>p:first-child]:mt-0 [&>p:last-child]:mb-0',
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
      const code = textFromReactNode(children)
      const isBlock = className?.startsWith('language-') === true || code.includes('\n')

      if (isBlock) {
        return (
          <code className={cn('block min-w-max text-ui text-fg', className)} {...props}>
            {children}
          </code>
        )
      }

      return (
        <code className={cn('bg-bg-sunken px-[0.5ch] text-fg', className)} {...props}>
          {children}
        </code>
      )
    },
    del({ className, node: _node, ...props }) {
      return <del className={cn('text-fg-faint decoration-red/60', className)} {...props} />
    },
    em({ className, node: _node, ...props }) {
      return (
        <em
          className={cn("text-fg [font-variation-settings:'MONO'_1,'CASL'_1,'slnt'_-9]", className)}
          {...props}
        />
      )
    },
    h1({ className, node: _node, ...props }) {
      return <MarkdownHeading className={className} rank={1} {...props} />
    },
    h2({ className, node: _node, ...props }) {
      return <MarkdownHeading className={className} rank={2} {...props} />
    },
    h3({ className, node: _node, ...props }) {
      return <MarkdownHeading className={className} rank={3} {...props} />
    },
    h4({ className, node: _node, ...props }) {
      return <MarkdownHeading className={className} rank={4} {...props} />
    },
    h5({ className, node: _node, ...props }) {
      return <MarkdownHeading className={className} rank={5} {...props} />
    },
    h6({ className, node: _node, ...props }) {
      return <MarkdownHeading className={className} rank={6} {...props} />
    },
    hr({ className, node: _node, ...props }) {
      return <hr className={cn('my-6 h-0 border-0 border-t border-line', className)} {...props} />
    },
    img({ alt, className, node: _node, src, ...props }) {
      const imageId = promptImageIdFromSrc(src)

      if (imageId) {
        const image = imagesById.get(imageId)

        if (!image) {
          return (
            <span
              className={cn(
                'my-3 flex min-h-16 items-center gap-[1ch] border border-dashed border-line-strong px-[2ch] py-2 text-meta text-fg-faint',
                className,
              )}
              role="note"
            >
              image unavailable
            </span>
          )
        }

        const imageUrl = imageUrlFor(image.id, image)

        return (
          <span className={cn('my-6 block', className)}>
            <img
              {...props}
              alt={alt ?? image.fileName}
              className="max-h-[420px] max-w-full border border-line bg-bg-sunken object-contain"
              loading="eager"
              src={imageUrl}
            />
            <span className="mt-1 block text-meta text-fg-faint">{image.fileName}</span>
          </span>
        )
      }

      return (
        <img
          alt={alt ?? ''}
          className={cn(
            'my-6 max-h-[440px] max-w-full border border-line bg-bg-sunken object-contain',
            className,
          )}
          loading="lazy"
          src={src}
          {...props}
        />
      )
    },
    input({ checked, className, disabled, node: _node, type, ...props }) {
      if (type === 'checkbox') {
        return (
          <input
            aria-label={checked ? 'Done' : 'Not done'}
            checked={checked}
            className={cn(
              'mr-2 size-3.5 translate-y-[0.12em] accent-[var(--accent)] disabled:opacity-100',
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
            'pl-[1ch] marker:text-fg-faint',
            isTaskItem && 'list-none pl-0 has-[:checked]:text-fg-faint',
            className,
          )}
          {...props}
        />
      )
    },
    ol({ className, node: _node, ...props }) {
      return (
        <ol
          className={cn('my-3 list-decimal space-y-1 pl-[3ch] marker:text-fg-faint', className)}
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
          // Scrollable code needs to be reachable by keyboard.
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className={cn(
            'scrollbar-term my-4 overflow-x-auto border border-line bg-bg-sunken px-[2ch] py-3',
            className,
          )}
          {...props}
        />
      )
    },
    section({ className, node: _node, ...props }) {
      return (
        <section
          className={cn('mt-6 border-t border-line pt-3 text-meta text-fg-dim', className)}
          {...props}
        />
      )
    },
    strong({ className, node: _node, ...props }) {
      return <strong className={cn('font-semibold text-fg', className)} {...props} />
    },
    sup({ className, node: _node, ...props }) {
      return (
        <sup
          className={cn(
            'ml-0.5 text-[0.7em] leading-none text-accent [&_a]:no-underline',
            className,
          )}
          {...props}
        />
      )
    },
    table({ className, node: _node, ...props }) {
      return (
        <div className="scrollbar-term my-4 overflow-x-auto border border-line">
          <table
            className={cn('w-full min-w-[40ch] border-collapse text-left text-ui', className)}
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
            'border-t border-line px-[2ch] py-1.5 align-top text-fg [&[align=center]]:text-center [&[align=right]]:text-right',
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
            'px-[2ch] py-1.5 align-bottom text-meta font-normal text-fg-faint [&[align=center]]:text-center [&[align=right]]:text-right',
            className,
          )}
          {...props}
        />
      )
    },
    thead({ className, node: _node, ...props }) {
      return <thead className={cn('bg-bg-sunken', className)} {...props} />
    },
    tr({ className, node: _node, ...props }) {
      return <tr className={className} {...props} />
    },
    ul({ className, node: _node, ...props }) {
      return (
        <ul
          className={cn("my-3 list-['•_'] space-y-1 pl-[3ch] marker:text-fg-faint", className)}
          {...props}
        />
      )
    },
  } satisfies Components

  // `<prompt-variable>` comes from remarkPromptVariables; react-markdown's element
  // map isn't typed for custom tags, so it is attached separately.
  return {
    ...components,
    [PROMPT_VARIABLE_ELEMENT]: ({ name = '', fallback, children }: PromptVariableElementProps) => (
      <PromptVariableSlot
        fallback={fallback || undefined}
        name={name}
        raw={textFromReactNode(children)}
      />
    ),
  } as Components
}

type HeadingRank = 1 | 2 | 3 | 4 | 5 | 6

type MarkdownHeadingProps = ComponentProps<'h1'> & {
  rank: HeadingRank
}

function MarkdownHeading({ children, className, rank, ...props }: MarkdownHeadingProps) {
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
        'mt-6 mb-2 scroll-mt-4 text-fg first:mt-0',
        rank === 1 && 'text-head font-extrabold',
        rank === 2 && 'text-body font-extrabold',
        rank >= 3 && 'text-body font-semibold',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="mr-[1ch] text-[0.875rem] font-normal text-fg-faint">
        {'#'.repeat(rank)}
      </span>
      {children}
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
  if (key === 'src' && shouldPreservePromptImageSrc(url)) {
    return url
  }

  if (key === 'href' && shouldPreservePromptReferenceHref(url)) {
    return url
  }

  return defaultUrlTransform(url)
}

export function formatImageSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
