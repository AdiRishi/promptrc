# Ask Before Copying Local Prompts During First Sign-In

When a user signs in for the first time while the remote Prompt Library is empty and local Prompts exist, promptrc should ask whether to copy the entire local Prompt Library into remote storage instead of silently switching storage and making the local work appear lost. We choose an explicit shadcn Dialog over automatic migration, sync, or merge so users understand the storage transition and retain control, while still making the safe path to preserve their work obvious.

## Consequences

- The copy prompt is first-sign-in onboarding, not a general merge tool; it should only appear when the remote Prompt Library is empty/fresh.
- Copying is intentionally blind: if the user accepts, copy every local Prompt as-is rather than detecting Starter Prompts or trying to classify local content.
- Accepting the copy prompt should not also seed remote Starter Prompts.
- Declining the copy prompt should show an empty remote Prompt Library and should not seed remote Starter Prompts.
- Accepting or declining the copy prompt should mark the remote Prompt Library as no longer fresh.
- Copying local Prompts into remote storage must not remove them from local storage.
- Copying should preserve user-facing Prompt fields, but generated IDs may change when needed to satisfy remote storage uniqueness constraints.
- The sign-in copy prompt should use the project's shadcn Dialog component rather than a custom modal.
