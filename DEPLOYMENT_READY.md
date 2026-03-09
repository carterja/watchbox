# WatchBox - Ready for GitHub Deployment! 🚀

All deployment files have been created and configured. Here's what's ready:

## ✅ Files Created

1. **Dockerfile** - Multi-stage build for optimized production image
2. **docker-compose.yml** - Portainer stack configuration
3. **.github/workflows/deploy.yml** - GitHub Actions CI/CD pipeline
4. **.dockerignore** - Optimized Docker build context
5. **.gitignore** - Updated for proper git tracking
6. **GITHUB_SETUP.md** - Complete step-by-step setup guide
7. **README.md** - Updated with deployment instructions

## 🎯 Next Steps

### 1. Create GitHub Repository

Go to: https://github.com/new

- Name: `watchbox`
- Description: "Personal movie & TV show tracker - Goodreads for media"
- Private or Public (your choice)
- Don't initialize with README (we have one)

### 2. Initialize and Push

```bash
cd /Users/carter/media-tracker

# Initialize git
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit - WatchBox setup with Portainer deployment"

# Add remote
git remote add origin https://github.com/carterja/watchbox.git

# Push to main
git branch -M main
git push -u origin main
```

### 3. Configure GitHub Secrets

Go to: Repository Settings → Secrets and variables → Actions

Add these 5 secrets:

1. **PORTAINER_URL** - Your Portainer URL (e.g., `https://portainer.example.com`)
2. **PORTAINER_ACCESS_TOKEN** - Get from Portainer → My account → Access tokens
3. **PORTAINER_STACK_ID** - Get after creating stack (from URL)
4. **PORTAINER_ENDPOINT_ID** - Usually `1` for local Docker
5. **TMDB_API_KEY** - Your TMDB API key

### 4. Create Portainer Stack

1. Log into Portainer
2. Stacks → Add stack
3. Name: `watchbox`
4. Paste the contents of `docker-compose.yml`
5. Add environment variable: `TMDB_API_KEY=your_key`
6. Deploy
7. Note the Stack ID from the URL for GitHub secrets

### 5. Push and Deploy

Once secrets are configured:

```bash
git push origin main
```

GitHub Actions will automatically:
- Build Docker image
- Push to ghcr.io
- Deploy to Portainer
- Restart your container

## 📦 Docker Build Configuration

**Multi-stage build**:
- Stage 1: Install dependencies
- Stage 2: Build Next.js app
- Stage 3: Production runtime (minimal size)

**Features**:
- Standalone output (self-contained)
- SQLite database in volume
- Auto-runs migrations on startup
- Health checks included
- Runs as non-root user

**Image will be published to**: `ghcr.io/carterja/watchbox:latest`

## 🔄 Auto-Deployment

Every push to `main` triggers:
1. ✅ Build & test
2. ✅ Create Docker image
3. ✅ Push to registry
4. ✅ Update Portainer stack
5. ✅ Restart container

## 📊 Port Configuration

- Container exposes: `3000`
- Portainer maps to: `3000` (configurable)
- Access at: `http://your-server-ip:3000`

## 💾 Data Persistence

- Volume: `watchbox-data`
- Location: `/app/data`
- Contains: `watchbox.db` (SQLite database)
- Persists across container restarts
- Backup recommended before major updates

## 🔐 Security

- Images stored in GitHub Container Registry
- Secrets managed via GitHub Actions
- Container runs as non-root user (nextjs:nodejs)
- Environment variables injected at runtime

## 📖 Full Documentation

See `GITHUB_SETUP.md` for detailed setup instructions, troubleshooting, and advanced configuration.

---

**Ready to deploy! Follow the steps above to get WatchBox running on your server.** 🎬
