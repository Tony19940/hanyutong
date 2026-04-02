# Feature Specification: Dialogue V2 Human Coach

**Feature Branch**: `[dialogue-v2-human-coach]`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "对话页 V2：更像真人老师的口语训练系统"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Natural Lesson Opening (Priority: P1)

As a beginner learner, I want the AI teacher to open each lesson like a real person in chat, so that I feel like I am talking to a teacher instead of being pushed through a scripted system.

**Why this priority**: The opening rhythm shapes the entire perceived quality of the dialogue experience. If the first few messages feel robotic, users lose trust immediately.

**Independent Test**: Can be fully tested by starting a new dialogue topic and verifying that the first-turn teacher behavior feels concise, human, and not overly system-like.

**Acceptance Scenarios**:

1. **Given** the user enters the dialogue tab and selects a topic, **When** the topic starts, **Then** the teacher opens with at most two short messages before asking for the learner response.
2. **Given** the first lesson is a follow-along sentence, **When** the teacher starts the lesson, **Then** the learner sees a short opener and one clear target sentence rather than a stack of instructional messages.
3. **Given** a learner returns to a new daily topic, **When** the teacher begins, **Then** the opening feels specific to the chosen topic and not like a generic system announcement.

---

### User Story 2 - Human-Like Turn Taking (Priority: P1)

As a learner sending voice replies, I want the waiting period before the AI response to feel like a real chat partner is thinking and replying, so that the interaction feels natural rather than mechanical.

**Why this priority**: This is the core difference between a tool and a teacher-like experience. The learner must feel the AI is responding conversationally, not exposing backend processing.

**Independent Test**: Can be tested by sending a voice reply and verifying that the user does not see raw system-processing text and instead sees a believable conversational waiting state.

**Acceptance Scenarios**:

1. **Given** the user sends a voice message, **When** the system is still processing the reply, **Then** the user message remains clean and the teacher side shows a conversational waiting state such as “正在输入…” or equivalent.
2. **Given** the AI response is ready, **When** the waiting state ends, **Then** the waiting indicator disappears and the actual teacher reply appears in sequence.
3. **Given** the system takes longer than usual to reply, **When** the learner is waiting, **Then** the interface continues to communicate that the teacher is responding without exposing technical system states.

---

### User Story 3 - Guided Practice Without Excess Instruction (Priority: P2)

As a beginner learner, I want the teacher to keep guidance short and focused on what I should say next, so that I spend more time speaking and less time reading instructions.

**Why this priority**: The product's value is speaking practice, not reading interface copy. Guidance should support speech, not dominate the lesson.

**Independent Test**: Can be tested by completing one full topic and confirming that each turn includes only the minimum amount of teacher guidance needed to continue.

**Acceptance Scenarios**:

1. **Given** the learner is in “跟我读” mode, **When** the teacher introduces the next sentence, **Then** the guidance is short and the main emphasis is on the target sentence.
2. **Given** the learner is in “你来说” or “自由聊” mode, **When** the teacher prompts the learner, **Then** the prompt is concise and directly actionable.
3. **Given** the learner fails a sentence, **When** the teacher asks for another attempt, **Then** the retry guidance is brief and focused on one key correction.

---

### User Story 4 - Clear Progress With Real Conversation Feel (Priority: P2)

As a learner, I want to know where I am in the topic without the chat feeling like a quiz interface, so that I feel supported but not over-instructed.

**Why this priority**: Progress clarity matters, but too much system framing breaks immersion.

**Independent Test**: Can be tested by moving through one topic and confirming that progress remains understandable without overwhelming the chat stream with meta messages.

**Acceptance Scenarios**:

1. **Given** the learner starts a topic, **When** the first lesson begins, **Then** the current stage and topic are understandable without requiring multiple status messages in the chat.
2. **Given** the learner progresses to the next sentence, **When** the transition happens, **Then** the UI reflects progress without interrupting the conversational flow.

---

