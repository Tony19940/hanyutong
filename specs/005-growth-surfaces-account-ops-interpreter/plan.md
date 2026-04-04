# Implementation Plan

## Backend

- Add Postgres-backed media, banner, popup, popup impression, event, and credential tables
- Add services and routes for home surfaces, media delivery, analytics tracking, credential binding, and avatar uploads
- Expand the admin API with banner, popup, user membership, and analytics endpoints
- Attach a Gemini Live websocket proxy for the premium interpreter entry point

## Frontend

- Add the home banner carousel, popup renderer, and install shortcut CTA
- Extend the admin page into a multi-module operations console
- Add credential binding to profile settings and username/password login fallback
- Add avatar selection/upload UI and the centered FAB interpreter entry

## Verification

- Vitest covers server routes, admin UI, avatar behavior, and profile/account flows
- Build verification remains `npm run build`
