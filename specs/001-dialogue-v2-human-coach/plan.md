# Implementation Plan: Dialogue V2 Human Coach

**Branch**: `[001-dialogue-v2-human-coach]` | **Date**: 2026-04-01 | **Spec**: [spec.md](D:/CodeX/hanyutong-main/specs/001-dialogue-v2-human-coach/spec.md)
**Input**: Feature specification from `/specs/001-dialogue-v2-human-coach/spec.md`

## Summary

Dialogue V2 will refine the existing voice-message-style practice flow so it feels more like chatting with a real teacher. The implementation will keep the current `ASR + Doubao-Seed-1.6-flash + TTS` pipeline, but tighten the first-turn lesson opening, shorten teacher guidance, replace backend-feeling waits with teacher-side conversational waiting states, preserve Khmer support for fixed scripted teaching text, and keep the latest message visible above the recording control in a mobile-first Telegram Mini App layout.

## Technical Context

**Language/Version**: JavaScript ES Modules on Node.js `>=18`, React 18  
**Primary Dependencies**: Express, React, Vite, Multer, Vitest, Testing Library, Supertest, `@volcengine/openapi`  
**Storage**: PostgreSQL for app data, in-memory `Map` for active dialogue sessions, JSON files for topic and Khmer translation content  
**Testing**: Vitest, React Testing Library, Supertest  
**Target Platform**: Telegram Mini App mobile web UI + Node.js web server  
**Project Type**: Web application  
**Performance Goals**: Dialogue start should feel responsive; daily topic selection should show immediate UI feedback; latest teacher or learner message should remain visible above the recording control on phone-sized screens; first learner reply should remain achievable within the first minute  
**Constraints**: Mobile-first layout, low cognitive load for beginners, fixed 5MB upload limit for voice messages, active session continuity remains in-memory for V2, existing external AI latency cannot be eliminated and must be masked with conversational UI states  
**Scale/Scope**: 50 dialogue topics, 3 daily recommendations, one active unfinished session per learner in the client flow, fixed-script Khmer support, guided speaking not open-ended free chat

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **开口优先**: Pass. Plan reduces message overload at topic start, keeps prompts short, and optimizes time-to-first-voice-reply.
- **真人老师感优先**: Pass. Plan replaces exposed backend-feeling waits with teacher-side conversational waiting states and constrains teacher message rhythm.
- **新手优先**: Pass. Plan keeps guidance concrete, low-pressure, and preserves short, structured lesson turns.
- **高棉语辅助是核心能力**: Pass. Plan preserves Khmer support for fixed scripted teacher messages and models that data explicitly.
- **移动端优先**: Pass. Plan treats the conversation viewport, message list, and recording control as a mobile-first layout problem.
- **少而精**: Pass. Scope is limited to Dialogue V2 behavior, not a broader redesign of other tabs or a new AI stack.

Post-Phase-1 re-check expectation:
- Design artifacts must preserve fixed-script Khmer support, keep sessions mobile-safe, and avoid introducing system-heavy instructional text or unnecessary open-ended AI behavior.

## Project Structure

### Documentation (this feature)

```text
specs/001-dialogue-v2-human-coach/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── dialogue-v2-api.yaml
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── components/
│   └── AIPracticePage.jsx
├── hooks/
│   └── usePronunciation.js
└── utils/
    └── api.js

server/
├── index.js
├── config.js
├── routes/
│   └── dialogue.js
├── services/
│   ├── dialogueScenarioService.js
│   ├── dialogueTeachingService.js
│   ├── dialogueSessionStore.js
│   ├── doubaoAsrService.js
│   ├── arkFlashService.js
│   └── doubaoTtsService.js
└── middleware/

data/
└── dialogue-khmer-translation-template.json

tests/
├── dialogue.spec.js
├── server.spec.js
└── *.spec.jsx|js
```

**Structure Decision**: Keep the existing single-repo web app structure. Dialogue V2 touches one React screen, one API client, one authenticated Express route group, several backend dialogue services, and the existing dialogue data files. No new top-level application or service boundary is needed.

