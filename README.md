# Pet Dashboard

A dashboard for keeping an eye on my dog Jesse. A daily sync job pulls his
GPS tracker data from [Tractive](https://tractive.com/) and stores it in
Postgres; the web app then plots where he's been over the last 48 hours on
a map, alongside his tracker's battery level and last sync time.

## How it fits together

- **[`sync-app/`](sync-app)** — Python job that logs into the Tractive API
  once a day, pulls Jesse's position history for the last 48 hours, and
  writes it into Postgres. Runs as a one-off Docker container on a daily
  timer (see [`deploy/systemd/`](deploy/systemd)).
- **[`backend/`](backend)** — Node/Express REST API in front of Postgres.
  Serves dashboard summary data and the 48-hour location history.
- **[`web-app/`](web-app)** — React dashboard. Renders Jesse's tracker
  status and draws his recent path on a [Leaflet](https://leafletjs.com/)
  map.

## Running it locally

```bash
cd backend && docker compose up -d   # Postgres
cd backend && npm install && npm run migrate && npm run dev
cd sync-app && python -m sync_app.main   # pull the last 48h of data
cd web-app && npm install && npm run dev
```

Each sub-project has its own `.env.example` to copy and fill in (Tractive
credentials, database URL, etc.).

## Deploying

See [DEPLOY.md](DEPLOY.md) for deploying all three parts to a VPS with
Docker, including HTTPS via Caddy and a systemd timer for the daily sync.
