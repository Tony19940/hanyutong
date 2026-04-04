# Dialogue V3 Multi-Engine

## Summary

- Keep Doubao for Chinese ASR, Chinese teacher content generation, and Chinese TTS
- Use Gemini `gemini-3.1-flash-live-preview` for Khmer teacher guidance audio
- Use XFYUN for Chinese pronunciation evaluation
- Move dialogue flow to a five-phase script-driven queue model
- Return teacher audio as runtime asset URLs instead of inline base64

## Core Rules

- One teacher bubble carries one spoken language only
- Chinese teacher messages must include pinyin
- Chinese demo messages may expose a slow replay asset
- Recording unlocks only after the current teacher prompt finishes
- Retry limit remains 3, then the lesson is skipped and queued for review

## API Contract

- `GET /api/dialogue/scenarios` returns scenario metadata, phase info, and service availability
- `POST /api/dialogue/session/start` returns the initial ready queue and current lesson state
- `POST /api/dialogue/session/message` returns recognized learner text, evaluation result, decision, and the next teacher queue
- `GET /api/dialogue/audio/:assetId` streams cached teacher audio assets
- `POST /api/dialogue/session/stop` clears the current in-memory session