## Phase 0: Research Outcomes

Phase 0 is complete through direct repository inspection and existing implementation review. See [research.md](D:/CodeX/hanyutong-main/specs/001-dialogue-v2-human-coach/research.md).

Resolved questions:
- Keep the current ASR + Flash + TTS architecture instead of returning to realtime duplex audio.
- Preserve in-memory active session storage for V2 rather than introducing database persistence.
- Use the current authenticated REST endpoints as the public contract surface for the dialogue UI.
- Treat Khmer translation as fixed-script support only for this version.

## Phase 1: Design Outputs

Phase 1 outputs for this feature are:
- [data-model.md](D:/CodeX/hanyutong-main/specs/001-dialogue-v2-human-coach/data-model.md)
- [contracts/dialogue-v2-api.yaml](D:/CodeX/hanyutong-main/specs/001-dialogue-v2-human-coach/contracts/dialogue-v2-api.yaml)
- [quickstart.md](D:/CodeX/hanyutong-main/specs/001-dialogue-v2-human-coach/quickstart.md)

### Design Direction

1. **Conversation rhythm**
   - Limit the opening to one short teacher opener plus one target sentence in most starts.
   - Keep retries and prompts to one key correction or one next action.
   - Replace any exposed backend state on the learner side with teacher-side waiting cues.

2. **State handling**
   - Keep the current in-memory dialogue session shape.
   - Explicitly model a teacher waiting state in the frontend UI and response contract.
   - Keep tab-switch continuity without requiring database persistence.

3. **Message content**
   - Fixed scripted teacher messages continue to carry Khmer support text.
   - Dynamic teacher feedback remains Chinese-only unless future scope explicitly adds live Khmer translation.

4. **Mobile layout**
   - Message list remains internally scrollable.
   - Recording control remains fixed.
   - Bottom padding guarantees the newest message is visible above the recording area.

## Test Strategy

### Automated

- Extend `tests/dialogue.spec.js` to cover:
  - concise topic opening behavior
  - retry and skip continuity
  - fixed Khmer support presence
- Extend request/route tests to cover:
  - start response shape
  - turn response shape
  - waiting-state-compatible contract fields if added
- Maintain `npm test` and `npm run build` as required gates.

### Manual

- Mobile-sized browser verification of:
  - topic start rhythm
  - teacher-side waiting cue
  - latest-message visibility above recording control
  - tab leave/return continuity
  - Khmer support readability for fixed teacher messages
- Local end-to-end verification with valid ASR, Ark, and TTS credentials.

## Implementation Phases

### Phase A - Message Rhythm and Teacher Presence

- Simplify topic opening sequence.
- Refine teacher reply batching and waiting indicators.
- Ensure no backend-feeling status leaks into learner bubbles.

### Phase B - Session and Message State

- Make conversation state explicit enough to preserve continuity and teacher waiting transitions.
- Keep new responses appended in believable chat order.

### Phase C - Mobile Conversation Layout

- Guarantee latest message visibility above the recorder.
- Preserve manual history scrolling and automatic smooth repositioning.
- Keep the recorder compact and anchored to the bottom.

### Phase D - Validation and Polish

- Verify Khmer support coverage for fixed-script messages.
- Tune message count, timing, and retry copy against constitution rules.
- Re-run automated and manual checks.

## Constitution Check After Design

- **开口优先**: Maintained. All phases reduce reading burden and protect time-to-first-speech.
- **真人老师感优先**: Maintained. Waiting, reply sequencing, and tone are centered around teacher presence rather than system exposure.
- **新手优先**: Maintained. Dynamic complexity stays bounded; prompts remain guided and concrete.
- **高棉语辅助是核心能力**: Maintained. Fixed-script teacher content continues to support Khmer.
- **移动端优先**: Maintained. Layout, scrolling, and recording control behavior remain explicitly mobile-first.
- **少而精**: Maintained. No unnecessary scope expansion into other product areas.

## Complexity Tracking

No constitution violations currently require justification.
