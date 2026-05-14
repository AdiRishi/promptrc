# promptrc

promptrc is a terminal-inspired prompt library for storing, finding, and reusing AI prompts. Its domain is personal prompt retrieval: helping a user keep useful prompts close at hand without turning the library into a heavy content-management system.

## Language

**Prompt Library**:
A user's personal collection of saved **Prompts**.
_Avoid_: Workspace, store, database

**Prompt**:
A reusable AI instruction saved by a user for later retrieval and reuse.
_Avoid_: Entry, file, snippet

**Prompt Body**:
The reusable instruction text copied from a **Prompt** into an AI tool.
_Avoid_: Content, description

**Prompt Use**:
An instance of copying a **Prompt Body** for reuse outside promptrc.
_Avoid_: View, open, select

**Use Count**:
The number of **Prompt Uses** recorded for a **Prompt**.
_Avoid_: View count, popularity score

**Category**:
The single primary grouping that places a **Prompt** in the library tree.
_Avoid_: Folder, directory, collection

**Category Order**:
The predictable order in which **Categories** appear in the library tree.
_Avoid_: Folder order, directory order, recency order

**Tag**:
A lightweight label that makes a **Prompt** easier to find across categories.
_Avoid_: Category, folder

**Starter Prompt**:
A real **Prompt** automatically added once to a fresh **Prompt Library** to demonstrate useful ways to use promptrc.
_Avoid_: Mock data, fake prompt, sample prompt

**Fresh Prompt Library**:
A **Prompt Library** that has not yet had a user create, edit, delete, duplicate, copy a **Prompt**, accept first-sign-in copying, or decline first-sign-in copying.
_Avoid_: Empty library, new user

**First-Sign-In Copy**:
A user-approved copy of all local **Prompts** into an empty remote **Prompt Library** during first sign-in.
_Avoid_: Migration, sync, merge

## Relationships

- A **Prompt Library** contains zero or more **Prompts**
- A **Fresh Prompt Library** receives **Starter Prompts** once unless an eligible **First-Sign-In Copy** decision is made for that library
- A **Prompt** has exactly one **Prompt Body**
- A **Prompt** belongs to exactly one **Category**
- **Category Order** is independent of when a **Prompt** was created, edited, or used
- A **Prompt** may have zero or more **Tags**
- A **Tag** may describe prompts across many **Categories**
- A **Prompt Use** belongs to exactly one **Prompt**
- A **Use Count** is derived from the **Prompt Uses** recorded for one **Prompt**
- A **Starter Prompt** is a **Prompt** once it has been added to a user's **Prompt Library**
- A **First-Sign-In Copy** copies local **Prompts** into a remote **Prompt Library** without removing them from local storage
- A **First-Sign-In Copy** is not a **Prompt Use**

## Example dialogue

> **Dev:** "When a user presses copy on a **Prompt**, should we record a **Prompt Use**?"
> **Domain expert:** "Yes. A **Prompt Use** means the **Prompt Body** was copied for reuse elsewhere. Merely selecting or opening the **Prompt** should not affect the **Use Count**."

> **Dev:** "Can a **Prompt** live in multiple **Categories**?"
> **Domain expert:** "No. A **Category** is the Prompt's single primary home in the tree. Use **Tags** when the same Prompt needs to be found through multiple cross-cutting labels."

> **Dev:** "Should editing a **Prompt** make its **Category** jump to the top of the library tree?"
> **Domain expert:** "No. **Category Order** should stay predictable while the Prompt's recency changes."

## Flagged ambiguities

- "entry", "file", and "snippet" may appear in UI metaphors, but the domain term for a saved reusable instruction is **Prompt**.
- "folder" and "directory" may appear in terminal-inspired visuals, but the domain term for primary prompt grouping is **Category**.
- "recent", "latest", and "updated" may describe Prompt metadata, but they must not define **Category Order**.
- A **Fresh Prompt Library** is not the same as an empty **Prompt Library**; deleting all **Prompts** after a real user action must not make the library fresh again.
- "mock data", "sample prompt", and "seeded prompt" may describe onboarding ideas, but the domain term for a prompt added once to a fresh library is **Starter Prompt**.
- A **First-Sign-In Copy** is not a general sync or merge feature; it only applies when an empty remote **Prompt Library** would otherwise hide local **Prompts** during sign-in.
- "copy" can mean either copying a **Prompt Body** for reuse, which records a **Prompt Use**, or **First-Sign-In Copy**, which copies local **Prompts** into remote storage and does not record **Prompt Uses**.
- Local-first persistence is an architectural/product strategy, not a domain term for this glossary.
- Codex skill and plugin references inside a **Prompt Body** are treated as markdown/rendering features, not standalone domain concepts.
