# Testing & automation

## Commands

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint |
| `npm test` / `npm test -- --run` | Vitest (unit + component) |
| `npm run test:coverage` | Vitest + coverage |
| `npm run test:e2e` | Playwright: full e2e (Chromium, serial) |
| `npm run test:e2e:smoke` | Playwright: tests tagged `@smoke` only |
| `npm run playwright:install` | Install Chromium to `.pw-browsers` |

E2e uses `prisma/e2e.db` and starts the production server (see `playwright.config.ts`). Vitest excludes `e2e/**` (see `vitest.config.ts`).

## API route inventory (coverage)

| Route | Vitest / Playwright API |
|-------|-------------------------|
| `GET /api/health` | e2e `api.spec` (`@smoke`) |
| `GET /api/plex/status` | e2e `api.spec` (`@smoke`) |
| `GET/POST /api/media` | e2e `api.spec` |
| `PATCH/DELETE /api/media/[id]` | e2e `api.spec` |
| `POST /api/media/reorder` | e2e `api.spec` |
| `POST /api/media/[id]/mark-episode-watched` | e2e `api.spec` |
| `GET /api/media/[id]/playback` | e2e `api.spec` |
| `GET /api/what-next` | e2e `api.spec` |
| `GET /api/plex/on-deck` | requires Plex token |
| `POST /api/plex/sync-watched` | e2e `api.spec` (503 without Plex) |
| `POST /api/plex/webhook` | e2e `api.spec` (multipart) |
| `POST /api/sync-seasons` | e2e `api.spec` (TMDB) |
| `GET /api/tmdb/*` | e2e `api.spec` (TMDB) + unit where pure |
| `GET /api/media/[id]/tv-season-episodes` | browser paths + manual |

Add a row here when you add a route; prefer an API-level Playwright `request` test or a Vitest test for pure logic.

## Playwright tags

- **`@smoke`**: fast checks (smoke routes + health API). Run with `npm run test:e2e:smoke`.
- Untagged / full suite: `npm run test:e2e` (includes Discover, Library, API, etc.).

## Plex: webhook vs polling

- **Webhooks** (`POST /api/plex/webhook`): real-time on `media.scrobble`.
- **Polling** (`POST /api/plex/sync-watched`): same merged On Deck + partial library as `GET /api/plex/on-deck`, applies WatchBox updates when playback is past the configured threshold (default 90%, `PLEX_SYNC_THRESHOLD` / `PLEX_SCROBBLE_THRESHOLD`).
