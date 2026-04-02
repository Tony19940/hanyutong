# Implementation Plan: Global Customization Foundation

**Branch**: `[002-global-customization-foundation]` | **Date**: 2026-04-02 | **Spec**: [spec.md](D:/CodeX/hanyutong-main/specs/002-global-customization-foundation/spec.md)  
**Input**: Feature specification from `/specs/002-global-customization-foundation/spec.md`

## Summary

This feature establishes the global customization foundation for `Bunson老师`, covering:

- app-wide interface language switching (`zh-CN`, `en`, `km`)
- global light/dark theme switching
- global teacher voice switching for future synthesis
- user-facing brand rename to `Bunson老师`
- Telegram avatar primary path with curated fallback avatars

The work is foundational rather than decorative. It affects the app shell, profile/settings surface, shared tokens, TTS configuration, and identity presentation across the four main tabs.

## Technical Context

**Language/Version**: JavaScript ES Modules on Node.js `>=18`, React 18  
**Primary Dependencies**: Express, React, Vite, PostgreSQL, `@volcengine/openapi`  
**Storage**: PostgreSQL for server-side user/profile data; localStorage already exists for client session persistence  
**Testing**: Vitest, React Testing Library, Supertest  
**Target Platform**: Telegram Mini App mobile web UI + Node.js web server  
**Project Type**: Single-repo web application  
**Performance Goals**:

- language/theme switching should feel immediate in the current session
- no visible full-page reload required for language/theme changes
- avatar fallback should avoid broken image states
- settings changes should persist across sessions

**Constraints**:

- mobile-first layouts remain the primary target
- settings surface must stay lightweight inside the existing “我的” flow
- Doubao voice availability cannot be assumed from docs alone; only authorized voices can be offered to users
- user requested two final theme UI designs later, so theme architecture must be ready before final polish assets arrive

**Scale/Scope**:

- 4 main tabs
- 1 settings surface inside profile
- 3 interface languages
- 2 themes
- 1 global teacher voice selection
- 5 to 6 default avatar assets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **开口优先**: Pass. Settings work stays secondary and should not add friction to core speaking flows.
- **真人老师感优先**: Pass. Global voice switching strengthens teacher identity if implemented cleanly.
- **新手优先**: Pass. Language switching directly reduces interface confusion for beginners.
- **高棉语辅助是核心能力**: Pass. Khmer remains a first-class interface language and support layer.
- **移动端优先**: Pass. Settings and top-right language shortcut must be designed for phone usage.
- **少而精**: Pass. Scope is limited to foundational customization, not a full settings explosion.

## Project Structure

### Documentation (this feature)

```text
specs/002-global-customization-foundation/
├── spec.md
└── plan.md
```

### Source Code (repository root)

```text
src/
├── App.jsx
├── App.css
├── components/
│   ├── HomePage.jsx
│   ├── ProfilePage.jsx
│   ├── AIPracticePage.jsx
│   ├── LoginPage.jsx
│   ├── TabBar.jsx
│   └── ShareModal.jsx
├── utils/
│   ├── api.js
│   └── telegram.js
└── [new]
    ├── i18n/
    │   ├── index.js
    │   ├── dictionaries/
    │   │   ├── zh-CN.json
    │   │   ├── en.json
    │   │   └── km.json
    │   └── languageMeta.js
    ├── theme/
    │   ├── tokens.js
    │   └── applyTheme.js
    └── preferences/
        └── defaults.js

server/
├── config.js
├── routes/
│   ├── auth.js
│   ├── user.js
│   └── [new] settings.js
├── services/
│   ├── doubaoTtsService.js
│   └── [new] voiceInventoryService.js
└── db.js / migrations-equivalent schema bootstrap

public/
└── [new]
    └── avatars/
        ├── default-01.png
        ├── default-02.png
        ├── default-03.png
        ├── default-04.png
        ├── default-05.png
        └── default-06.png

tests/
├── i18n.spec.js
├── settings.spec.js
├── profile.spec.jsx
└── existing screen tests
```

**Structure Decision**:

