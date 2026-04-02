# Feature Specification: Dialogue V2 Human Coach

**Feature Branch**: `[001-dialogue-v2-human-coach]`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "对话页 V2：更像真人老师的口语训练系统"

## Constitution Alignment

This feature MUST follow the HanYuTong constitution already ratified in `D:\CodeX\hanyutong-main\.specify\memory\constitution.md`, with special emphasis on:

- `开口优先`: reduce time-to-first-sentence and keep the learner speaking
- `真人老师感优先`: keep the teacher feeling like a real chat partner, not a processing pipeline
- `新手优先`: keep prompts simple, concrete, and low-pressure
- `高棉语辅助是核心能力`: preserve Khmer support for fixed teaching text
- `移动端优先`: keep the full loop natural inside a phone-sized Telegram Mini App layout

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Human Lesson Opening (Priority: P1)

As a beginner learner, I want Bunson老师 to open each selected topic like a real person in chat, so that the first few seconds feel natural and low-pressure instead of scripted.

**Why this priority**: The opening sets the tone of the entire exercise. If the first turn feels robotic or overloaded, users lose trust before they even speak.

**Independent Test**: Start any daily recommended topic and verify the teacher opens with no more than two short messages before the learner is expected to respond.

**Acceptance Scenarios**:

1. **Given** the learner taps one of the three daily topics, **When** the topic starts, **Then** the teacher opens with at most two short chat messages before the learner is prompted to speak.
2. **Given** the first stage is `跟我读`, **When** the teacher begins, **Then** the learner sees one short opener and one target sentence rather than a stack of instructions.
3. **Given** different topics are selected on different days, **When** the teacher opens the topic, **Then** the opening feels specific to that topic rather than a generic reusable script.

---

### User Story 2 - Human-Like Waiting and Reply Rhythm (Priority: P1)

As a learner sending voice replies, I want the time between my message and the teacher response to feel like a real chat partner is listening and replying, so that the exercise feels conversational rather than mechanical.

**Why this priority**: This is the clearest difference between a teacher-like dialogue system and a speech processing tool. If the waiting state feels technical, the illusion breaks.

**Independent Test**: Record and send one voice reply, then verify the learner does not see backend processing text and instead sees a teacher-side waiting cue followed by a short teacher response sequence.

**Acceptance Scenarios**:

1. **Given** the learner sends a voice message, **When** the reply is still being prepared, **Then** the learner's own message bubble stays clean and the teacher side shows a conversational waiting state.
2. **Given** the teacher reply is ready, **When** the waiting state ends, **Then** the waiting cue disappears and the teacher reply appears in conversational order.
3. **Given** the system takes longer than usual to reply, **When** the learner is waiting, **Then** the interface continues to imply that the teacher is replying without exposing technical statuses such as recognition or inference.

---

### User Story 3 - Guided Practice With Minimal Instruction (Priority: P2)

As a beginner learner, I want the teacher to keep guidance short and directly tied to the next thing I should say, so that I spend more time speaking and less time reading.

**Why this priority**: The product's goal is spoken confidence, not instructional reading. Guidance must support action, not dominate the turn.

**Independent Test**: Complete one full topic and verify each turn contains only the minimum guidance needed to continue speaking.

**Acceptance Scenarios**:

1. **Given** the learner is in `跟我读`, **When** the teacher introduces the next sentence, **Then** the target sentence remains the main focus and extra guidance stays short.
2. **Given** the learner is in `你来说` or `自由聊`, **When** the teacher prompts the learner, **Then** the prompt is concise, concrete, and directly actionable.
3. **Given** the learner fails a sentence, **When** the teacher asks for another try, **Then** the retry guidance focuses on one key correction only.

---

### User Story 4 - Progress Without Breaking Conversation Feel (Priority: P2)

As a learner, I want to understand which topic and stage I am in without the chat feeling like a quiz UI, so that I feel guided but still immersed in a teacher-led conversation.

**Why this priority**: Users need orientation, but too much system framing damages the teacher illusion and adds reading burden.

**Independent Test**: Move through one topic and verify progress remains understandable while the message stream still feels like a chat conversation.

**Acceptance Scenarios**:

1. **Given** the learner starts a topic, **When** the first lesson begins, **Then** the current topic and stage are understandable without requiring multiple status messages in the chat.
2. **Given** the learner progresses to the next lesson step, **When** the transition happens, **Then** progress updates do not flood the message stream with system-like text.

---

### User Story 5 - Khmer Support for Fixed Teaching Text (Priority: P3)

As a Khmer-speaking beginner, I want fixed teacher teaching sentences to include Khmer support text, so that I can understand the meaning even when my Chinese is still weak.

