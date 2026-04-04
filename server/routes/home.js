import { Router } from 'express';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { listActiveHomeBanners, findEligiblePopupForUser } from '../services/homeSurfaceService.js';

const router = Router();

router.use(requireUserAuth);

router.get('/surfaces', asyncHandler(async (req, res) => {
  const [banners, popup] = await Promise.all([
    listActiveHomeBanners(),
    findEligiblePopupForUser(req.user.id),
  ]);

  res.json({
    banners,
    popup,
  });
}));

export default router;