### User Story 5 - Beginner Support Through Khmer Context (Priority: P3)

As a Khmer-speaking beginner, I want each fixed teaching sentence to show Khmer support text, so that I can understand the meaning even if my Chinese is still weak.

**Why this priority**: This lowers fear and helps beginners stay in the exercise, but it is secondary to getting the teacher rhythm right.

**Independent Test**: Can be tested by opening any dialogue topic and confirming that fixed teacher messages include Khmer support text when available.

**Acceptance Scenarios**:

1. **Given** a fixed scripted teacher sentence is shown, **When** the learner reads it, **Then** the learner can also see the Khmer meaning.
2. **Given** a dynamic teacher reply is generated, **When** no Khmer translation is available, **Then** the system still remains understandable and usable.

### Edge Cases

- What happens when the AI response takes significantly longer than normal?
- How does the system behave if the learner sends an empty or unclear recording?
- What happens when the learner switches tabs in the middle of a waiting state?
- How does the dialogue resume if the learner reopens the tab during the same unfinished topic?
- How should the system behave when a sentence is skipped after repeated failures?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST start each selected dialogue topic with a concise conversational opening that uses no more than two teacher messages before the learner is expected to respond.
- **FR-002**: The system MUST prioritize the target sentence itself over explanatory instructional text during follow-along practice.
- **FR-003**: The system MUST avoid showing technical processing language such as recognition or backend status inside the learner’s own message bubble.
- **FR-004**: The system MUST show a teacher-side conversational waiting state while the learner is waiting for the AI reply.
- **FR-005**: The system MUST remove the waiting state immediately when the actual teacher reply becomes available.
- **FR-006**: The system MUST keep retry guidance brief and focused on one key correction at a time.
- **FR-007**: The system MUST preserve the three-stage lesson model of follow-along, prompted response, and freer speaking.
- **FR-008**: The system MUST present progress in a way that does not flood the chat stream with system-like instructions.
- **FR-009**: The system MUST continue to show Khmer support text for fixed scripted teacher messages where translations exist.
- **FR-010**: The system MUST keep the interaction feeling like a teacher-led chat rather than a test interface or system wizard.
- **FR-011**: The system MUST preserve the existing retry limit behavior and skip behavior after repeated failed attempts.
- **FR-012**: The system MUST maintain dialogue continuity when the learner temporarily leaves and returns to the dialogue tab within the same session.

### Key Entities *(include if feature involves data)*

- **Dialogue Topic**: A guided practice scenario such as ordering food or workplace greetings, including its title, subtitle, and lesson sequence.
- **Lesson Step**: A single unit within a topic, containing stage, label, target sentence, teaching prompt, and support translations.
- **Teacher Message**: A scripted or generated assistant message delivered as chat content, optionally with audio and Khmer support text.
- **Learner Turn**: A single learner voice reply and its evaluated result within the current lesson step.
- **Waiting State**: A temporary conversational state shown while the teacher response is being prepared.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In at least 90% of topic starts, the learner sees no more than two teacher chat messages before the first expected learner response.
- **SC-002**: At least 80% of learners who start a dialogue topic send a first voice reply within the first minute.
- **SC-003**: The percentage of dialogue sessions abandoned before the first learner reply decreases compared with the current dialogue flow.
- **SC-004**: User feedback on dialogue naturalness improves, with learners reporting that the teacher feels more like a real chat partner than a scripted system.
- **SC-005**: At least 90% of fixed scripted teacher messages continue to display Khmer support text where a translation is available.

## Assumptions

- The current target audience remains Khmer-speaking beginner learners of practical Chinese.
- The product goal for dialogue is guided speaking practice, not open-ended AI conversation.
- Existing topic structures, retry logic, and basic AI pipeline remain in place for this version.
- Dynamic teacher replies may remain Chinese-only if real-time Khmer translation is not yet part of the approved scope.
- The current chat-style UI foundation will be reused rather than replaced with a completely new interaction model.
