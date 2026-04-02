# Tasks: Global Customization Foundation

**Input**: Design documents from `/specs/002-global-customization-foundation/`  
**Prerequisites**: plan.md, spec.md  
**Design Input Note**: `C:\Users\10269\Downloads\stitch.zip` contains dark and light UI directions. Implementation MUST follow the provided visual style where compatible, but MUST preserve current real product functionality when the design files diverge from the actual app behavior.

**Tests**: Include targeted automated tests because this feature changes shared app shell behavior, persisted user settings, and cross-tab rendering.

**Organization**: Tasks are grouped by user story so each customization capability can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: Which user story this task belongs to
- Every task includes an exact file path

## Path Conventions

- Frontend: `D:\CodeX\hanyutong-main\src\...`
- Backend: `D:\CodeX\hanyutong-main\server\...`
- Tests: `D:\CodeX\hanyutong-main\tests\...`
- Public assets: `D:\CodeX\hanyutong-main\public\...`
- Feature docs: `D:\CodeX\hanyutong-main\specs\002-global-customization-foundation\...`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the repository for shared customization work across language, theme, voice, brand, and avatar systems.

- [ ] T001 Add customization feature route and preference test scaffold to `D:\CodeX\hanyutong-main\tests\server.spec.js`
- [ ] T002 [P] Add app-shell language/theme behavior test scaffold to `D:\CodeX\hanyutong-main\tests\App.spec.jsx`
- [ ] T003 [P] Add profile avatar and settings UI coverage scaffold to `D:\CodeX\hanyutong-main\tests\ProfilePage.spec.jsx`
- [ ] T004 [P] Add i18n dictionary and preference utility test scaffold to `D:\CodeX\hanyutong-main\tests\i18n.spec.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared preference, translation, and theme primitives that all user stories depend on.

**⚠️ CRITICAL**: No user story work should start until this phase is complete.

- [ ] T005 Create a shared user customization data model and persistence shape in `D:\CodeX\hanyutong-main\server\db.js`
- [ ] T006 [P] Add backend preference read/write helpers in `D:\CodeX\hanyutong-main\server\routes\user.js`
- [ ] T007 [P] Create client-side preference storage helpers in `D:\CodeX\hanyutong-main\src\utils\api.js`
- [ ] T008 [P] Create shared i18n bootstrap utilities in `D:\CodeX\hanyutong-main\src\i18n\index.js`
- [ ] T009 [P] Create semantic language metadata for flag/name handling in `D:\CodeX\hanyutong-main\src\i18n\languageMeta.js`
- [ ] T010 [P] Create theme token and root-theme application helpers in `D:\CodeX\hanyutong-main\src\theme\tokens.js`
- [ ] T011 Add base customization state wiring to `D:\CodeX\hanyutong-main\src\App.jsx`

**Checkpoint**: Foundation ready - user story work can now proceed in priority order.

---

## Phase 3: User Story 1 - App Language Switching (Priority: P1) 🎯 MVP

**Goal**: Let users switch the app interface between Chinese, English, and Khmer from settings and the home-page shortcut.

**Independent Test**: Change the interface language from settings and from the home-page shortcut, then verify shell labels and page headings update immediately and persist across reload.

### Tests for User Story 1

- [ ] T012 [P] [US1] Add app-shell language switching assertions to `D:\CodeX\hanyutong-main\tests\App.spec.jsx`
- [ ] T013 [P] [US1] Add dictionary key coverage assertions for core shell labels to `D:\CodeX\hanyutong-main\tests\i18n.spec.js`
- [ ] T014 [P] [US1] Add user-settings API assertions for persisted language to `D:\CodeX\hanyutong-main\tests\server.spec.js`

### Implementation for User Story 1

- [ ] T015 [US1] Create Simplified Chinese dictionary for core user-facing shell copy in `D:\CodeX\hanyutong-main\src\i18n\dictionaries\zh-CN.json`
- [ ] T016 [US1] Create English dictionary for core user-facing shell copy in `D:\CodeX\hanyutong-main\src\i18n\dictionaries\en.json`
- [ ] T017 [US1] Create Khmer dictionary for core user-facing shell copy in `D:\CodeX\hanyutong-main\src\i18n\dictionaries\km.json`
- [ ] T018 [US1] Add user settings GET/POST contract for language persistence in `D:\CodeX\hanyutong-main\server\routes\user.js`
- [ ] T019 [US1] Wire global `t()` usage into shared shell rendering in `D:\CodeX\hanyutong-main\src\App.jsx`
- [ ] T020 [US1] Localize bottom tab labels in `D:\CodeX\hanyutong-main\src\components\TabBar.jsx`
- [ ] T021 [US1] Add a top-right home-page language shortcut with current flag indicator in `D:\CodeX\hanyutong-main\src\components\HomePage.jsx`
- [ ] T022 [US1] Add a compact settings language selector in `D:\CodeX\hanyutong-main\src\components\ProfilePage.jsx`

**Checkpoint**: User Story 1 should be independently functional and demoable.

---

## Phase 4: User Story 2 - Day/Night Theme Switching (Priority: P1)

**Goal**: Support explicit dark and light themes across the app shell and major mobile screens.

**Independent Test**: Switch theme from settings and verify the app shell, home, dialogue, profile, and tab bar all reflect the chosen theme and persist after reload.

### Tests for User Story 2

- [ ] T023 [P] [US2] Add theme persistence assertions to `D:\CodeX\hanyutong-main\tests\server.spec.js`
- [ ] T024 [P] [US2] Add root theme and major shell rendering assertions to `D:\CodeX\hanyutong-main\tests\App.spec.jsx`

### Implementation for User Story 2

- [ ] T025 [US2] Create dark and light semantic token sets in `D:\CodeX\hanyutong-main\src\theme\tokens.js`
- [ ] T026 [US2] Apply root theme switching and persistence bootstrap in `D:\CodeX\hanyutong-main\src\App.jsx`
- [ ] T027 [US2] Refactor shared shell CSS to consume semantic tokens in `D:\CodeX\hanyutong-main\src\App.css`
- [ ] T028 [US2] Add settings theme selector in `D:\CodeX\hanyutong-main\src\components\ProfilePage.jsx`
- [ ] T029 [US2] Align Home page visual tokens to dark/light system in `D:\CodeX\hanyutong-main\src\components\HomePage.jsx`
- [ ] T030 [US2] Align Dialogue page visual tokens to dark/light system in `D:\CodeX\hanyutong-main\src\components\AIPracticePage.jsx`
- [ ] T031 [US2] Align Profile page visual tokens to dark/light system in `D:\CodeX\hanyutong-main\src\components\ProfilePage.jsx`
- [ ] T032 [US2] Align shared tab bar active/inactive states to theme tokens in `D:\CodeX\hanyutong-main\src\components\TabBar.jsx`

**Checkpoint**: User Story 2 should provide a coherent two-theme system without waiting for pixel-perfect final polish.

---

## Phase 5: User Story 3 - Global Teacher Voice Switching (Priority: P2)

**Goal**: Let users choose a global teacher voice for future synthesis, using only verified usable Doubao voices.

**Independent Test**: Select a new teacher voice in settings and verify future runtime-generated dialogue audio uses that voice; verify invalid/unavailable voices fall back to default safely.

### Tests for User Story 3

- [ ] T033 [P] [US3] Add settings API assertions for persisted voice selection to `D:\CodeX\hanyutong-main\tests\server.spec.js`
- [ ] T034 [P] [US3] Add voice selector rendering assertions to `D:\CodeX\hanyutong-main\tests\ProfilePage.spec.jsx`

### Implementation for User Story 3

- [ ] T035 [US3] Create a verified voice inventory service and allowlist model in `D:\CodeX\hanyutong-main\server\services\voiceInventoryService.js`
- [ ] T036 [US3] Expose available and default teacher voices through user settings APIs in `D:\CodeX\hanyutong-main\server\routes\user.js`
- [ ] T037 [US3] Update runtime TTS synthesis to respect per-user selected voice with safe fallback in `D:\CodeX\hanyutong-main\server\services\doubaoTtsService.js`
- [ ] T038 [US3] Add a teacher voice selector section to settings in `D:\CodeX\hanyutong-main\src\components\ProfilePage.jsx`
- [ ] T039 [US3] Thread selected voice through dialogue-related client requests in `D:\CodeX\hanyutong-main\src\utils\api.js`

**Checkpoint**: User Story 3 should support verified voice switching for new runtime-generated teacher audio.

---

## Phase 6: User Story 4 - Brand Rename to Bunson老师 (Priority: P1)

**Goal**: Rename the user-facing product brand to `Bunson老师` consistently across core flows.

**Independent Test**: Open the app, login flow, dialogue, profile, and share flow and confirm user-facing branding uses `Bunson老师`.

### Tests for User Story 4

- [ ] T040 [P] [US4] Add user-facing brand-string coverage assertions to `D:\CodeX\hanyutong-main\tests\App.spec.jsx`

### Implementation for User Story 4

- [ ] T041 [US4] Replace user-facing app title and document title branding in `D:\CodeX\hanyutong-main\src\App.jsx`
- [ ] T042 [US4] Update login-page user-facing brand copy in `D:\CodeX\hanyutong-main\src\components\LoginPage.jsx`
- [ ] T043 [US4] Update share-flow metadata and share copy branding in `D:\CodeX\hanyutong-main\src\components\ShareModal.jsx`
- [ ] T044 [US4] Update package/app metadata strings where user-visible naming is surfaced in `D:\CodeX\hanyutong-main\package.json`

**Checkpoint**: User Story 4 should remove the old visible app name from core user-facing paths.

---

## Phase 7: User Story 5 - Avatar Strategy for Users (Priority: P2)

**Goal**: Use Telegram avatars when available and fall back to a curated default avatar pack when they are not.

**Independent Test**: Verify profile and dialogue avatar rendering for valid Telegram photo URL, missing photo URL, and broken image URL cases.

### Tests for User Story 5

- [ ] T045 [P] [US5] Add Telegram-avatar and fallback-avatar rendering assertions to `D:\CodeX\hanyutong-main\tests\ProfilePage.spec.jsx`
- [ ] T046 [P] [US5] Add fallback-avatar stability assertions to `D:\CodeX\hanyutong-main\tests\App.spec.jsx`

### Implementation for User Story 5

- [ ] T047 [US5] Add a curated built-in default avatar pack under `D:\CodeX\hanyutong-main\public\avatars\`
- [ ] T048 [US5] Replace generated-initial fallback logic with deterministic built-in avatar selection in `D:\CodeX\hanyutong-main\src\components\ProfilePage.jsx`
- [ ] T049 [US5] Align dialogue-page learner avatar resolution with Telegram-first and deterministic fallback behavior in `D:\CodeX\hanyutong-main\src\components\AIPracticePage.jsx`
- [ ] T050 [US5] Persist selected/resolved fallback avatar identity in settings handling within `D:\CodeX\hanyutong-main\server\routes\user.js`
- [ ] T051 [US5] Ensure login/session bootstrap preserves Telegram `photo_url` semantics in `D:\CodeX\hanyutong-main\server\routes\auth.js`

**Checkpoint**: User Story 5 should eliminate broken avatar states and keep user identity presentation stable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Finalize the shared customization feature and reconcile implementation with provided dark/light UI directions.

- [ ] T052 [P] Review `C:\Users\10269\Downloads\stitch.zip` dark/light references and reconcile token mapping notes in `D:\CodeX\hanyutong-main\specs\002-global-customization-foundation\plan.md`
- [ ] T053 [P] Add missing translation keys for shared status, error, and settings copy in `D:\CodeX\hanyutong-main\src\i18n\dictionaries\zh-CN.json`, `D:\CodeX\hanyutong-main\src\i18n\dictionaries\en.json`, and `D:\CodeX\hanyutong-main\src\i18n\dictionaries\km.json`
- [ ] T054 [P] Verify theme contrast and layout fit on mobile-sized screens in `D:\CodeX\hanyutong-main\src\App.css`, `D:\CodeX\hanyutong-main\src\components\HomePage.jsx`, `D:\CodeX\hanyutong-main\src\components\AIPracticePage.jsx`, and `D:\CodeX\hanyutong-main\src\components\ProfilePage.jsx`
- [ ] T055 Run full customization regression checks from `D:\CodeX\hanyutong-main\package.json`
- [ ] T056 Fix any test or integration regressions discovered in `D:\CodeX\hanyutong-main\tests\server.spec.js`, `D:\CodeX\hanyutong-main\tests\App.spec.jsx`, `D:\CodeX\hanyutong-main\tests\ProfilePage.spec.jsx`, and `D:\CodeX\hanyutong-main\tests\i18n.spec.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3-7)**: Depend on Foundational completion
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)** language switching depends directly on the new preference and i18n foundation
- **US2 (P1)** theme switching depends on preference persistence and token foundation
- **US4 (P1)** brand rename can partly proceed earlier, but should land after dictionaries exist so naming is not duplicated in raw strings
- **US3 (P2)** voice switching depends on preference persistence and verified voice inventory
- **US5 (P2)** avatar strategy depends on preference persistence only if fallback avatar identity is meant to remain stable across devices

