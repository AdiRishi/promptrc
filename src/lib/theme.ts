import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'promptrc.theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Runs inline in <head> before first paint so the page never flashes the wrong
 * theme. Kept dependency-free and tiny on purpose.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='dark'||((!p||p==='system')&&matchMedia('${DARK_QUERY}').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=p||'system'}catch(e){}})()`

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

const readPreference = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)

    return isThemePreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

const resolve = (preference: ThemePreference): ResolvedTheme => {
  if (preference !== 'system') {
    return preference
  }

  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

const listeners = new Set<() => void>()

const apply = (preference: ThemePreference) => {
  const root = document.documentElement
  const resolved = resolve(preference)

  root.classList.toggle('dark', resolved === 'dark')
  root.dataset.theme = preference
}

export const setThemePreference = (preference: ThemePreference) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this visit.
  }

  apply(preference)
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)

  const media = window.matchMedia(DARK_QUERY)
  const onSystemChange = () => {
    if (readPreference() === 'system') {
      apply('system')
      listener()
    }
  }

  media.addEventListener('change', onSystemChange)

  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', onSystemChange)
  }
}

const getSnapshot = () => {
  const preference = readPreference()

  return `${preference}:${resolve(preference)}`
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => 'system:light')
  const [preference, resolved] = snapshot.split(':') as [ThemePreference, ResolvedTheme]

  return {
    preference,
    resolved,
    setPreference: setThemePreference,
    /** Cycles light → dark → system. */
    cycle: () => {
      setThemePreference(
        preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light',
      )
    },
  }
}
