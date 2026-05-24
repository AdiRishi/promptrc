import { useEffect, useRef } from 'react'

const textNodeType = 3
const elementNodeType = 1
const markdownStartAttribute = 'data-markdown-source-start'
const markdownEndAttribute = 'data-markdown-source-end'
const markdownTextAttribute = 'data-markdown-source-text'
const markdownExpansionTags = new Set(['a', 'code', 'del', 'em', 'span', 'strong'])

type MarkdownCopyPoint = {
  offset?: number
}

type MarkdownCopyPosition = {
  end?: MarkdownCopyPoint
  start?: MarkdownCopyPoint
}

type MarkdownCopyNode = {
  children?: MarkdownCopyNode[]
  position?: MarkdownCopyPosition
  properties?: Record<string, unknown>
  tagName?: string
  type: string
  value?: string
}

type MarkdownSourceRange = {
  end: number
  start: number
}

type SelectionEdge = 'start' | 'end'

export function rehypeMarkdownCopySource() {
  return (tree: MarkdownCopyNode) => {
    annotateMarkdownCopySource(tree)
  }
}

export function useSelectedMarkdownCopy<TElement extends HTMLElement>(markdown: string) {
  const markdownRef = useRef<TElement>(null)

  useEffect(() => {
    const markdownElement = markdownRef.current

    if (!markdownElement) {
      return
    }

    const ownerDocument = markdownElement.ownerDocument

    const copySelectedMarkdown = (event: ClipboardEvent) => {
      const selectedMarkdown = getSelectedMarkdown(markdown, markdownElement)

      if (event.defaultPrevented || !event.clipboardData) {
        return
      }

      if (!selectedMarkdown) {
        return
      }

      event.preventDefault()
      event.clipboardData.setData('text/plain', selectedMarkdown)
    }

    ownerDocument.addEventListener('copy', copySelectedMarkdown)

    return () => {
      ownerDocument.removeEventListener('copy', copySelectedMarkdown)
    }
  }, [markdown])

  return markdownRef
}

function annotateMarkdownCopySource(node: MarkdownCopyNode) {
  if (node.type === 'element') {
    node.properties = {
      ...node.properties,
      ...sourceRangeProperties(node),
    }
  }

  if (!node.children) {
    return
  }

  node.children = node.children.flatMap((child) => {
    if (child.type === 'text' && child.value && sourceRangeFromNode(child)) {
      return [createMarkdownTextSpan(child)]
    }

    annotateMarkdownCopySource(child)
    return [child]
  })
}

function createMarkdownTextSpan(textNode: MarkdownCopyNode): MarkdownCopyNode {
  return {
    children: [textNode],
    position: textNode.position,
    properties: {
      className: ['contents'],
      [markdownTextAttribute]: 'true',
      ...sourceRangeProperties(textNode),
    },
    tagName: 'span',
    type: 'element',
  }
}

function sourceRangeProperties(node: MarkdownCopyNode) {
  const sourceRange = sourceRangeFromNode(node)

  if (!sourceRange) {
    return {}
  }

  return {
    [markdownEndAttribute]: String(sourceRange.end),
    [markdownStartAttribute]: String(sourceRange.start),
  }
}

function getSelectedMarkdown(markdown: string, markdownElement: HTMLElement) {
  const selection = markdownElement.ownerDocument.getSelection()

  if (!selection || selection.isCollapsed || !selection.toString()) {
    return null
  }

  const fragments: string[] = []

  for (let index = 0; index < selection.rangeCount; index += 1) {
    const range = selection.getRangeAt(index)

    if (!rangeIntersectsNode(range, markdownElement)) {
      continue
    }

    const sourceRange = getSelectedMarkdownSourceRange(markdown, markdownElement, range)

    if (sourceRange) {
      fragments.push(markdown.slice(sourceRange.start, sourceRange.end))
    }
  }

  return fragments.length > 0 ? fragments.join('\n\n') : null
}

function getSelectedMarkdownSourceRange(
  markdown: string,
  markdownElement: HTMLElement,
  range: Range,
): MarkdownSourceRange | null {
  const start = getMarkdownBoundaryOffset(
    markdown,
    markdownElement,
    range.startContainer,
    range.startOffset,
    'start',
  )
  const end = getMarkdownBoundaryOffset(
    markdown,
    markdownElement,
    range.endContainer,
    range.endOffset,
    'end',
  )

  if (start === null || end === null) {
    return null
  }

  const selectedRange = normalizeSourceRange(start, end)
  const expandedRange = expandToFullySelectedMarkdownElement(
    markdownElement,
    range,
    range.startContainer,
    selectedRange,
  )

  return expandedRange ?? selectedRange
}

function getMarkdownBoundaryOffset(
  markdown: string,
  root: HTMLElement,
  container: Node,
  offset: number,
  edge: SelectionEdge,
) {
  if (!root.contains(container)) {
    return edge === 'start' ? firstMarkdownOffset(root) : lastMarkdownOffset(root)
  }

  if (container.nodeType === textNodeType) {
    return getTextMarkdownOffset(markdown, root, container, offset, edge)
  }

  if (container === root && isElementBoundaryOffset(container, offset, edge)) {
    return edge === 'start' ? firstMarkdownOffset(root) : lastMarkdownOffset(root)
  }

  if (container.nodeType === elementNodeType) {
    const containerRange = sourceRangeFromElement(container as HTMLElement)

    if (containerRange && isElementBoundaryOffset(container, offset, edge)) {
      return edge === 'start' ? containerRange.start : containerRange.end
    }
  }

  const boundaryNode = getBoundaryNode(container, offset, edge)
  const sourceElement = closestMarkdownElement(
    root,
    boundaryNode,
    `[${markdownStartAttribute}][${markdownEndAttribute}]`,
  )
  const sourceRange = sourceElement ? sourceRangeFromElement(sourceElement) : null

  if (!sourceRange) {
    return null
  }

  return edge === 'start' ? sourceRange.start : sourceRange.end
}

