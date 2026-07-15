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

## Gameplay Rules

- Missions progress through 500 levels. The daytime city backdrop changes to a space scene from level 50 onward.
- Boss encounters are available from level 10. Milestone bosses appear at levels 10, 15, and every fifth level from level 20 onward.
- TIE fighters perform an evasive vertical dodge roughly every 1.5 seconds.
- At the end of a mission, the score is converted to credits at a 1:1 rate (for example, 1,000 points award 1,000 credits).
- Shop skins and upgrades are displayed in rarity order: rare, epic, then legendary. Legendary items receive an additional visual glow.
- Purchasable shop items cost 50,000 credits for rare, 80,000 credits for epic, and 120,000 credits for legendary rarity. The default Steel skin remains free.

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