- Add a lightweight client-side i18n layer with static dictionaries.
- Add a server-backed user preferences model instead of keeping language/theme/voice only in localStorage.
- Keep localStorage as a fast startup cache, but server is the source of truth for signed-in users.
- Keep fallback avatar assets in `public/avatars` so both profile and dialogue can reuse them.

## Phase 0: Research Outcomes

### 1. Telegram avatar feasibility

Telegram Mini Apps expose `WebAppUser.photo_url`, so Telegram profile photos are a viable primary avatar path. This path is not guaranteed and must remain fallback-safe.  
Reference: [Telegram Mini Apps](https://core.telegram.org/bots/webapps#webappuser)

### 2. Doubao voice feasibility

Doubao supports multiple voices, but not every documented voice is guaranteed for the current app. The inventory shown in settings must be based on voices actually authorized for the current TTS app, not on a raw documentation scrape.  
References:

- [火山引擎 豆包语音产品简介](https://www.volcengine.com/docs/6561/79817?lang=zh)
- [快速入门（旧版控制台）](https://www.volcengine.com/docs/6561/163043?lang=zh)
- [参数基本说明](https://www.volcengine.com/docs/6561/79823?lang=zh)

### 3. Current implementation constraints

- The current app title is still set in `src/App.jsx` with legacy naming.
- Profile already attempts to merge Telegram avatar URL into current user state.
- Current fallback avatar strategy is inline SVG-generated initials, not curated visual avatars.
- TTS defaults are currently global environment variables in `server/config.js`, not per-user settings.
- There is no existing shared i18n system or theme token architecture.

## Core Design Decisions

### Decision A - Persist preferences on the server

**Decision**: Store user customization settings server-side, with client-side cache for startup.

**Why**:

- preferences should survive logout/login and device changes
- language/theme/voice are user-level, not one-session-only toggles
- future settings expansion will be easier if there is one server-backed preference object

**Implementation direction**:

- add preference fields to `users` table or a dedicated `user_settings` table
- for current project size, a dedicated `user_settings` table is cleaner and more extensible:
  - `user_id`
  - `language`
  - `theme`
  - `voice_type`
  - `fallback_avatar_id`
  - timestamps

### Decision B - Use dictionary-based UI internationalization

**Decision**: Use static JSON dictionaries for shared UI copy.

**Why**:

- app shell text is stable and finite
- avoids runtime translation cost and inconsistency
- easiest path to cover Chinese / English / Khmer cleanly

**Implementation direction**:

- central `t(key)` function
- nested dictionaries by namespace:
  - `common`
  - `tabs`
  - `home`
  - `quiz`
  - `dialogue`
  - `profile`
  - `settings`
  - `login`
  - `share`
- first milestone only requires coverage of user-facing main flows, not admin internals

### Decision C - Theme via token sets, not one-off page overrides

**Decision**: Build a shared dark/light token layer before applying final UI assets.

**Why**:

- current app uses many embedded component styles
- page-by-page overrides will become unmaintainable
- user will provide two full design directions later

**Implementation direction**:

- define semantic tokens:
  - background
  - surface
  - text primary / secondary
  - border
  - brand accent
  - button primary
  - tab active/inactive
  - danger / success / warning
- expose theme on root as `data-theme="dark|light"`
- migrate high-impact screens first:
  - App shell
  - Home
  - Dialogue
  - Profile
  - TabBar

### Decision D - Voice selector shows only verified voices

**Decision**: Maintain a verified voice inventory rather than assuming every documented voice is safe to expose.

**Why**:

- voice authorization is environment-specific
- exposing unusable voices creates broken settings UX
- this app needs a stable “teacher” identity

**Implementation direction**:

- add `voiceInventoryService.js`
- maintain a vetted allowlist shape like:
  - `id`
  - `label`
  - `style`
  - `gender`
  - `status`
  - `isDefault`
- settings UI only lists voices with `status: available`
- server falls back to configured default if selected voice fails

### Decision E - Curated fallback avatars, deterministic assignment

**Decision**: Use 5 to 6 curated default avatars stored locally and assign one deterministically when Telegram photo is absent or broken.

**Why**:

- more polished than generated initials
- stable identity feel across profile and dialogue
- no extra network dependency

**Implementation direction**:

- keep Telegram `photo_url` as primary
- fallback priority:
  1. explicit stored fallback avatar choice
  2. deterministic avatar from built-in pack based on user id / telegram id
  3. last-resort generated initial avatar only if assets fail

## Public API / Data Changes

### New server endpoints

- `GET /api/user/settings`
  - returns current persisted preferences and available voice options
- `POST /api/user/settings`
  - updates one or more settings:
    - `language`
    - `theme`
    - `voiceType`
    - `fallbackAvatarId`

### Existing endpoint changes

- `POST /api/auth/login`
  - may initialize `user_settings` on first login
- `POST /api/auth/verify`
  - should include current preferences for fast client bootstrap
- `GET /api/user/profile`
  - should include resolved avatar info and/or available fallback avatar identifier if needed

### Client storage changes

- localStorage additions for fast boot:
  - `hyt_language`
  - `hyt_theme`
  - `hyt_voice`
- server remains source of truth when authenticated

## Delivery Phases

### Phase 1 - Brand and Preference Infrastructure

- rename visible app branding to `Bunson老师`
- add `user_settings` persistence model
- expose settings APIs
- bootstrap client preference store

### Phase 2 - Language System

- add i18n dictionary structure
- translate app shell and main user-facing UI
- wire settings language selector
- add home-page top-right language shortcut with current flag indicator

### Phase 3 - Theme System

- introduce semantic theme tokens
- wire dark/light toggle in settings
- migrate app shell and highest-traffic screens to tokenized theme usage
- leave hooks ready for final provided UI designs

### Phase 4 - Voice System

- audit current Doubao voice inventory against actual authorization
- expose available voices via settings API
- persist selected teacher voice
- apply selected voice to runtime-generated synthesis

### Phase 5 - Avatar System

- keep Telegram avatar as primary
- add curated fallback avatar pack
- resolve avatar loading in profile and dialogue consistently

## Test Strategy

### Automated

- `settings.spec.js`
  - create/read/update settings
  - fallback defaults
- `i18n.spec.js`
  - dictionary coverage for required shell keys
- `profile.spec.jsx`
  - Telegram avatar success/failure behavior
- extend UI tests for:
  - language switch
  - theme switch
  - voice selection persistence

### Manual

- verify all 4 tabs in `zh-CN`, `en`, `km`
- verify dark/light visual parity on phone-sized viewport
- verify top-right home language shortcut behavior
- verify selected voice affects dialogue teacher messages and future generated audio
- verify Telegram avatar and fallback behavior using:
  - valid photo URL
  - empty photo URL
  - broken image URL

## Risks and Mitigations

### Risk 1 - Translation sprawl

If all strings are translated at once without prioritization, rollout may stall.

**Mitigation**:

- first milestone covers app shell + core user flows only
- admin copy can remain lower priority

### Risk 2 - Theme retrofit cost

Current styles are partly inline and page-local, which makes full theme conversion expensive.

**Mitigation**:

- migrate via semantic tokens
- prioritize major shared shells and high-traffic screens first

### Risk 3 - Voice selector exposes unusable voices

**Mitigation**:

- only show verified authorized voices
- fallback safely to default voice

### Risk 4 - Telegram avatar inconsistency

**Mitigation**:

- never rely on Telegram avatar as guaranteed
- use deterministic local fallback pack

## Constitution Check After Design

- **开口优先**: Maintained. Settings are lightweight and do not interrupt speaking flows.
- **真人老师感优先**: Maintained. Voice selection strengthens teacher identity rather than diluting it.
- **新手优先**: Maintained. Language switching lowers UI friction for beginners.
- **高棉语辅助是核心能力**: Maintained. Khmer becomes a full interface option rather than a narrow support layer only.
- **移动端优先**: Maintained. All switches remain in compact mobile-friendly surfaces.
- **少而精**: Maintained. Scope is limited to foundational customization, not general feature sprawl.

## Recommended Next Step

After this plan, the right next artifact is `tasks.md`, with a recommended MVP slice of:

1. brand rename
2. settings persistence model
3. language system for app shell
4. theme token architecture

Voice inventory and curated avatar pack should follow once the settings backbone exists.

