import { useState } from 'react'

const STORAGE_KEY = 'promptrc.blanks.v1'
const MAX_REMEMBERED_PROMPTS = 50

type RememberedValues = Record<string, Record<string, string>>

const readRemembered = (): RememberedValues => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}

    return parsed && typeof parsed === 'object' ? (parsed as RememberedValues) : {}
  } catch {
    return {}
  }
}

const writeRemembered = (promptId: string, values: Record<string, string>) => {
  try {
    const remembered = readRemembered()
    const hasValues = Object.values(values).some((value) => value.trim())

    delete remembered[promptId]

    if (hasValues) {
      remembered[promptId] = values
    }

    const trimmed = Object.fromEntries(
      Object.entries(remembered).slice(-MAX_REMEMBERED_PROMPTS + 1),
    )

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(hasValues ? { ...trimmed, [promptId]: values } : trimmed),
    )
  } catch {
    // Remembering blanks is a convenience; failing to store them is harmless.
  }
}

/**
 * Values typed into a Prompt's fill-in blanks. They are remembered per Prompt on
 * this device, so the next copy starts where the last one left off.
 */
export function usePromptVariableValues(promptId: string | null) {
  const [state, setState] = useState<{ promptId: string | null; values: Record<string, string> }>(
    () => ({ promptId: null, values: {} }),
  )

  // Derive during render when the Prompt changes (no effect, no flash of stale values).
  let current = state

  if (state.promptId !== promptId) {
    current = { promptId, values: promptId ? (readRemembered()[promptId] ?? {}) : {} }
    setState(current)
  }

  const setValue = (name: string, value: string) => {
    if (!promptId) {
      return
    }

    setState((previous) => {
      const values = { ...previous.values, [name]: value }

      writeRemembered(promptId, values)

      return { promptId, values }
    })
  }

  const reset = () => {
    if (!promptId) {
      return
    }

    writeRemembered(promptId, {})
    setState({ promptId, values: {} })
  }

  return { values: current.values, setValue, reset }
}
