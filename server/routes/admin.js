import crypto from 'crypto';
import { Router } from 'express';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { writeAuditLog } from '../services/auditService.js';
import { grantMonthCardMembership } from '../services/membershipService.js';
import { createAdminSession, revokeAdminSession } from '../services/sessionService.js';

const router = Router();

const adminLoginRateLimit = createRateLimiter({
  windowMs: config.adminRateWindowMs,
  max: config.adminRateLimit,
  keyPrefix: 'admin-login',
});

function generateKeyCode() {
  const year = new Date().getFullYear();
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
  return `HYT-${year}-${part1}-${part2}`;
}

function parseExpiryDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest('Invalid expiry date', 'INVALID_EXPIRY_DATE');
  }

  return parsed.toISOString();
}

async function syncAllKeyStatuses() {
  const nowIso = new Date().toISOString();
  await query(
    `
      UPDATE keys
      SET status = 'expired',
          expired_at = COALESCE(expired_at, $1)
      WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at <= $1
    `,
    [nowIso]
  );

  await query(
    `
      UPDATE keys
      SET status = 'active',
          expired_at = NULL
      WHERE status = 'expired'
        AND expires_at IS NOT NULL
        AND expires_at > $1
    `,
    [nowIso]
  );
}

router.post('/login', adminLoginRateLimit, asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    throw badRequest('Password is required', 'PASSWORD_REQUIRED');
  }

  if (password !== config.adminPassword) {
    throw forbidden('Invalid admin password', 'INVALID_ADMIN_PASSWORD');
  }

  const session = await createAdminSession();
  await writeAuditLog({
    actorType: 'admin',
    actorSessionId: session.sessionId,
    action: 'admin.login',
    targetType: 'session',
    targetId: String(session.sessionId),
  });

  res.json({
    token: session.token,
  });
}));

router.post('/logout', requireAdminAuth, asyncHandler(async (req, res) => {
  await writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: 'admin.logout',
    targetType: 'session',
    targetId: String(req.adminSession.id),
  });
  await revokeAdminSession(req.authToken);
  res.json({ success: true });
}));

router.get('/session', requireAdminAuth, asyncHandler(async (_req, res) => {
  res.json({
    authenticated: true,
  });
}));

router.use(requireAdminAuth);

router.post('/generate-key', asyncHandler(async (req, res) => {
  const count = Math.min(
    Number.parseInt(req.body.count, 10) || 1,
    config.maxKeyGenerationCount
  );
  const durationDays = Math.max(Number.parseInt(req.body.durationDays, 10) || config.premiumDurationDays, 1);
  const expiresAt = parseExpiryDate(req.body.expiresAt);
  const keys = [];

  await withTransaction(async (client) => {
    const lastKeyResult = await client.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM keys');
    const serialBase = Number(lastKeyResult.rows[0]?.max_id || 0) + 1;

    for (let i = 0; i < count; i += 1) {
      let inserted = false;
      let retries = 0;

      while (!inserted && retries < config.maxKeyCollisionRetries) {
        const keyCode = generateKeyCode();
        const serialNumber = String(serialBase + i).padStart(3, '0');

        try {
          const insertedKey = await client.query(
            `
              INSERT INTO keys (key_code, serial_number, duration_days, expires_at)
              VALUES ($1, $2, $3, $4)
              RETURNING *
            `,
            [keyCode, serialNumber, durationDays, expiresAt]
          );
          keys.push({
            keyCode,
            serialNumber,
            durationDays,
            expiresAt: insertedKey.rows[0].expires_at || null,
          });
          inserted = true;
        } catch (error) {
          if (error.code !== '23505') {
            throw error;
          }
          retries += 1;
        }
      }

      if (!inserted) {
        throw new Error('Unable to generate a unique key');
      }
    }
  });

  await writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: 'keys.generate',
    targetType: 'key',
    targetId: String(keys.length),
    details: { count: keys.length, durationDays, expiresAt },
  });

  res.json({ keys, count: keys.length });
}));

