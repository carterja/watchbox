# WatchBox - GitHub & Portainer Setup Guide

## 📦 Step 1: Create GitHub Repository

1. **Go to GitHub**: https://github.com/new
2. **Repository details**:
   - Repository name: `watchbox`
   - Description: "Personal movie & TV show tracker - Goodreads for media"
   - Visibility: Private (or Public if you want)
   - ✅ Add README (we already have one)
   - ✅ Add .gitignore (we already have one)
   - License: MIT (optional)

3. **Create repository**

## 🔑 Step 2: Configure GitHub Secrets

Go to your repository settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `PORTAINER_URL` | Your Portainer URL | `https://portainer.yourdomain.com` |
| `PORTAINER_ACCESS_TOKEN` | Portainer API access token | `ptr_xxxxxxxxxxxxx` |
| `PORTAINER_STACK_ID` | Stack ID (get from Portainer) | `12` |
| `PORTAINER_ENDPOINT_ID` | Endpoint ID (usually `1` for local) | `1` |
| `TMDB_API_KEY` | Your TMDB API key | `abcd1234...` |

### How to Get Portainer Access Token:
1. Log into Portainer
2. Click your username → My account
3. Scroll to "Access tokens"
4. Click "+ Add access token"
5. Name it "GitHub Actions"
6. Copy the token (save it immediately!)

### How to Get Stack ID:
1. Create the stack in Portainer first (see Step 3)
2. In Portainer, go to Stacks
3. Click on your stack
4. Look at the URL: `https://portainer.example.com/#!/1/docker/stacks/12`
5. The number at the end (`12`) is your Stack ID

## 🐳 Step 3: Create Portainer Stack

1. **Log into Portainer**
2. **Go to Stacks** → Add stack
3. **Name**: `watchbox`
4. **Build method**: Web editor
5. **Paste this compose file**:

```yaml
version: '3.8'

services:
  watchbox:
    image: ghcr.io/carterja/watchbox:latest
    container_name: watchbox
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - TMDB_API_KEY=your_tmdb_api_key_here
      - DATABASE_URL=file:/app/data/watchbox.db
    volumes:
      - watchbox-data:/app/data
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  watchbox-data:
    driver: local
```

6. **Environment variables** (in Portainer UI):
   - Add `TMDB_API_KEY` with your actual key
   
7. **Deploy the stack**

## 📤 Step 4: Push Code to GitHub

In your local `media-tracker` folder:

```bash
# Initialize git repository
git init

# Add the remote
git remote add origin https://github.com/carterja/watchbox.git

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - WatchBox setup"

# Push to GitHub
git branch -M main
git push -u origin main
```

## 🚀 Step 5: Trigger Deployment

Once pushed to `main` branch:

1. **GitHub Actions will automatically**:
   - Build the Docker image
   - Push to GitHub Container Registry (ghcr.io)
   - Deploy to your Portainer stack

2. **Monitor the deployment**:
   - Go to GitHub → Actions tab
   - Watch the workflow run
   - Should take ~5-10 minutes

3. **Check Portainer**:
   - Go to Stacks → watchbox
   - Container should restart with new image
   - Check logs for any errors

## 🌐 Step 6: Access Your App

Once deployed, access WatchBox at:
- Local: `http://your-server-ip:3000`
- If you have a reverse proxy: `https://watchbox.yourdomain.com`

## 🔄 Future Updates

To update WatchBox:

```bash
# Make changes to your code
git add .
git commit -m "Add feature X"
git push origin main
```

GitHub Actions will automatically:
1. Build new Docker image
2. Push to registry
3. Update Portainer stack
4. Restart container

## 🔧 Troubleshooting

### Build fails in GitHub Actions
- Check Actions logs in GitHub
- Verify all dependencies in package.json
- Ensure Dockerfile syntax is correct

### Portainer deployment fails
- Verify secrets are correct in GitHub
- Check Portainer access token is valid
- Ensure Stack ID is correct
- Check Portainer logs

### Container won't start
- Check Portainer logs for the container
- Verify TMDB_API_KEY is set
- Ensure port 3000 isn't already in use
- Check volume permissions

### Database issues
- Volume persists data at `/app/data/watchbox.db`
- If you need to reset: delete volume in Portainer and recreate stack
- Backup volume before major updates

## 📊 Monitoring

### Health Check
The container includes a health check that pings the app every 30 seconds.

Check in Portainer:
- Green = healthy
- Yellow = starting
- Red = unhealthy (check logs)

### Logs
View logs in Portainer:
1. Go to Containers
2. Click on watchbox container
3. Click "Logs"
4. Enable "Auto-refresh logs"

## 🔐 Security Notes

1. **Keep secrets safe**:
   - Never commit `.env` files
   - Use GitHub Secrets for sensitive data
   - Rotate Portainer tokens periodically

2. **Container registry**:
   - Images are stored in ghcr.io (GitHub Container Registry)
   - They're linked to your GitHub account
   - Can be made private in repository settings

3. **Network security**:
   - Consider using a reverse proxy (Nginx/Traefik)
   - Add SSL certificates
   - Restrict port access with firewall

## 📝 Optional: Reverse Proxy Setup

If using Nginx Proxy Manager or Traefik:

**Change docker-compose.yml ports**:
```yaml
ports:
  - "3000"  # Internal only
```

**Add labels for Traefik**:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.watchbox.rule=Host(`watchbox.yourdomain.com`)"
  - "traefik.http.services.watchbox.loadbalancer.server.port=3000"
```

---

## ✅ Checklist

- [ ] Created GitHub repository
- [ ] Added GitHub Secrets (5 secrets)
- [ ] Created Portainer stack
- [ ] Pushed code to GitHub
- [ ] GitHub Actions ran successfully
- [ ] Container is running in Portainer
- [ ] App is accessible on port 3000
- [ ] TMDB API is working (search for movies)
- [ ] Database persists after restart

**You're all set! Enjoy WatchBox! 🎬**
