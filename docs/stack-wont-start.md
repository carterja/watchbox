# Stack won't start

When the Docker stack fails to start or the container keeps restarting, use these steps.

---

## Debug from the server (command line)

SSH into the server and use the project directory (where `docker-compose.yml` lives—e.g. a git clone or where Portainer builds from).

### 1. Build and see full output

```bash
cd /path/to/media-tracker   # or wherever the stack is
docker compose build --no-cache
```

You’ll see every build step. If the build fails, the last lines will show the error (e.g. `npm run build` exit code 1, or a missing file).

### 2. Run in the foreground (no detach)

```bash
export TMDB_API_KEY="your-key-here"   # if you use Discover; optional to start the app
docker compose up
```

Don’t use `-d`. Logs stream in the terminal. You’ll see:

- Entrypoint fixing permissions
- `prisma db push` output (or errors)
- `backfill-viewer` output
- `node server.js` and any crash or listen message

When something fails, the error is right there. Ctrl+C stops the stack.

### 3. After it’s running (or to inspect a failed start)

If you started with `docker compose up -d` elsewhere (e.g. Portainer):

```bash
docker compose ps -a
docker compose logs -f app
```

`-f` follows the logs. For a one-off container that already exited:

```bash
docker compose run --rm app sh
# then inside: ls -la /app, cat /app/server.js 2>/dev/null || true, etc.
```

### 4. Quick checklist

| Step              | Command / check |
|-------------------|------------------|
| Build fails       | `docker compose build --no-cache` → read last error. |
| Start fails       | `docker compose up` (no `-d`) → read where it stops. |
| Need env var      | `export TMDB_API_KEY=...` before `docker compose up`, or set in `.env` next to `docker-compose.yml`. |
| Logs of running   | `docker compose logs -f app` |

---

## Remove and re-add the stack in Portainer

Sometimes Portainer keeps stale build/run state. A clean remove and re-add can fix it.

**Important:** when removing the stack, **do not** remove the volume, or you’ll lose your database.

1. In Portainer: **Stacks** → your stack (e.g. *watchbox*) → **Editor** or **Summary**.
2. Click **Remove the stack**.
3. When prompted for “Remove associated volumes” or similar: **uncheck** the volume (e.g. `watchbox-data`). Remove only the stack/containers.
4. Re-add the stack:
   - **Add stack** → paste your `docker-compose.yml` (or use “Build from Git” and point at your repo/branch).
   - Set **Environment variables** (e.g. `TMDB_API_KEY`) if you use them.
   - Deploy.

The existing volume will be reused when the new stack starts, so your data stays. If you ever need to confirm the volume is still there: **Volumes** in Portainer, or on the server: `docker volume ls | grep watchbox`.

---

## 1. Check the container logs

In **Portainer**: open your stack → click the **app** container → **Logs**. Or from the server:

```bash
docker ps -a
docker logs <container_name_or_id>
```

Look for the first error. Common messages:

- **`wget: not found`** → Fixed in the image by installing `wget` for the healthcheck. Rebuild and redeploy.
- **`Cannot find module`** or **`server.js` missing** → Build may be broken or standalone output not copied. Rebuild from repo root.
- **`EACCES` / permission denied** on `/app/data` → Volume permissions. The entrypoint tries to fix this; if it still fails, on the host run `chown -R 1001:1001 <volume_path>` (see `docker volume inspect watchbox-data` for path).
- **`TMDB_API_KEY`** → Set the env var in the stack (Portainer → stack → **Environment variables**). The app can start without it, but TMDB features (Discover, search) will fail until it’s set.
- **Prisma / database errors** on startup → `db push` or backfill failed. Check that the volume is writable and `DATABASE_URL` is `file:/app/data/watchbox.db`.
- **Build exits with code 1** (during `npm run build` in the image) → Often ESLint/TypeScript in the container; the app now has `ignoreDuringBuilds` for both. If it still fails, the build may be out of memory—try increasing Docker/Portainer build memory or building on the server with `docker compose build --no-cache` to see the real error.

## 2. Rebuild and redeploy

After pulling the latest code (including the Dockerfile that installs `wget` and any other fixes):

1. In Portainer: **Stacks** → your stack → **Editor** → **Update the stack** (or redeploy).
2. Or on the server: `cd` to the project and run `docker compose build --no-cache && docker compose up -d`.

## 3. Healthcheck

The stack uses a healthcheck with `wget`. If the healthcheck keeps failing even though the app works when you open it in a browser, the container may be marked unhealthy. The image includes `wget` so the check should pass after a rebuild. If you still see health issues, you can temporarily relax or disable the healthcheck in `docker-compose.yml` to get the stack running, then debug the check separately.
