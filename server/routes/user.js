import { Router } from 'express';
import { config } from '../config.js';
import { query } from '../db.js';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getVocabularyCount } from '../services/vocabularyService.js';

const router = Router();

router.use(requireUserAuth);

function resolveHskLevel(learnedCount, thresholds) {
  for (const threshold of thresholds) {
    if (learnedCount >= threshold.minLearned) {
      return threshold.level;
    }
  }
  return 1;
}

router.get('/profile', asyncHandler(async (req, res) => {
  const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = userResult.rows[0];

  const learnedResult = await query(
    `
      SELECT COUNT(*) AS count
      FROM user_progress
      WHERE user_id = $1 AND status = 'learned'
    `,
    [req.user.id]
  );

  const bookmarkedResult = await query(
    `
      SELECT COUNT(*) AS count
      FROM user_progress
      WHERE user_id = $1 AND status = 'bookmarked'
    `,
    [req.user.id]
  );

  const totalTimeResult = await query(
    `
      SELECT COALESCE(SUM(time_spent), 0) AS total
      FROM daily_records
      WHERE user_id = $1
    `,
    [req.user.id]
  );

  const dailyRecordsResult = await query(
    `
      SELECT date
      FROM daily_records
      WHERE user_id = $1 AND words_learned > 0
      ORDER BY date DESC
    `,
    [req.user.id]
  );

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const dates = dailyRecordsResult.rows.map((row) => row.date);

  if (dates.length > 0) {
    const checkDate = new Date(today);
    if (!dates.includes(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (dates.includes(checkDate.toISOString().split('T')[0])) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  const last7Days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const recordResult = await query(
      `
        SELECT words_learned
        FROM daily_records
        WHERE user_id = $1 AND date = $2
      `,
      [req.user.id, dateStr]
    );
    const record = recordResult.rows[0];

    last7Days.push({
      date: dateStr,
      dayName: dayNames[date.getDay()],
      learned: record ? Number(record.words_learned) : 0,
      isToday: dateStr === today,
    });
  }

  const learnedCount = Number(learnedResult.rows[0]?.count || 0);
  const bookmarkedCount = Number(bookmarkedResult.rows[0]?.count || 0);
  const totalMinutes = Number(totalTimeResult.rows[0]?.total || 0);
  const totalWords = getVocabularyCount();
  const mastery = totalWords > 0 ? Math.round((learnedCount / totalWords) * 100) : 0;
  const hskLevel = resolveHskLevel(learnedCount, config.hskThresholds);

  res.json({
    user: {
      ...user,
      hskLevel,
    },
    stats: {
      wordsLearned: learnedCount,
      bookmarked: bookmarkedCount,
      totalHours: Math.round(totalMinutes / 60),
      totalMinutes,
      mastery,
      streak,
      last7Days,
      vocabularyCount: totalWords,
    },
  });
}));

router.get('/collection', asyncHandler(async (req, res) => {
  const bookmarksResult = await query(
    `
      SELECT word_id, updated_at
      FROM user_progress
      WHERE user_id = $1 AND status = 'bookmarked'
      ORDER BY updated_at DESC
    `,
    [req.user.id]
  );

  res.json({ bookmarks: bookmarksResult.rows });
}));

router.post('/time', asyncHandler(async (req, res) => {
  const minutesValue = Number.parseInt(req.body.minutes, 10);
  const secondsValue = Number.parseInt(req.body.seconds, 10);
  const normalizedMinutes = Number.isFinite(minutesValue)
    ? minutesValue
    : Number.isFinite(secondsValue)
      ? Math.floor(secondsValue / 60)
      : 0;

  if (normalizedMinutes <= 0) {
    return res.json({ success: true, minutesRecorded: 0 });
  }

  const today = new Date().toISOString().split('T')[0];
  await query(
    `
      INSERT INTO daily_records (user_id, date, words_learned, time_spent)
      VALUES ($1, $2, 0, $3)
      ON CONFLICT(user_id, date) DO UPDATE SET time_spent = daily_records.time_spent + EXCLUDED.time_spent
    `,
    [req.user.id, today, normalizedMinutes]
  );

  return res.json({ success: true, minutesRecorded: normalizedMinutes });
}));

export default router;
