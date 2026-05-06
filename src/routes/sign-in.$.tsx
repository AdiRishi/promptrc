import { SignIn } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

import { AuthShell } from '@/features/auth/auth-shell'
import {
  CLERK_AFTER_AUTH_PATH,
  CLERK_SIGN_IN_PATH,
  CLERK_SIGN_UP_PATH,
  promptrcClerkAppearance,
} from '@/features/auth/clerk-appearance'
import { canonicalLink, seo } from '@/lib/seo'
import { SITE_NAME } from '@/lib/site-config'

export const Route = createFileRoute('/sign-in/$')({
  component: SignInRoute,
  head: () => ({
    meta: seo({
      title: `Sign in | ${SITE_NAME}`,
      description: 'Sign in to promptrc to sync your saved AI prompts across browsers.',
      path: CLERK_SIGN_IN_PATH,
      robots: 'noindex, follow',
    }),
    links: [canonicalLink(CLERK_SIGN_IN_PATH)],
  }),
})

function SignInRoute() {
  return (
    <AuthShell mode="sign-in">
      <SignIn
        appearance={promptrcClerkAppearance}
        fallbackRedirectUrl={CLERK_AFTER_AUTH_PATH}
        forceRedirectUrl={CLERK_AFTER_AUTH_PATH}
        path={CLERK_SIGN_IN_PATH}
        routing="path"
        signUpUrl={CLERK_SIGN_UP_PATH}
      />
    </AuthShell>
  )
}