router.get('/keys', asyncHandler(async (req, res) => {
  await syncAllKeyStatuses();

  const status = req.query.status;
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = (page - 1) * limit;

  const params = [];
  let whereClause = '';
  if (status) {
    params.push(status);
    whereClause = ` WHERE k.status = $${params.length}`;
  }

  const keysResult = await query(
    `
      SELECT k.*, u.name AS user_name, u.telegram_id
      FROM keys k
      LEFT JOIN users u ON k.user_id = u.id
      ${whereClause}
      ORDER BY k.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );

  const filteredTotalResult = await query(
    `
      SELECT COUNT(*) AS count
      FROM keys k
      ${whereClause}
    `,
    params
  );

  const [totalResult, activeResult, unusedResult, expiredResult] = await Promise.all([
    query('SELECT COUNT(*) AS count FROM keys'),
    query("SELECT COUNT(*) AS count FROM keys WHERE status = 'active'"),
    query("SELECT COUNT(*) AS count FROM keys WHERE status = 'unused'"),
    query("SELECT COUNT(*) AS count FROM keys WHERE status = 'expired'"),
  ]);

  const filteredTotal = Number(filteredTotalResult.rows[0]?.count || 0);

  res.json({
    keys: keysResult.rows,
    stats: {
      total: Number(totalResult.rows[0]?.count || 0),
      active: Number(activeResult.rows[0]?.count || 0),
      unused: Number(unusedResult.rows[0]?.count || 0),
      expired: Number(expiredResult.rows[0]?.count || 0),
      filteredTotal,
    },
    pagination: {
      page,
      limit,
      total: filteredTotal,
    },
  });
}));

router.delete('/keys/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const keyResult = await query('SELECT * FROM keys WHERE id = $1', [id]);
  const key = keyResult.rows[0];
  if (!key) {
    throw notFound('Key not found', 'KEY_NOT_FOUND');
  }

  if (key.status !== 'unused') {
    throw badRequest('Only unused keys can be deleted', 'KEY_NOT_UNUSED');
  }

  await query('DELETE FROM keys WHERE id = $1', [id]);
  await writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: 'keys.delete',
    targetType: 'key',
    targetId: String(id),
    details: { keyCode: key.key_code, status: key.status },
  });

  res.json({ success: true });
}));

router.post('/keys/:id/extend', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expiresAt = parseExpiryDate(req.body.expiresAt);
  if (!expiresAt) {
    throw badRequest('expiresAt is required', 'EXPIRY_REQUIRED');
  }

  if (!new Date(expiresAt).getTime() || new Date(expiresAt).getTime() <= Date.now()) {
    throw badRequest('Expiry date must be in the future', 'INVALID_EXPIRY_DATE');
  }

  const key = await withTransaction(async (client) => {
    const keyResult = await client.query('SELECT * FROM keys WHERE id = $1', [id]);
    const existingKey = keyResult.rows[0];
    if (!existingKey) {
      throw notFound('Key not found', 'KEY_NOT_FOUND');
    }

    const updated = await client.query(
      `
        UPDATE keys
        SET expires_at = $2,
            status = 'active',
            expired_at = NULL,
            last_extended_at = LOCALTIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
      [id, expiresAt]
    );

    if (updated.rows[0].user_id) {
      await grantMonthCardMembership(
        updated.rows[0].user_id,
        {
          expiresAt,
          sourceKeyId: updated.rows[0].id,
          eventType: 'key_extended',
          details: { adminSessionId: req.adminSession.id },
        },
        client
      );
    }

    return updated.rows[0];
  });

  await writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: 'keys.extend',
    targetType: 'key',
    targetId: String(id),
    details: { keyCode: key.key_code, expiresAt },
  });

  res.json({ success: true, key });
}));

router.post('/keys/:id/expire', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expiresAt = new Date().toISOString();
  let previousStatus = null;

  const key = await withTransaction(async (client) => {
    const keyResult = await client.query('SELECT * FROM keys WHERE id = $1', [id]);
    const existingKey = keyResult.rows[0];
    if (!existingKey) {
      throw notFound('Key not found', 'KEY_NOT_FOUND');
    }
    previousStatus = existingKey.status;

    const updated = await client.query(
      `
        UPDATE keys
        SET status = 'expired',
            expired_at = LOCALTIMESTAMP,
            expires_at = COALESCE(expires_at, LOCALTIMESTAMP)
        WHERE id = $1
        RETURNING *
      `,
      [id]
    );

    if (updated.rows[0].user_id) {
      await grantMonthCardMembership(
        updated.rows[0].user_id,
        {
          expiresAt,
          sourceKeyId: updated.rows[0].id,
          eventType: 'manual_adjustment',
          details: { forcedExpire: true, adminSessionId: req.adminSession.id },
        },
        client
      );
    }

    return updated.rows[0];
  });

  await writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: 'keys.expire',
    targetType: 'key',
    targetId: String(id),
    details: { previousStatus, keyCode: key.key_code },
  });

  res.json({ success: true });
}));

router.get('/stats', asyncHandler(async (_req, res) => {
  await syncAllKeyStatuses();
  const todayDate = new Date().toISOString().split('T')[0];
  const [
    totalKeysResult,
    activeKeysResult,
    unusedKeysResult,
    expiredKeysResult,
    totalUsersResult,
    activeTodayResult,
  ] = await Promise.all([
    query('SELECT COUNT(*) AS count FROM keys'),
    query("SELECT COUNT(*) AS count FROM keys WHERE status = 'active'"),
    query("SELECT COUNT(*) AS count FROM keys WHERE status = 'unused'"),
    query("SELECT COUNT(*) AS count FROM keys WHERE status = 'expired'"),
    query('SELECT COUNT(*) AS count FROM users'),
    query(
      `
        SELECT COUNT(DISTINCT user_id) AS count
        FROM daily_records
        WHERE date = $1
      `,
      [todayDate]
    ),
  ]);

  res.json({
    totalKeys: Number(totalKeysResult.rows[0]?.count || 0),
    activeKeys: Number(activeKeysResult.rows[0]?.count || 0),
    unusedKeys: Number(unusedKeysResult.rows[0]?.count || 0),
    expiredKeys: Number(expiredKeysResult.rows[0]?.count || 0),
    totalUsers: Number(totalUsersResult.rows[0]?.count || 0),
    activeToday: Number(activeTodayResult.rows[0]?.count || 0),
  });
}));

export default router;
