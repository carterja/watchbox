#!/bin/sh
set -e
# Ensure data directory is writable by nextjs (uid 1001) when using a mounted volume
if [ -d /app/data ]; then
  chown -R nextjs:nodejs /app/data 2>/dev/null || true
fi
exec su-exec nextjs "$@"
