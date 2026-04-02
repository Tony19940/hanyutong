# Tasks: Dialogue V2 Human Coach

**Input**: Design documents from `/specs/001-dialogue-v2-human-coach/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Include targeted automated tests because the plan explicitly requires route, flow, and message-rhythm verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: Which user story this task belongs to
- Every task includes an exact file path

## Path Conventions

- Frontend: `D:\CodeX\hanyutong-main\src\...`
- Backend: `D:\CodeX\hanyutong-main\server\...`
- Tests: `D:\CodeX\hanyutong-main\tests\...`
- Feature docs: `D:\CodeX\hanyutong-main\specs\001-dialogue-v2-human-coach\...`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare targeted test and contract scaffolding for Dialogue V2 work.

- [ ] T001 Add Dialogue V2 route contract assertions to `D:\CodeX\hanyutong-main\tests\server.spec.js`
- [ ] T002 [P] Add Dialogue V2 lesson-flow assertions to `D:\CodeX\hanyutong-main\tests\dialogue.spec.js`
- [ ] T003 [P] Add Dialogue V2 UI behavior coverage scaffold to `D:\CodeX\hanyutong-main\tests\AIPracticePage.spec.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared dialogue primitives that all user stories depend on.

**⚠️ CRITICAL**: No user story work should start until this phase is complete.

- [ ] T004 Refactor shared teacher message materialization helpers in `D:\CodeX\hanyutong-main\server\services\dialogueTeachingService.js`
- [ ] T005 [P] Normalize topic, lesson, and Khmer support shaping in `D:\CodeX\hanyutong-main\server\services\dialogueScenarioService.js`
- [ ] T006 [P] Align Dialogue V2 REST response shapes with `D:\CodeX\hanyutong-main\specs\001-dialogue-v2-human-coach\contracts\dialogue-v2-api.yaml` in `D:\CodeX\hanyutong-main\server\routes\dialogue.js`
- [ ] T007 [P] Normalize client dialogue payload handling in `D:\CodeX\hanyutong-main\src\utils\api.js`
- [ ] T008 Harden active dialogue session continuity helpers in `D:\CodeX\hanyutong-main\server\services\dialogueSessionStore.js`

**Checkpoint**: Foundation ready - user story work can now proceed in priority order.

---

## Phase 3: User Story 1 - Human Lesson Opening (Priority: P1) 🎯 MVP

**Goal**: Make topic starts feel like a real teacher opening a chat, with no more than two short teacher messages before learner action.

**Independent Test**: Start any daily topic and verify the teacher opens with one short opener plus one target sentence, without stacked instructional chatter.

### Tests for User Story 1

- [ ] T009 [P] [US1] Add topic-opening rhythm tests to `D:\CodeX\hanyutong-main\tests\dialogue.spec.js`
- [ ] T010 [P] [US1] Add `/api/dialogue/session/start` response-shape assertions to `D:\CodeX\hanyutong-main\tests\server.spec.js`

### Implementation for User Story 1

- [ ] T011 [US1] Simplify topic opening message specs in `D:\CodeX\hanyutong-main\server\services\dialogueScenarioService.js`
- [ ] T012 [US1] Limit first-turn teacher sequencing and preserve audio generation order in `D:\CodeX\hanyutong-main\server\services\dialogueTeachingService.js`
- [ ] T013 [US1] Update topic-start rendering so only the intended opening messages appear in `D:\CodeX\hanyutong-main\src\components\AIPracticePage.jsx`

**Checkpoint**: User Story 1 should be independently functional and demoable.

---

## Phase 4: User Story 2 - Human-Like Waiting and Reply Rhythm (Priority: P1)

**Goal**: Make the delay after a learner voice message feel like the teacher is listening and replying, not like the system is processing.

**Independent Test**: Send one learner voice reply and verify the learner bubble stays clean while the teacher side shows a waiting cue that resolves into a short teacher response.

### Tests for User Story 2

