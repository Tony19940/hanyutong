import { Router } from 'express';
import { query, withTransaction } from '../db.js';
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
    throw badRequest('Key code is required', 'KEY_REQUIRED');
  }

  const keyResult = await query('SELECT * FROM keys WHERE key_code = $1', [String(keyCode).trim()]);
  const key = keyResult.rows[0];
  if (!key) {
    throw notFound('Key not found', 'KEY_NOT_FOUND');
  }

  if (key.status === 'expired') {
    throw forbidden('Key has expired', 'KEY_EXPIRED');
  }

  const telegramIdValue = telegramId ? String(telegramId) : null;
  const user = await withTransaction(async (client) => {
    if (key.status === 'activated' && key.user_id) {
      const existingUserResult = await client.query('SELECT * FROM users WHERE id = $1', [key.user_id]);
      const existingUser = existingUserResult.rows[0];
      if (!existingUser) {
        throw notFound('User not found for activated key', 'USER_NOT_FOUND');
      }

      if (telegramIdValue && existingUser.telegram_id && existingUser.telegram_id !== telegramIdValue) {
        throw forbidden('Key already belongs to another user', 'KEY_ALREADY_USED');
      }

      return existingUser;
    }

    let userRow = null;
    if (telegramIdValue) {
      const userResult = await client.query('SELECT * FROM users WHERE telegram_id = $1', [telegramIdValue]);
      userRow = userResult.rows[0] || null;
    }

    if (!userRow) {
      const localTelegramId = telegramIdValue || `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const insertResult = await client.query(
        `
          INSERT INTO users (telegram_id, name, avatar_url, key_id)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `,
        [localTelegramId, name || 'User', avatarUrl || null, key.id]
      );
      userRow = insertResult.rows[0];
    } else if (name || avatarUrl) {
      const updateResult = await client.query(
        `
          UPDATE users
          SET name = COALESCE($1, name),
              avatar_url = COALESCE($2, avatar_url),
              key_id = COALESCE(key_id, $3)
          WHERE id = $4
          RETURNING *
        `,
        [name || null, avatarUrl || null, key.id, userRow.id]
      );
      userRow = updateResult.rows[0];
    }

    await client.query(
      `
        UPDATE keys
        SET status = $1, activated_at = CURRENT_TIMESTAMP, user_id = $2, expired_at = NULL
        WHERE id = $3
      `,
      ['activated', userRow.id, key.id]
    );

    return userRow;
  });

  const token = await createUserSession(user.id);

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
  await revokeUserSession(req.authToken);
  res.json({ success: true });
}));

export default router;
