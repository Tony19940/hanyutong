# Render Deployment

## Current recommendation

This project can run on Render as a Node web service, but Render free web services use an ephemeral filesystem. That means the local SQLite database is reset whenever the service restarts, redeploys, or spins down.

If you need stable production data, move to one of these options:

1. Render paid web service with a persistent disk
2. Render Postgres and migrate off SQLite

## Render blueprint

The repository now includes `render.yaml` for a Node web service:

- `buildCommand`: `npm install && npm run build`
- `startCommand`: `npm start`
- `healthCheckPath`: `/api/health`

## Required environment variables

Set these in the Render dashboard:

- `BOT_TOKEN`
- `WEBAPP_URL`
- `ADMIN_PASSWORD`

Optional:

- `DB_PATH`

If you attach a persistent disk on a paid plan, set:

- `DB_PATH=/var/data/hanyutong.db`

or use Render's mounted disk path and point `DB_PATH` into it.

## GitHub to Render flow

1. Push this repository to GitHub.
2. In Render, create a new Blueprint or Web Service from that GitHub repo.
3. Confirm the build and start commands from `render.yaml`.
4. Add the required environment variables.
5. Deploy.
6. After deploy, update your Telegram bot's `WEBAPP_URL` to the Render app URL if needed.

## Health check

Use:

- `/api/health`

Expected response:

```json
{
  "ok": true,
  "environment": "production"
}
```
