# Fighter Game

Local development baseline for a pnpm workspace containing a 2D fighter game, a small Express API, and shared API/client libraries.

## Requirements

- Node.js 24
- pnpm 11

## Install

```bash
pnpm install
```

Dependencies are installed in this workspace. The local pnpm store is ignored by git at `.pnpm-store/`.

## Run Locally

Run the game frontend:

```bash
./start-app.sh
```

Open:

```text
http://localhost:5173/
```

The root `start` and `dev` package scripts call the same helper.
The helper runs `pnpm --filter @workspace/flight-sim run dev`.

Run the API server:

```bash
pnpm --filter @workspace/api-server run dev
```

The API defaults to port `5000` and exposes:

```text
GET /api/healthz
```

## Verify

Run type checking:

```bash
pnpm run typecheck
```

Run the full workspace build:

```bash
pnpm run build
```

## Workspace Map

- `artifacts/flight-sim` - main React/Vite game app
- `artifacts/api-server` - Express API server
- `artifacts/mockup-sandbox` - Vite mockup/sandbox app
- `lib/api-spec` - OpenAPI spec and Orval codegen
- `lib/api-client-react` - generated React Query API client
- `lib/api-zod` - generated Zod API schemas
- `scripts` - workspace utility scripts
- `docs/replit-free-local-development.md` - notes on the Replit-free migration

## Code Generation

Regenerate API clients and schemas from the OpenAPI spec:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Deployment Notes

The game production build is written to:

```text
artifacts/flight-sim/dist/public
```

The API production build is written to:

```text
artifacts/api-server/dist
```

This repo no longer depends on Replit project metadata or Replit Vite plugins. See `docs/replit-free-local-development.md` for the cleanup reference.

## Cleanup

Remove installed dependencies and the local pnpm store:

```bash
rm -rf node_modules .pnpm-store
```
