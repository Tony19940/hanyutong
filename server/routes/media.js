import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getMediaAsset } from '../services/mediaService.js';

const router = Router();

router.get('/:assetId', asyncHandler(async (req, res) => {
  const asset = await getMediaAsset(String(req.params.assetId || '').trim());
  res.setHeader('Content-Type', asset.mime_type || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(asset.bytes);
}));

export default router;
