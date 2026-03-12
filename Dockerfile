FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
# Full node_modules so Prisma CLI has all deps (effect, empathic, fast-check, etc.) at runtime
COPY --from=builder /app/node_modules ./node_modules

# Create data directory for SQLite; create .next/cache so Next.js can write at runtime
RUN mkdir -p /app/data /app/.next/cache && chown -R nextjs:nodejs /app

# su-exec so we can fix volume permissions then drop to nextjs
RUN apk add --no-cache su-exec

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 9516

ENV PORT=9516
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/watchbox.db"

# Entrypoint: ensure /app/data is writable by nextjs when volume is mounted, then run CMD as nextjs
ENTRYPOINT ["/entrypoint.sh"]
# Run migrations, backfill viewer (null/empty -> both), then start app
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push && node scripts/backfill-viewer.mjs && node server.js"]
