# Research: Dialogue V2 Human Coach

## Decision 1: Keep the current voice-message architecture

**Decision**: Continue using the existing `ASR + Doubao-Seed-1.6-flash + TTS` pipeline rather than returning to the older realtime dialogue socket approach.

**Rationale**:
- The current product goal is voice-message-style practice, not phone-call-style full duplex conversation.
- The current implementation already supports uploaded voice blobs, ASR transcription, Flash-generated feedback, and TTS teacher replies.
- This architecture is easier to constrain to guided lesson flow, retry rules, and concise teacher messaging.

**Alternatives considered**:
- Reintroduce realtime WebSocket dialogue: rejected because it increases implementation complexity and weakens lesson-flow control for this use case.

## Decision 2: Preserve in-memory dialogue session storage for V2

**Decision**: Keep the active dialogue session in `server/services/dialogueSessionStore.js` as in-memory state for this version.

**Rationale**:
- Current product requirement is continuity when leaving and returning to the dialogue tab during the same live session, not full durable history across process restarts.
- In-memory storage already exists and matches the current scope.
- Moving to database persistence would add complexity without being required by the current V2 spec.

**Alternatives considered**:
- Persist unfinished sessions in PostgreSQL: rejected for V2 because it adds migration, cleanup, and resume logic beyond current scope.
- Persist only in local browser storage: rejected because authoritative lesson progression and evaluation already live server-side.

## Decision 3: Treat Khmer support as fixed-script-only for V2

**Decision**: Khmer support remains mandatory for fixed scripted teacher messages, but dynamic teacher feedback remains Chinese-only in V2.

**Rationale**:
- Fixed-script translations already exist in `data/dialogue-khmer-translation-template.json`.
- Dynamic live translation would increase latency and introduce a second AI dependency into every turn.
- Constitution prioritizes comprehension support without breaking the main speaking flow.

**Alternatives considered**:
- Live translate all teacher feedback: rejected because it adds cost, latency, and reliability risk.
- Remove Khmer support from dialogue: rejected because it conflicts with the constitution.

## Decision 4: Keep REST endpoints as the dialogue contract surface

**Decision**: Dialogue V2 will continue to use the existing authenticated REST API:
- `GET /api/dialogue/scenarios`
- `POST /api/dialogue/session/start`
- `POST /api/dialogue/session/message`
- `POST /api/dialogue/session/stop`

**Rationale**:
- These endpoints already match the voice-message product model.
- The frontend already uses `src/utils/api.js` with `FormData` upload for audio messages.
- The contract surface is narrow and testable with Supertest.

**Alternatives considered**:
- Add a new socket transport: rejected as unnecessary for this version.
- Collapse all dialogue actions into one generic endpoint: rejected because it would make contracts less explicit.

## Decision 5: Model teacher waiting as a UI state, not a backend processing state

**Decision**: The learner should never see raw backend-processing language in their own message bubble. Any wait between learner send and teacher response should be represented as a teacher-side conversational waiting cue.

**Rationale**:
- Directly aligned with the constitution's “真人老师感优先”.
- Keeps the chat illusion intact even when external AI latency varies.
- Matches current product expectations already validated through recent iteration.

**Alternatives considered**:
- Show learner-side status text such as “正在识别”: rejected because it breaks immersion.
- Show no waiting state at all: rejected because it makes the app feel laggy or unresponsive.
