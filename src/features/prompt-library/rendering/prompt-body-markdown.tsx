import { ImageIcon } from 'lucide-react'
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
    <div
      className={cn(
        'prompt-markdown font-reading text-[17px] leading-[1.72] [overflow-wrap:anywhere] text-ink-soft',
        className,
      )}
    >
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
    <section aria-label="Prompt images" className="mt-10">
      <div className="label-caps mb-3 flex items-center gap-2">
        <ImageIcon aria-hidden="true" className="size-3.5" />
        Plates
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {images.map((image) => {
          const imageUrl = imageUrlFor(image.id, image)

          return (
            <a
              className="group grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-xl bg-paper-raised p-2 shadow-[inset_0_0_0_1px_var(--rule)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--rule-strong)]"
              href={imageUrl}
              key={image.id}
              rel="noreferrer"
              target="_blank"
            >
              <img
                alt=""
                className="h-14 w-[72px] rounded-lg bg-paper-sunken object-cover"
                loading="eager"
                src={imageUrl}
              />
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-ink group-hover:text-vermilion">
                  {image.fileName}
                </span>
                <span className="block font-mono text-[11px] text-ink-muted">
                  {formatImageSize(image.size)}
                </span>
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
            'text-ink underline decoration-vermilion/45 decoration-[1.5px] underline-offset-[3px] transition-colors hover:text-vermilion hover:decoration-vermilion',
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
            'my-6 border-l-[3px] border-vermilion/70 pl-5 text-ink-muted italic [&>p:first-child]:mt-0 [&>p:last-child]:mb-0',
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
          <code
            className={cn('block min-w-max font-mono text-[13px] leading-[1.7]', className)}
            {...props}
          >
            {children}
          </code>
        )
      }

      return (
        <code
          className={cn(
            'rounded-[5px] bg-paper-sunken px-[0.35em] py-[0.08em] font-mono text-[0.82em] text-ink shadow-[inset_0_0_0_1px_var(--rule)]',
            className,
          )}
          {...props}
        >
          {children}
        </code>
      )
    },
    del({ className, node: _node, ...props }) {
      return <del className={cn('text-ink-faint decoration-vermilion/60', className)} {...props} />
    },
    em({ className, node: _node, ...props }) {
      return <em className={cn('italic', className)} {...props} />
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
      return (
        <hr
          className={cn(
            'mx-auto my-8 h-auto w-16 border-0 text-center text-ink-faint after:content-["⁂"]',
            className,
          )}
          {...props}
        />
      )
    },
    img({ alt, className, node: _node, src, ...props }) {
      const imageId = promptImageIdFromSrc(src)

      if (imageId) {
        const image = imagesById.get(imageId)

        if (!image) {
          return (
            <span
              className={cn(
                'my-5 flex min-h-24 items-center gap-3 rounded-xl bg-paper-sunken px-4 py-3 font-sans text-[13px] text-ink-muted shadow-[inset_0_0_0_1px_var(--rule)]',
                className,
              )}
              role="note"
            >
              <ImageIcon aria-hidden="true" className="size-4" />
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
              className="max-h-[440px] max-w-full rounded-xl bg-paper-sunken object-contain shadow-card"
              loading="eager"
              src={imageUrl}
            />
            <span className="mt-2 block font-mono text-[11px] text-ink-muted">
              {image.fileName}
            </span>
          </span>
        )
      }

      return (
        <img
          alt={alt ?? ''}
          className={cn(
            'my-6 max-h-[440px] max-w-full rounded-xl bg-paper-sunken object-contain shadow-card',
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
              'mr-2 size-3.5 translate-y-[0.12em] accent-vermilion disabled:opacity-100',
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
            'pl-1.5 marker:text-ink-faint',
            isTaskItem && 'list-none pl-0 has-[:checked]:text-ink-faint',
            className,
          )}
          {...props}
        />
      )
    },
    ol({ className, node: _node, ...props }) {
      return (
        <ol
          className={cn(
            'my-4 list-decimal space-y-1.5 pl-6 marker:font-mono marker:text-[0.8em] marker:text-vermilion',
            className,
          )}
          {...props}
        />
      )
    },
    p({ className, node: _node, ...props }) {
      return <p className={cn('my-4 first:mt-0 last:mb-0', className)} {...props} />
    },
    pre({ className, node: _node, ...props }) {
      return (
        <pre
          // Scrollable code needs to be reachable by keyboard.
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className={cn(
            'scrollbar-quiet my-6 overflow-x-auto rounded-xl bg-paper-sunken px-5 py-4 text-ink shadow-[inset_0_0_0_1px_var(--rule)]',
            className,
          )}
          {...props}
        />
      )
    },
    section({ className, node: _node, ...props }) {
      return (
        <section
          className={cn(
            'mt-8 border-t border-rule pt-4 font-sans text-[13px] text-ink-muted',
            className,
          )}
          {...props}
        />
      )
    },
    strong({ className, node: _node, ...props }) {
      return <strong className={cn('font-semibold text-ink', className)} {...props} />
    },
    sup({ className, node: _node, ...props }) {
      return (
        <sup
          className={cn(
            'ml-0.5 font-mono text-[0.65em] leading-none text-vermilion [&_a]:no-underline',
            className,
          )}
          {...props}
        />
      )
    },
    table({ className, node: _node, ...props }) {
      return (
        <div className="scrollbar-quiet my-6 overflow-x-auto rounded-xl shadow-[inset_0_0_0_1px_var(--rule)]">
          <table
            className={cn(
              'w-full min-w-[520px] border-collapse text-left font-sans text-[13px]',
              className,
            )}
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
            'border-t border-rule px-3.5 py-2.5 align-top text-ink-soft [&[align=center]]:text-center [&[align=right]]:text-right',
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
            'label-caps px-3.5 py-2.5 align-bottom [&[align=center]]:text-center [&[align=right]]:text-right',
            className,
          )}
          {...props}
        />
      )
    },
    thead({ className, node: _node, ...props }) {
      return <thead className={cn('bg-paper-sunken/70', className)} {...props} />
    },
    tr({ className, node: _node, ...props }) {
      return <tr className={className} {...props} />
    },
    ul({ className, node: _node, ...props }) {
      return (
        <ul
          className={cn('my-4 list-[square] space-y-1.5 pl-6 marker:text-vermilion/70', className)}
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
        'mt-8 mb-3 scroll-mt-4 text-ink first:mt-0',
        rank === 1 && 'font-display text-[26px] leading-tight',
        rank === 2 && 'font-display text-[22px] leading-snug',
        rank === 3 && 'font-display text-[19px] leading-snug italic',
        rank >= 4 && 'label-caps text-ink',
        className,
      )}
      {...props}
    >
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
