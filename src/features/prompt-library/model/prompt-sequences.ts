/**
 * A sequence keeps its steps inside the ordinary Prompt Body, separated by a
 * marker line. That keeps storage, search, sharing, and images identical for
 * every kind, and the body stays readable markdown (the marker is an HTML
 * comment, so any markdown renderer hides it).
 */
export const SEQUENCE_STEP_MARKER = '<!-- step -->'

const STEP_SPLIT_PATTERN = /^[ \t]*<!--\s*step\s*-->[ \t]*$/m

export const splitSequenceSteps = (body: string): string[] => {
  return body
    .split(new RegExp(STEP_SPLIT_PATTERN.source, 'gm'))
    .map((step) => step.trim())
    .filter(Boolean)
}

/** Joins steps back into a body. Empty steps are kept while editing. */
export const joinSequenceSteps = (steps: readonly string[]) => {
  return steps.map((step) => step.trim()).join(`\n\n${SEQUENCE_STEP_MARKER}\n\n`)
}

/** Text to paste into an AI tool when copying a whole sequence at once. */
export const formatSequenceForCopy = (steps: readonly string[]) => {
  if (steps.length <= 1) {
    return steps[0] ?? ''
  }

  return steps.map((step, index) => `Step ${index + 1}\n${step}`).join('\n\n')
}

export const stripSequenceMarkers = (body: string) => {
  return splitSequenceSteps(body).join('\n\n')
}

const EDITING_SEPARATOR = `\n\n${SEQUENCE_STEP_MARKER}\n\n`
const EDITING_SPLIT_PATTERN = /\n*^[ \t]*<!--\s*step\s*-->[ \t]*$\n*/m

/**
 * Editing keeps empty steps and the whitespace a person is in the middle of
 * typing; reading (splitSequenceSteps) trims and drops empties.
 */
export const splitSequenceStepsForEditing = (body: string): string[] => {
  return body.split(EDITING_SPLIT_PATTERN)
}

export const joinSequenceStepsForEditing = (steps: readonly string[]) => {
  return steps.join(EDITING_SEPARATOR)
}
