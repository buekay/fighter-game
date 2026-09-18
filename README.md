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
- `docs/architecture.md` - Modulgrenzen, Persistenz- und Performance-Regeln

## Gameplay Rules

- Missions progress through 500 levels. The daytime city backdrop changes to a space scene from level 50 onward.
- The tank, spider robot, submarine, and city use enlarged mechanical models with metal armor, pistons, joints, reactors, damage marks, and a shared phase-marked boss health bar. Each has three unique special attacks with 1.5 seconds of locked-target warning; attacks pause when frozen and accelerate in later health phases. The city shares one attack controller and health bar across its surviving defense systems. The Titan retains its original model, size, health bar, and abilities.
- Boss Fight mode has five encounters in order: Titan, tank, spider robot, submarine, and fortress city. Each encounter starts with 9,000 HP; the city splits this pool across six destructible flame, rocket, and cannon defenders. Destroy all defenders to complete the final encounter.
- Boss encounters are available from level 3. Early milestone bosses appear at levels 3, 5, 8, 10, 12, 15, and 18. The five major bosses appear at levels 20 (Titan), 25 (tank), 30 (spider robot), 35 (submarine), and 40 (city). From level 50, this order repeats every ten levels: 50/60/70/80/90, then 100/110/120/130/140, and so on. Level progression waits for each major boss encounter to finish; large score gains cannot skip an encounter.
- TIE fighters perform an evasive vertical dodge roughly every 1.5 seconds.
- From level 20 onward, specialist enemies can appear: healers repair damaged allies, shield generators protect nearby ships, and kamikaze fighters rush the player.
- From level 50 onward, enemies can also spawn as armored, swift, or frenzied elites with increased score rewards.
- Near misses extend the current combo window, load ultimates, and award bonus score.
- Every fourth level rotates an endless-sector mutator. Every tenth level offers three random choices from a pool of 15 risk/reward routes.
- Bosses announce phase changes and telegraph their radial special attacks.
- Flawless formation waves award triple credits, and the end-of-run report records combat statistics and per-mode personal records.
- At the end of a mission, the score is converted to credits at a 1:1 rate (for example, 1,000 points award 1,000 credits).
- Shop skins and upgrades are displayed in rarity order: rare, epic, legendary, ultra legendary, then ultimate. Legendary and higher items receive an additional visual glow; ultimate uses an iridescent, colorful silver treatment.
- Purchasable shop items cost 50,000 credits for rare, 100,000 credits for epic, 200,000 credits for legendary, 400,000 credits for ultra legendary, and 1,000,000 credits for ultimate rarity. The default Steel skin remains free.

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