**Why this priority**: Khmer support lowers fear and supports comprehension, but dialogue rhythm and naturalness remain higher priority.

**Independent Test**: Open any topic and verify fixed teacher messages such as openers, target sentences, and scripted prompts display Khmer support where translations exist.

**Acceptance Scenarios**:

1. **Given** a fixed scripted teacher sentence is shown, **When** the learner reads it, **Then** the learner can also view the Khmer meaning.
2. **Given** a dynamic teacher reply is generated, **When** no Khmer translation is available, **Then** the dialogue still remains understandable and usable.

### Edge Cases

- What happens when the teacher reply takes significantly longer than normal?
- How should the system behave when the learner sends an empty, too-short, or unclear recording?
- What happens when the learner leaves the dialogue tab while the teacher is in a waiting state?
- How should the topic resume when the learner comes back to an unfinished dialogue session?
- What happens when a sentence reaches the retry limit and must be skipped without breaking the teacher-like rhythm?
- How should the interface behave when TTS fails for a teacher message but text still exists?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST start each selected dialogue topic with a concise teacher-style opening that uses no more than two teacher messages before the learner is expected to respond.
- **FR-002**: The system MUST prioritize the target sentence over explanatory instructional text during `跟我读` practice.
- **FR-003**: The system MUST avoid showing technical processing language inside the learner's own message bubble.
- **FR-004**: The system MUST show a teacher-side conversational waiting state while the teacher reply is being prepared.
- **FR-005**: The system MUST remove the waiting state immediately when the teacher reply becomes available.
- **FR-006**: The system MUST keep retry guidance short and focused on one correction at a time.
- **FR-007**: The system MUST preserve the three-stage lesson model of `跟我读`、`你来说`、`自由聊`.
- **FR-008**: The system MUST present topic and stage progress without flooding the chat stream with system-style status messages.
- **FR-009**: The system MUST continue to display Khmer support text for fixed scripted teacher messages where translations exist.
- **FR-010**: The system MUST preserve a teacher-led chat feeling instead of drifting into a test UI or backend-debug UI.
- **FR-011**: The system MUST preserve the existing retry-limit and skip-after-failure behavior.
- **FR-012**: The system MUST maintain dialogue continuity when the learner temporarily leaves and returns to the dialogue tab within the same unfinished session.
- **FR-013**: The system MUST keep the first learner action lightweight enough that a beginner can send a first voice reply within the first minute of entering a topic.
- **FR-014**: The system MUST keep the mobile layout clear enough that the latest teacher and learner messages remain visible above the recording control.

### Key Entities *(include if feature involves data)*

- **Dialogue Topic**: A guided real-world speaking scenario such as restaurant ordering or workplace greetings, including title, subtitle, daily recommendation metadata, and lesson sequence.
- **Lesson Step**: A single guided unit within a topic, including stage, label, target sentence, focus point, scripted prompt, and Khmer support text.
- **Teacher Message**: A scripted or generated assistant-side chat message with text, optional Khmer support, optional audio, timestamp, and display role.
- **Learner Turn**: A single learner voice reply plus its ASR text, evaluation result, retry count impact, and relation to the active lesson step.
- **Waiting State**: A temporary teacher-side conversational state used while the next teacher reply is still being prepared.
- **Dialogue Session State**: The in-memory state for the current unfinished topic, including active topic, active lesson index, stage, retries, pass/skip counts, and pending reply status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In at least 90% of topic starts, the learner sees no more than two teacher messages before the first expected learner response.
- **SC-002**: At least 80% of learners who start a dialogue topic send a first voice reply within the first minute.
- **SC-003**: The percentage of dialogue sessions abandoned before the first learner reply decreases compared with the current dialogue flow.
- **SC-004**: User feedback on dialogue naturalness improves, with learners reporting that Bunson老师 feels more like a real chat partner than a scripted system.
- **SC-005**: At least 90% of fixed scripted teacher messages display Khmer support text where a translation exists.
- **SC-006**: The majority of tested dialogue sessions keep the latest message fully visible above the recording control on mobile-sized layouts.

## Assumptions

- The target audience remains Khmer-speaking beginners learning practical spoken Chinese.
- The product goal for dialogue remains guided speaking practice, not fully open-ended AI conversation.
- Existing topic structures, retry logic, ASR + Flash + TTS pipeline, and teacher persona remain in place for this version.
- Dynamic teacher replies may remain Chinese-only if live Khmer translation is still out of scope for this release.
- The existing chat-style UI foundation will be refined rather than replaced with a completely new interaction model.