- [ ] T014 [P] [US2] Add waiting-state and reply-order assertions to `D:\CodeX\hanyutong-main\tests\AIPracticePage.spec.jsx`
- [ ] T015 [P] [US2] Add turn-response contract assertions for teacher reply sequencing to `D:\CodeX\hanyutong-main\tests\server.spec.js`

### Implementation for User Story 2

- [ ] T016 [US2] Remove learner-side processing leakage and keep teacher-side waiting semantics in `D:\CodeX\hanyutong-main\server\services\dialogueTeachingService.js`
- [ ] T017 [US2] Update turn-response handling so waiting and reply replacement stay in believable chat order in `D:\CodeX\hanyutong-main\src\components\AIPracticePage.jsx`
- [ ] T018 [US2] Ensure route-level turn responses support teacher-side waiting-compatible UI flow in `D:\CodeX\hanyutong-main\server\routes\dialogue.js`

**Checkpoint**: User Story 2 should feel like a human chat wait/reply cycle without relying on technical status copy.

---

## Phase 5: User Story 3 - Guided Practice With Minimal Instruction (Priority: P2)

**Goal**: Keep each teacher turn short, actionable, and focused on speaking rather than explanation.

**Independent Test**: Complete one topic and verify every prompt or retry message is concise and focused on one next action or one correction.

### Tests for User Story 3

- [ ] T019 [P] [US3] Add concise-guidance and retry-copy assertions to `D:\CodeX\hanyutong-main\tests\dialogue.spec.js`
- [ ] T020 [P] [US3] Add teacher-feedback brevity assertions to `D:\CodeX\hanyutong-main\tests\server.spec.js`

### Implementation for User Story 3

- [ ] T021 [US3] Refine fallback feedback copy and retry intro generation in `D:\CodeX\hanyutong-main\server\services\dialogueTeachingService.js`
- [ ] T022 [US3] Refine lesson prompts, focus text, and stage copy for brevity in `D:\CodeX\hanyutong-main\server\services\dialogueScenarioService.js`
- [ ] T023 [US3] Tighten system prompts for Flash-generated teacher feedback in `D:\CodeX\hanyutong-main\server\services\arkFlashService.js`

**Checkpoint**: User Story 3 should preserve a teacher-led feel with less instructional noise.

---

## Phase 6: User Story 4 - Progress Without Breaking Conversation Feel (Priority: P2)

**Goal**: Keep topic/stage orientation and session continuity without turning the conversation into a quiz UI.

**Independent Test**: Move through a topic, switch away from the dialogue tab, come back, and verify the same unfinished session and latest messages remain visible above the recording control.

### Tests for User Story 4

- [ ] T024 [P] [US4] Add tab-return continuity coverage to `D:\CodeX\hanyutong-main\tests\AIPracticePage.spec.jsx`
- [ ] T025 [P] [US4] Add dialogue state progression assertions to `D:\CodeX\hanyutong-main\tests\dialogue.spec.js`

### Implementation for User Story 4

- [ ] T026 [US4] Keep topic/stage note output lightweight and non-spammy in `D:\CodeX\hanyutong-main\server\services\dialogueScenarioService.js`
- [ ] T027 [US4] Preserve dialogue tab continuity and restore unfinished message state in `D:\CodeX\hanyutong-main\src\components\AIPracticePage.jsx`
- [ ] T028 [US4] Rework scroll, bottom padding, and newest-message visibility above the recorder in `D:\CodeX\hanyutong-main\src\components\AIPracticePage.jsx`

**Checkpoint**: User Story 4 should maintain progress clarity and mobile-safe readability without flooding chat history.

---

## Phase 7: User Story 5 - Khmer Support for Fixed Teaching Text (Priority: P3)

**Goal**: Keep fixed teacher messages understandable for Khmer-speaking beginners through visible Khmer support text.

**Independent Test**: Open multiple topics and confirm fixed scripted teacher messages consistently display Khmer text where translations exist, while dynamic teacher replies remain usable without Khmer.

### Tests for User Story 5

