const promptLibrarySortCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

/** Natural, case-insensitive ordering for titles and names, stable on ties. */
export const comparePromptLibraryText = (left: string, right: string) => {
  const normalizedLeft = left.trim()
  const normalizedRight = right.trim()
  const result = promptLibrarySortCollator.compare(normalizedLeft, normalizedRight)

  return result === 0 ? normalizedLeft.localeCompare(normalizedRight) : result
}
