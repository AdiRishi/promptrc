import { SignUp } from '@clerk/tanstack-react-start'
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

export const Route = createFileRoute('/sign-up/$')({
  component: SignUpRoute,
  head: () => ({
    meta: seo({
      title: `Create account | ${SITE_NAME}`,
      description: 'Create a promptrc account to keep your AI prompt library synced.',
      path: CLERK_SIGN_UP_PATH,
      robots: 'noindex, follow',
    }),
    links: [canonicalLink(CLERK_SIGN_UP_PATH)],
  }),
})

function SignUpRoute() {
  return (
    <AuthShell mode="sign-up">
      <SignUp
        appearance={promptrcClerkAppearance}
        fallbackRedirectUrl={CLERK_AFTER_AUTH_PATH}
        forceRedirectUrl={CLERK_AFTER_AUTH_PATH}
        path={CLERK_SIGN_UP_PATH}
        routing="path"
        signInUrl={CLERK_SIGN_IN_PATH}
      />
    </AuthShell>
  )
}
