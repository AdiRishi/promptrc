# Projects Are Where You Are; Kind, Pin and Tag Stack on Top

The library list used to show one thing at a time — all, pinned, one kind, one category, or one tag — with categories and kinds side by side in the tree. In practice categories are projects: there are many of them, they grow, and they are the first thing you think of ("the prompt from render-md"), while the four kinds are a short fixed list you reach for once you are already somewhere. So we made the Project the primary navigation axis and turned the filter into independent parts — `{ project, kind, pinned, tag }` — that stack: `~/.promptrc/render-md/sequences` is one place. The record field and D1 column keep the name `category`; only the interface and the filter say project.

## Consequences

- `:cd <project>` changes the Project and keeps the kind; `:sequences` (and the other kinds) change the kind and keep the Project; `:cd ~` goes back to everything. The tree lists Projects; kinds and ★ are toggles above the list with counts for the current Project.
- Project identity ignores case, spacing and punctuation (`model/prompt-projects.ts`), so "Render MD" and "render-md" are one Project shown under its most common spelling. Saving or capturing into such a name files the Prompt under the existing spelling, so near-duplicate Projects can't be created by accident; the picker also asks "did you mean …?" for typos and makes a new Project an explicit choice.
- Project Order stays alphabetical (see CONTEXT.md); recency would make the tree move under you. Many Projects stay reachable through `:cd` completion, the finder, and the picker.
- A filter saved by an earlier build (`{ type: 'kind', kind }` and so on) is upgraded on load to the matching single part.
- No D1 migration: projects are derived from the existing `category` column.
