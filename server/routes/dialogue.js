import { Router } from 'express';
import { badRequest } from '../errors.js';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  buildDialogueSession,
  getDialogueAvailability,
  listDialogueScenarios,
} from '../services/dialogueScenarioService.js';
import { saveDialogueSession } from '../services/dialogueSessionStore.js';

const router = Router();

router.use(requireUserAuth);

router.get('/scenarios', asyncHandler(async (_req, res) => {
  res.json({
    ...getDialogueAvailability(),
    scenarios: listDialogueScenarios(),
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
  });
  saveDialogueSession(session);

  res.json({
    ok: true,
    session: {
      sessionId: session.sessionId,
      scenario: session.scenario,
      doubao: {
        wsUrl: session.doubao.wsUrl,
        resourceId: session.doubao.resourceId,
        connectId: session.doubao.connectId,
      },
      startSession: {
        dialog: {
          bot_name: session.startSession.dialog.bot_name,
        },
      },
    },
    notes: [
      '当前版本已切换到豆包语音端到端参数体系。',
      '浏览器通过后端代理连接豆包，避免在前端暴露鉴权头。',
    ],
  });
}));

router.post('/session/stop', asyncHandler(async (_req, res) => {
  res.json({
    ok: true,
  });
}));

export default router;
