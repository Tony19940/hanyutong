# Feature Specification: Global Customization Foundation

**Feature Branch**: `[002-global-customization-foundation]`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "规划接下来要更新的功能：多语言系统、黑夜和白天模式、更多豆包音色并支持全局切换、软件更名为 Bunson老师、用户头像方案"

## Constitution Alignment

This feature MUST follow the HanYuTong constitution in `D:\CodeX\hanyutong-main\.specify\memory\constitution.md`, with special emphasis on:

- `新手优先`: settings and global switches must remain simple and understandable
- `高棉语辅助是核心能力`: language and translation changes must not weaken Khmer support
- `移动端优先`: all new controls must fit Telegram Mini App mobile layouts
- `少而精`: these upgrades are foundational customization, not an excuse to add complex settings noise

## User Scenarios & Testing *(mandatory)*

### User Story 1 - App Language Switching (Priority: P1)

As a learner, I want to switch the app interface language between Chinese, English, and Khmer, so that I can understand the navigation and settings in the language I am most comfortable with.

**Why this priority**: This affects the entire product shell and directly improves clarity for multilingual users, especially beginners who are not confident in Chinese UI labels.

**Independent Test**: Open the app, switch the interface language from settings, and verify navigation labels, key page headings, and core action text all update immediately. Repeat by tapping the language icon in the home page top-right shortcut.

**Acceptance Scenarios**:

1. **Given** the user is on any main tab, **When** they change the interface language in settings, **Then** the visible app shell labels update to the selected language without breaking the current session.
2. **Given** the user is on the home page, **When** they tap the language shortcut in the top-right corner, **Then** the app cycles or opens a quick switch flow and updates the current language indicator.
3. **Given** the user closes and reopens the app, **When** a language was previously selected, **Then** the app reopens in the same interface language.

---

### User Story 2 - Day/Night Theme Switching (Priority: P1)

As a learner, I want to switch between dark mode and light mode, so that the product stays comfortable in different lighting conditions and can match the final provided visual designs.

**Why this priority**: Theme is a global visual foundation. It affects every main page and should be solved before more detailed design polish continues.

**Independent Test**: Switch between dark and light themes from settings and verify all main tabs remain readable, themed consistently, and usable on mobile.

**Acceptance Scenarios**:

1. **Given** the user enters settings, **When** they switch from dark to light mode, **Then** all major screens immediately reflect the selected visual theme.
2. **Given** the user previously selected a theme, **When** they relaunch the app, **Then** the same theme remains active.
3. **Given** the final dark and light UI assets are available, **When** the theme is applied, **Then** the product uses the correct token set instead of a partial color inversion.

---

### User Story 3 - Global Teacher Voice Switching (Priority: P2)

As a learner, I want to switch Bunson老师's default voice globally, so that I can choose the voice style I prefer for words, examples, and AI teaching messages.

**Why this priority**: Voice is part of teacher identity and retention, but the product can still function with one default voice. This is important after language and theme foundations.

**Independent Test**: Change the selected teacher voice in settings, then play a vocabulary word, an example sentence, and a dialogue teacher message to verify all future generated audio uses the newly selected voice.

**Acceptance Scenarios**:

1. **Given** multiple usable Doubao voices are available to the app, **When** the user picks one in settings, **Then** the selection becomes the default synthesis voice for future playback.
2. **Given** the selected voice is no longer authorized or available, **When** the app attempts synthesis, **Then** the app falls back to a safe default voice rather than failing silently.
3. **Given** the user has already selected a voice, **When** they reopen the app later, **Then** the same voice remains selected.

---

### User Story 4 - Brand Rename to Bunson老师 (Priority: P1)

As a user, I want the app to consistently present itself as `Bunson老师`, so that the product brand, teacher persona, and learning experience feel unified.

**Why this priority**: The current product already centers the teacher persona. Renaming affects trust, memory, copy consistency, and social sharing.

