import { Router } from 'express';
import { badRequest } from '../errors.js';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getProgressQueue, reviewWord } from '../services/studyProgressService.js';

const router = Router();

router.use(requireUserAuth);

router.get('/queue', asyncHandler(async (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10) || 20;
  const queue = await getProgressQueue(req.user.id, { limit });
  res.json(queue);
}));

router.post('/review', asyncHandler(async (req, res) => {
  const wordId = Number.parseInt(req.body?.wordId, 10);
  const quality = Number.parseInt(req.body?.quality, 10);
  if (!Number.isFinite(wordId)) {
    throw badRequest('wordId is required', 'WORD_ID_REQUIRED');
  }
  if (!Number.isFinite(quality)) {
    throw badRequest('quality is required', 'QUALITY_REQUIRED');
  }

  const result = await reviewWord(req.user.id, wordId, quality);
  res.json({
    ok: true,
    ...result,
  });
}));

export default router;
