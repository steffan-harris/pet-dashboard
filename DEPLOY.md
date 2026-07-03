# Deploying pet-dashboard

This deploys all three parts to a single VPS using Docker:

- **postgres** — database, always running
- **backend** — Express API, always running, port 4000 (internal only)
- **webapp** — built React app served by nginx, internal only. Nothing in
  this stack is exposed directly: the shared Caddy container (owned by the
  separate `server-config` repo) terminates HTTPS on ports 80/443 and routes
  `pet-dashboard.steffan.lol` here — `/api/*` and `/health` to the backend,
  everything else to the webapp.
- **sync** — one-shot container that pulls Tractive data; not part of the
  always-on stack, triggered once a day by a systemd timer.

## 1. Provision the VPS

Any small VPS works (e.g. a $5-6/mo Hetzner CX22 or DigitalOcean droplet,
Ubuntu 22.04+). You'll need a public IPv4 address and SSH access.

## 2. Point DNS at the server (Cloudflare)

You're using `pet-dashboard.steffan.lol` via Cloudflare. Caddy gets its TLS
certificate by completing an HTTP challenge on port 80, which only works if
Cloudflare isn't intercepting that traffic. In the Cloudflare dashboard, for
the `pet-dashboard` DNS record:

- Set the record type to **A**, pointing at the VPS's public IP
- Click the orange cloud icon so it turns **grey ("DNS only")**

Grey-cloud is required for the initial certificate issuance. Once Caddy has
a valid cert (check the shared Caddy container's logs in the `server-config`
stack for "certificate obtained successfully"), you *can* switch the record
back to orange-cloud (proxied)
if you want Cloudflare's CDN/DDoS protection in front — just set Cloudflare's
SSL/TLS mode to **Full (strict)** so it trusts Caddy's cert rather than
expecting a Cloudflare-issued one. If you're not sure, just leave it grey —
it works either way and is one less thing to misconfigure.

Also open ports 80 and 443 on the VPS firewall if you have one enabled, e.g.:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this
```

Verify: `docker compose version`

## 4. Copy the repo to the server

```bash
git clone <your-repo-url> /opt/pet-dashboard
cd /opt/pet-dashboard
```

(Or `rsync`/`scp` it over if you don't want to push the repo anywhere public.)

## 4b. Bring up the shared Caddy stack (creates `caddy-net`)

The `server-config` repo owns the Caddy container, the `caddy-net` Docker
network, and the `Caddyfile` block that routes `pet-dashboard.steffan.lol` to
this stack's containers.

If you're migrating from the old setup (where this stack bound ports 80/443),
stop/update this stack to free the ports, then deploy `server-config` to create
`caddy-net`, then start this stack. `docker-compose.yml` here declares
`caddy-net` as `external` and will refuse to start until the network exists.

## 5. Configure secrets

```bash
cp .env.example .env
nano .env
```

Fill in:
- `POSTGRES_PASSWORD` — pick a real password, not the dev default
- `TRACTIVE_EMAIL` / `TRACTIVE_PASSWORD` / `TRACTIVE_TRACKER_IDS` — same values
  as in `sync-app/.env` locally

(The site domain and ACME email now live in the `server-config` repo's
`Caddyfile`, not here.)

This `.env` is read by `docker-compose.yml` for the `backend`, `webapp`, and
`sync` services. It's git-ignored — never commit it.

## 6. Bring up the always-on services

```bash
docker compose up -d --build postgres backend webapp
```

This builds the three images and runs the database migrations automatically
(the backend container runs `node scripts/migrate.js` before starting).

HTTPS is handled by the shared Caddy container from the `server-config`
stack, which requests a certificate for `pet-dashboard.steffan.lol` from
Let's Encrypt the first time its Caddyfile mentions the domain — watch its
logs (in the `server-config` stack) for `certificate obtained successfully`.
If it instead retries with errors, double check the DNS record is grey-cloud
(step 2) and that ports 80/443 are actually reachable from the internet
(`curl http://<server-ip>` from your own machine while grey-clouded).

Once issued, check it:
```bash
curl https://pet-dashboard.steffan.lol/health
curl https://pet-dashboard.steffan.lol/api/dashboard/summary
```

Plain `http://` requests get redirected to `https://` automatically —
that's Caddy's default behavior, nothing extra to configure.

## 7. Run the sync once manually to seed data

```bash
docker compose --profile sync run --rm sync
```

`sync` has `profiles: [sync]` in `docker-compose.yml` specifically so it's
*not* started by step 6 — it only runs when explicitly invoked, here or by
the timer below.

## 8. Schedule the daily sync

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

## 9. Updating after code changes

```bash
cd /opt/pet-dashboard
git pull
docker compose up -d --build postgres backend webapp
```

The backend container re-runs migrations on every start, so new migration
files in `backend/db/migrations/` are picked up automatically.

## Notes on Caddy / certificates

- The Caddy container, its certificates, and the routing config all live in
  the separate `server-config` repo/stack — nothing TLS-related is stored in
  this stack anymore.
- Renewal is automatic — Caddy renews well before the 90-day Let's Encrypt
  expiry, no cron job needed.
- The `server-config` Caddyfile proxies `/api/*` and `/health` to the
  `pet-dashboard-backend` container and everything else to
  `pet-dashboard-webapp` (nginx serving the built static files). If you add
  new backend routes that need to be reachable from the browser, no
  Caddyfile change is needed as long as they're under `/api/`.
