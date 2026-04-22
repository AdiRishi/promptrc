# TanStack Start Launchpad

**A clean TanStack Start starter with React Query, Tailwind v4, shadcn/ui, and strong day-one DX.**

[![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.x-blue?logo=react)](https://tanstack.com/start)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.x-ff4154)](https://tanstack.com/query)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Uses pnpm](https://img.shields.io/badge/pnpm-10.x-orange?logo=pnpm)](https://pnpm.io/)

## What's included

- **[TanStack Start](https://tanstack.com/start)** for SSR-ready routing, server functions, and app structure
- **TanStack Query** with app-wide provider setup and router SSR query integration
- **[Tailwind CSS v4](https://tailwindcss.com/)** plus **[shadcn/ui](https://ui.shadcn.com/)** primitives for fast, polished UI work
- **TanStack Router devtools** and **React Query devtools** for quick feedback while building
- **Strict TypeScript, ESLint, and Prettier** with import sorting and Tailwind class ordering
- **Lucide icons** and a small starter surface that stays out of the way

## Prerequisites

- Node.js 20+ (LTS)
- pnpm 10.x (pinned via `packageManager` in `package.json`)

## Quick start

```bash
pnpm install
pnpm dev
```

The app runs at `http://localhost:8080`.

## Tech stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Framework | TanStack Start (React 19 + Vite 8)      |
| Routing   | TanStack Router (type-safe, file-based) |
| Data      | TanStack Query                          |
| Styling   | Tailwind CSS v4 + shadcn/ui             |
| Testing   | Vitest + Testing Library                |
| Runtime   | Nitro                                   |
| Language  | TypeScript 6 (strict)                   |

## Project structure

```text
src/
  routes/                     → File-based routes and layout shells
  components/ui/              → shadcn/ui primitives
  lib/
    query-client.ts           → Shared React Query client
    app-provider.tsx          → App-wide provider wrapper
  global-styles/tailwind.css  → Theme tokens and Tailwind layers
```

## Scripts

| Command          | Description                                  |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Start the TanStack Start dev server on 8080  |
| `pnpm dev:web`   | Alias of `pnpm dev`                          |
| `pnpm build`     | Create the production build                  |
| `pnpm preview`   | Preview the built app locally                |
| `pnpm test`      | Run Vitest                                   |
| `pnpm typecheck` | Run `tsc --noEmit`                           |
| `pnpm lint`      | Run ESLint                                   |
| `pnpm format`    | Format the repo with Prettier                |
| `pnpm check`     | Format and apply ESLint fixes in one command |

## Where to extend

- Add new pages in `src/routes/`
- Introduce loaders or server functions where TanStack Start fits your app best
- Add your own data layer without unwinding generated bindings or database-specific glue
- Expand the design system with `pnpm shadcn add <component-name>`

## Resources

- [TanStack Start docs](https://tanstack.com/start)
- [TanStack Query docs](https://tanstack.com/query/latest)
- [TanStack Router docs](https://tanstack.com/router/latest)
- [Tailwind CSS v4 docs](https://tailwindcss.com/)
- [shadcn/ui docs](https://ui.shadcn.com/)
