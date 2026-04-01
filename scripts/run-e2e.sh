#!/usr/bin/env bash
set -euo pipefail

BROWSERS_DIR="$(pwd)/.pw-browsers"

# ── 1. Check browser directory exists and is non-empty ───────────────────────
if [ ! -d "$BROWSERS_DIR" ] || [ -z "$(ls -A "$BROWSERS_DIR" 2>/dev/null)" ]; then
  echo ""
  echo "❌  Playwright browsers not installed."
  echo ""
  echo "    Run:  npm run playwright:install"
  echo ""
  exit 1
fi

# ── 2. Check for an actual chromium binary ───────────────────────────────────
if ! find "$BROWSERS_DIR" \( -name "headless_shell" -o -name "chrome-headless-shell" -o -name "chromium" \) -type f 2>/dev/null | grep -q .; then
  echo ""
  echo "❌  Chromium binary not found in $BROWSERS_DIR"
  echo "    Browser cache may be corrupt."
  echo ""
  echo "    Run:  rm -rf .pw-browsers && npm run playwright:install"
  echo ""
  exit 1
fi

# ── 3. Hand off to playwright ────────────────────────────────────────────────
exec npx playwright test "$@"
