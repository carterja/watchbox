#!/usr/bin/env bash
# Test Docker build and run locally before pushing.
# Usage:
#   ./scripts/test-docker.sh          — build + full run (compose up)
#   ./scripts/test-docker.sh --smoke  — build + only test "prisma db push" then exit

set -e
cd "$(dirname "$0")/.."

echo "Building image..."
docker compose build

if [ "$1" = "--smoke" ]; then
  echo ""
  echo "Smoke test: running 'prisma db push' in a one-off container..."
  docker compose run --rm app node node_modules/prisma/build/index.js db push
  echo "OK: prisma db push succeeded."
  exit 0
fi

echo ""
echo "Running container (Prisma db push + server startup)..."
echo "App will be at http://localhost:9516 — Ctrl+C to stop."
echo ""

# Use .env if present so TMDB_API_KEY is set; otherwise dummy (app may complain but DB/Prisma will run)
export TMDB_API_KEY="${TMDB_API_KEY:-dummy-key-for-build-test}"
docker compose up
