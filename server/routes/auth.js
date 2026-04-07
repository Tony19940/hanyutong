import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { config } from '../config.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { requireUserAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { createUserSession, getUserSession, revokeUserSession } from '../services/sessionService.js';
import {
  activateKeyForUser,
  getActivationKeyByCode,
  getMembershipAccess,
  grantMonthCardMembership,
  grantTrialMembership,
  hasConsumedTrial,
  isFutureTimestamp,
} from '../services/membershipService.js';
import {
  awardReferralRewardIfEligible,
  bindReferralIfEligible,
  ensureInviteCodeForUser,
  getInviteLeaderboard,
  getInviteSummary,
} from '../services/referralService.js';
import { getCredentialByUserId, verifyPasswordCredentials } from '../services/credentialService.js';
import { getFreeQuotaSummary } from '../services/freeQuotaService.js';
import { getGoalSummary } from '../services/studyProgressService.js';

const router = Router();
const loginRateLimit = createRateLimiter({
  windowMs: config.loginRateWindowMs,
  max: config.loginRateLimit,
  keyPrefix: 'user-login',
});

function readBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7).trim();
}

function buildInviteBaseUrl(req) {
  if (config.webappUrl) {
    return config.webappUrl;
  }
  return `${req.protocol}://${req.get('host')}`;
}

function toUserPayload(user, accountUsername = null) {
  return {
    id: user.id,
    telegram_id: user.telegram_id,
    name: user.name,
    avatar_url: user.avatar_url,
    account_username: accountUsername,
  };
}

async function resolveSessionUser(req) {
  const token = readBearerToken(req);
  if (!token) {
    return null;
  }
  return getUserSession(token);
}

async function findOrCreateUser({
  client,
  sessionUserId = null,
  telegramId = null,
  name = null,
  avatarUrl = null,
}) {
  if (sessionUserId) {
    const existingResult = await client.query('SELECT * FROM users WHERE id = $1', [sessionUserId]);
    const existingUser = existingResult.rows[0];
    if (!existingUser) {
      throw notFound('User not found', 'USER_NOT_FOUND');
    }
    const updated = await client.query(
      `
        UPDATE users
        SET name = COALESCE($2, name),
            avatar_url = COALESCE($3, avatar_url)
        WHERE id = $1
        RETURNING *
      `,
      [sessionUserId, name, avatarUrl]
    );
    return updated.rows[0];
  }

  const telegramIdValue = telegramId ? String(telegramId) : null;
  if (telegramIdValue) {
    const existingResult = await client.query('SELECT * FROM users WHERE telegram_id = $1', [telegramIdValue]);
    const existingUser = existingResult.rows[0];
    if (existingUser) {
      const updated = await client.query(
        `
          UPDATE users
          SET name = COALESCE($2, name),
              avatar_url = COALESCE($3, avatar_url)
          WHERE id = $1
          RETURNING *
        `,
        [existingUser.id, name, avatarUrl]
      );
      return updated.rows[0];
    }
  }

  const localTelegramId = telegramIdValue || `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inserted = await client.query(
    `
      INSERT INTO users (telegram_id, name, avatar_url)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [localTelegramId, name || 'User', avatarUrl || null]
  );
  return inserted.rows[0];
}

async function buildAuthResponse(user, token, req) {
  await ensureInviteCodeForUser(user.id);
  const membership = await getMembershipAccess(user.id);
  const invite = await getInviteSummary(user.id, buildInviteBaseUrl(req));
  const credential = await getCredentialByUserId(user.id);
  const freeQuota = await getFreeQuotaSummary(user.id);
  const studySummary = await getGoalSummary(user.id);
  const leaderboard = await getInviteLeaderboard(3);
  const userCountResult = await query('SELECT COUNT(*) AS count FROM users');

  return {
    user: toUserPayload(user, credential?.username || null),
    token,
    membership,
    invite,
    freeQuota,
    studySummary,
    socialProof: {
      learnerCount: Number(userCountResult.rows[0]?.count || 0),
      inviteLeaderboard: leaderboard,
      rewardDaysPerConversion: config.referralRewardDays,
    },
  };
}

