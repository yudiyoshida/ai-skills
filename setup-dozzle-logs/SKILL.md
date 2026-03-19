---
name: setup-dozzle-logs
description: >-
  Configure Dozzle with log file watchers in Docker Compose projects. Use when
  the user wants to monitor log files via Dozzle, add a log viewer to
  docker-compose, set up real-time log monitoring with a web UI, or mentions
  Dozzle, log monitoring, or watching log files in Docker.
---

# Setup Dozzle with Log File Monitoring

Add [Dozzle](https://dozzle.dev) (real-time Docker log viewer) to any Docker Compose project,
with sidecar containers that stream custom log files into Docker stdout so Dozzle can display them.

## How It Works

```
log files (*.log) → tail -F containers (sidecar) → stdout → Docker Engine → Dozzle Web UI
```

- **Dozzle** reads Docker container stdout/stderr via the Docker socket
- **Sidecar containers** (Alpine ~2MB each) run `tail -F` on log files, forwarding content to stdout
- Dozzle picks up each sidecar as a separate "container" in its web UI

## Step 1: Gather Log Mapping from User

Ask the user (use AskQuestion if available, otherwise ask conversationally):

1. **Which docker-compose file** to modify (e.g. `docker-compose.yml`, `docker-compose.dev.yml`)
2. **Log directory path** relative to the project root (e.g. `./logs`)
3. **Log files to monitor** — list of filenames inside that directory (e.g. `cache.log`, `http.log`, `iam.log`)
4. **Dozzle port** — default `9999`, user may want a different one
5. **Container name prefix** — default `log-`, user may want project-specific (e.g. `myapp-log-`)

If the user already provided this information in conversation context, skip asking and use what was given.

## Step 2: Add Sidecar Containers

For **each log file**, add one sidecar service to the docker-compose file.

Template per log file:

```yaml
  <prefix><name>:
    image: alpine:3.21
    container_name: <project>-log-<name>
    restart: unless-stopped
    volumes:
      - <log-directory>:/logs:ro
    command: ["tail", "-n", "50", "-F", "/logs/<filename>"]
```

Rules:
- `<name>` = log filename without extension (e.g. `cache.log` → `cache`)
- Mount the log directory as **read-only** (`:ro`)
- Use `-n 50` to show last 50 lines on startup
- Use `-F` (capital F) to follow even if file is recreated/rotated
- No network needed for sidecars (they just read files)

## Step 3: Add Dozzle Service

Add Dozzle after the sidecar containers:

```yaml
  dozzle:
    image: amir20/dozzle:latest
    container_name: <project>-dozzle
    restart: unless-stopped
    ports:
      - "<port>:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

## Step 4: Inform the User

After adding the services, tell the user:

1. Run `docker compose -f <file> up -d` to start
2. Access Dozzle at `http://localhost:<port>`
3. Each log file appears as a separate container in Dozzle's sidebar
4. Dozzle also shows logs from all other containers (postgres, redis, etc.)

## Example Output

For a project with `./logs/` containing `cache.log`, `http.log`, `iam.log`:

```yaml
  log-cache:
    image: alpine:3.21
    container_name: myapp-log-cache
    restart: unless-stopped
    volumes:
      - ./logs:/logs:ro
    command: ["tail", "-n", "50", "-F", "/logs/cache.log"]

  log-http:
    image: alpine:3.21
    container_name: myapp-log-http
    restart: unless-stopped
    volumes:
      - ./logs:/logs:ro
    command: ["tail", "-n", "50", "-F", "/logs/http.log"]

  log-iam:
    image: alpine:3.21
    container_name: myapp-log-iam
    restart: unless-stopped
    volumes:
      - ./logs:/logs:ro
    command: ["tail", "-n", "50", "-F", "/logs/iam.log"]

  dozzle:
    image: amir20/dozzle:latest
    container_name: myapp-dozzle
    restart: unless-stopped
    ports:
      - "9999:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```
