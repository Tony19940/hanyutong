import { Router } from 'express';
import { badRequest } from '../errors.js';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { trackAppEvent, markPopupClick, markPopupImpression } from '../services/analyticsService.js';

const router = Router();

const ALLOWED_EVENT_NAMES = new Set([
  'app_open',
  'dialogue_start',
  'interpreter_start',
  'banner_click',
  'popup_click',
  'popup_impression',
  'install_prompt_shown',
  'install_completed',
]);

router.use(requireUserAuth);

router.post('/track', asyncHandler(async (req, res) => {
  const eventName = String(req.body?.eventName || '').trim();
  const metadata = req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : null;

  if (!ALLOWED_EVENT_NAMES.has(eventName)) {
    throw badRequest('Unsupported event name', 'INVALID_EVENT_NAME');
  }

  await trackAppEvent({
    userId: req.user.id,
    eventName,
    metadata,
  });

  if (eventName === 'popup_impression' && metadata?.popupId) {
    await markPopupImpression({
      popupId: Number(metadata.popupId),
      userId: req.user.id,
    });
  }

  if (eventName === 'popup_click' && metadata?.popupId) {
    await markPopupClick({
      popupId: Number(metadata.popupId),
      userId: req.user.id,
    });
  }

  res.json({ ok: true });
}));

export default router;