### Within Each User Story

- Tests first
- Server-side persistence/contracts before frontend control wiring
- Shared utility implementation before page-level UI integration
- Story complete before moving to lower-priority scope if following MVP sequence

### Parallel Opportunities

- T002, T003, and T004 can run in parallel during Setup
- T006 through T010 can run in parallel during Foundational
- Within each user story, the test tasks marked `[P]` can run in parallel
- US4 brand rename can run alongside early US1 dictionary creation once naming keys are agreed
- US5 avatar asset preparation can run in parallel with US3 voice inventory work after preferences infrastructure is ready

---

## Parallel Example: User Story 1

```bash
# Parallel test and dictionary preparation
T012 Add app-shell language switching assertions to tests/App.spec.jsx
T013 Add dictionary key coverage assertions to tests/i18n.spec.js
T014 Add user-settings API assertions for persisted language to tests/server.spec.js

# Then implementation can split by dictionary and shell
T015 Create zh-CN dictionary
T016 Create English dictionary
T017 Create Khmer dictionary
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 language switching
4. Complete Phase 4: US2 theme switching
5. Complete Phase 6: US4 brand rename
6. Stop and validate the app shell, settings, and main tabs before continuing to voice/avatar polish

### Incremental Delivery

1. Preference infrastructure
2. Language system
3. Theme system
4. Brand rename
5. Voice system
6. Avatar system
7. Polish and regression

### Suggested MVP Scope

For the first high-confidence implementation slice, ship:

- **US1** App Language Switching
- **US2** Day/Night Theme Switching
- **US4** Brand Rename to Bunson老师

These three stories establish the new product identity and global shell behavior. Voice inventory and avatar polish can follow as the second slice.

---

## Notes

- `[P]` tasks are parallelizable
- `[US#]` labels map tasks directly to spec user stories
- All task descriptions include exact file paths
- The provided Stitch dark/light references are treated as visual direction inputs, not authority over functional behavior when the designs conflict with the current real product

