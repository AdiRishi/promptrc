<div align="center">
  <img src="public/logo512.png" alt="promptrc logo" width="120" height="120" />

# promptrc

A terminal-inspired prompt library for storing, searching, and reusing your best AI prompts.

[![CI](https://github.com/AdiRishi/promptrc/actions/workflows/ci.yml/badge.svg)](https://github.com/AdiRishi/promptrc/actions/workflows/ci.yml) [![Deploy](https://github.com/AdiRishi/promptrc/actions/workflows/deploy.yml/badge.svg)](https://github.com/AdiRishi/promptrc/actions/workflows/deploy.yml) ![GitHub License](https://img.shields.io/github/license/AdiRishi/promptrc) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/AdiRishi/promptrc/pulls)

[**promptrc.app**](https://promptrc.app) · [Report a bug](https://github.com/AdiRishi/promptrc/issues)

</div>

---

## ✨ Features

- ⌨️ **Keyboard-first workflow** — `j/k` to navigate, `n` to create, `e` to edit, `d` to duplicate, `x` to delete, `⌘C` to copy, `?` for the keymap
- 🗂️ **Organize by category and tag** — group prompts the way your brain actually works
- 🔎 **Instant search** — fuzzy match across title, body, category, and tags as you type
- 💾 **Local-first, cloud-optional** — anonymous users persist to `localStorage`; signed-in users sync to a Cloudflare D1 database
- 🔐 **Auth via Clerk** — sign in to access your library from any browser, no account required to try the app
- 📈 **Use counter** — promptrc tracks how often you reach for each prompt so the ones that matter rise to the top
- 🖥️ **Terminal aesthetic** — monospace, dim chrome, `$ promptrc --help` framing, no dialog spam
- ⚡ **Edge-deployed** — TanStack Start + Nitro running on Cloudflare Workers

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (see [`.node-version`](.node-version))
- [pnpm](https://pnpm.io/) 10.x or later
- A [Clerk](https://clerk.com/) project (free tier is fine) for authentication

### Installation

```bash
# Clone the repository
git clone https://github.com/AdiRishi/promptrc.git
cd promptrc

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your VITE_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY

# Start the development server
pnpm dev
```

The app will be available at **http://localhost:8080**

> 💡 You can use promptrc fully without signing in — your library will persist to `localStorage`. Sign in to sync prompts across devices via Cloudflare D1.

---

## ⌨️ Keymap

promptrc is built around a single-letter, modifier-light keymap. Press `?` anywhere to summon the in-app cheat sheet.

| Action               | Keys                      |
| -------------------- | ------------------------- |
| Next prompt          | <kbd>j</kbd>              |
| Previous prompt      | <kbd>k</kbd>              |
| Focus search         | <kbd>/</kbd>              |
| New prompt           | <kbd>n</kbd>              |
| Edit selected        | <kbd>e</kbd>              |
| Duplicate            | <kbd>d</kbd>              |
| Copy body            | <kbd>⌘</kbd> <kbd>C</kbd> |
| Delete (×2 confirms) | <kbd>x</kbd>              |
| Toggle help          | <kbd>?</kbd>              |
| Cancel · dismiss     | <kbd>esc</kbd>            |

---

## 🛠️ Tech Stack

| Category          | Technology                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**     | [TanStack Start](https://tanstack.com/start) (React meta-framework)                                                             |
| **UI Library**    | [React 19](https://react.dev)                                                                                                   |
| **Routing**       | [TanStack Router](https://tanstack.com/router) with file-based routes                                                           |
| **Build Tool**    | [Vite 8](https://vite.dev)                                                                                                      |
| **Styling**       | [Tailwind CSS 4](https://tailwindcss.com)                                                                                       |
| **Components**    | [shadcn/ui](https://ui.shadcn.com) + [Base UI](https://base-ui.com) primitives                                                  |
| **State**         | [Zustand](https://github.com/pmndrs/zustand) (client) + [TanStack Query](https://tanstack.com/query) (server)                   |
| **Auth**          | [Clerk](https://clerk.com) via [@clerk/tanstack-react-start](https://www.npmjs.com/package/@clerk/tanstack-react-start)         |
| **Database**      | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite at the edge)                                                     |
| **Server**        | [Nitro](https://nitro.unjs.io) targeting [Cloudflare Workers](https://workers.cloudflare.com)                                   |
| **Notifications** | [Sonner](https://sonner.emilkowal.ski)                                                                                          |
| **Typography**    | [Inter](https://rsms.me/inter/) (Sans) + [JetBrains Mono](https://www.jetbrains.com/lp/mono/)                                   |
| **Icons**         | [Lucide React](https://lucide.dev)                                                                                              |
| **Testing**       | [Vitest](https://vitest.dev) + [@cloudflare/vitest-pool-workers](https://www.npmjs.com/package/@cloudflare/vitest-pool-workers) |

---

## 🏗️ Architecture

promptrc is a **local-first** app with optional cloud sync.

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ┌────────────────────┐    ┌──────────────────────────────┐  │
│  │ Zustand store      │◄──►│ PromptLibraryClient          │  │
│  │ (UI state)         │    │ ┌──────────┐  ┌────────────┐ │  │
│  └────────────────────┘    │ │  local   │  │   remote   │ │  │
│                            │ │ storage  │  │  storage   │ │  │
│                            │ └────┬─────┘  └──────┬─────┘ │  │
│                            └──────┼───────────────┼───────┘  │
└───────────────────────────────────┼───────────────┼──────────┘
                                    │               │
                          ┌─────────▼──┐    ┌───────▼──────────┐
                          │ localStorage│    │ TanStack server  │
                          │  (signed   │    │  functions       │
                          │   out)     │    │  (Cloudflare     │
                          └────────────┘    │   Worker + D1)   │
                                            └──────────────────┘
```

- The same `PromptLibraryClient` interface backs both modes — components don't know or care where a prompt lives.
- Signed-out users get a fully functional app with zero network calls.
- Signing in promotes the in-memory snapshot to D1 on next write; subsequent loads hydrate from the server.

### Project layout

```
src/
├── components/ui/             # shadcn/ui primitives
├── features/
│   ├── auth/                  # Clerk shell + appearance
│   └── prompt-library/
│       ├── components/        # Tree panel, workspace, help overlay
│       ├── hooks/             # Command palette / keyboard commands
│       ├── lib/               # Validation & formatting utilities
│       ├── server/            # TanStack server functions (D1 access)
│       ├── storage/           # local + remote storage adapters
│       ├── store/             # Zustand store
│       └── types.ts
├── lib/                       # App providers, query client, SEO, site config
└── routes/                    # File-based TanStack Router routes
migrations/                    # D1 SQL migrations
tests/                         # Vitest + workers pool
```

---

## 🔧 Development

### Available scripts

| Command               | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `pnpm dev`            | Start the dev server on port 8080                            |
| `pnpm build`          | Build for production (outputs to `.output/`)                 |
| `pnpm preview`        | Preview the production build locally                         |
| `pnpm test`           | Run the Vitest suite (Cloudflare workers pool)               |
| `pnpm lint`           | Run ESLint                                                   |
| `pnpm format`         | Format with Prettier                                         |
| `pnpm typecheck`      | Regenerate Worker types and run `tsc`                        |
| `pnpm cf-typegen`     | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |
| `pnpm check`          | Run all checks (format, lint, typecheck, deploy dry-run)     |
| `pnpm deploy`         | Deploy to Cloudflare Workers                                 |
| `pnpm deploy:dry-run` | Validate deployment without publishing                       |

### Environment variables

Copy `.env.example` to `.env`:

| Variable                     | Required | Description                                                  |
| ---------------------------- | -------- | ------------------------------------------------------------ |
| `VITE_SITE_URL`              | optional | Canonical origin for SEO/social tags (defaults to localhost) |
| `VITE_CLERK_PUBLISHABLE_KEY` | yes      | Clerk publishable key (`pk_test_…` or `pk_live_…`)           |
| `CLERK_SECRET_KEY`           | yes      | Clerk secret key (`sk_test_…` or `sk_live_…`) — server-only  |

Only `VITE_*` variables are exposed to the client. Server functions read `CLERK_SECRET_KEY` from the Worker environment.

### Database

The remote prompt store is a single Cloudflare D1 table. Migrations live in [`migrations/`](migrations) and run automatically on deploy. To apply locally:

```bash
pnpx wrangler d1 migrations apply promptrc --local
```

### Adding UI components

```bash
npx shadcn@latest add <component-name>
```

---

## 🌐 Deployment

promptrc is configured for [Cloudflare Workers](https://workers.cloudflare.com) with a D1 database binding (`DB`).

```bash
pnpm build
pnpm deploy
```

The `wrangler.jsonc` file pins the production routes (`promptrc.app`, `www.promptrc.app`) and the D1 database id. Fork-and-deploy your own copy by:

1. Creating a new D1 database: `pnpx wrangler d1 create <your-name>`
2. Updating `wrangler.jsonc` with your `database_id`, `name`, and `routes`
3. Setting `CLERK_SECRET_KEY` as a Worker secret: `pnpx wrangler secret put CLERK_SECRET_KEY`

Because the app runs through Nitro, retargeting another platform is a one-line change in [`nitro.config.ts`](nitro.config.ts).

---

## 🎨 Design philosophy

promptrc treats the prompt library as a **piece of developer tooling**, not a content-management UI. That choice drives every interaction:

- **Single-letter keys, no chords.** If a power user can't reach an action with one press, the workflow is wrong.
- **Toasts, not modals.** Confirm-by-repeat (`x` twice) replaces blocking dialogs. The library never gets in your way.
- **Monospace everywhere that matters.** Prompt bodies, filenames (`.md` projection), and the help overlay all read like a terminal session.
- **Local-first by default.** The app is useful before you sign in, before you sync, before you trust it. Cloud is an upgrade path, not a gate.
- **No prompt left behind.** Use counts, timestamps, and tags exist to surface the prompts you actually reuse — nothing is buried.

The palette is a warm dark slate with a signature amber accent (`#ffb454`) borrowed from terminal status lines.

---

## 🤝 Contributing

Contributions are welcome. Please open an issue first for anything beyond a small fix.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/your-thing`)
3. Run `pnpm check` before committing
4. Open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
  <sub>Built by <a href="https://github.com/AdiRishi">Adishwar Rishi</a></sub>
</div>
