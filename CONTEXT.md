# promptrc

promptrc is a terminal-style personal library for capturing, finding, and reusing the prompts, phrasings, instruction sequences, and benchmarks that worked. Its domain is personal prompt retrieval: keeping what worked close at hand without turning the library into a heavy content-management system.

## Language

**Prompt Library**:
A user's personal collection of saved **Prompts**.
_Avoid_: Workspace, store, database

**Prompt**:
A reusable AI instruction saved by a user for later retrieval and reuse.
_Avoid_: Entry, file, snippet

**Kind**:
What a **Prompt** is: a plain reusable instruction (`prompt`), a **Fragment**, a **Sequence**, or a **Benchmark**. Every kind is still a **Prompt**; the kind only changes how the **Prompt Body** is presented, copied, and evaluated.
_Avoid_: Type, template, format

**Fragment**:
A **Prompt** whose body is a piece of wording worth keeping rather than a complete instruction.
_Avoid_: Snippet, phrase, quote

**Sequence**:
A **Prompt** whose body is an ordered list of **Steps**, sent to an AI tool one after another.
_Avoid_: Chain, workflow, pipeline

**Step**:
One instruction within a **Sequence**, separated from its neighbours by a `<!-- step -->` marker line in the **Prompt Body**.
_Avoid_: Stage, part

**Benchmark**:
A **Prompt** used as a reproducible test: its body is the exact test prompt, its **Notes** describe the expected result, and it keeps a log of **Runs**.
_Avoid_: Eval, test case

**Run**:
One recorded attempt of a **Benchmark** against a named model, with a **Verdict** and an optional note.
_Avoid_: Result, execution, trial

**Verdict**:
The judgement of a **Run** against the expected result: pass, mixed, or fail.
_Avoid_: Score, grade, status

**Variable**:
A `{{name}}` or `{{name | fallback}}` slot in a **Prompt Body** that is filled in before copying. Shown to people as a blank.
_Avoid_: Placeholder, parameter, field

**Notes**:
Free text attached to a **Prompt** explaining why it works (or, for a **Benchmark**, what a pass looks like). Notes are not part of the **Prompt Body** and are never copied.
_Avoid_: Description, comment, metadata

**Pin**:
A user's mark that keeps a **Prompt** at the top of every list.
_Avoid_: Favourite, star, bookmark

**Prompt Body**:
The reusable instruction text copied from a **Prompt** into an AI tool.
_Avoid_: Content, description

**Prompt Use**:
An instance of copying a **Prompt Body** (or one **Step** of a **Sequence**) for reuse outside promptrc, with any filled **Variables** substituted.
_Avoid_: View, open, select

**Use Count**:
The number of **Prompt Uses** recorded for a **Prompt**.
_Avoid_: View count, popularity score

**Project**:
The single primary home of a **Prompt** — usually the piece of work it came from. Projects are where you navigate; everything else narrows within one. Two names that differ only in case, spacing or punctuation ("Render MD", "render-md") are the same Project. Stored on the record and in D1 as `category`.
_Avoid_: Category (in the interface), folder, collection, workspace

**Project Order**:
The predictable order in which **Projects** appear in the library tree: alphabetical.
_Avoid_: Recency order

**Library Filter**:
What the list shows: an optional **Project**, narrowed by an optional **Kind**, **Pin**, and **Tag**. The parts stack; changing one keeps the others.
_Avoid_: View, folder, scope

**Tag**:
A lightweight label that makes a **Prompt** easier to find across **Projects**.
_Avoid_: Project, folder

**Starter Prompt**:
A real **Prompt** automatically added once to a fresh **Prompt Library** to demonstrate useful ways to use promptrc.
_Avoid_: Mock data, fake prompt, sample prompt

**Fresh Prompt Library**:
A **Prompt Library** that has not yet had a user create, edit, delete, duplicate, copy a **Prompt**, accept first-sign-in copying, or decline first-sign-in copying.
_Avoid_: Empty library, new user

**First-Sign-In Copy**:
A user-approved copy of all local **Prompts** into an empty remote **Prompt Library** during first sign-in.
_Avoid_: Migration, sync, merge

**Fresh Prompt Library Transition**:
The decision that determines whether a **Fresh Prompt Library** receives **Starter Prompts**, offers **First-Sign-In Copy**, or preserves a user's prior empty **Prompt Library** choice.
_Avoid_: Onboarding branch, migration flow, empty-state setup

## Relationships

