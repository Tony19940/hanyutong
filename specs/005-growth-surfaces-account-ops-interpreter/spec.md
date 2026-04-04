# Growth Surfaces, Account Ops, And Interpreter Entry

## Summary

- Add a home banner carousel between the word card and the bottom tab bar
- Add a daily popup system with admin-managed creative, links, and schedule windows
- Add a prominent install-to-home-screen shortcut on the home page
- Expand the admin area with banner, popup, user, and analytics modules
- Add Telegram-linked credential binding plus username/password login fallback
- Introduce a richer avatar system with built-in animal avatars and user uploads
- Add a premium-only centered FAB that opens a strict Gemini live interpreter page

## Core Rules

- Banner content is image-first and ordered by explicit `sortOrder`
- Popups only appear on the home page when the user is idle and no popup was shown to that user on the same day
- New uploaded media and custom avatars are stored in Postgres, not on the Render filesystem
- Telegram identity remains the primary account anchor even after credential binding
- Avatar priority is custom avatar, then built-in selected avatar, then Telegram avatar, then deterministic fallback
- The interpreter only translates between Simplified Chinese and Khmer and never chats or explains

## API Contract

- `GET /api/home/surfaces` returns active home banners and the currently eligible popup for the authenticated user
- `POST /api/events/track` stores lightweight product analytics events
- `GET /api/media/:assetId` streams stored banner, popup, and avatar media
- `POST /api/user/account/bind-credentials` binds a unique username/password to the current Telegram-linked account
- `POST /api/auth/password-login` logs in with bound credentials and resolves back to the same user
- `GET /api/user/avatar-options`, `POST /api/user/avatar/select`, and `POST /api/user/avatar/upload` manage avatar choices
- `GET /api/admin/banners`, `POST /api/admin/banners`, and `POST /api/admin/banners/reorder` manage banner content and order
- `GET /api/admin/popups` and `POST /api/admin/popups` manage popup content and schedules
- `GET /api/admin/users` and `POST /api/admin/users/:id/membership` expose user search and manual membership management
- `GET /api/admin/analytics/overview` returns today metrics and a seven-day trend
- `WS /api/interpreter/live` proxies Gemini Live for premium simultaneous interpretation
