# Use Clerk for Authentication With a Terminal-Styled UI

promptrc uses Clerk as its authentication provider through `@clerk/tanstack-react-start`, including app-level `ClerkProvider`, request middleware, and server-side user identity checks. We keep Clerk's managed auth primitives, but present sign-in and sign-up inside our own terminal-styled shell with shared Clerk appearance tokens so authentication feels native to the `~/.promptrc` interface instead of like a detached hosted flow.

## Consequences

- Authenticated server work should continue to use Clerk identity from `auth()` and scope user-owned data by Clerk user ID.
- Sign-in and sign-up routes should reuse the shared auth shell and `promptrcClerkAppearance` rather than styling Clerk components ad hoc.
- If we later replace Clerk, we must revisit both the auth boundary and the prompt library's local-versus-remote storage selection.