**Independent Test**: Search the product shell, login flow, profile/share UI, and metadata to confirm the old name has been replaced where user-visible branding is intended.

**Acceptance Scenarios**:

1. **Given** the app is opened on any user-facing screen, **When** the product brand appears, **Then** it uses `Bunson老师` consistently.
2. **Given** the user shares a learning result, **When** the share asset or metadata references the app, **Then** it uses the new brand.
3. **Given** there are legacy places where the old name is still used internally, **When** those places are not user-visible, **Then** they do not block this feature unless they leak into user-facing copy.

---

### User Story 5 - Avatar Strategy for Users (Priority: P2)

As a user, I want my avatar area to look personal and complete, so that the app feels polished whether or not Telegram returns my profile photo.

**Why this priority**: Identity polish matters in profile and dialogue flows, but the app already works without it. This should be solved as a robust fallback system.

**Independent Test**: Verify avatar rendering in three cases: Telegram profile photo available, Telegram profile photo unavailable, and invalid image URL.

**Acceptance Scenarios**:

1. **Given** Telegram provides a valid `photo_url`, **When** the app loads the user profile, **Then** that profile photo is used as the primary avatar.
2. **Given** Telegram does not provide a photo or access is unavailable, **When** the user profile is rendered, **Then** the app falls back to a curated default avatar set instead of a broken image.
3. **Given** the app uses fallback avatars, **When** the user revisits profile and dialogue screens, **Then** the chosen fallback remains stable enough that the identity does not appear random on every visit.

## Edge Cases

- How should the app behave if the user switches interface language during an active dialogue session?
- What happens if the selected light/dark theme assets are incomplete for one screen?
- What happens if a selected Doubao voice is visible in settings but no longer has authorization in production?
- Should legacy pre-generated vocabulary audio be regenerated per selected voice, or should global voice switching apply only to future/generated audio?
- How should the home page language shortcut behave: cycle through languages directly or open a compact selector?
- If Telegram returns `photo_url` but the image request fails, what fallback priority should be used?
- Should default fallback avatars be deterministic per user, random once, or user-selectable from settings?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support three interface languages: Simplified Chinese, English, and Khmer.
- **FR-002**: The system MUST expose language switching inside settings.
- **FR-003**: The home page MUST expose a top-right language control that visibly indicates the current language using a flag or equivalent compact indicator.
- **FR-004**: The system MUST persist the user's last selected interface language across sessions.
- **FR-005**: The system MUST support both dark mode and light mode as explicit user-selectable themes.
- **FR-006**: The system MUST expose theme switching inside settings.
- **FR-007**: The system MUST persist the user's last selected theme across sessions.
- **FR-008**: The system MUST support a global teacher voice setting for future synthesis requests.
- **FR-009**: The system MUST expose teacher voice selection inside settings using only voices that the app can actually use.
- **FR-010**: The system MUST fall back to a default authorized voice if the selected voice is unavailable or unauthorized.
- **FR-011**: The system MUST rename the user-facing product brand from the previous app name to `Bunson老师`.
- **FR-012**: The system MUST attempt to use Telegram Mini App user profile photos where Telegram provides them.
- **FR-013**: The system MUST provide a curated fallback avatar set for users whose Telegram photo is missing, blocked, or fails to load.
- **FR-014**: The system MUST keep the settings surface simple and avoid turning “我的” into a cluttered settings-heavy page.
- **FR-015**: The system MUST preserve current dialogue, learning, and quiz usability when language, theme, or voice changes are applied.

### Clarified Scope Decisions

- **FR-016**: Global voice switching in this version SHOULD apply to newly generated or runtime-generated audio first; pre-generated vocabulary/example audio regeneration is out of scope unless explicitly planned later.
- **FR-017**: The app SHOULD treat Telegram `photo_url` as the primary avatar source, but MUST not rely on it as guaranteed availability.
- **FR-018**: Default fallback avatars SHOULD be a curated built-in pack of 5 to 6 visually consistent options, selected deterministically rather than randomly changing on every load.
- **FR-019**: Theme implementation SHOULD use structured design tokens or theme variables rather than ad hoc page-by-page color overrides.
- **FR-020**: Interface language switching MUST cover shared app shell and all major user-facing labels before it expands to every edge-case admin or internal string.

