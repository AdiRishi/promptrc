# promptrc

Terminal-inspired prompt library built with TanStack Start, React 19, Tailwind v4, and Nitro.

## Quick start

```bash
pnpm install
pnpm dev
```

The app runs at `http://localhost:8080`.

## Scripts

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `pnpm dev`            | Start the local dev server on port 8080      |
| `pnpm build`          | Build the app and generate deploy assets     |
| `pnpm preview`        | Preview the production build locally         |
| `pnpm deploy`         | Deploy the built Worker from `.output`       |
| `pnpm deploy:dry-run` | Validate the Worker bundle without deploying |
| `pnpm test`           | Run Vitest                                   |
| `pnpm typecheck`      | Run `tsc --noEmit`                           |
| `pnpm check`          | Format and lint with auto-fix                |

## Cloudflare deployment

This repo is configured to deploy the TanStack Start app to Cloudflare Workers through Nitro.

- `nitro.config.ts` uses the `cloudflare_module` preset and asks Nitro to generate Wrangler config at build time.
- `pnpm build` outputs the Worker bundle to `.output/server` and Nitro's deploy redirect config to `.output`.
- `pnpm deploy` runs `wrangler` against that generated output, matching the pattern used in `~/personal/render-md`.
- `preview_urls` is enabled so PR builds can upload non-production Worker versions and return preview links.
- the generated Wrangler config publishes the production Worker to the `promptrc.app` and `www.promptrc.app` custom domains.

### Required env

Set `VITE_SITE_URL` to your real production origin before the first real deploy. The build uses it for:

- canonical URLs
- Open Graph and Twitter metadata
- JSON-LD structured data
- generated `robots.txt`
- generated `sitemap.xml`

Set it to the canonical apex host (`https://promptrc.app`). The shared SEO helpers normalize `www.promptrc.app` back to the apex URL for canonical tags and related metadata.

For local development, copy `.env.example` to `.env` and adjust values there as needed. This repo ignores `.env`, so local environment changes stay out of git.

Local example:

```bash
VITE_SITE_URL=https://promptrc.app pnpm build
```

## GitHub Actions

Three workflows are included:

- `.github/workflows/ci.yml` runs formatting, linting, type checks, tests, and a production build.
- `.github/workflows/deploy.yml` deploys `main` to Cloudflare after CI succeeds.
- `.github/workflows/preview.yml` uploads a versioned Worker preview for each pull request and comments with the preview URL.

### GitHub secrets

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

### GitHub repo variable

- `SITE_URL`

The deploy and preview workflows pass `vars.SITE_URL` through to `VITE_SITE_URL` at build time.

## SEO and deployment extras

- `src/lib/seo.ts` centralizes page metadata, canonical links, and JSON-LD helpers.
- `src/lib/vite-sitemap-plugin.ts` regenerates `public/sitemap.xml` and `public/robots.txt` during builds.
- `public/manifest.json` is updated for the shipped app instead of the starter template.

## Next step

Once you are ready to create the Cloudflare-side resources, we just need to wire in the real domain and any custom routes or domains in the generated Wrangler config path.
