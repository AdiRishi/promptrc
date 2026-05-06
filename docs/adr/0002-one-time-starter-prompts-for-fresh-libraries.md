# Add Starter Prompts Once for Fresh Libraries

Fresh Prompt Libraries should receive a small set of real Starter Prompts automatically so first-time users can immediately understand what promptrc is for and how browsing, searching, copying, editing, and creating Prompts feels. We choose this over a preview-only empty state because the app's value is clearest when the library already contains useful Prompts, but the library must stop being fresh after the user's first meaningful action or first-sign-in copy decision so deleting all Prompts later does not reload the starter set. The First-Sign-In Copy flow is an exception: if the user accepts, the remote Prompt Library receives copied local Prompts instead of Starter Prompts; if the user declines, the remote Prompt Library remains empty instead of receiving Starter Prompts.

## Consequences

- Freshness is distinct from emptiness and must be persisted with the Prompt Library.
- Starter Prompts become ordinary Prompts once added; the UI should not permanently mark them as demo content.
- The default selected Starter Prompt should be a concise Start Here guide, followed by practical Prompts that showcase everyday reuse across multiple Categories.
- If a user already made a local Prompt Library non-fresh and deleted all local Prompts, signing into an empty remote Prompt Library should preserve that empty choice instead of seeding remote Starter Prompts.
