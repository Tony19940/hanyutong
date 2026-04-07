import { Router } from 'express';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { badRequest, unauthorized } from '../errors.js';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getVocabulary } from '../services/vocabularyService.js';

const router = Router();

router.use(requireUserAuth);

router.get('/next', asyncHandler(async (req, res) => {
  const mode = String(req.query.mode || 'home').trim().toLowerCase();
  if (mode === 'quiz' && req.user.membership?.accessLevel !== 'premium') {
    throw unauthorized('Premium membership is required for quiz access', 'PREMIUM_REQUIRED');
  }

  const requestedBatch = Number.parseInt(req.query.batch, 10);
  const batchSize = Math.min(
    Number.isFinite(requestedBatch) ? requestedBatch : config.defaultWordBatch,
    config.maxWordBatch
  );
  const vocabulary = getVocabulary();

  const progressResult = await query(
    `
      SELECT word_id, status
      FROM user_progress
      WHERE user_id = $1
    `,
    [req.user.id]
  );

  const learnedIds = new Set(progressResult.rows.filter((row) => row.status === 'learned').map((row) => row.word_id));
  const bookmarkedIds = new Set(progressResult.rows.filter((row) => row.status === 'bookmarked').map((row) => row.word_id));

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

  const result = await withTransaction(async (client) => {
    const previousResult = await client.query(
      `
        SELECT status
        FROM user_progress
        WHERE user_id = $1 AND word_id = $2
      `,
      [req.user.id, wordIdValue]
    );
    const previous = previousResult.rows[0] || null;

    await client.query(
      `
        INSERT INTO user_progress (user_id, word_id, status, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, word_id)
        DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP
      `,
      [req.user.id, wordIdValue, action]
    );

    const previousStatus = previous?.status || null;
    const countedAsLearned = action === 'learned' && previousStatus !== 'learned';

    if (countedAsLearned) {
      const today = new Date().toISOString().split('T')[0];
      await client.query(
        `
          INSERT INTO daily_records (user_id, date, words_learned, time_spent)
          VALUES ($1, $2, 1, 0)
          ON CONFLICT(user_id, date) DO UPDATE SET words_learned = daily_records.words_learned + 1
        `,
        [req.user.id, today]
      );
    }

    return {
      previousStatus,
      currentStatus: action,
      countedAsLearned,
    };
  });

  res.json({
    success: true,
    ...result,
  });
}));

router.get('/all', asyncHandler(async (_req, res) => {
  res.json(getVocabulary());
}));

export default router;
