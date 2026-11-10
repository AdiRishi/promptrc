import { shadcn } from '@clerk/ui/themes'

export const CLERK_SIGN_IN_PATH = '/sign-in'
export const CLERK_SIGN_UP_PATH = '/sign-up'
export const CLERK_AFTER_AUTH_PATH = '/'

/**
 * Clerk's shadcn theme reads the same CSS tokens as the app (see
 * global-styles/tailwind.css), so it follows the active colorscheme. This only
 * makes it look like it belongs in a terminal: mono type, square controls in a
 * rounded frame.
 */
export const promptrcClerkAppearance = {
  theme: shadcn,
  variables: {
    borderRadius: '0',
    fontFamily: "'Recursive Variable', ui-monospace, monospace",
    fontFamilyButtons: "'Recursive Variable', ui-monospace, monospace",
    fontSize: '0.875rem',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full rounded-md border border-[var(--line-strong)] shadow-none',
    card: 'bg-[var(--bg-raised)] shadow-none',
    headerTitle: 'text-head font-extrabold text-[var(--fg)]',
    headerSubtitle: 'text-meta text-[var(--fg-dim)]',
    logoBox: 'hidden',
    formFieldInput: 'h-10 border-[var(--line-strong)] bg-[var(--bg-sunken)] shadow-none',
    socialButtonsBlockButton: 'h-10 border-[var(--line-strong)] bg-[var(--bg-sunken)] shadow-none',
    formButtonPrimary:
      'h-10 bg-[var(--accent)] font-semibold text-[var(--accent-fg)] shadow-none hover:bg-[var(--accent)] hover:brightness-110',
    footer: 'bg-[var(--bg-raised)] [background-image:none]',
    footerActionLink: 'text-[var(--accent)] hover:text-[var(--accent)]',
  },
} as const
