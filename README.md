# MyThinkRead

AI-native reading platform — create with AI, read in the cloud, own your data.

## Quickstart

```bash
# Install dependencies
pnpm install

# Start the API (Cloudflare Workers local dev on :8787)
pnpm dev:api

# In another terminal, start the web app (Vite dev on :3000)
pnpm dev:web
```

The web app proxies `/api` requests to the API server automatically.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in real secrets for non-dev runs:

| Variable | Purpose | Required in prod? |
|---|---|---|
| `ENVIRONMENT` | `development` or `production` | Yes |
| `JWT_SECRET` | Signing key for auth tokens | Yes |
| `PINATA_JWT` | IPFS pinning via Pinata | Yes |
| `BUNDLR_PRIVATE_KEY` | Arweave upload wallet (or `IRYS_PRIVATE_KEY`) | Yes |
| `AZURE_TTS_KEY` | Azure TTS fallback key | No (falls back to Workers AI) |
| `R2_PUBLIC_URL` | Public base URL for R2 assets | No |

For local Cloudflare Workers, place secrets in `apps/api/.dev.vars` (wrangler reads it automatically).

## Testing

```bash
# Run all tests (API + web) in non-watch mode
pnpm -r test -- --run
```

- API tests use `@cloudflare/vitest-pool-workers` with miniflare D1/KV/R2/Queue bindings.
- Web tests use `jsdom` + `@testing-library/react`.

## Deployment

### API (Cloudflare Workers)

```bash
cd apps/api
pnpm wrangler deploy
```

Set production secrets with:

```bash
wrangler secret put JWT_SECRET
wrangler secret put PINATA_JWT
wrangler secret put BUNDLR_PRIVATE_KEY
```

### Web (Cloudflare Pages)

```bash
cd apps/web
pnpm build
# Deploy the `dist` folder via Cloudflare Pages or `wrangler pages deploy dist`
```

## Architecture

See [`docs/`](docs/) for detailed architecture and design documents:

- [`docs/01-prd.md`](docs/01-prd.md) — Product Requirements
- [`docs/02-architecture.md`](docs/02-architecture.md) — System Architecture
- [`docs/03-technical-spec.md`](docs/03-technical-spec.md) — Technical Specification
- [`docs/04-task-breakdown.md`](docs/04-task-breakdown.md) — Task Breakdown
- [`docs/05-test-spec.md`](docs/05-test-spec.md) — Test Specification
- [`docs/KNOWN-GAPS.md`](docs/KNOWN-GAPS.md) — Known gaps and future work

## Tech Stack

- **API**: Cloudflare Workers + Hono + D1 (SQLite) + KV + R2 + Queues
- **Web**: React 19 + Vite + Tailwind CSS + Zustand
- **Monorepo**: pnpm workspaces
