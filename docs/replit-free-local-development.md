# Replit-Free Local Development

This repo was downloaded from Replit and adjusted so it can be developed and deployed without Replit-specific runtime dependencies.

## What Changed

- Removed Replit Vite plugins from the frontend apps.
- Removed Replit project metadata files: `.replit` and `replit.md`.
- Removed Replit package catalog entries from `pnpm-workspace.yaml`.
- Removed Linux/Replit-only native package exclusions so macOS can install the correct Rollup, esbuild, Tailwind, and related native packages.
- Trimmed the `flight-sim` app by removing unused shadcn/Radix UI scaffold files, hooks, utility helpers, and unused frontend dependencies.
- Updated the `flight-sim` game loop to scale movement and timers from elapsed frame time, keeping gameplay speed consistent across display refresh rates.
- Fixed `flight-sim` keyboard listener cleanup so global handlers are removed correctly.
- Removed unused Drizzle/Postgres database scaffolding (`lib/db`) and related workspace references.
- Added local defaults for required environment values:
  - `@workspace/flight-sim`: `PORT=5173`, `BASE_PATH=/`
  - `@workspace/mockup-sandbox`: `PORT=5174`, `BASE_PATH=/`
  - `@workspace/api-server`: `PORT=5000`
- Updated `.gitignore` so `node_modules/` and `.pnpm-store/` stay out of git.

## Local Commands

Install dependencies:

```bash
pnpm install
```

Run the game locally:

```bash
pnpm --filter @workspace/flight-sim run dev
```

Open:

```text
http://localhost:5173/
```

Run the full verification build:

```bash
pnpm run build
```

## Cleanup

Dependencies are installed inside the repo. The pnpm store for this workspace is also local:

```text
/Users/stba/Developer/buelli/fighter-game/.pnpm-store/v11
```

To remove installed packages and the local store:

```bash
rm -rf /Users/stba/Developer/buelli/fighter-game/node_modules
rm -rf /Users/stba/Developer/buelli/fighter-game/.pnpm-store
```

## Last Verified

- `./node_modules/.bin/tsc --build` succeeded.
- `./node_modules/.bin/tsc -p artifacts/api-server/tsconfig.json --noEmit` succeeded.
- `pnpm-lock.yaml` parsed as YAML after removing the stale database entries.
