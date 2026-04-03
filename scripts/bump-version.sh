#!/usr/bin/env bash
# Bump package.json patch version locally before you commit + push.
# This replaces the old CI workflow that pushed "chore: bump version" after every
# main push (which left origin/main one commit ahead and caused rejected pushes).
set -euo pipefail
cd "$(dirname "$0")/.."
npm version patch --no-git-tag-version
VER=$(node -p "require('./package.json').version")
echo "Version is now ${VER}. Include in your commit, e.g.:"
echo "  git add package.json package-lock.json && git commit -m \"chore: bump version to ${VER}\""
