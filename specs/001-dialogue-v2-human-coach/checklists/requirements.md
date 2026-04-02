# Requirements Checklist: Dialogue V2 Human Coach

**Purpose**: Validate that the Dialogue V2 spec is complete, constitution-aligned, and ready to move into planning.
**Created**: 2026-04-01
**Feature**: `D:\CodeX\hanyutong-main\specs\001-dialogue-v2-human-coach\spec.md`

## Constitution Alignment

- [ ] CHK001 The spec clearly prioritizes helping users speak sooner, not adding explanation-heavy flows.
- [ ] CHK002 The spec explicitly protects the “real teacher chat” feel over exposing backend processing.
- [ ] CHK003 The spec keeps beginner comprehension as a first-class design constraint.
- [ ] CHK004 The spec preserves Khmer support for fixed teaching text.
- [ ] CHK005 The spec includes mobile-first constraints for message visibility and recording controls.

## Scope Clarity

- [ ] CHK006 The feature scope is clearly limited to Dialogue V2 behavior and does not silently include unrelated tabs.
- [ ] CHK007 The spec distinguishes fixed scripted teacher content from dynamic teacher replies.
- [ ] CHK008 The spec states what remains out of scope for this version, especially around open-ended AI conversation and live Khmer translation.
- [ ] CHK009 The spec keeps the three-stage lesson structure intact.

## User Stories

- [ ] CHK010 Each user story is independently testable.
- [ ] CHK011 User Story 1 covers topic opening rhythm.
- [ ] CHK012 User Story 2 covers human-like waiting and reply handling.
- [ ] CHK013 User Story 3 covers concise guidance and retry behavior.
- [ ] CHK014 User Story 4 covers progress without breaking conversation feel.
- [ ] CHK015 User Story 5 covers Khmer support for fixed teaching text.

## Requirements Coverage

- [ ] CHK016 Requirements cover opening message count limits.
- [ ] CHK017 Requirements cover removal of technical processing language from learner-facing states.
- [ ] CHK018 Requirements cover the teacher-side waiting state.
- [ ] CHK019 Requirements cover retry-limit and skip continuity.
- [ ] CHK020 Requirements cover dialogue continuity when leaving and returning to the tab.
- [ ] CHK021 Requirements cover visibility of latest messages above the recording control.

## Testability

- [ ] CHK022 The edge cases include slow replies, unclear recordings, tab switching, retry limits, and TTS failure.
- [ ] CHK023 Success criteria are measurable and technology-agnostic.
- [ ] CHK024 The spec can move to planning without requiring hidden implementation assumptions.

## Notes

- Check items off as completed: `[x]`
- Add clarifications inline before moving to `spec-kit` planning if any unchecked item blocks architecture or task decomposition.
