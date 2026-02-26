import { Router } from 'express';
import db from '../db.js';

const router = Router();

// POST /api/auth/login - Verify key and login
router.post('/login', (req, res) => {
  const { keyCode, telegramId, name, avatarUrl } = req.body;

  if (!keyCode) {
    return res.status(400).json({ error: 'សូមបញ្ចូលលេខសម្ងាត់' }); // Please enter key
  }

  const key = db.prepare('SELECT * FROM keys WHERE key_code = ?').get(keyCode);

  if (!key) {
    return res.status(404).json({ error: 'លេខសម្ងាត់មិនត្រឹមត្រូវ' }); // Invalid key
  }

  if (key.status === 'expired') {
    return res.status(403).json({ error: 'លេខសម្ងាត់ផុតកំណត់' }); // Key expired
  }

  // If key is already activated, check if it belongs to this user
  if (key.status === 'activated' && key.user_id) {
    const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(key.user_id);
    if (existingUser && existingUser.telegram_id !== telegramId) {
      return res.status(403).json({ error: 'លេខសម្ងាត់នេះត្រូវបានប្រើរួចហើយ' }); // Key already used
    }
    // Return existing user
    return res.json({ user: existingUser, token: keyCode });
  }

  // Activate key and create/find user
  const createUser = db.transaction(() => {
    let user = telegramId
      ? db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId)
      : null;

    if (!user) {
      const result = db.prepare(
        'INSERT INTO users (telegram_id, name, avatar_url, key_id) VALUES (?, ?, ?, ?)'
      ).run(telegramId || `local_${Date.now()}`, name || 'User', avatarUrl || null, key.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    db.prepare(
      'UPDATE keys SET status = ?, activated_at = CURRENT_TIMESTAMP, user_id = ? WHERE id = ?'
    ).run('activated', user.id, key.id);

    return user;
  });

  const user = createUser();
  res.json({ user, token: keyCode });
});

// POST /api/auth/verify - Verify existing session
router.post('/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: 'No token' });

  const key = db.prepare('SELECT * FROM keys WHERE key_code = ? AND status = ?').get(token, 'activated');
  if (!key || !key.user_id) return res.status(401).json({ error: 'Invalid session' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(key.user_id);
  if (!user) return res.status(401).json({ error: 'User not found' });

  res.json({ user });
});

export default router;
