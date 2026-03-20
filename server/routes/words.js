import { Router } from 'express';
import db from '../db.js';
import { config } from '../config.js';
import { badRequest } from '../errors.js';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getVocabulary } from '../services/vocabularyService.js';

const router = Router();

router.use(requireUserAuth);

router.get('/next', asyncHandler(async (req, res) => {
  const requestedBatch = Number.parseInt(req.query.batch, 10);
  const batchSize = Math.min(
    Number.isFinite(requestedBatch) ? requestedBatch : config.defaultWordBatch,
    config.maxWordBatch
  );
  const vocabulary = getVocabulary();

  const progressRows = db.prepare(`
    SELECT word_id, status
    FROM user_progress
    WHERE user_id = ?
  `).all(req.user.id);

  const learnedIds = new Set(progressRows.filter((row) => row.status === 'learned').map((row) => row.word_id));
  const bookmarkedIds = new Set(progressRows.filter((row) => row.status === 'bookmarked').map((row) => row.word_id));

  const availableWords = vocabulary.filter((word) => !learnedIds.has(word.id));
  const batch = availableWords.slice(0, batchSize);

  res.json({
    words: batch,
    total: vocabulary.length,
    learned: learnedIds.size,
    bookmarked: bookmarkedIds.size,
    remaining: availableWords.length,
  });
}));

router.post('/action', asyncHandler(async (req, res) => {
  const { wordId, action } = req.body;
  if (!wordId || !action) {
    throw badRequest('Missing fields', 'MISSING_FIELDS');
  }

  if (!['learned', 'bookmarked'].includes(action)) {
    throw badRequest('Invalid action', 'INVALID_ACTION');
  }

  const wordIdValue = Number.parseInt(wordId, 10);
  if (!Number.isFinite(wordIdValue)) {
    throw badRequest('Invalid wordId', 'INVALID_WORD_ID');
  }

  const result = db.transaction(() => {
    const previous = db.prepare(`
      SELECT status
      FROM user_progress
      WHERE user_id = ? AND word_id = ?
    `).get(req.user.id, wordIdValue);

    db.prepare(`
      INSERT INTO user_progress (user_id, word_id, status, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, word_id)
      DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP
    `).run(req.user.id, wordIdValue, action);

    const previousStatus = previous?.status || null;
    const countedAsLearned = action === 'learned' && previousStatus !== 'learned';

    if (countedAsLearned) {
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO daily_records (user_id, date, words_learned, time_spent)
        VALUES (?, ?, 1, 0)
        ON CONFLICT(user_id, date) DO UPDATE SET words_learned = words_learned + 1
      `).run(req.user.id, today);
    }

    return {
      previousStatus,
      currentStatus: action,
      countedAsLearned,
    };
  })();

  res.json({
    success: true,
    ...result,
  });
}));

router.get('/all', asyncHandler(async (req, res) => {
  res.json(getVocabulary());
}));

export default router;
