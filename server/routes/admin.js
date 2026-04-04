import crypto from 'crypto';
import multer from 'multer';
import { Router } from 'express';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { writeAuditLog } from '../services/auditService.js';
import { getAnalyticsOverview } from '../services/analyticsService.js';
import { getCredentialByUserId } from '../services/credentialService.js';
import { listAdminBanners, listAdminPopups } from '../services/homeSurfaceService.js';
import { createNormalizedImageAsset } from '../services/mediaService.js';
import { grantMonthCardMembership, setManualMembership } from '../services/membershipService.js';
import { createAdminSession, revokeAdminSession } from '../services/sessionService.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

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

function parseOptionalBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() !== 'false';
}

function parseOptionalInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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

router.get('/banners', asyncHandler(async (_req, res) => {
  res.json({
    banners: await listAdminBanners(),
  });
}));

router.post('/banners', upload.single('image'), asyncHandler(async (req, res) => {
  const bannerId = req.body?.id ? Number.parseInt(req.body.id, 10) : null;
  const title = String(req.body?.title || '').trim();
  const linkUrl = String(req.body?.linkUrl || '').trim();
  const sortOrder = parseOptionalInteger(req.body?.sortOrder, 0);
  const isActive = parseOptionalBoolean(req.body?.isActive, true);

  const banner = await withTransaction(async (client) => {
    let assetId = null;
    if (bannerId) {
      const existingResult = await client.query('SELECT * FROM home_banners WHERE id = $1', [bannerId]);
      const existingBanner = existingResult.rows[0];
      if (!existingBanner) {
        throw notFound('Banner not found', 'BANNER_NOT_FOUND');
      }
      assetId = existingBanner.asset_id;
    }

    if (req.file?.buffer?.length) {
      const asset = await createNormalizedImageAsset({
        scope: 'admin',
        category: 'banner',
        fileName: req.file.originalname || 'banner',
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        square: false,
        maxWidth: 1600,
        maxHeight: 900,
        quality: 86,
      }, client);
      assetId = asset.id;
    }

    if (!assetId) {
      throw badRequest('Banner image is required', 'BANNER_IMAGE_REQUIRED');
    }

    if (bannerId) {
      await client.query(
        `
          UPDATE home_banners
          SET asset_id = $2,
              title = $3,
              link_url = $4,
              sort_order = $5,
              is_active = $6,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [bannerId, assetId, title, linkUrl || null, sortOrder, isActive]
      );
      const result = await client.query(
        `
          SELECT b.id AS banner_id,
                 b.title,
                 b.link_url,
                 b.sort_order,
                 b.is_active,
                 b.created_at,
                 b.updated_at,
                 m.id,
                 m.mime_type,
                 m.file_name,
                 m.width,
                 m.height
          FROM home_banners b
          JOIN media_assets m ON m.id = b.asset_id
          WHERE b.id = $1
        `,
        [bannerId]
      );
      return result.rows[0];
    }

    const inserted = await client.query(
      `
        INSERT INTO home_banners (asset_id, title, link_url, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [assetId, title, linkUrl || null, sortOrder, isActive]
    );
    const result = await client.query(
      `
        SELECT b.id AS banner_id,
               b.title,
               b.link_url,
               b.sort_order,
               b.is_active,
               b.created_at,
               b.updated_at,
               m.id,
               m.mime_type,
               m.file_name,
               m.width,
               m.height
        FROM home_banners b
        JOIN media_assets m ON m.id = b.asset_id
        WHERE b.id = $1
      `,
      [inserted.rows[0].id]
    );
    return result.rows[0];
  });

  await writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: bannerId ? 'banner.update' : 'banner.create',
    targetType: 'banner',
    targetId: String(bannerId || banner.banner_id),
    details: { title, linkUrl, sortOrder, isActive },
  });

  res.json({
    banners: await listAdminBanners(),
  });
}));

