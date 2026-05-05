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

**Tag**:
A lightweight label that makes a **Prompt** easier to find across categories.
_Avoid_: Category, folder

## Relationships

- A **Prompt Library** contains zero or more **Prompts**
- A **Prompt** has exactly one **Prompt Body**
- A **Prompt** belongs to exactly one **Category**
- A **Prompt** may have zero or more **Tags**
- A **Tag** may describe prompts across many **Categories**
- A **Prompt Use** belongs to exactly one **Prompt**
- A **Use Count** is derived from the **Prompt Uses** recorded for one **Prompt**

## Example dialogue

> **Dev:** "When a user presses copy on a **Prompt**, should we record a **Prompt Use**?"
> **Domain expert:** "Yes. A **Prompt Use** means the **Prompt Body** was copied for reuse elsewhere. Merely selecting or opening the **Prompt** should not affect the **Use Count**."

> **Dev:** "Can a **Prompt** live in multiple **Categories**?"
> **Domain expert:** "No. A **Category** is the Prompt's single primary home in the tree. Use **Tags** when the same Prompt needs to be found through multiple cross-cutting labels."

## Flagged ambiguities

- "entry", "file", and "snippet" may appear in UI metaphors, but the domain term for a saved reusable instruction is **Prompt**.
- "folder" and "directory" may appear in terminal-inspired visuals, but the domain term for primary prompt grouping is **Category**.
- Local-first persistence is an architectural/product strategy, not a domain term for this glossary.
- Codex skill and plugin references inside a **Prompt Body** are treated as markdown/rendering features, not standalone domain concepts.
