import crypto from 'crypto';
import { Router } from 'express';
import db from '../db.js';
import { config } from '../config.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { writeAuditLog } from '../services/auditService.js';
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

router.post('/login', adminLoginRateLimit, asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    throw badRequest('密码不能为空', 'PASSWORD_REQUIRED');
  }

  if (password !== config.adminPassword) {
    throw forbidden('无权访问', 'INVALID_ADMIN_PASSWORD');
  }

  const session = createAdminSession();
  writeAuditLog({
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
  writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: 'admin.logout',
    targetType: 'session',
    targetId: String(req.adminSession.id),
  });
  revokeAdminSession(req.authToken);
  res.json({ success: true });
}));

router.get('/session', requireAdminAuth, asyncHandler(async (req, res) => {
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
  const keys = [];
  const insert = db.prepare('INSERT INTO keys (key_code, serial_number) VALUES (?, ?)');
  const lastKey = db.prepare('SELECT MAX(id) AS maxId FROM keys').get();
  const serialBase = (lastKey.maxId || 0) + 1;

  const generateAll = db.transaction(() => {
    for (let i = 0; i < count; i += 1) {
      let inserted = false;
      let retries = 0;

      while (!inserted && retries < config.maxKeyCollisionRetries) {
        const keyCode = generateKeyCode();
        const serialNumber = String(serialBase + i).padStart(3, '0');

        try {
          insert.run(keyCode, serialNumber);
          keys.push({ keyCode, serialNumber });
          inserted = true;
        } catch (error) {
          retries += 1;
        }
      }

      if (!inserted) {
        throw new Error('Unable to generate a unique key');
      }
    }
  });

  generateAll();
  writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: 'keys.generate',
    targetType: 'key',
    targetId: String(keys.length),
    details: { count: keys.length },
  });

  res.json({ keys, count: keys.length });
}));

router.get('/keys', asyncHandler(async (req, res) => {
  const status = req.query.status;
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = (page - 1) * limit;

  let whereClause = '';
  const params = [];
  if (status) {
    whereClause = ' WHERE k.status = ?';
    params.push(status);
  }

  const keys = db.prepare(`
    SELECT k.*, u.name AS user_name, u.telegram_id
    FROM keys k
    LEFT JOIN users u ON k.user_id = u.id
    ${whereClause}
    ORDER BY k.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const filteredTotalRow = db.prepare(`
    SELECT COUNT(*) AS count
    FROM keys k
    ${whereClause}
  `).get(...params);

  const total = db.prepare('SELECT COUNT(*) AS count FROM keys').get();
  const activated = db.prepare("SELECT COUNT(*) AS count FROM keys WHERE status = 'activated'").get();
  const unused = db.prepare("SELECT COUNT(*) AS count FROM keys WHERE status = 'unused'").get();
  const expired = db.prepare("SELECT COUNT(*) AS count FROM keys WHERE status = 'expired'").get();

  res.json({
    keys,
    stats: {
      total: total.count,
      activated: activated.count,
      unused: unused.count,
      expired: expired.count,
      filteredTotal: filteredTotalRow.count,
    },
    pagination: {
      page,
      limit,
      total: filteredTotalRow.count,
    },
  });
}));

router.delete('/keys/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const key = db.prepare('SELECT * FROM keys WHERE id = ?').get(id);
  if (!key) {
    throw notFound('Key not found', 'KEY_NOT_FOUND');
  }

  if (key.status === 'activated') {
    throw badRequest('已激活的密钥无法删除', 'KEY_ALREADY_ACTIVATED');
  }

  db.prepare('DELETE FROM keys WHERE id = ?').run(id);
  writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: 'keys.delete',
    targetType: 'key',
    targetId: String(id),
    details: { keyCode: key.key_code, status: key.status },
  });

  res.json({ success: true });
}));

router.post('/keys/:id/expire', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const key = db.prepare('SELECT * FROM keys WHERE id = ?').get(id);
  if (!key) {
    throw notFound('Key not found', 'KEY_NOT_FOUND');
  }

  db.prepare(`
    UPDATE keys
    SET status = 'expired', expired_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);

  writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: 'keys.expire',
    targetType: 'key',
    targetId: String(id),
    details: { previousStatus: key.status, keyCode: key.key_code },
  });

  res.json({ success: true });
}));

router.get('/stats', asyncHandler(async (req, res) => {
  const totalKeys = db.prepare('SELECT COUNT(*) AS count FROM keys').get();
  const activatedKeys = db.prepare("SELECT COUNT(*) AS count FROM keys WHERE status = 'activated'").get();
  const unusedKeys = db.prepare("SELECT COUNT(*) AS count FROM keys WHERE status = 'unused'").get();
  const expiredKeys = db.prepare("SELECT COUNT(*) AS count FROM keys WHERE status = 'expired'").get();
  const totalUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get();

  const todayDate = new Date().toISOString().split('T')[0];
  const activeToday = db.prepare(`
    SELECT COUNT(DISTINCT user_id) AS count
    FROM daily_records
    WHERE date = ?
  `).get(todayDate);

  res.json({
    totalKeys: totalKeys.count,
    activatedKeys: activatedKeys.count,
    unusedKeys: unusedKeys.count,
    expiredKeys: expiredKeys.count,
    totalUsers: totalUsers.count,
    activeToday: activeToday.count,
  });
}));

export default router;
