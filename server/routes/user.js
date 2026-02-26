import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/user/profile - Get user profile with stats
router.get('/profile', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Stats
  const learned = db.prepare(
    "SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND status = 'learned'"
  ).get(userId);

  const bookmarked = db.prepare(
    "SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND status = 'bookmarked'"
  ).get(userId);

  // Total learning time (minutes)
  const totalTime = db.prepare(
    'SELECT COALESCE(SUM(time_spent), 0) as total FROM daily_records WHERE user_id = ?'
  ).get(userId);

  // Streak calculation
  const dailyRecords = db.prepare(
    'SELECT date FROM daily_records WHERE user_id = ? AND words_learned > 0 ORDER BY date DESC'
  ).all(userId);

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const dates = dailyRecords.map(r => r.date);

  if (dates.length > 0) {
    let checkDate = new Date(today);
    // If today is not in the list, check yesterday
    if (!dates.includes(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (dates.includes(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Last 7 days activity
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const record = db.prepare(
      'SELECT words_learned FROM daily_records WHERE user_id = ? AND date = ?'
    ).get(userId, dateStr);
    last7Days.push({
      date: dateStr,
      dayName: ['អា', 'ច', 'អ', 'ព', 'ព្រ', 'សុ', 'ស'][d.getDay()],
      learned: record ? record.words_learned : 0,
      isToday: dateStr === today,
    });
  }

  // Mastery percentage
  const totalWords = 5000;
  const mastery = totalWords > 0 ? Math.round((learned.count / totalWords) * 100) : 0;

  // Calculate HSK level
  let hskLevel = 1;
  if (learned.count >= 2500) hskLevel = 6;
  else if (learned.count >= 1200) hskLevel = 5;
  else if (learned.count >= 600) hskLevel = 4;
  else if (learned.count >= 300) hskLevel = 3;
  else if (learned.count >= 150) hskLevel = 2;

  res.json({
    user: {
      ...user,
      hskLevel,
    },
    stats: {
      wordsLearned: learned.count,
      bookmarked: bookmarked.count,
      totalHours: Math.round(totalTime.total / 60),
      mastery,
      streak,
      last7Days,
    }
  });
});

// GET /api/user/collection - Get bookmarked words
router.get('/collection', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const bookmarks = db.prepare(`
    SELECT word_id, updated_at FROM user_progress
    WHERE user_id = ? AND status = 'bookmarked'
    ORDER BY updated_at DESC
  `).all(userId);

  res.json({ bookmarks });
});

// POST /api/user/time - Record learning time
router.post('/time', (req, res) => {
  const { userId, seconds } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const today = new Date().toISOString().split('T')[0];
  const minutes = Math.round((seconds || 0) / 60);

  db.prepare(`
    INSERT INTO daily_records (user_id, date, words_learned, time_spent)
    VALUES (?, ?, 0, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET time_spent = time_spent + ?
  `).run(userId, today, minutes, minutes);

  res.json({ success: true });
});

export default router;