router.post('/banners/reorder', asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  await withTransaction(async (client) => {
    for (const item of items) {
      await client.query(
        `
          UPDATE home_banners
          SET sort_order = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [Number(item.id), parseOptionalInteger(item.sortOrder, 0)]
      );
    }
  });
  await writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: 'banner.reorder',
    targetType: 'banner',
    targetId: String(items.length),
  });
  res.json({
    banners: await listAdminBanners(),
  });
}));

router.get('/popups', asyncHandler(async (_req, res) => {
  res.json({
    popups: await listAdminPopups(),
  });
}));

router.post('/popups', upload.single('image'), asyncHandler(async (req, res) => {
  const popupId = req.body?.id ? Number.parseInt(req.body.id, 10) : null;
  const title = String(req.body?.title || '').trim();
  const body = String(req.body?.body || '').trim();
  const linkUrl = String(req.body?.linkUrl || '').trim();
  const priority = parseOptionalInteger(req.body?.priority, 0);
  const startsAt = parseExpiryDate(req.body?.startsAt);
  const endsAt = parseExpiryDate(req.body?.endsAt);
  const isActive = parseOptionalBoolean(req.body?.isActive, true);

  const popup = await withTransaction(async (client) => {
    let assetId = null;
    if (popupId) {
      const existingResult = await client.query('SELECT * FROM app_popups WHERE id = $1', [popupId]);
      const existingPopup = existingResult.rows[0];
      if (!existingPopup) {
        throw notFound('Popup not found', 'POPUP_NOT_FOUND');
      }
      assetId = existingPopup.asset_id;
    }

    if (req.file?.buffer?.length) {
      const asset = await createNormalizedImageAsset({
        scope: 'admin',
        category: 'popup',
        fileName: req.file.originalname || 'popup',
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        square: false,
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 86,
      }, client);
      assetId = asset.id;
    }

    if (!assetId) {
      throw badRequest('Popup image is required', 'POPUP_IMAGE_REQUIRED');
    }

    if (popupId) {
      await client.query(
        `
          UPDATE app_popups
          SET asset_id = $2,
              title = $3,
              body = $4,
              link_url = $5,
              priority = $6,
              starts_at = $7,
              ends_at = $8,
              is_active = $9,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [popupId, assetId, title, body, linkUrl || null, priority, startsAt, endsAt, isActive]
      );
      return popupId;
    }

    const inserted = await client.query(
      `
        INSERT INTO app_popups (asset_id, title, body, link_url, priority, starts_at, ends_at, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [assetId, title, body, linkUrl || null, priority, startsAt, endsAt, isActive]
    );
    return inserted.rows[0].id;
  });

  await writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: popupId ? 'popup.update' : 'popup.create',
    targetType: 'popup',
    targetId: String(popup),
    details: { title, priority, startsAt, endsAt, isActive },
  });

  res.json({
    popups: await listAdminPopups(),
  });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const search = String(req.query?.search || '').trim().toLowerCase();
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const offset = (page - 1) * limit;
  const params = [];
  let whereClause = '';

  if (search) {
    params.push(`%${search}%`);
    whereClause = `
      WHERE LOWER(COALESCE(u.name, '')) LIKE $1
         OR LOWER(COALESCE(u.telegram_id, '')) LIKE $1
         OR LOWER(COALESCE(uc.username, '')) LIKE $1
    `;
  }

  const usersResult = await query(
    `
      SELECT u.id,
             u.telegram_id,
             u.name,
             u.avatar_url,
             u.created_at,
             ma.plan_type,
             ma.status,
             ma.access_level,
             ma.expires_at,
             uc.username
      FROM users u
      LEFT JOIN membership_access ma ON ma.user_id = u.id
      LEFT JOIN user_credentials uc ON uc.user_id = u.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );
  const totalResult = await query(
    `
      SELECT COUNT(*) AS count
      FROM users u
      LEFT JOIN user_credentials uc ON uc.user_id = u.id
      ${whereClause}
    `,
    params
  );

  res.json({
    users: usersResult.rows.map((row) => ({
      id: row.id,
      telegramId: row.telegram_id,
      name: row.name,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      membership: {
        planType: row.plan_type || 'free',
        status: row.status || 'free',
        accessLevel: row.access_level || 'free',
        expiresAt: row.expires_at || null,
      },
      account: {
        username: row.username || null,
        hasPassword: Boolean(row.username),
      },
    })),
    pagination: {
      page,
      limit,
      total: Number(totalResult.rows[0]?.count || 0),
    },
  });
}));

router.post('/users/:id/membership', asyncHandler(async (req, res) => {
  const userId = Number.parseInt(req.params.id, 10);
  const planType = String(req.body?.planType || '').trim();
  const expiresAt = parseExpiryDate(req.body?.expiresAt);
  if (!['free', 'trial', 'month_card'].includes(planType)) {
    throw badRequest('Unsupported plan type', 'INVALID_PLAN_TYPE');
  }

  const membership = await withTransaction(async (client) => {
    const userResult = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0]) {
      throw notFound('User not found', 'USER_NOT_FOUND');
    }

    const normalizedPlanType = planType === 'trial' ? 'trial' : planType === 'month_card' ? 'month_card' : 'free';
    return setManualMembership(
      userId,
      {
        planType: normalizedPlanType,
        expiresAt: normalizedPlanType === 'free' ? null : expiresAt,
        details: { adminSessionId: req.adminSession.id },
      },
      client
    );
  });

  await writeAuditLog({
    actorType: 'admin',
    actorSessionId: req.adminSession.id,
    action: 'user.membership.update',
    targetType: 'user',
    targetId: String(userId),
    details: { planType, expiresAt },
  });

  res.json({ membership });
}));

router.get('/analytics/overview', asyncHandler(async (_req, res) => {
  res.json(await getAnalyticsOverview());
}));

export default router;
