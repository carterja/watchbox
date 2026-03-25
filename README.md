# WatchBox

A personal **Goodreads-style tracker for movies and TV shows**. Track your watchlist with three status categories: **Unwatched**, **In progress**, and **Finished**. Add titles via search or from TMDB's curated lists.

## Features

- 🎬 **Three Status Categories**: Unwatched, In progress, Finished
- 🔍 **Discover**: Browse Popular, Trending, Top Rated, and Now Playing content
- 🎭 **Season Tracking**: For TV series, track which seasons you've completed
- 📊 **Filtering**: Filter by streaming service (Netflix, Apple TV, Plex, HBO, Prime, etc.)
- 👥 **Viewer Tags**: Organize shows by who watches them (Wife, Both, Me)
- ⚡ **Performance**: Optimized with database indexes, image lazy loading, and memoization
- 🎨 **Modern UI**: Clean design with hover cards and smooth transitions

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **SQLite** + **Prisma** ORM
- **TMDB API** for movie/TV metadata
- **Zod** for validation

## Lightweight / low-resource

The app is tuned to run well on a small server (e.g. 1GB RAM):

- **API caching**: `GET /api/media` uses short-lived browser cache to cut repeat requests.
- **Lazy JS**: Drag-and-drop reorder (dnd-kit) loads only when you tap "Reorder", keeping initial bundles smaller.
- **Images**: WebP only, fewer size variants; `compress: true` in Next.js for gzip.
- **Docker**: Optional `NODE_OPTIONS=--max-old-space-size=384` in `docker-compose.yml` to cap Node heap; adjust or remove if you have more RAM.

## Prerequisites

- Node.js 18+ 
- TMDB API Key (free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))

## Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/carterja/watchbox.git
   cd watchbox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your TMDB API key:
   ```
   TMDB_API_KEY=your_key_here
   DATABASE_URL="file:./dev.db"
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Docker Deployment

### Using Docker Compose

```bash
docker-compose up -d
```

### Using Portainer Stack

1. Copy the contents of `docker-compose.yml`
2. In Portainer, create a new stack
3. Paste the compose file
4. Add environment variables in Portainer UI (`TMDB_API_KEY`, and optional Plex: `PLEX_SERVER_URL`, `PLEX_TOKEN`, `PLEX_WEBHOOK_SECRET`). They must appear in `docker-compose.yml` under `environment:` or the container never receives them.
5. Deploy the stack

## Plex Media Server (optional)

WatchBox can read your **On Deck** (in-progress) list from Plex and accept **webhooks** when playback events fire (foundation for auto-updating your list later).

### Get your `X-Plex-Token`

1. Open **[app.plex.tv](https://app.plex.tv)** in a desktop browser and sign in.
2. Open **Developer Tools** (F12 or right‑click → Inspect).
3. Go to the **Network** tab, refresh the page (or click around in the app).
4. Select any request to **`plex.tv`** or your server (`*.plex.direct`, local IP, etc.).
5. In **Request headers**, copy the value of **`X-Plex-Token`**.

Treat this token like a password—don’t commit it or share it.

### Configure the app

Set in `.env`:

- **`PLEX_SERVER_URL`** — Base URL of your Plex Media Server, e.g. `http://192.168.1.10:32400` (same network as WatchBox).  
  If WatchBox runs in Docker and Plex is on the host, try `http://host.docker.internal:32400` (Docker Desktop) or your host LAN IP.
- **`PLEX_TOKEN`** — The `X-Plex-Token` from above.

Check connectivity:

```bash
curl -s http://localhost:3000/api/plex/status
```

In-progress items from Plex:

```bash
curl -s http://localhost:3000/api/plex/on-deck
```

TMDB ids are parsed when your library uses **The Movie Database** as the metadata agent for that library (best match with WatchBox, which keys off TMDB).

### Webhooks (Plex Pass)

On the Plex server: **Settings → Webhooks** → add URL:

`https://your-watchbox-domain.com/api/plex/webhook?secret=YOUR_SECRET`

Set **`PLEX_WEBHOOK_SECRET`** in `.env` to the same `YOUR_SECRET`. The handler currently acknowledges events; you can extend it to update `Media` rows on `media.scrobble`.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TMDB_API_KEY` | TMDB API key for fetching movie/TV data | Yes |
| `DATABASE_URL` | SQLite database path | Yes |
| `PLEX_SERVER_URL` | Plex server base URL (e.g. `http://IP:32400`) | No |
| `PLEX_TOKEN` | Plex `X-Plex-Token` | No |
| `PLEX_WEBHOOK_SECRET` | Shared secret for `/api/plex/webhook?secret=` | No |
| `NODE_ENV` | Environment (production/development) | No |

## GitHub Actions Deployment

This repository includes automated deployment to your Portainer instance via webhook:

1. In Portainer, open your stack and copy the **Webhook URL** (or create one in the stack’s webhooks section).
2. In GitHub: **Settings → Secrets and variables → Actions**, add:
   - `PORTAINER_WEBHOOK_URL`: The full webhook URL from Portainer (e.g. `https://portainer.example.com/api/stacks/webhooks/...`).
3. Push to the `main` branch to trigger deployment. Portainer will pull the latest image and redeploy the stack.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run db:push` - Push Prisma schema to database
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
watchbox/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── (dashboard)/  # Dashboard layout pages
│   │   │   ├── discover/ # Browse & search movies/TV
│   │   │   ├── movies/   # Movie collection
│   │   │   └── series/   # TV series collection
│   │   └── api/          # API routes
│   ├── components/       # React components
│   ├── lib/              # Utility functions
│   └── types/            # TypeScript types
├── prisma/               # Database schema
├── scripts/              # Utility scripts
└── public/               # Static assets
```

## Contributing

This is a personal project, but feel free to fork and adapt it for your own use!

## TMDB Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

## License

MIT
