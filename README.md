# Fighter Game

Local development workspace for the 2D fighter game.

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
pnpm dev
```

Open:

```text
http://localhost:5173/
```

The root `start` and `dev` package scripts call `./start-app.sh`, which runs `@workspace/flight-sim`.

## Verify

Run the focused rule tests:

```bash
pnpm test
```

Run type checking:

```bash
pnpm run typecheck
```

Run the production build:

```bash
pnpm run build
```

## Workspace Map

- `artifacts/flight-sim` - React/Vite canvas game app

## Deployment Notes

The game production build is written to:

```text
artifacts/flight-sim/dist/public
```

## Cleanup

Remove installed dependencies and the local pnpm store:

```bash
rm -rf node_modules .pnpm-store
```
