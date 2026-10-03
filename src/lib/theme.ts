import { useSyncExternalStore } from 'react'

/**
 * Terminal colorschemes. `system` follows the OS: `promptrc` when dark,
 * `daylight` when light. Switch with `:colorscheme <name>`.
 */
export const COLOR_SCHEMES = [
  { id: 'promptrc', label: 'promptrc', description: 'amber on slate — the original', dark: true },
  { id: 'daylight', label: 'daylight', description: 'a light terminal, warm paper', dark: false },
  {
    id: 'phosphor',
    label: 'phosphor',
    description: 'amber CRT with scanlines',
    dark: true,
    crt: true,
  },
  {
    id: 'green-screen',
    label: 'green-screen',
    description: 'P1 green CRT with scanlines',
    dark: true,
    crt: true,
  },
  { id: 'tokyo-night', label: 'tokyo-night', description: 'deep blue and neon', dark: true },
  { id: 'catppuccin', label: 'catppuccin', description: 'mocha pastels', dark: true },
  { id: 'gruvbox', label: 'gruvbox', description: 'retro groove', dark: true },
] as const satisfies ReadonlyArray<{
  id: string
  label: string
  description: string
  dark: boolean
  crt?: boolean
}>

export type ColorSchemeId = (typeof COLOR_SCHEMES)[number]['id']
export type ColorSchemePreference = ColorSchemeId | 'system'

export const COLOR_SCHEME_STORAGE_KEY = 'promptrc.colorscheme'

const DARK_QUERY = '(prefers-color-scheme: dark)'
const SCHEME_IDS: readonly string[] = COLOR_SCHEMES.map((scheme) => scheme.id)
const DARK_SCHEMES = COLOR_SCHEMES.filter((scheme) => scheme.dark).map((scheme) => scheme.id)
const CRT_SCHEMES = COLOR_SCHEMES.filter((scheme) => 'crt' in scheme).map((scheme) => scheme.id)

/**
 * Runs inline in <head> before first paint so the page never flashes the wrong
 * scheme. Kept dependency-free and tiny on purpose.
 */
export const COLOR_SCHEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(SCHEME_IDS)},d=${JSON.stringify(DARK_SCHEMES)},c=${JSON.stringify(CRT_SCHEMES)},p=localStorage.getItem('${COLOR_SCHEME_STORAGE_KEY}'),s=k.indexOf(p)>=0?p:(matchMedia('${DARK_QUERY}').matches?'promptrc':'daylight'),r=document.documentElement;r.dataset.scheme=s;r.classList.toggle('dark',d.indexOf(s)>=0);if(c.indexOf(s)>=0)r.dataset.crt='';else delete r.dataset.crt}catch(e){}})()`

export const isColorSchemeId = (value: unknown): value is ColorSchemeId =>
  typeof value === 'string' && SCHEME_IDS.includes(value)

const readPreference = (): ColorSchemePreference => {
  try {
    const stored = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)

    return isColorSchemeId(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

const resolve = (preference: ColorSchemePreference): ColorSchemeId => {
  if (preference !== 'system') {
    return preference
  }

  return window.matchMedia(DARK_QUERY).matches ? 'promptrc' : 'daylight'
}

const listeners = new Set<() => void>()

const apply = (preference: ColorSchemePreference) => {
  const root = document.documentElement
  const scheme = resolve(preference)

  root.dataset.scheme = scheme
  root.classList.toggle('dark', (DARK_SCHEMES as readonly string[]).includes(scheme))

  if ((CRT_SCHEMES as readonly string[]).includes(scheme)) {
    root.dataset.crt = ''
  } else {
    delete root.dataset.crt
  }
}

export const setColorSchemePreference = (preference: ColorSchemePreference) => {
  try {
    if (preference === 'system') {
      localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY)
    } else {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, preference)
    }
  } catch {
    // Storage can be unavailable (private mode); the scheme still applies for this visit.
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

export function useColorScheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => 'system:promptrc')
  const [preference, scheme] = snapshot.split(':') as [ColorSchemePreference, ColorSchemeId]

  return {
    preference,
    scheme,
    isDark: (DARK_SCHEMES as readonly string[]).includes(scheme),
    setPreference: setColorSchemePreference,
    /** Steps through every scheme, then back to following the system. */
    cycle: () => {
      const order: ColorSchemePreference[] = ['system', ...COLOR_SCHEMES.map((entry) => entry.id)]
      const next = order[(order.indexOf(preference) + 1) % order.length] ?? 'system'

      setColorSchemePreference(next)
    },
  }
}
