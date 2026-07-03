#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if command -v pnpm >/dev/null 2>&1; then
  PNPM_CMD=(pnpm)
elif command -v corepack >/dev/null 2>&1; then
  PNPM_CMD=(corepack pnpm)
else
  echo "pnpm is required to start the app, and corepack was not found."
  echo "Install pnpm, or install Node.js with corepack enabled, then run this script again."
  exit 1
fi

if [ ! -d "$ROOT_DIR/node_modules" ]; then
  echo "Workspace dependencies are not installed yet."
  echo "Run: pnpm install"
  exit 1
fi

echo "Starting Fighter Game..."
echo "Open http://localhost:5173/ once the dev server is ready."
echo

export pnpm_config_verify_deps_before_run=false
exec "${PNPM_CMD[@]}" --filter @workspace/flight-sim run dev
