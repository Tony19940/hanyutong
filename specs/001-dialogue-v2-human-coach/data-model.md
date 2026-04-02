# Data Model: Dialogue V2 Human Coach

## Overview

Dialogue V2 reuses the current dialogue domain model but clarifies the entities and state needed to deliver a more human teacher-like rhythm.

## Entities

### DialogueTopic

Represents one guided speaking scenario.

**Fields**
- `id`: stable topic identifier
- `title`: short visible topic title
- `subtitle`: short user-facing explanation
- `dailyTopic`: label shown in daily recommendation context
- `coachName`: teacher persona name
- `stages`: ordered list of stage names
- `lessons[]`: ordered list of `LessonStep`

**Rules**
- Must be selectable from the daily recommendation set.
- Must contain at least one lesson step.
- Must remain understandable to beginners in its title and subtitle.

### LessonStep

Represents a single practice unit within a topic.

**Fields**
- `id`: stable lesson identifier
- `label`: short lesson label
- `mode`: `shadow | prompt | free`
- `stage`: visible stage grouping
- `target`: primary Chinese sentence or task
- `targetKm`: Khmer translation for target sentence when available
- `focus`: one short teaching focus
- `focusKm`: Khmer translation for focus when available
- `prompt`: teacher prompt text
- `promptKm`: Khmer translation for prompt when available
- `keywords[]`: evaluation hints for prompt/free modes

**Rules**
- `shadow` steps must prioritize the target sentence.
- `prompt` and `free` steps must stay actionable for beginners.
- Fixed-script Khmer support should exist where available.

### TeacherMessage

Represents one teacher-side message in the chat stream.

**Fields**
- `id`: unique message id
- `role`: `assistant`
- `type`: `audio | text | note`
- `text`: visible Chinese text
- `khmerText`: optional Khmer support text
- `audio`: optional audio payload metadata
- `createdAt`: timestamp

**Rules**
- Fixed scripted teaching messages should include Khmer support where available.
- Opening and retry messages should remain concise.
- Teacher waiting is represented separately as transient UI state, not persisted as a durable message by default.

### LearnerTurn

Represents one learner response in a topic.

**Fields**
- `id`: unique local or server id
- `role`: `user`
- `type`: `audio | text`
- `audioUrl` or uploaded blob reference on client side
- `text`: ASR transcript or fallback error text
- `durationSeconds`: approximate recording length
- `createdAt`: timestamp

**Rules**
- Learner bubbles must not expose backend processing states.
- Learner audio is authoritative input for ASR and lesson evaluation.

### DialogueSessionState

Represents the mutable state of the current unfinished topic.

**Fields**
- `sessionId`
- `learnerName`
- `scenario`
- `lessonIndex`
- `retryCount`
- `passed`
- `skipped`
- `isComplete`
- `startedAt`

**Derived fields**
- `currentLesson`
- `totalLessons`

**Rules**
- One active dialogue session is kept in memory per current session id.
- Session must survive leaving and returning to the dialogue tab while the server process remains alive.
- Retry limit remains capped by `MAX_DIALOGUE_RETRIES`.

## State Transitions

### Topic Lifecycle

1. `idle` -> learner selects a daily topic
2. `starting` -> server builds session and returns opening teacher messages
3. `active` -> learner and teacher exchange voice-message turns
4. `complete` -> all lesson steps are passed or skipped
5. `stopped` -> session is explicitly stopped or removed

### Lesson Outcome Lifecycle

1. Learner sends audio
2. ASR produces transcript or empty result
3. Evaluation decides:
   - `passed`
   - `retry`
   - `skipped`
   - `complete`
4. Teacher reply is generated
5. Next lesson intro or completion messages are appended

## Validation Notes

- Empty transcripts must not crash the flow; they trigger a short retry-safe teacher reply.
- Khmer translations are optional at the field level but expected for fixed-script content where the translation dataset covers the message.
- Newest messages must remain visible above the recorder in the mobile layout.
