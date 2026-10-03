import { useSyncExternalStore } from 'react'

/**
 * Vim-style messages: the latest one is printed in the command-line row at the
 * bottom of the screen and fades after a moment. Replaces floating toasts.
 */
export type EchoTone = 'info' | 'ok' | 'error'

export type EchoMessage = {
  id: number
  text: string
  tone: EchoTone
}

const ERROR_PATTERN =
  /couldn’t|couldn't|failed|unavailable|too large|isn’t supported|invalid|not found/i
const ECHO_DURATION_MS = 4500

let current: EchoMessage | null = null
let nextId = 1
let clearTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((listener) => listener())

export const echo = (text: string, tone?: EchoTone) => {
  current = { id: nextId++, text, tone: tone ?? (ERROR_PATTERN.test(text) ? 'error' : 'info') }
  emit()

  if (clearTimer) {
    clearTimeout(clearTimer)
  }

  const shownId = current.id

  clearTimer = setTimeout(() => {
    if (current?.id === shownId) {
      current = null
      emit()
    }
  }, ECHO_DURATION_MS)
}

export const clearEcho = () => {
  current = null
  emit()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function useEcho() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  )
}
