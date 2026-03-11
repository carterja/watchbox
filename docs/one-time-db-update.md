# One-time: replace the live site DB

Keep the Portainer stack tied to Git (auto-updates on push). Just this once, replace the database inside the running container with your local `dev.db`.

## 1. Copy your DB to the server

From your Mac (in the project directory, where `dev.db` lives):

```bash
scp dev.db carter@10.0.1.40:/tmp/watchbox.db
```

(Use your server’s host/IP and fix SSH if you had host key issues before.)

## 2. On the server: put the file into the container and restart

SSH in, then:

```bash
# Find the watchbox app container name (often watchbox_app_1 or <stack>_app_1)
docker ps

# Overwrite the DB in the container (replace CONTAINER with the actual name)
docker cp /tmp/watchbox.db CONTAINER:/app/data/watchbox.db

# Restart so the app reloads the DB
docker restart CONTAINER
```

Example if the container is named `watchbox_app_1`:

```bash
docker cp /tmp/watchbox.db watchbox_app_1:/app/data/watchbox.db
docker restart watchbox_app_1
```

After that, the live site uses your updated DB. The stack stays deployed from Git and will keep updating when you push to main.
