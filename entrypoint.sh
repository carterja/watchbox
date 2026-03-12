#!/bin/sh
set -e
# Ensure data directory and DB are writable by nextjs when using a mounted volume.
# Volume may have been created with root-owned files from a previous run.
if [ -d /app/data ]; then
  chown -R nextjs:nodejs /app/data
  chmod -R u+rwX /app/data
fi
exec su-exec nextjs "$@"