- A **Prompt Library** contains zero or more **Prompts**
- A **Fresh Prompt Library** receives **Starter Prompts** once unless an eligible **First-Sign-In Copy** decision is made for that library
- A **Prompt** has exactly one **Kind** and exactly one **Prompt Body**
- A **Sequence**'s **Steps** live inside its **Prompt Body**; there is no separate step storage
- A **Benchmark** has zero or more **Runs**; each **Run** has exactly one **Verdict**
- **Variables** belong to the **Prompt Body**; values typed into them are a per-device convenience, not part of the **Prompt**
- Pinning or logging a **Run** is a user action that ends a **Fresh Prompt Library**
- A **Prompt** belongs to exactly one **Project**
- **Project Order** is independent of when a **Prompt** was created, edited, or used
- A **Library Filter** has at most one **Project**, one **Kind**, one **Tag**, and whether only **Pinned** Prompts show
- Saving a **Prompt** into a name that matches an existing **Project** files it under that Project's spelling
- A **Prompt** may have zero or more **Tags**
- A **Tag** may describe prompts across many **Projects**
- A **Prompt Use** belongs to exactly one **Prompt**
- A **Use Count** is derived from the **Prompt Uses** recorded for one **Prompt**
- A **Starter Prompt** is a **Prompt** once it has been added to a user's **Prompt Library**
- A **First-Sign-In Copy** copies local **Prompts** into a remote **Prompt Library** without removing them from local storage
- A **First-Sign-In Copy** is not a **Prompt Use**
- A **Fresh Prompt Library Transition** happens after a **Prompt Library** hydrates and before normal Prompt use begins
- A **Fresh Prompt Library Transition** may create **Starter Prompts**, offer **First-Sign-In Copy**, or mark the remote **Prompt Library** non-fresh without creating Prompts

## Example dialogue

> **Dev:** "When someone copies step two of a **Sequence**, is that a **Prompt Use**?"
> **Domain expert:** "Yes — it is the same reuse, just narrower. Selecting the Sequence or reading its Steps is not."

> **Dev:** "Should a **Run** go in the **Notes**?"
> **Domain expert:** "No. **Notes** describe what good looks like; a **Run** records what actually happened, against which model, so the two can be compared over time."

> **Dev:** "When a user presses copy on a **Prompt**, should we record a **Prompt Use**?"
> **Domain expert:** "Yes. A **Prompt Use** means the **Prompt Body** was copied for reuse elsewhere. Merely selecting or opening the **Prompt** should not affect the **Use Count**."

> **Dev:** "Can a **Prompt** live in multiple **Projects**?"
> **Domain expert:** "No. A **Project** is the Prompt's single primary home in the tree. Use **Tags** when the same Prompt needs to be found through multiple cross-cutting labels."

> **Dev:** "Should editing a **Prompt** make its **Project** jump to the top of the library tree?"
> **Domain expert:** "No. **Project Order** should stay predictable while the Prompt's recency changes."

> **Dev:** "Are **Kinds** another way of grouping, like **Projects**?"
> **Domain expert:** "No. A Project is where something lives; a Kind is what shape it is. You go to a Project, then narrow to its Sequences — the two stack."

## Flagged ambiguities

- "entry", "file", and "snippet" may appear in UI metaphors, but the domain term for a saved reusable instruction is **Prompt**.
- The primary grouping was called **Category** until it became **Project**. Code and D1 still say `category` (`PromptRecord.category`, the `category` column); the interface, filters and commands say project. `:cd` is the interface's word for going to a Project, so "directory" survives only as terminal metaphor.
- The kind named `prompt` shares its name with the domain term **Prompt**. In the interface it is labelled "Prompt" under Kinds; everywhere else "Prompt" means any saved item of any **Kind**.
- "blank" is the interface word for a **Variable**; code should say Variable.
- "recent", "latest", and "updated" may describe Prompt metadata, but they must not define **Project Order**.
- A **Fresh Prompt Library** is not the same as an empty **Prompt Library**; deleting all **Prompts** after a real user action must not make the library fresh again.
- "mock data", "sample prompt", and "seeded prompt" may describe onboarding ideas, but the domain term for a prompt added once to a fresh library is **Starter Prompt**.
- A **First-Sign-In Copy** is not a general sync or merge feature; it only applies when an empty remote **Prompt Library** would otherwise hide local **Prompts** during sign-in.
- "copy" can mean either copying a **Prompt Body** for reuse, which records a **Prompt Use**, or **First-Sign-In Copy**, which copies local **Prompts** into remote storage and does not record **Prompt Uses**.
- Local-first persistence is an architectural/product strategy, not a domain term for this glossary.
- Codex skill and plugin references inside a **Prompt Body** are treated as markdown/rendering features, not standalone domain concepts.
- A **Fresh Prompt Library Transition** is not a general synchronization flow; it only resolves the first usable state for a fresh local or remote **Prompt Library**.
