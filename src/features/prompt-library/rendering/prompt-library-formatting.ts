import { stripSequenceMarkers } from '@/features/prompt-library/model/prompt-sequences'

export const relativeTime = (iso: string) => {
  const then = new Date(iso).getTime()
  const diffSeconds = Math.floor((Date.now() - then) / 1000)

  if (diffSeconds < 60) return 'just now'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)}d ago`
  if (diffSeconds < 31536000) return `${Math.floor(diffSeconds / 2592000)}mo ago`

  return `${Math.floor(diffSeconds / 31536000)}y ago`
}

const longDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** "12 Mar 2026" — unambiguous everywhere. */
export const formatLongDate = (iso: string) => longDateFormatter.format(new Date(iso))

/** Catalog numbers read like an archive's accession numbers: № 007. */
export const formatCatalogNumber = (catalogNumber: number | undefined) => {
  return catalogNumber ? `№ ${String(catalogNumber).padStart(3, '0')}` : '№ —'
}

/** A one-line, markdown-free preview of a Prompt Body. */
export const toPlainExcerpt = (body: string, maxLength = 180) => {
  const plain = stripSequenceMarkers(body)
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return plain.length > maxLength ? `${plain.slice(0, maxLength).trimEnd()}…` : plain
}

export const countWords = (text: string) => {
  return stripSequenceMarkers(text).split(/\s+/).filter(Boolean).length
}

/** Rough token estimate (≈4 characters per token for English prose). */
export const estimateTokens = (text: string) => {
  return Math.max(1, Math.round(stripSequenceMarkers(text).length / 4))
}

export const pluralize = (count: number, singular: string, plural = `${singular}s`) => {
  return `${count} ${count === 1 ? singular : plural}`
}
