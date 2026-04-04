# Implementation Plan

## Backend

- Refactor dialogue scenarios into script-driven five-phase steps derived from the existing topic seed set
- Add Khmer Gemini audio generation, XFYUN pronunciation scoring, and runtime audio asset caching
- Expand dialogue state and responses to carry queue metadata, evaluation fields, and slow-replay URLs

## Frontend

- Replace the old reply-per-request flow with a queue-driven teacher playback flow
- Show Chinese teacher text with pinyin and a slow replay button when available
- Unlock learner recording only after the active prompt message completes

## Verification

- Vitest covers dialogue session progression, server routes, and the dialogue page topic selector
- Build verification remains `npm run build`
