# WatchBox

A personal **Goodreads-style tracker for movies and TV shows**. Track your watchlist with three status categories: **Yet to start**, **In progress**, and **Finished**. Add titles via search or from TMDB's curated lists.

## Features

- 🎬 **Three Status Categories**: Yet to start, In progress, Finished
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
4. Add environment variables in Portainer UI
5. Deploy the stack

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TMDB_API_KEY` | TMDB API key for fetching movie/TV data | Yes |
| `DATABASE_URL` | SQLite database path | Yes |
| `NODE_ENV` | Environment (production/development) | No |

## GitHub Actions Deployment

This repository includes automated deployment to your Portainer instance:

1. Fork or clone this repository
2. Add GitHub Secrets:
   - `PORTAINER_URL`: Your Portainer URL
   - `PORTAINER_ACCESS_TOKEN`: Portainer access token
   - `PORTAINER_STACK_ID`: Stack ID to update
   - `TMDB_API_KEY`: Your TMDB API key

3. Push to `main` branch to trigger deployment

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
