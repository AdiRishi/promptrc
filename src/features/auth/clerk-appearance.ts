import { shadcn } from '@clerk/ui/themes'

export const CLERK_SIGN_IN_PATH = '/sign-in'
export const CLERK_SIGN_UP_PATH = '/sign-up'
export const CLERK_AFTER_AUTH_PATH = '/'

export const promptrcClerkAppearance = {
  theme: shadcn,
  variables: {
    colorPrimary: '#ffb454',
    colorBackground: '#0e0f13',
    colorForeground: '#e8e6e3',
    colorInputBackground: '#0b0c0e',
    colorInputText: '#e8e6e3',
    colorText: '#e8e6e3',
    colorTextSecondary: '#8a8682',
    colorNeutral: '#8a8682',
    colorDanger: '#ff6b6b',
    colorSuccess: '#7acc8e',
    colorRing: '#ffb454',
    borderRadius: '0.125rem',
    fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace',
    fontFamilyButtons: '"JetBrains Mono Variable", ui-monospace, monospace',
  },
  elements: {
    rootBox: 'w-full',
    card: 'w-full border border-border bg-card shadow-none rounded-[2px]',
    header: 'gap-1 text-left',
    headerTitle: 'text-foreground text-[22px] tracking-normal',
    headerSubtitle: 'text-muted-foreground text-[13px]',
    logoBox: 'hidden',
    formFieldLabel: 'text-accent-foreground text-[11px] tracking-[0.12em] uppercase',
    formFieldInput:
      'rounded-[2px] border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
    formButtonPrimary:
      'rounded-[2px] bg-primary text-primary-foreground font-semibold hover:bg-[var(--primary-hover)]',
    footerActionText: 'text-muted-foreground',
    footerActionLink: 'text-primary hover:text-[var(--primary-hover)]',
    identityPreview: 'rounded-[2px] border border-border bg-background',
    identityPreviewText: 'text-foreground',
    identityPreviewEditButton: 'text-primary',
    otpCodeFieldInput:
      'rounded-[2px] border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-ring',
    dividerLine: 'bg-border',
    dividerText: 'text-muted-foreground',
    socialButtonsBlockButton:
      'rounded-[2px] border-border bg-background text-foreground hover:bg-muted',
    formResendCodeLink: 'text-primary',
    alert: 'rounded-[2px] border-border bg-background',
  },
} as const
