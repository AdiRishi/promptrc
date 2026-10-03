import { shadcn } from '@clerk/ui/themes'

export const CLERK_SIGN_IN_PATH = '/sign-in'
export const CLERK_SIGN_UP_PATH = '/sign-up'
export const CLERK_AFTER_AUTH_PATH = '/'

/**
 * Clerk's shadcn theme reads the same CSS tokens as the app (see
 * global-styles/tailwind.css), so colours follow light/dark automatically.
 * Only typography and shape are set here.
 */
export const promptrcClerkAppearance = {
  theme: shadcn,
  variables: {
    borderRadius: '0.625rem',
    fontFamily: '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
    fontFamilyButtons: '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-[var(--shadow-card)] ring-1 ring-[var(--rule)] rounded-2xl',
    card: 'bg-[var(--paper-raised)] shadow-none',
    headerTitle: 'font-display text-[26px] tracking-[-0.01em] text-[var(--ink)]',
    headerSubtitle: 'text-[13.5px] text-[var(--ink-muted)]',
    logoBox: 'hidden',
    formButtonPrimary: 'bg-[var(--vermilion)] hover:bg-[var(--vermilion-ink)] shadow-none',
    footerActionLink: 'text-[var(--vermilion)] hover:text-[var(--vermilion-ink)]',
  },
} as const