- [ ] T029 [P] [US5] Add Khmer-support coverage for fixed scripted messages to `D:\CodeX\hanyutong-main\tests\dialogue.spec.js`
- [ ] T030 [P] [US5] Add UI rendering assertions for `khmerText` to `D:\CodeX\hanyutong-main\tests\AIPracticePage.spec.jsx`

### Implementation for User Story 5

- [ ] T031 [US5] Validate and preserve fixed Khmer translation mapping in `D:\CodeX\hanyutong-main\server\services\dialogueScenarioService.js`
- [ ] T032 [US5] Ensure fixed teacher messages carry Khmer support through message materialization in `D:\CodeX\hanyutong-main\server\services\dialogueTeachingService.js`
- [ ] T033 [US5] Render fixed Khmer support text consistently in teacher bubbles in `D:\CodeX\hanyutong-main\src\components\AIPracticePage.jsx`

**Checkpoint**: User Story 5 should keep fixed-script comprehension support intact for Khmer-speaking beginners.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all stories.

- [ ] T034 [P] Reconcile route contract examples with final implementation in `D:\CodeX\hanyutong-main\specs\001-dialogue-v2-human-coach\contracts\dialogue-v2-api.yaml`
- [ ] T035 [P] Refresh manual validation steps and acceptance checks in `D:\CodeX\hanyutong-main\specs\001-dialogue-v2-human-coach\quickstart.md`
- [ ] T036 Run full Dialogue V2 validation using `D:\CodeX\hanyutong-main\specs\001-dialogue-v2-human-coach\quickstart.md`
- [ ] T037 Run regression test suite from `D:\CodeX\hanyutong-main\package.json` and fix any Dialogue V2 regressions in `D:\CodeX\hanyutong-main\tests\server.spec.js`, `D:\CodeX\hanyutong-main\tests\dialogue.spec.js`, and `D:\CodeX\hanyutong-main\tests\AIPracticePage.spec.jsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3-7)**: Depend on Foundational completion
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts first after Foundational and defines the new lesson opening rhythm
- **US2 (P1)**: Depends on foundational message shaping and should follow immediately after US1
- **US3 (P2)**: Depends on the stabilized message sequencing from US1 and US2
- **US4 (P2)**: Depends on stabilized message/state behavior from US1 and US2
- **US5 (P3)**: Depends on the fixed-script message path but remains largely independent once message shaping is stable

### Within Each User Story

- Tests first
- Shared story-specific data/copy shaping before UI polish
- Backend response shaping before frontend final rendering
- Story complete before moving to lower-priority scope if following MVP sequence

### Parallel Opportunities

- T002 and T003 can run in parallel during Setup
- T005, T006, T007 can run in parallel during Foundational
- Within each story, test tasks marked `[P]` can run in parallel
- US5 translation rendering work can run in parallel with later US4 polish once foundational message shaping is complete

---

## Parallel Example: User Story 1

```bash
# Parallel test preparation
T009 Add topic-opening rhythm tests to tests/dialogue.spec.js
T010 Add /api/dialogue/session/start response-shape assertions to tests/server.spec.js

# Then implementation can split by file
T011 Simplify topic opening specs in server/services/dialogueScenarioService.js
T012 Limit first-turn sequencing in server/services/dialogueTeachingService.js
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1
4. Complete Phase 4: US2
5. Stop and validate the teacher-like opening and waiting experience

### Incremental Delivery

1. Foundation
2. Human opening
3. Human-like waiting
4. Minimal instruction
5. Progress + continuity
6. Khmer support verification
7. Polish and regression

### Suggested MVP Scope

For the first high-confidence implementation slice, ship:
- **US1** Human Lesson Opening
- **US2** Human-Like Waiting and Reply Rhythm

These two stories deliver the most visible teacher-like improvement while preserving the existing architecture.

---

## Notes

- `[P]` tasks are parallelizable
- `[US#]` labels map tasks directly to spec user stories
- All task descriptions include exact paths
- `tests/AIPracticePage.spec.jsx` is introduced intentionally as a focused component-level test file for Dialogue V2 UI behavior
