# Render Deployment

## Current recommendation

This project is configured for Render Web Service + Render Postgres.

The app now reads `DATABASE_URL` and no longer depends on a local SQLite file for runtime data. That means generated keys, users, sessions, and study progress survive service restarts and redeploys as long as the Render Postgres database remains attached.

## Render blueprint

The repository includes `render.yaml` with:

- a `hanyutong-db` Render Postgres database
- a `hanyutong` Node web service
- `DATABASE_URL` injected from the attached database
- `buildCommand`: `npm install && npm run build`
- `startCommand`: `npm start`
- `healthCheckPath`: `/api/health`

## Required environment variables

Set these in the Render dashboard:

- `BOT_TOKEN`
- `WEBAPP_URL`
- `ADMIN_PASSWORD`

The blueprint supplies:

- `DATABASE_URL`
- session TTL values
- rate-limit values

## GitHub to Render flow

1. Push this repository to GitHub.
2. In Render, create or sync the Blueprint from that repo.
3. Confirm the database `hanyutong-db` is created and linked.
4. Add the required environment variables.
5. Deploy.
6. After deploy, update your Telegram bot's `WEBAPP_URL` to the Render app URL if needed.

## Data migration note

Existing SQLite data is not copied automatically into Render Postgres.

If you have important keys or user records in a local SQLite file, export and import them before switching production traffic.

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
