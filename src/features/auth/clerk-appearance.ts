import { shadcn } from '@clerk/ui/themes'

export const CLERK_SIGN_IN_PATH = '/sign-in'
export const CLERK_SIGN_UP_PATH = '/sign-up'
export const CLERK_AFTER_AUTH_PATH = '/'

/**
 * Clerk's shadcn theme reads the same CSS tokens as the app (see
 * global-styles/tailwind.css), so it follows the active colorscheme. This only
 * makes it look like it belongs in a terminal: mono type, square-ish corners.
 */
export const promptrcClerkAppearance = {
  theme: shadcn,
  variables: {
    borderRadius: '0.25rem',
    fontFamily: "'Recursive Variable', ui-monospace, monospace",
    fontFamilyButtons: "'Recursive Variable', ui-monospace, monospace",
    fontSize: '0.8125rem',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full rounded-md border border-[var(--line)] shadow-none',
    card: 'bg-[var(--bg-raised)] shadow-none',
    headerTitle: 'text-[17px] font-bold text-[var(--fg)]',
    headerSubtitle: 'text-[12.5px] text-[var(--fg-dim)]',
    logoBox: 'hidden',
    formFieldInput: 'rounded-sm border-[var(--line)] bg-[var(--bg-sunken)] shadow-none',
    socialButtonsBlockButton: 'rounded-sm border-[var(--line)] bg-[var(--bg-sunken)] shadow-none',
    formButtonPrimary:
      'rounded-sm bg-[var(--accent)] font-bold text-[var(--accent-fg)] shadow-none hover:bg-[var(--accent)] hover:brightness-110',
    footer: 'bg-[var(--bg-raised)] [background-image:none]',
    footerActionLink: 'text-[var(--accent)] hover:text-[var(--accent)]',
  },
} as const
