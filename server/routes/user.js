import { Router } from 'express';
import { config } from '../config.js';
import db from '../db.js';
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
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const learned = db.prepare(`
    SELECT COUNT(*) AS count
    FROM user_progress
    WHERE user_id = ? AND status = 'learned'
  `).get(req.user.id);

  const bookmarked = db.prepare(`
    SELECT COUNT(*) AS count
    FROM user_progress
    WHERE user_id = ? AND status = 'bookmarked'
  `).get(req.user.id);

  const totalTime = db.prepare(`
    SELECT COALESCE(SUM(time_spent), 0) AS total
    FROM daily_records
    WHERE user_id = ?
  `).get(req.user.id);

  const dailyRecords = db.prepare(`
    SELECT date
    FROM daily_records
    WHERE user_id = ? AND words_learned > 0
    ORDER BY date DESC
  `).all(req.user.id);

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const dates = dailyRecords.map((row) => row.date);

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
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const record = db.prepare(`
      SELECT words_learned
      FROM daily_records
      WHERE user_id = ? AND date = ?
    `).get(req.user.id, dateStr);

    last7Days.push({
      date: dateStr,
      dayName: ['អា', 'ច', 'អ', 'ព', 'ព្រ', 'សុ', 'ស'][date.getDay()],
      learned: record ? record.words_learned : 0,
      isToday: dateStr === today,
    });
  }

  const totalWords = getVocabularyCount();
  const mastery = totalWords > 0 ? Math.round((learned.count / totalWords) * 100) : 0;
  const hskLevel = resolveHskLevel(learned.count, config.hskThresholds);

  res.json({
    user: {
      ...user,
      hskLevel,
    },
    stats: {
      wordsLearned: learned.count,
      bookmarked: bookmarked.count,
      totalHours: Math.round(totalTime.total / 60),
      totalMinutes: totalTime.total,
      mastery,
      streak,
      last7Days,
      vocabularyCount: totalWords,
    },
  });
}));

router.get('/collection', asyncHandler(async (req, res) => {
  const bookmarks = db.prepare(`
    SELECT word_id, updated_at
    FROM user_progress
    WHERE user_id = ? AND status = 'bookmarked'
    ORDER BY updated_at DESC
  `).all(req.user.id);

  res.json({ bookmarks });
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
  db.prepare(`
    INSERT INTO daily_records (user_id, date, words_learned, time_spent)
    VALUES (?, ?, 0, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET time_spent = time_spent + ?
  `).run(req.user.id, today, normalizedMinutes, normalizedMinutes);

  return res.json({ success: true, minutesRecorded: normalizedMinutes });
}));

export default router;
