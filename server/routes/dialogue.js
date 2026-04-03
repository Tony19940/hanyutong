import multer from 'multer';
import { Router } from 'express';
import { badRequest, notFound } from '../errors.js';
import { requirePremiumAccess, requireUserAuth } from '../middleware/auth.js';
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
  materializeMessageSpecs,
} from '../services/dialogueTeachingService.js';
import { getDialogueSession, removeDialogueSession, saveDialogueSession } from '../services/dialogueSessionStore.js';
import { transcribeDialogueAudio } from '../services/doubaoAsrService.js';
import { ensureUserSettingsForDialogue } from '../services/userSettingsService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(requireUserAuth);
router.use(requirePremiumAccess('dialogue'));

router.get('/scenarios', asyncHandler(async (_req, res) => {
  res.json({
    ...getDialogueAvailability(),
    scenarios: listDialogueScenarios(),
    dailyScenarios: listDailyDialogueScenarios(),
  });
}));

router.post('/session/start', asyncHandler(async (req, res) => {
  const { scenarioId } = req.body || {};
  if (!scenarioId) {
    throw badRequest('scenarioId is required', 'MISSING_SCENARIO_ID');
  }

  const session = buildDialogueSession({
    scenarioId,
    learnerName: req.user.name || '学员',
    voiceType: (await ensureUserSettingsForDialogue(req.user)).voiceType,
  });
  saveDialogueSession(session);

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
      const aiMessages = await materializeMessageSpecs([
        {
          role: 'assistant',
          type: 'audio',
          text: '我刚才没有听清，你再说一次。',
        },
      ]);

      res.json({
        ok: true,
        userMessage: null,
        aiMessages,
        state: buildDialogueState(session),
        evaluation: {
          passed: false,
          skipped: false,
          retryCount: session.retryCount,
          lessonIndex: session.lessonIndex,
          isComplete: session.isComplete,
        },
      });
      return;
    }

    const response = await buildDialogueTurnResponse({
      session,
      transcript,
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
