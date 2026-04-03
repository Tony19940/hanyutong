# Feature Specification: Membership Referral

**Feature Branch**: `[003-membership-referral]`  
**Created**: 2026-04-03  
**Status**: Implemented  
**Input**: User description: "调整付费逻辑、增加邀请裂变、把永久激活码改成可续期月卡"

## Constitution Alignment

This feature follows the HanYuTong constitution in `D:\CodeX\hanyutong-main\.specify\memory\constitution.md`, with emphasis on:

- `新手优先`: users can enter the product before paying
- `开口优先`: AI dialogue remains the primary paid value anchor
- `移动端优先`: trial, redemption, invite, and month-card UI fit Telegram Mini App mobile layouts
- `少而精`: v1 keeps offline payment + activation codes and avoids ad-system scope creep

## User Scenarios & Testing

### User Story 1 - Start, trial, and downgrade path (Priority: P1)

As a new user, I want to enter the product immediately and start a free Premium trial, so that I can see what the product feels like before paying.

**Independent Test**: start a trial, confirm Premium access during trial, then expire the trial and verify word cards remain available while quiz and dialogue are locked.

**Acceptance Scenarios**:

1. **Given** a first-time user opens the app, **When** they tap free trial, **Then** the system creates a session and grants a 3-day Premium trial.
2. **Given** a user is inside an active trial, **When** they open quiz or dialogue, **Then** those Premium features are available.
3. **Given** a trial has expired, **When** the user stays signed in, **Then** word-card learning remains available but quiz and dialogue are blocked by a membership wall.

### User Story 2 - Convert to paid month card (Priority: P1)

As a user, I want to redeem an activation code after paying客服 on Telegram, so that my membership can continue without leaving the product entirely.

**Independent Test**: activate a key, expire it, extend the same key in admin, and then reactivate it for the same user.

**Acceptance Scenarios**:

1. **Given** a user receives a valid activation code, **When** they redeem it, **Then** Premium access is restored until a visible expiry date.
2. **Given** a key is already bound to a user, **When** it is extended in admin, **Then** the same user can reuse the same code after expiry.
3. **Given** a key is bound to one user, **When** another user attempts to use it, **Then** the system rejects the attempt.

### User Story 3 - Referral growth loop (Priority: P2)

As a user, I want my own invite link and invite stats, so that I can invite friends and earn extra usage time.

**Independent Test**: bind an invitee once, trigger first paid activation, and verify the inviter gets one 7-day reward only once.

**Acceptance Scenarios**:

1. **Given** a user opens Me, **When** they open invite, **Then** they see a personal invite link plus invite/paid/reward stats.
2. **Given** a new user starts through an invite link, **When** they register or start trial, **Then** the inviter relationship is recorded once and self-invite is rejected.
3. **Given** the invitee pays for the first time, **When** activation succeeds, **Then** the inviter receives 7 extra days and later renewals do not duplicate that reward.

### User Story 4 - Membership and admin operations (Priority: P2)

As an admin, I want dated activation keys that can be extended or expired, so that month-card fulfillment can be managed manually.

**Independent Test**: generate a dated key, list it, delete an unused key, extend an expired bound key, and expire an active key.

**Acceptance Scenarios**:

1. **Given** an admin opens key management, **When** they generate keys, **Then** each key can carry either a duration or fixed expiry date.
2. **Given** a key is already active or expired, **When** admin sets a future expiry date, **Then** the key becomes active again and the bound user entitlement is updated.
3. **Given** a key is unused, **When** admin deletes it, **Then** it is removed cleanly without affecting any user entitlement.

## Requirements

### Functional Requirements

- **FR-001**: New users MUST be able to enter the product without pre-purchasing an activation code.
- **FR-002**: The system MUST support a 3-day Premium trial for first-time direct users.
- **FR-003**: The system MUST support invite attribution using a per-user invite code and invite URL.
- **FR-004**: The system MUST keep word-card learning available in the free layer after trial or paid expiry.
- **FR-005**: The system MUST block quiz access for users without Premium membership.
- **FR-006**: The system MUST block AI dialogue access for users without Premium membership.
- **FR-007**: Paid access MUST be represented as a month card with an expiry date rather than auto-renewing subscription semantics.
- **FR-008**: Activation codes MUST remain available as the manual fulfillment mechanism for offline Telegram payment.
- **FR-009**: Activation codes MUST be bindable to a user and reusable by that same user after admin extension.
- **FR-010**: The system MUST expose `membership.status`, `membership.planType`, `membership.accessLevel`, and `membership.expiresAt` in auth/profile responses.
- **FR-011**: Every user MUST have an invite code and invite URL visible from the Me flow.
- **FR-012**: Referral rewards MUST be single-level only.
- **FR-013**: The inviter MUST receive 7 reward days only when the invitee first pays successfully.
- **FR-014**: The same invitee MUST NOT grant the inviter multiple rewards across later renewals.
- **FR-015**: Admin tools MUST support generating, listing, extending, expiring, and deleting activation keys according to key state.

### Scope Decisions Locked In

- **FR-016**: Invited trial stays 3 days and does not stack beyond the first eligible trial.
- **FR-017**: Ads remain out of scope for this version.
- **FR-018**: The current learning share poster remains optional secondary content, not the primary growth mechanic.
- **FR-019**: Existing users keep account identity and session even after Premium expires.
- **FR-020**: Telegram客服 offline payment remains the only payment path in this release.

## Key Entities

- **MembershipAccess**: Current entitlement state for a user, including plan type, status, access level, and expiry.
- **ActivationKey**: A dated, bindable, extendable activation code used to fulfill month-card access.
- **Referral**: Direct inviter-to-invitee binding with one-time reward state.
- **EntitlementEvent**: Audit-style record of trial starts, paid activations, key extensions, rewards, and manual adjustments.

## Success Criteria

- **SC-001**: A new user can reach the main app and start trial without contacting support first.
- **SC-002**: Free users can continue word-card learning after expiry while Premium-only features remain gated.
- **SC-003**: Invite stats show invited count, converted count, and earned reward days from the Me flow.
- **SC-004**: A bound activation key can be extended and reused by the same user without reassignment.
- **SC-005**: Automated regression coverage verifies trial, free-layer gating, referral reward-on-first-pay, and admin key lifecycle behavior.
