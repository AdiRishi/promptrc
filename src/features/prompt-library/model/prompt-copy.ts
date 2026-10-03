import {
  formatSequenceForCopy,
  splitSequenceSteps,
} from '@/features/prompt-library/model/prompt-sequences'
import { fillPromptVariables } from '@/features/prompt-library/model/prompt-templates'
import { type PromptRecord } from '@/features/prompt-library/types'

type PromptCopyOptions = {
  /** Values for `{{variables}}`; unfilled slots fall back or stay verbatim. */
  values?: Readonly<Record<string, string>>
  /** Copy a single sequence step (0-based) instead of the whole Prompt Body. */
  stepIndex?: number
}

/** The exact text a Prompt Use puts on the clipboard. */
export const getPromptCopyText = (
  prompt: Pick<PromptRecord, 'body' | 'kind'>,
  options: PromptCopyOptions = {},
) => {
  const values = options.values ?? {}

  if (prompt.kind !== 'sequence') {
    return fillPromptVariables(prompt.body, values)
  }

  const steps = splitSequenceSteps(prompt.body).map((step) => fillPromptVariables(step, values))

  if (options.stepIndex !== undefined) {
    return steps[options.stepIndex] ?? ''
  }

  return formatSequenceForCopy(steps)
}
