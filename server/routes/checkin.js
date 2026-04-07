import { Router } from 'express';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getCheckinSummary } from '../services/studyProgressService.js';

const router = Router();

router.use(requireUserAuth);

router.get('/summary', asyncHandler(async (req, res) => {
  const days = Number.parseInt(req.query.days, 10) || 21;
  const summary = await getCheckinSummary(req.user.id, { days });
  res.json(summary);
}));

export default router;
