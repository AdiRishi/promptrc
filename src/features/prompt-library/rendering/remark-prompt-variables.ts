import { segmentPromptTemplate } from '@/features/prompt-library/model/prompt-templates'

type MdastNode = {
  type: string
  value?: string
  children?: MdastNode[]
  data?: {
    hName?: string
    hProperties?: Record<string, string>
  }
}

/** Element name the markdown renderer maps to a fill-in slot. */
export const PROMPT_VARIABLE_ELEMENT = 'prompt-variable'

const SKIPPED_PARENTS = new Set(['code', 'inlineCode', 'link', 'linkReference', 'html'])

const splitTextNode = (node: MdastNode): MdastNode[] => {
  const segments = segmentPromptTemplate(node.value ?? '')

  if (!segments.some((segment) => segment.type === 'variable')) {
    return [node]
  }

  return segments.map((segment) =>
    segment.type === 'text'
      ? { type: 'text', value: segment.text }
      : {
          type: 'promptVariable',
          data: {
            hName: PROMPT_VARIABLE_ELEMENT,
            hProperties: {
              name: segment.name,
              fallback: segment.fallback ?? '',
            },
          },
          children: [{ type: 'text', value: segment.raw }],
        },
  )
}

const transform = (node: MdastNode) => {
  if (!node.children || SKIPPED_PARENTS.has(node.type)) {
    return
  }

  node.children = node.children.flatMap((child) => {
    if (child.type === 'text') {
      return splitTextNode(child)
    }

    transform(child)
    return [child]
  })
}

/**
 * Turns `{{name}}` / `{{name | fallback}}` in prose into `<prompt-variable>`
 * elements so the reader can render them as inline fill-in blanks. Code spans
 * and code blocks are left verbatim.
 */
export function remarkPromptVariables() {
  return (tree: MdastNode) => {
    transform(tree)
  }
}
