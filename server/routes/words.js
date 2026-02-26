import { Router } from 'express';
import db from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Load vocabulary data
let vocabulary = [];
const vocabPath = path.join(__dirname, '..', '..', 'data', 'vocabulary.json');
try {
  vocabulary = JSON.parse(fs.readFileSync(vocabPath, 'utf-8'));
} catch (e) {
  console.warn('Vocabulary file not found, using empty list');
}

// GET /api/words/next - Get next batch of words for learning
router.get('/next', (req, res) => {
  const userId = req.query.userId;
  const batchSize = parseInt(req.query.batch) || 20;

  if (!userId) return res.status(400).json({ error: 'userId required' });

  // Get IDs of words the user has already learned or bookmarked
  const progressRows = db.prepare(
    'SELECT word_id, status FROM user_progress WHERE user_id = ?'
  ).all(userId);

  const learnedIds = new Set(progressRows.filter(r => r.status === 'learned').map(r => r.word_id));
  const bookmarkedIds = new Set(progressRows.filter(r => r.status === 'bookmarked').map(r => r.word_id));

  // Filter out learned words, return next batch
  const availableWords = vocabulary.filter(w => !learnedIds.has(w.id));
  const batch = availableWords.slice(0, batchSize);

  res.json({
    words: batch,
    total: vocabulary.length,
    learned: learnedIds.size,
    bookmarked: bookmarkedIds.size,
    remaining: availableWords.length,
  });
});

// POST /api/words/action - Record swipe action
router.post('/action', (req, res) => {
  const { userId, wordId, action } = req.body; // action: 'learned' or 'bookmarked'

  if (!userId || !wordId || !action) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (!['learned', 'bookmarked'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  db.prepare(`
    INSERT INTO user_progress (user_id, word_id, status, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, word_id) DO UPDATE SET status = ?, updated_at = CURRENT_TIMESTAMP
  `).run(userId, wordId, action, action);

  // Update daily record
  const today = new Date().toISOString().split('T')[0];
  if (action === 'learned') {
    db.prepare(`
      INSERT INTO daily_records (user_id, date, words_learned, time_spent)
      VALUES (?, ?, 1, 0)
      ON CONFLICT(user_id, date) DO UPDATE SET words_learned = words_learned + 1
    `).run(userId, today);
  }

  res.json({ success: true });
});

// GET /api/words/all - Get all vocabulary (for offline caching)
router.get('/all', (req, res) => {
  res.json(vocabulary);
});

export default router;