router.post('/start-trial', loginRateLimit, asyncHandler(async (req, res) => {
  const { telegramId, name, avatarUrl, inviteCode } = req.body || {};
  const session = await resolveSessionUser(req);

  const user = await withTransaction(async (client) => {
    const userRow = await findOrCreateUser({
      client,
      sessionUserId: session?.user?.id || null,
      telegramId,
      name,
      avatarUrl,
    });

    await ensureInviteCodeForUser(userRow.id, client);
    const consumedTrial = await hasConsumedTrial(userRow.id, client);
    if (!consumedTrial) {
      const referral = await bindReferralIfEligible(
        {
          inviteCode,
          inviteeUserId: userRow.id,
        },
        client
      );
      await grantTrialMembership(userRow.id, { invited: Boolean(referral) }, client);
    } else {
      await getMembershipAccess(userRow.id, client);
    }

    const refreshed = await client.query('SELECT * FROM users WHERE id = $1', [userRow.id]);
    return refreshed.rows[0];
  });

  const token = await createUserSession(user.id);
  res.json(await buildAuthResponse(user, token, req));
}));

router.post('/login', loginRateLimit, asyncHandler(async (req, res) => {
  const { keyCode, telegramId, name, avatarUrl, inviteCode } = req.body || {};
  if (!keyCode) {
    throw badRequest('Key code is required', 'KEY_REQUIRED');
  }

  const session = await resolveSessionUser(req);

  const user = await withTransaction(async (client) => {
    const key = await getActivationKeyByCode(keyCode, client);
    if (!key) {
      throw notFound('Key not found', 'KEY_NOT_FOUND');
    }

    const userRow = await findOrCreateUser({
      client,
      sessionUserId: session?.user?.id || null,
      telegramId,
      name,
      avatarUrl,
    });

    await ensureInviteCodeForUser(userRow.id, client);
    await bindReferralIfEligible(
      {
        inviteCode,
        inviteeUserId: userRow.id,
      },
      client
    );

    if (key.user_id && key.user_id !== userRow.id) {
      throw forbidden('Key already belongs to another user', 'KEY_ALREADY_USED');
    }

    let activeKey = key;
    if (!key.user_id) {
      activeKey = await activateKeyForUser(key, userRow.id, client);
      if (!activeKey) {
        throw forbidden('Key has expired', 'KEY_EXPIRED');
      }
    }

    if (!activeKey.expires_at && activeKey.status === 'active') {
      await grantMonthCardMembership(
        userRow.id,
        {
          expiresAt: null,
          sourceKeyId: activeKey.id,
          eventType: 'paid_activation',
          details: { legacyPermanent: true },
        },
        client
      );
    } else {
      if (!isFutureTimestamp(activeKey.expires_at)) {
        throw forbidden('Key has expired', 'KEY_EXPIRED');
      }

      const paidStatusBeforeUpdate = await client.query(
        'SELECT first_paid_at FROM users WHERE id = $1',
        [userRow.id]
      );
      const hadPriorPaidActivation = Boolean(paidStatusBeforeUpdate.rows[0]?.first_paid_at);

      await client.query(
        `
          UPDATE users
          SET first_paid_at = COALESCE(first_paid_at, CURRENT_TIMESTAMP),
              key_id = $2
          WHERE id = $1
        `,
        [userRow.id, activeKey.id]
      );

      await grantMonthCardMembership(
        userRow.id,
        {
          expiresAt: activeKey.expires_at,
          sourceKeyId: activeKey.id,
          eventType: 'paid_activation',
          details: { keyCode: activeKey.key_code },
        },
        client
      );

      if (!hadPriorPaidActivation) {
        await awardReferralRewardIfEligible(userRow.id, client);
      }
    }

    const refreshed = await client.query('SELECT * FROM users WHERE id = $1', [userRow.id]);
    return refreshed.rows[0];
  });

  const token = await createUserSession(user.id);

  res.json(await buildAuthResponse(user, token, req));
}));

router.post('/verify', requireUserAuth, asyncHandler(async (req, res) => {
  const userResult = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = userResult.rows[0];

  res.json(await buildAuthResponse(user, req.authToken, req));
}));

router.post('/password-login', loginRateLimit, asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    throw badRequest('Username and password are required', 'CREDENTIALS_REQUIRED');
  }

  const credential = await verifyPasswordCredentials(username, password);
  const userResult = await query('SELECT * FROM users WHERE id = $1', [credential.user_id]);
  const user = userResult.rows[0];
  if (!user) {
    throw notFound('User not found', 'USER_NOT_FOUND');
  }

  const token = await createUserSession(user.id);
  res.json(await buildAuthResponse(user, token, req));
}));

router.post('/logout', requireUserAuth, asyncHandler(async (req, res) => {
  await revokeUserSession(req.authToken);
  res.json({ success: true });
}));

export default router;
