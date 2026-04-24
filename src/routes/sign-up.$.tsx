import { SignUp } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

import { AuthShell } from '@/features/auth/auth-shell'
import {
  CLERK_AFTER_AUTH_PATH,
  CLERK_SIGN_IN_PATH,
  CLERK_SIGN_UP_PATH,
  promptrcClerkAppearance,
} from '@/features/auth/clerk-appearance'

export const Route = createFileRoute('/sign-up/$')({
  component: SignUpRoute,
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