function getTextMarkdownOffset(
  markdown: string,
  root: HTMLElement,
  container: Node,
  offset: number,
  edge: SelectionEdge,
) {
  const textElement = closestMarkdownElement(root, container, `[${markdownTextAttribute}]`)
  const textRange = textElement ? sourceRangeFromElement(textElement) : null

  if (!textElement || !textRange) {
    return null
  }

  const textOffset = visibleTextOffsetWithin(textElement, container, offset)
  const visibleText = visibleTextWithin(textElement)
  const sourceText = markdown.slice(textRange.start, textRange.end)

  return (
    textRange.start + markdownOffsetFromVisibleTextOffset(sourceText, visibleText, textOffset, edge)
  )
}

function expandToFullySelectedMarkdownElement(
  root: HTMLElement,
  range: Range,
  startContainer: Node,
  selectedRange: MarkdownSourceRange,
) {
  let element = elementFromNode(startContainer)
  let expandedRange: MarkdownSourceRange | null = null

  while (element && element !== root) {
    const sourceRange = sourceRangeFromElement(element)

    if (
      sourceRange &&
      sourceRange.start <= selectedRange.start &&
      sourceRange.end >= selectedRange.end &&
      !element.hasAttribute(markdownTextAttribute) &&
      shouldExpandSelectedMarkdownElement(element) &&
      isElementVisiblySelected(element, range)
    ) {
      expandedRange = sourceRange
    }

    element = element.parentElement
  }

  return expandedRange
}

function shouldExpandSelectedMarkdownElement(element: HTMLElement) {
  return markdownExpansionTags.has(element.tagName.toLowerCase())
}

function getBoundaryNode(container: Node, offset: number, edge: SelectionEdge) {
  if (container.nodeType === elementNodeType) {
    const childIndex = edge === 'start' ? offset : offset - 1

    return container.childNodes[childIndex] ?? container
  }

  return container
}

function closestMarkdownElement(root: HTMLElement, node: Node, selector: string) {
  let element = elementFromNode(node)

  while (element && element !== root) {
    if (element.matches(selector)) {
      return element
    }

    element = element.parentElement
  }

  return null
}

function elementFromNode(node: Node) {
  if (node.nodeType === elementNodeType) {
    return node as HTMLElement
  }

  return node.parentElement
}

function isElementBoundaryOffset(container: Node, offset: number, edge: SelectionEdge) {
  return edge === 'start' ? offset === 0 : offset === container.childNodes.length
}

function isElementVisiblySelected(element: HTMLElement, range: Range) {
  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
    return false
  }

  const startOffset = visibleTextOffsetWithin(element, range.startContainer, range.startOffset)
  const endOffset = visibleTextOffsetWithin(element, range.endContainer, range.endOffset)

  return startOffset === 0 && endOffset === visibleTextWithin(element).length
}

function visibleTextOffsetWithin(element: HTMLElement, container: Node, offset: number) {
  const range = element.ownerDocument.createRange()
  range.selectNodeContents(element)
  range.setEnd(container, offset)

  const textOffset = range.toString().length
  range.detach()

  return textOffset
}

function visibleTextWithin(element: HTMLElement) {
  const range = element.ownerDocument.createRange()
  range.selectNodeContents(element)

  const text = range.toString()
  range.detach()

  return text
}

function markdownOffsetFromVisibleTextOffset(
  sourceText: string,
  visibleText: string,
  textOffset: number,
  edge: SelectionEdge,
) {
  if (sourceText.length === visibleText.length) {
    return clamp(textOffset, 0, sourceText.length)
  }

  if (textOffset <= 0) {
    return 0
  }

  if (textOffset >= visibleText.length) {
    return sourceText.length
  }

  const visibleTextStart = sourceText.indexOf(visibleText)

  if (visibleTextStart >= 0) {
    return clamp(visibleTextStart + textOffset, 0, sourceText.length)
  }

  return edge === 'start'
    ? clamp(textOffset, 0, sourceText.length)
    : clamp(sourceText.length - (visibleText.length - textOffset), 0, sourceText.length)
}

function sourceRangeFromNode(node: MarkdownCopyNode): MarkdownSourceRange | null {
  const start = node.position?.start?.offset
  const end = node.position?.end?.offset

  if (typeof start !== 'number' || typeof end !== 'number') {
    return null
  }

  return { end, start }
}

function sourceRangeFromElement(element: HTMLElement): MarkdownSourceRange | null {
  const start = Number(element.getAttribute(markdownStartAttribute))
  const end = Number(element.getAttribute(markdownEndAttribute))

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null
  }

  return { end, start }
}

function firstMarkdownOffset(root: HTMLElement) {
  const element = root.querySelector<HTMLElement>(`[${markdownStartAttribute}]`)

  return element ? (sourceRangeFromElement(element)?.start ?? null) : null
}

function lastMarkdownOffset(root: HTMLElement) {
  const elements = root.querySelectorAll<HTMLElement>(`[${markdownEndAttribute}]`)
  const element = elements.item(elements.length - 1)

  return element ? (sourceRangeFromElement(element)?.end ?? null) : null
}

function normalizeSourceRange(start: number, end: number): MarkdownSourceRange {
  return {
    end: Math.max(start, end),
    start: Math.min(start, end),
  }
}

function rangeIntersectsNode(range: Range, node: Node) {
  try {
    return range.intersectsNode(node)
  } catch {
    return node.contains(range.commonAncestorContainer)
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
