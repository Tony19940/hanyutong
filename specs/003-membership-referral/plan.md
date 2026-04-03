# Implementation Plan: Membership Referral

**Branch**: `[003-membership-referral]` | **Date**: 2026-04-03 | **Spec**: [spec.md](D:/CodeX/hanyutong-main/specs/003-membership-referral/spec.md)  
**Input**: Feature specification from `/specs/003-membership-referral/spec.md`

## Summary

This feature replaces the old “activation code before seeing the app” flow with a membership model built around:

- 3-day Premium trial
- free learning layer after expiry
- Premium month card fulfilled through Telegram客服 + activation code
- invite links and first-paid referral rewards
- dated, extendable activation keys in admin

The implementation separates identity/session from entitlement/access and moves activation codes from the first-run gate to the redemption/fulfillment path.

## Technical Context

**Language/Version**: JavaScript ES Modules, React 18, Express, Node.js `>=18`  
**Primary Dependencies**: React, Express, PostgreSQL / `pg-mem`, Vitest, React Testing Library, Supertest  
**Storage**: PostgreSQL schema bootstrap in `server/db.js`, browser localStorage for session bootstrap cache  
**Testing**: `npm test`, `npm run build`  
**Target Platform**: Telegram Mini App mobile web UI + Node.js backend  
**Project Type**: Single-repo full-stack app

## Constitution Check

- **开口优先**: Pass. AI dialogue stays the main paid value anchor.
- **真人老师感优先**: Pass. Dialogue remains Premium rather than ad-supported.
- **新手优先**: Pass. New users enter the app before paying.
- **高棉语辅助是核心能力**: Pass. Free layer still keeps core vocabulary learning available.
- **移动端优先**: Pass. Trial, redeem, membership wall, and invite UI all stay mobile-first.
- **少而精**: Pass. Offline payment is preserved; ads and local payment integration remain out of scope.

## Data Model Changes

### Added / Expanded Tables

- `keys`
  - `expires_at`
  - `last_extended_at`
  - `duration_days`
  - status upgraded to `unused | active | expired`
- `users`
  - `invite_code`
  - `invited_by_user_id`
  - `referral_bound_at`
  - `first_paid_at`
- `membership_access`
  - current plan, status, access level, expiry, source key
- `referrals`
  - direct inviter/invitee binding and one-time reward state
- `entitlement_events`
  - entitlement history for trial, paid activation, extension, and reward adjustments

## API Changes

### User-facing

- `POST /api/auth/start-trial`
  - creates or reuses a user, binds invite if eligible, grants first trial, returns `user + token + membership + invite`
- `POST /api/auth/login`
  - redeems activation code, supports direct paid conversion and reactivation with the same bound key, returns `user + token + membership + invite`
- `POST /api/auth/verify`
  - returns current user session plus membership and invite summary
- `GET /api/user/profile`
  - returns stats, settings, membership, and invite summary
- `GET /api/user/invite`
  - returns invite code/link/stats plus current membership

### Admin-facing

- `POST /api/admin/generate-key`
  - supports `count`, `durationDays`, and optional `expiresAt`
- `GET /api/admin/keys`
  - returns dated key rows plus binding metadata and status summary
- `POST /api/admin/keys/:id/extend`
  - extends a key to a future date and updates bound-user membership
- `POST /api/admin/keys/:id/expire`
  - forces a key to expire and downgrades the entitlement state
- `DELETE /api/admin/keys/:id`
  - only deletes unused keys

## Frontend Plan

### Entry & Auth

- replace the old pure activation-code login screen with:
  - free trial CTA
  - activation-code redemption CTA
  - Telegram客服 CTA
- cache invite attribution from `?ref=CODE`
- persist returned session token and merged user identity

### Membership-aware App Shell

- hold `membership` and `invite` in app state alongside `user`
- allow word-card learning regardless of free or Premium status
- render membership walls for:
  - quiz
  - AI dialogue
- keep profile and invite tools accessible after expiry

### Me / Invite UX

- show membership expiry directly under the avatar
- add membership card and invite card above existing stats
- make invite the primary sharing action
- keep poster sharing as a secondary option inside the invite modal

### Admin UX

- show current active / unused / expired states
- allow generation by duration or fixed date
- allow delete for unused keys only
- allow extend for bound active/expired keys
- allow force-expire actions

## Backend Plan

### Entitlement Logic

- session identity remains independent from entitlements
- `membership_access` becomes the source of truth for gated features
- Premium gates enforced at route level:
  - `/api/words/next?mode=quiz`
  - all `/api/dialogue/*`

### Referral Logic

- generate per-user invite code
- bind inviter once per invitee
- reject self-invite and duplicate binding
- grant reward only on the invitee’s first successful paid activation

### Key Lifecycle

- unused keys can be generated or deleted
- first redemption binds a key to one user
- expired bound keys can be extended by admin
- extended keys restore Premium when the same user redeems again

## Verification

Completed verification for this implementation:

- `npm test`
- `npm run build`

Both passed after the membership, invite, and admin flow changes landed.
