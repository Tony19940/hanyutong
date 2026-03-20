import { Router } from 'express';
import db from '../db.js';
import { config } from '../config.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { createUserSession, revokeUserSession } from '../services/sessionService.js';

const router = Router();
const loginRateLimit = createRateLimiter({
  windowMs: config.loginRateWindowMs,
  max: config.loginRateLimit,
  keyPrefix: 'user-login',
});

router.post('/login', loginRateLimit, asyncHandler(async (req, res) => {
  const { keyCode, telegramId, name, avatarUrl } = req.body;

  if (!keyCode) {
    throw badRequest('សូមបញ្ចូលលេខសម្ងាត់', 'KEY_REQUIRED');
  }

  const key = db.prepare('SELECT * FROM keys WHERE key_code = ?').get(String(keyCode).trim());
  if (!key) {
    throw notFound('លេខសម្ងាត់មិនត្រឹមត្រូវ', 'KEY_NOT_FOUND');
  }

  if (key.status === 'expired') {
    throw forbidden('លេខសម្ងាត់ផុតកំណត់', 'KEY_EXPIRED');
  }

  const telegramIdValue = telegramId ? String(telegramId) : null;
  const createOrActivateUser = db.transaction(() => {
    if (key.status === 'activated' && key.user_id) {
      const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(key.user_id);
      if (!existingUser) {
        throw notFound('User not found for activated key', 'USER_NOT_FOUND');
      }

      if (telegramIdValue && existingUser.telegram_id && existingUser.telegram_id !== telegramIdValue) {
        throw forbidden('លេខសម្ងាត់នេះត្រូវបានប្រើរួចហើយ', 'KEY_ALREADY_USED');
      }

      return existingUser;
    }

    let user = telegramIdValue
      ? db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramIdValue)
      : null;

    if (!user) {
      const result = db.prepare(`
        INSERT INTO users (telegram_id, name, avatar_url, key_id)
        VALUES (?, ?, ?, ?)
      `).run(
        telegramIdValue || `local_${Date.now()}`,
        name || 'User',
        avatarUrl || null,
        key.id
      );
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    } else if (name || avatarUrl) {
      db.prepare(`
        UPDATE users
        SET name = COALESCE(?, name),
            avatar_url = COALESCE(?, avatar_url),
            key_id = COALESCE(key_id, ?)
        WHERE id = ?
      `).run(name || null, avatarUrl || null, key.id, user.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }

    db.prepare(`
      UPDATE keys
      SET status = ?, activated_at = CURRENT_TIMESTAMP, user_id = ?, expired_at = NULL
      WHERE id = ?
    `).run('activated', user.id, key.id);

    return user;
  });

  const user = createOrActivateUser();
  const token = createUserSession(user.id);

  res.json({
    user,
    token,
  });
}));

router.post('/verify', requireUserAuth, asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      telegram_id: req.user.telegramId,
      name: req.user.name,
      avatar_url: req.user.avatarUrl,
    },
  });
}));

router.post('/logout', requireUserAuth, asyncHandler(async (req, res) => {
  revokeUserSession(req.authToken);
  res.json({ success: true });
}));

export default router;
