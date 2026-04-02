# Quickstart: Dialogue V2 Human Coach

## Prerequisites

- Node.js 18+
- Valid environment variables for:
  - `DOUBAO_ASR_APP_ID`
  - `DOUBAO_ASR_ACCESS_TOKEN`
  - `DOUBAO_ASR_RESOURCE_ID`
  - `ARK_API_KEY`
  - `ARK_DOUBAO_FLASH_ENDPOINT_ID`
  - `ARK_BASE_URL`
  - `DOUBAO_TTS_APP_ID`
  - `DOUBAO_TTS_TOKEN`
  - `DOUBAO_TTS_CLUSTER`
  - `DOUBAO_TTS_VOICE_TYPE`
- Existing app auth working locally

## Start the app

```powershell
cd D:\CodeX\hanyutong-main
npm install
npm run dev
```

Frontend should be available through the local Vite URL, with the Express server handling `/api`.

## Verify the feature manually

1. Log in with a valid local test code.
2. Open the `对话` tab.
3. Confirm three daily recommended topics appear.
4. Tap one topic.
5. Verify:
   - no more than two opening teacher messages before learner action
   - fixed teacher messages show Khmer support text where available
   - the latest message is visible above the recording control
6. Tap `开始录音`, record a short sentence, then tap again to send.
7. Verify:
   - your own bubble does not show backend processing text
   - Bunson老师 shows a conversational waiting state
   - the teacher reply appears in sequence
8. Switch away from the tab and return.
9. Verify the same unfinished session remains visible.

## Automated checks

```powershell
cd D:\CodeX\hanyutong-main
npm test
npm run build
```

## Recommended focused checks for V2

- Start-of-topic message count
- Retry guidance brevity
- Teacher waiting indicator behavior
- Khmer support rendering for fixed scripted messages
- Mobile viewport latest-message visibility above the recorder