## External Capability Notes

### Telegram avatar capability

Telegram Mini Apps expose `WebAppUser.photo_url` when privacy settings allow it. This means Telegram avatar retrieval is feasible as the primary path, but must remain optional and fallback-safe. Source: Telegram Mini Apps official docs, `WebAppUser.photo_url` field. [core.telegram.org](https://core.telegram.org/bots/webapps#webappuser)

### Doubao voice capability

Doubao TTS supports multiple voices and voice authorization matters at runtime. Official docs note that:

- TTS provides multiple voices and styles. [火山引擎产品简介](https://www.volcengine.com/docs/6561/79817?lang=zh)
- Trial applications can test all voices, but formal production access depends on service authorization. [快速入门（旧版控制台）](https://www.volcengine.com/docs/6561/163043?lang=zh)
- Some voices still require a control-panel order/authorization even when free, and unauthorized voices will return access errors. [参数基本说明](https://www.volcengine.com/docs/6561/79823?lang=zh)
- Fireworks/voice cloning style expansion is possible, and current docs mention the voice list scale has grown significantly. [产品简介](https://www.volcengine.com/docs/6561/1257543?lang=zh), [声音复刻下单及使用指南](https://www.volcengine.com/docs/6561/1167802?lang=zh)

Therefore, “check available voices” should be implemented as a controlled inventory task against the currently authorized voice set, not as a hardcoded assumption that every documented voice is usable in this app.

## Key Entities *(include if feature involves data)*

- **AppLanguage**: The selected interface language for shared UI text, stored as one of `zh-CN`, `en`, or `km`.
- **AppTheme**: The selected global visual theme, stored as `dark` or `light`.
- **VoiceOption**: A TTS voice choice that includes a stable internal voice ID, a user-facing label, an authorization state, and optional metadata such as gender/style.
- **BrandString**: User-facing product naming and related teacher/app labels that must be updated from the previous app name to `Bunson老师`.
- **TelegramAvatar**: The avatar URL obtained from Telegram Mini App user data when available.
- **FallbackAvatar**: A local curated avatar asset used when Telegram avatar resolution fails or is unavailable.
- **CustomizationSettings**: The persisted set of user preferences including language, theme, and selected teacher voice.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the four main navigation labels and major top-level page headings switch correctly between Chinese, English, and Khmer.
- **SC-002**: 100% of user-selected language and theme preferences persist after app restart.
- **SC-003**: All four main tabs remain visually usable in both dark and light themes on a phone-sized layout.
- **SC-004**: The settings voice selector shows only voices that are either verified as usable or explicitly marked unavailable.
- **SC-005**: At least 95% of profile and dialogue avatar renders succeed without showing a broken image state.
- **SC-006**: User-facing branding shows `Bunson老师` consistently across core user flows.

## Recommended Delivery Order

### Phase 1 - Product Foundations

1. Rename app to `Bunson老师`
2. Add theme token architecture for dark/light
3. Add language system for app shell + settings + main tab labels

### Phase 2 - User-Facing Controls

4. Add settings surface for:
   - language
   - theme
   - teacher voice
5. Add home-page top-right language shortcut

### Phase 3 - Voice and Identity Polish

6. Verify actual authorized Doubao voice inventory
7. Add global teacher voice switching
8. Add Telegram avatar + fallback avatar pack

## Assumptions

- The user will provide final dark and light mode UI designs later.
- The user wants one coherent settings surface, likely inside the current “我的” page rather than a separate full settings app section.
- The current TTS integration remains Doubao-based.
- The current product continues to prioritize Telegram Mini App mobile usage over desktop.
- Some strings such as admin-only copy can be phased after core user-facing translations if scope needs to be constrained.

