import multer from 'multer';
import path from 'path';
import { Router } from 'express';
import { badRequest, notFound, unauthorized } from '../errors.js';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  buildDialogueSession,
  buildDialogueState,
  getDialogueAvailability,
  listDailyDialogueScenarios,
  listDialogueScenarios,
} from '../services/dialogueScenarioService.js';
import {
  buildDialogueStartResponse,
  buildDialogueTurnResponse,
} from '../services/dialogueTeachingService.js';
import { getDialogueSession, removeDialogueSession, saveDialogueSession } from '../services/dialogueSessionStore.js';
import { resolveDialogueAudioAsset } from '../services/audioAssetService.js';
import { trackAppEvent } from '../services/analyticsService.js';
import { transcribeDialogueAudio } from '../services/doubaoAsrService.js';
import { buildPronunciationFallback, evaluatePronunciation } from '../services/xfyunPronunciationService.js';
import { ensureUserSettingsForDialogue } from '../services/userSettingsService.js';
import { consumeFreeQuota, getFreeQuotaSummary } from '../services/freeQuotaService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/audio/:assetId', asyncHandler(async (req, res) => {
  const asset = resolveDialogueAudioAsset(String(req.params.assetId || '').trim());
  if (!asset) {
    throw notFound('Dialogue audio asset not found', 'DIALOGUE_AUDIO_NOT_FOUND');
  }

  res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
  res.sendFile(path.resolve(asset.filePath));
}));

router.use(requireUserAuth);

router.get('/scenarios', asyncHandler(async (req, res) => {
  res.json({
    ...getDialogueAvailability(),
    scenarios: listDialogueScenarios(),
    dailyScenarios: listDailyDialogueScenarios(),
    freeQuota: await getFreeQuotaSummary(req.user.id),
  });
}));

router.post('/session/start', asyncHandler(async (req, res) => {
  const { scenarioId } = req.body || {};
  if (!scenarioId) {
    throw badRequest('scenarioId is required', 'MISSING_SCENARIO_ID');
  }

  let quota = null;
  if (req.user.membership?.accessLevel !== 'premium') {
    const consumeResult = await consumeFreeQuota(req.user.id, 'dialogue', 1);
    quota = consumeResult.quota;
    if (!consumeResult.allowed) {
      throw unauthorized('Premium membership is required', 'PREMIUM_REQUIRED');
    }
  } else {
    quota = await getFreeQuotaSummary(req.user.id);
  }

  const session = buildDialogueSession({
    scenarioId,
    learnerName: req.user.name || '学员',
    voiceType: (await ensureUserSettingsForDialogue(req.user)).voiceType,
  });
  saveDialogueSession(session);
  await trackAppEvent({
    userId: req.user.id,
    eventName: 'dialogue_start',
    metadata: { scenarioId },
  });

  const startResponse = await buildDialogueStartResponse(session);
  res.json({
    ok: true,
    session: {
      sessionId: session.sessionId,
      scenario: {
        id: session.scenario.id,
        title: session.scenario.title,
        subtitle: session.scenario.subtitle,
        dailyTopic: session.scenario.dailyTopic,
        stages: session.scenario.stages,
      },
    },
    messages: startResponse.messages,
    state: startResponse.state,
    freeQuota: quota,
  });
}));

router.post(
  '/session/message',
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    const sessionId = String(req.body?.sessionId || '').trim();
    if (!sessionId) {
      throw badRequest('sessionId is required', 'MISSING_SESSION_ID');
    }

    const session = getDialogueSession(sessionId);
    if (!session) {
      throw notFound('Dialogue session not found', 'DIALOGUE_SESSION_NOT_FOUND');
    }

    if (!req.file?.buffer?.length) {
      throw badRequest('audio file is required', 'MISSING_AUDIO_FILE');
    }

    const audioFormat = String(req.file.mimetype || '').includes('wav') ? 'wav' : 'wav';
    const transcriptResult = await transcribeDialogueAudio(req.file.buffer, audioFormat);
    const transcript = transcriptResult.text.trim();

    if (!transcript) {
      res.json({
        ok: true,
        userMessage: null,
        messages: [
          {
            id: `empty-audio-${Date.now()}`,
            sender: 'teacher',
            kind: 'feedback',
            language: 'km',
            engine: 'gemini-khmer',
            displayText: 'Bunson老师 មិនទាន់ស្តាប់ច្បាស់ទេ សូមនិយាយម្ដងទៀត។',
            delayBeforeShowMs: 0,
            activatesRecording: false,
            createdAt: new Date().toISOString(),
          },
        ],
        state: buildDialogueState(session, 'SHOWING_BUBBLE'),
        evaluation: {
          recognizedText: '',
          contentMatched: false,
          overallScore: null,
          toneScore: null,
          phonemeScore: null,
          fluencyScore: null,
          decision: 'retry',
          attemptIndex: session.retryCount + 1,
          reviewQueued: false,
          passed: false,
          skipped: false,
          retryCount: session.retryCount,
          lessonIndex: session.lessonIndex,
          isComplete: session.isComplete,
        },
      });
      return;
    }

    const currentLesson = session.scenario.steps[session.lessonIndex];
    let pronunciationEvaluation = buildPronunciationFallback();
    if (currentLesson?.allowPronunciationEval && currentLesson.expectedText) {
      try {
        pronunciationEvaluation = await evaluatePronunciation(req.file.buffer, currentLesson.expectedText);
      } catch (error) {
        console.error('Pronunciation evaluation failed, falling back to content-only pass:', error);
      }
    }

    const response = await buildDialogueTurnResponse({
      session,
      transcript,
      evaluation: pronunciationEvaluation,
    });

    res.json({
      ok: true,
      ...response,
    });
  })
);

router.post('/session/stop', asyncHandler(async (req, res) => {
  const sessionId = String(req.body?.sessionId || '').trim();
  if (sessionId) {
    removeDialogueSession(sessionId);
  }

  res.json({
    ok: true,
  });
}));

export default router;
