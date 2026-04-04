import { beforeEach, describe, expect, it, vi } from 'vitest';

function setDialogueEnv() {
  process.env.DOUBAO_ASR_APP_ID = 'asr-app';
  process.env.DOUBAO_ASR_ACCESS_TOKEN = 'asr-token';
  process.env.DOUBAO_ASR_RESOURCE_ID = 'volc.bigasr.auc_turbo';
  process.env.ARK_API_KEY = 'ark-key';
  process.env.ARK_DOUBAO_FLASH_ENDPOINT_ID = 'ep-flash';
  process.env.DOUBAO_TTS_APP_ID = 'tts-app';
  process.env.DOUBAO_TTS_TOKEN = 'tts-token';
  process.env.DOUBAO_TTS_CLUSTER = 'volcano_tts';
  process.env.DOUBAO_TTS_VOICE_TYPE = 'BV001_streaming';
  process.env.GEMINI_API_KEY = 'gemini-key';
  process.env.GEMINI_KHMER_MODEL = 'gemini-3.1-flash-live-preview';
  process.env.GEMINI_KHMER_VOICE_NAME = 'Gacrux';
  process.env.XFYUN_APP_ID = 'xf-app';
  process.env.XFYUN_API_KEY = 'xf-key';
  process.env.XFYUN_API_SECRET = 'xf-secret';
}

async function loadDialogueModule() {
  vi.resetModules();
  setDialogueEnv();
  return import('../server/services/dialogueScenarioService.js');
}

describe('dialogue lesson flow', () => {
  beforeEach(() => {
    setDialogueEnv();
  });

  it('marks a shadow lesson as passed and advances to the next lesson', async () => {
    const { applyTranscriptToSession, buildDialogueSession } = await loadDialogueModule();
    const session = buildDialogueSession({ scenarioId: 'greeting', learnerName: 'Tony' });

    const result = applyTranscriptToSession(session, '你好，我叫小豆。', { overallScore: 88, toneScore: 90, phonemeScore: 84, fluencyScore: 82 });

    expect(result.outcome).toBe('passed');
    expect(result.evaluation.passed).toBe(true);
    expect(result.state.lessonIndex).toBe(1);
    expect(result.state.passed).toBe(1);
    expect(result.evaluation.contentMatched).toBe(true);
  });

  it('increments retry count when a lesson does not pass', async () => {
    const { applyTranscriptToSession, buildDialogueSession, buildDialogueState } = await loadDialogueModule();
    const session = buildDialogueSession({ scenarioId: 'meal', learnerName: 'Tony' });

    const result = applyTranscriptToSession(session, '我不知道');

    expect(result.outcome).toBe('retry');
    expect(result.evaluation.retryCount).toBe(1);
    expect(buildDialogueState(session).lessonIndex).toBe(0);
  });

  it('builds a concise Khmer start flow before the first Chinese demo', async () => {
    const { buildDialogueSession, buildStartSpecs } = await loadDialogueModule();
    const session = buildDialogueSession({ scenarioId: 'greeting', learnerName: 'Tony' });

    const teacherMessages = buildStartSpecs(session).filter((message) => message.sender === 'teacher');

    expect(teacherMessages.map((message) => [message.language, message.displayText])).toEqual([
      ['km', 'ថ្ងៃនេះយើងហាត់សន្ទនាខ្លីមួយ។ ខ្ញុំនឹងអានជាមុន ហើយអ្នកអានតាមបន្ទាប់។'],
      ['zh', '你好，我叫小豆。'],
      ['km', 'ឥឡូវនេះសូមអានតាមខ្ញុំ។'],
    ]);
  });

  it('skips after the third failed attempt', async () => {
    const { applyTranscriptToSession, buildDialogueSession } = await loadDialogueModule();
    const session = buildDialogueSession({ scenarioId: 'shopping', learnerName: 'Tony' });

    applyTranscriptToSession(session, '不知道');
    applyTranscriptToSession(session, '不知道');
    const result = applyTranscriptToSession(session, '不知道');

    expect(result.outcome).toBe('skipped');
    expect(result.evaluation.skipped).toBe(true);
    expect(result.state.lessonIndex).toBe(1);
    expect(result.state.skipped).toBe(1);
    expect(result.evaluation.reviewQueued).toBe(true);
  });
});
