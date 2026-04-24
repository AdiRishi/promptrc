import { SignIn } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

import { AuthShell } from '@/features/auth/auth-shell'
import {
  CLERK_AFTER_AUTH_PATH,
  CLERK_SIGN_IN_PATH,
  CLERK_SIGN_UP_PATH,
  promptrcClerkAppearance,
} from '@/features/auth/clerk-appearance'

export const Route = createFileRoute('/sign-in/$')({
  component: SignInRoute,
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
