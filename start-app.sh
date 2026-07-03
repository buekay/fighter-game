#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required to start the app."
  echo "Install it first, then run this script again."
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

exec pnpm --filter @workspace/flight-sim run dev
