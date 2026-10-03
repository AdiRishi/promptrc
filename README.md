<div align="center">
  <img src="public/logo512.png" alt="promptrc" width="96" height="96" />

# promptrc

**A terminal for the prompts that worked.**
Keep the prompts, phrasings, sequences and benchmarks that worked — before they slip away.

[![CI](https://github.com/AdiRishi/promptrc/actions/workflows/ci.yml/badge.svg)](https://github.com/AdiRishi/promptrc/actions/workflows/ci.yml) [![Deploy](https://github.com/AdiRishi/promptrc/actions/workflows/deploy.yml/badge.svg)](https://github.com/AdiRishi/promptrc/actions/workflows/deploy.yml) ![GitHub License](https://img.shields.io/github/license/AdiRishi/promptrc)

[**promptrc.app**](https://promptrc.app) · [Report a bug](https://github.com/AdiRishi/promptrc/issues)

<img src="docs/screenshots/library.jpg" alt="promptrc as a three-pane terminal UI: a ~/.promptrc tree of kinds, categories and tags, an fzf-style list of entries, and the Bug Hunt prompt open with one fill-in blank completed, above a vim-style status line" width="100%" />

</div>

---

## What it keeps

promptrc is your `~/.promptrc`: a keyboard-driven library for the moments when working with an AI goes exactly right. Every entry is a **Prompt**, marked by the kind of thing it is:

|     | Kind          | For                               | What the viewer gives you                                                 |
| --- | ------------- | --------------------------------- | ------------------------------------------------------------------------- |
| ❯   | **Prompt**    | A reusable instruction            | `{{variables}}` become inline fill-in blanks; yank uses your words        |
| “   | **Fragment**  | Wording that landed exactly right | Set in a handwritten mono, ready to drop into a larger prompt             |
| »   | **Sequence**  | An ordered chain of instructions  | Numbered steps, each yanked on its own (`:y2`), with progress as you go   |
| ◆   | **Benchmark** | A reproducible test               | The expected result, a test-runner log of runs per model, and a pass rate |

Every entry can carry **notes** (why it works, what good looks like), a **category**, **tags**, pasted **images**, and a **pin**.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/command-line.jpg" alt="The vim-style command line open at the bottom of the screen, with a wildmenu completing :colorscheme" /></td>
    <td width="50%"><img src="docs/screenshots/finder.jpg" alt="The Telescope-style finder: results on the left, a line-numbered preview of the highlighted sequence on the right" /></td>
  </tr>
  <tr>
    <td align="center"><sub><kbd>:</kbd> — the command line, with completion and history</sub></td>
    <td align="center"><sub><kbd>⌘</kbd><kbd>K</kbd> — find anything, with a live preview</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/capture-phosphor.jpg" alt="Quick capture floating over the library in the amber phosphor colorscheme, with scanlines" /></td>
    <td width="50%"><img src="docs/screenshots/sequence-raw.jpg" alt="A sequence in raw view with line numbers, in the tokyo-night colorscheme" /></td>
  </tr>
  <tr>
    <td align="center"><sub><kbd>c</kbd> — capture from anywhere (phosphor)</sub></td>
    <td align="center"><sub><kbd>r</kbd> — raw source with line numbers (tokyo-night)</sub></td>
  </tr>
</table>

## Highlights

- **It drives like a terminal** — three lazygit-style panes (<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>), a vim status line that shows the mode, and an echo line instead of toasts.
- **A real command line** — <kbd>:</kbd> takes ex commands with <kbd>⇥</kbd> completion and <kbd>↑</kbd> history: `:sequences`, `:cd engineering`, `:new benchmark`, `:y2`, `:rm!`, `:w`, `:q`.
- **Capture in seconds** — <kbd>c</kbd> floats a capture shell over whatever you're doing. Paste, pick a kind, <kbd>⌘</kbd><kbd>↵</kbd>. The title comes from the first line if you skip it.
- **Fill-in blanks** — write `{{audience}}` or `{{tone | calm}}`; the viewer turns them into slots you type straight into, and remembers what you typed per entry.
- **glow and bat** — read entries rendered, or press <kbd>r</kbd> for the raw markdown with line numbers and syntax colour.
- **Benchmarks as a test runner** — `:log claude-opus-5-5 pass decision led` records a run; the ledger shows ✓/~/✗ rows, a pass rate and a sparkline.
- **Seven colorschemes** — `:colorscheme promptrc | daylight | phosphor | green-screen | tokyo-night | catppuccin | gruvbox`. The phosphor and green-screen CRTs get scanlines, glow and a vignette.
- **Local-first, cloud-optional** — everything works signed out (stored in your browser). `:login` to sync to Cloudflare D1 and share read-only links.

<img src="docs/screenshots/colorschemes.jpg" alt="The same benchmark in six colorschemes: promptrc, daylight, green-screen, catppuccin, gruvbox and phosphor" width="100%" />

## Keys

| Action                         | Keys                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| Quick capture                  | <kbd>c</kbd>                                                 |
| New, in the full editor        | <kbd>n</kbd> (or `:new [kind]`)                              |
| Command line                   | <kbd>:</kbd>                                                 |
| Find anything                  | <kbd>⌘</kbd> <kbd>K</kbd>                                    |
| Focus a pane                   | <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>                       |
| Grep the list                  | <kbd>/</kbd>                                                 |
| Next · previous                | <kbd>j</kbd> · <kbd>k</kbd> (or arrows in the list)          |
| Yank (with filled blanks)      | <kbd>y</kbd> or <kbd>⌘</kbd> <kbd>C</kbd>                    |
| Rendered ⇄ raw                 | <kbd>r</kbd>                                                 |
| Edit · pin · duplicate · share | <kbd>e</kbd> · <kbd>p</kbd> · <kbd>d</kbd> · <kbd>s</kbd>    |
| Delete                         | <kbd>x</kbd> twice, or `:rm!`                                |
| Save · cancel while editing    | <kbd>⌘</kbd> <kbd>↵</kbd> · <kbd>Esc</kbd> (or `:w` · `:q!`) |
| The manual                     | <kbd>?</kbd> (or `:help`)                                    |

---

## Quick start

**Prerequisites:** Node.js (see [`.node-version`](.node-version)), pnpm (pinned in `package.json`), and a [Clerk](https://clerk.com/) project (free tier is fine).

```bash
git clone https://github.com/AdiRishi/promptrc.git
cd promptrc
pnpm install
cp .env.example .env   # add VITE_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY
pnpm db:migrate        # apply D1 migrations locally
pnpm dev               # http://localhost:8080
```

## Tech stack

|               |                                                                                                                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework** | [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) on [React 19.3](https://react.dev) with the [React Compiler](https://react.dev/learn/react-compiler) (native oxc port) |
| **Build**     | [Vite 8](https://vite.dev) (Rolldown) + [Nitro](https://nitro.build) targeting [Cloudflare Workers](https://workers.cloudflare.com)                                                                                  |
| **Data**      | [Cloudflare D1](https://developers.cloudflare.com/d1/) (prompts) + [R2](https://developers.cloudflare.com/r2/) (images); `localStorage` when signed out                                                              |
| **State**     | [Zustand](https://github.com/pmndrs/zustand) (library) + [TanStack Query](https://tanstack.com/query) (server reads)                                                                                                 |
| **Auth**      | [Clerk](https://clerk.com) via `@clerk/tanstack-react-start`                                                                                                                                                         |
| **UI**        | [Tailwind CSS 4](https://tailwindcss.com), [Base UI](https://base-ui.com), [cmdk](https://cmdk.paco.me), [Lucide](https://lucide.dev)                                                                                |
| **Type**      | [Recursive](https://www.recursive.design) (mono, with its casual axis for notes) + a box-drawing subset of [JetBrains Mono](https://www.jetbrains.com/lp/mono/)                                                      |
| **Tooling**   | [TypeScript 7](https://devblogs.microsoft.com/typescript/) (native compiler), [Oxlint](https://oxc.rs/docs/guide/usage/linter) (type-aware) and [Oxfmt](https://oxc.rs/docs/guide/usage/formatter)                   |
| **Tests**     | [Vitest 5](https://vitest.dev) — jsdom for UI, [`@cloudflare/vitest-plugin`](https://www.npmjs.com/package/@cloudflare/vitest-plugin) (Miniflare) for D1/R2                                                          |

## Architecture

promptrc is **local-first** with optional cloud sync. One `PromptLibraryClient` sits over two storage adapters, so components never branch on whether you're signed in.

```
 Browser                                                    Cloudflare Worker
┌──────────────────────────────────────────────┐          ┌──────────────────────┐
│  Zustand store ◄──► PromptLibraryClient       │          │ TanStack server fns   │
│  (library, filter,     ├─ local storage  ─────┼─► localStorage                  │
│   selection, composer) └─ remote storage ─────┼─────────►│  D1 (prompts)        │
│                                               │          │  R2 (images)         │
└──────────────────────────────────────────────┘          └──────────────────────┘
```

- Signed-out users get the full app with zero network calls.
- On first sign-in, a library kept in the browser can be copied into the account (see [ADR 0003](docs/adr/0003-copy-local-prompts-on-first-sign-in.md)).
- All four kinds share one record; a sequence's steps live in its body behind an invisible `<!-- step -->` marker (see [ADR 0004](docs/adr/0004-prompt-kinds-share-one-record.md)).

```
src/
├── components/ui/                 # Primitives: pane, button, dialog, input, kbd, choice
├── features/
│   ├── auth/                      # Sign-in shell + Clerk appearance
│   └── prompt-library/
│       ├── commands/              # Command metadata, keys, ex commands, executor
│       ├── components/            # Panes, status line, command line, finder, manual
│       ├── hooks/                 # Hotkeys, commands, remembered blanks
│       ├── lifecycle/             # Hydration + fresh-library transitions
│       ├── model/                 # Records, kinds, templates, sequences, runs, validation
│       ├── persistence/           # localStorage + D1/R2 adapters
│       ├── rendering/             # Markdown, fill-in blanks, references, formatting
│       ├── selectors/             # Filters, sorts, facets, catalog numbers
│       ├── server/                # TanStack server functions
│       ├── store/                 # Zustand store
│       └── sync/                  # Client + session orchestration
├── lib/                           # Providers, colorschemes, echo line, SEO, site config
└── routes/                        # File-based routes
migrations/                        # D1 migrations
tests/                             # Mirrors src/features
```

## Development

| Command          | Description                                          |
| ---------------- | ---------------------------------------------------- |
| `pnpm dev`       | Dev server on port 8080 (runs the Worker in workerd) |
| `pnpm build`     | Production build into `.output/`                     |
| `pnpm test`      | Vitest with coverage (jsdom + workers projects)      |
| `pnpm lint`      | Oxlint, type-aware                                   |
| `pnpm format`    | Oxfmt                                                |
| `pnpm typecheck` | Regenerate Worker types, then TypeScript 7           |
| `pnpm check`     | The CI gate: format, lint, typecheck, deploy dry-run |
| `pnpm deploy`    | Deploy to Cloudflare Workers                         |

### Environment

| Variable                     | Required | Description                               |
| ---------------------------- | -------- | ----------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | yes      | Clerk publishable key (client)            |
| `CLERK_SECRET_KEY`           | yes      | Clerk secret key (Worker only)            |
| `VITE_SITE_URL`              | optional | Canonical origin for SEO and social cards |

Only `VITE_*` variables reach the client bundle.

## Deployment

promptrc deploys to Cloudflare Workers with a D1 database (`DB`) and an R2 bucket (`PROMPT_IMAGES`). Migrations in [`migrations/`](migrations) are additive. The Deploy workflow applies them before shipping the Worker; `wrangler deploy` on its own does **not**, so for a manual deploy run:

```bash
pnpx wrangler d1 migrations apply promptrc --remote
pnpm build
pnpm deploy
```

To deploy your own copy: create a D1 database (`pnpx wrangler d1 create <name>`) and an R2 bucket, update the ids and `routes` in `wrangler.jsonc`, and set `CLERK_SECRET_KEY` as a Worker secret (`pnpx wrangler secret put CLERK_SECRET_KEY`).

## Design notes

- **It should feel like a terminal, because that's where you work.** Panes with titles set into their borders, a status line, a command line, an echo area. Nothing floats that a TUI wouldn't float.
- **One monospace, three voices.** Recursive at `MONO 1` throughout: heavy and slightly casual for titles, upright for prompts, and its casual, slanted cut for notes, like comments someone left in the margin.
- **Glyphs, not icons.** ❯ “ » ◆ mark the kinds; trees, rules and frames are box-drawing characters.
- **Colour comes from the colorscheme.** Every surface reads named terminal colours (`--bg`, `--fg`, `--accent`, `--red` … `--cyan`), so a scheme is a dozen lines of CSS.
- **Local-first by default.** Useful before you sign in, before you sync, before you trust it.
- **Nothing gets in your way.** Single-letter keys, confirm-by-repeat for delete, messages in the echo line instead of dialogs.

## Contributing

Contributions are welcome — please open an issue first for anything beyond a small fix, and run `pnpm check` and `pnpm test` before opening a pull request.

## License

MIT — see [LICENSE](LICENSE).
