# Deploying pet-dashboard

This deploys all three parts to a single VPS using Docker:

- **postgres** — database, always running
- **backend** — Express API, always running, port 4000 (internal only)
- **webapp** — built React app served by nginx, also reverse-proxies `/api` and
  `/health` to the backend. This is the only service exposed on port 80.
- **sync** — one-shot container that pulls Tractive data; not part of the
  always-on stack, triggered once a day by a systemd timer.

## 1. Provision the VPS

Any small VPS works (e.g. a $5-6/mo Hetzner CX22 or DigitalOcean droplet,
Ubuntu 22.04+). You'll need a public IPv4 address and SSH access.

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this
```

Verify: `docker compose version`

## 3. Copy the repo to the server

```bash
git clone <your-repo-url> /opt/pet-dashboard
cd /opt/pet-dashboard
```

(Or `rsync`/`scp` it over if you don't want to push the repo anywhere public.)

## 4. Configure secrets

```bash
cp .env.example .env
nano .env
```

Fill in:
- `POSTGRES_PASSWORD` — pick a real password, not the dev default
- `TRACTIVE_EMAIL` / `TRACTIVE_PASSWORD` / `TRACTIVE_TRACKER_IDS` — same values
  as in `sync-app/.env` locally

This `.env` is read by `docker-compose.yml` for both the `backend` and `sync`
services. It's git-ignored — never commit it.

## 5. Bring up the always-on services

```bash
docker compose up -d --build postgres backend webapp
```

This builds the three images, runs the database migrations automatically
(the backend container runs `node scripts/migrate.js` before starting), and
serves the dashboard on port 80.

Check it:
```bash
curl http://localhost/health
curl http://localhost/api/dashboard/summary
```

## 6. Run the sync once manually to seed data

```bash
docker compose --profile sync run --rm sync
```

`sync` has `profiles: [sync]` in `docker-compose.yml` specifically so it's
*not* started by step 5 — it only runs when explicitly invoked, here or by
the timer below.

## 7. Schedule the daily sync

Two systemd unit files are provided in `deploy/systemd/`:

```bash
sudo cp deploy/systemd/pet-dashboard-sync.service /etc/systemd/system/
sudo cp deploy/systemd/pet-dashboard-sync.timer /etc/systemd/system/
```

Edit `pet-dashboard-sync.service` if your checkout isn't at
`/opt/pet-dashboard` — update `WorkingDirectory` to match.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pet-dashboard-sync.timer
```

This runs the sync daily at 06:00 server time. Check it:

```bash
systemctl list-timers pet-dashboard-sync.timer   # confirm next run
sudo systemctl start pet-dashboard-sync.service   # trigger once now
journalctl -u pet-dashboard-sync.service -n 50    # see sync output/logs
```

Adjust the schedule by editing `OnCalendar=` in the `.timer` file (systemd
calendar syntax, e.g. `*-*-* 06,18:00:00` for twice a day).

## 8. Updating after code changes

```bash
cd /opt/pet-dashboard
git pull
docker compose up -d --build postgres backend webapp
```

The backend container re-runs migrations on every start, so new migration
files in `backend/db/migrations/` are picked up automatically.

## Notes on HTTPS / domains

This setup serves plain HTTP on port 80. Once you have a domain pointed at
the server's IP, put a TLS-terminating reverse proxy in front — the simplest
option is swapping `webapp`'s nginx for [Caddy](https://caddyserver.com/),
which gets you free auto-renewing Let's Encrypt certs with a few lines of
config. Ask if you want that wired in once you have a domain.
