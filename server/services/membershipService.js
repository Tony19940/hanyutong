import { query } from '../db.js';
import { config } from '../config.js';

const TRIAL_PLAN_TYPES = new Set(['trial', 'invited_trial']);
const PREMIUM_PLAN_TYPES = new Set(['month_card', 'referral_reward']);

function now() {
  return new Date();
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function addDaysToIso(baseValue, days) {
  const baseDate = toDate(baseValue) || now();
  const nextDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  return nextDate.toISOString();
}

export function isFutureTimestamp(value) {
  const parsed = toDate(value);
  return Boolean(parsed && parsed.getTime() > Date.now());
}

function deriveMembershipFields(planType, expiresAt) {
  if (planType === 'legacy_permanent') {
    return {
      status: 'premium_active',
      accessLevel: 'premium',
    };
  }

  if (!planType || planType === 'free') {
    return {
      status: 'free',
      accessLevel: 'free',
    };
  }

  if (TRIAL_PLAN_TYPES.has(planType)) {
    return isFutureTimestamp(expiresAt)
      ? { status: 'trial_active', accessLevel: 'premium' }
      : { status: 'trial_expired', accessLevel: 'free' };
  }

  if (PREMIUM_PLAN_TYPES.has(planType)) {
    return isFutureTimestamp(expiresAt)
      ? { status: 'premium_active', accessLevel: 'premium' }
      : { status: 'premium_expired', accessLevel: 'free' };
  }

  return {
    status: 'free',
    accessLevel: 'free',
  };
}

function toMembershipPayload(row) {
  if (!row) {
    return {
      status: 'free',
      planType: 'free',
      accessLevel: 'free',
      expiresAt: null,
      startedAt: null,
      isPremium: false,
    };
  }

  return {
    status: row.status,
    planType: row.plan_type,
    accessLevel: row.access_level,
    expiresAt: row.expires_at || null,
    startedAt: row.started_at || null,
    isPremium: row.access_level === 'premium',
  };
}

export async function recordEntitlementEvent({
  userId,
  eventType,
  planType = null,
  daysDelta = 0,
  expiresAt = null,
  relatedKeyId = null,
  relatedReferralId = null,
  details = null,
}, client = null) {
  await query(
    `
      INSERT INTO entitlement_events (
        user_id,
        event_type,
        plan_type,
        days_delta,
        expires_at,
        related_key_id,
        related_referral_id,
        details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      userId,
      eventType,
      planType,
      daysDelta,
      expiresAt,
      relatedKeyId,
      relatedReferralId,
      details ? JSON.stringify(details) : null,
    ],
    client
  );
}

export async function upsertMembershipAccess(userId, { planType, expiresAt = null, sourceKeyId = null }, client = null) {
  const nextPlanType = planType || 'free';
  const nextExpiresAt = nextPlanType === 'legacy_permanent' ? null : expiresAt;
  const derived = deriveMembershipFields(nextPlanType, nextExpiresAt);
  const result = await query(
    `
      INSERT INTO membership_access (
        user_id,
        plan_type,
        status,
        access_level,
        expires_at,
        started_at,
        source_key_id,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE
      SET plan_type = EXCLUDED.plan_type,
          status = EXCLUDED.status,
          access_level = EXCLUDED.access_level,
          expires_at = EXCLUDED.expires_at,
          started_at = CURRENT_TIMESTAMP,
          source_key_id = EXCLUDED.source_key_id,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
    [userId, nextPlanType, derived.status, derived.accessLevel, nextExpiresAt, sourceKeyId],
    client
  );

  return toMembershipPayload(result.rows[0]);
}

async function seedMembershipFromKeys(userId, client = null) {
  const keyResult = await query(
    `
      SELECT *
      FROM keys
      WHERE user_id = $1
      ORDER BY expires_at DESC NULLS LAST, id DESC
      LIMIT 1
    `,
    [userId],
    client
  );
  const key = keyResult.rows[0];

  if (!key) {
    return upsertMembershipAccess(userId, { planType: 'free', expiresAt: null, sourceKeyId: null }, client);
  }

  const normalizedKey = await syncActivationKeyStatus(key, client);

  if (normalizedKey.status === 'active' && !normalizedKey.expires_at) {
    return upsertMembershipAccess(
      userId,
      {
        planType: 'legacy_permanent',
        expiresAt: null,
        sourceKeyId: normalizedKey.id,
      },
      client
    );
  }

  return upsertMembershipAccess(
    userId,
    {
      planType: normalizedKey.user_id ? 'month_card' : 'free',
      expiresAt: normalizedKey.expires_at || null,
      sourceKeyId: normalizedKey.id || null,
    },
    client
  );
}

export async function getMembershipAccess(userId, client = null) {
  const result = await query(
    'SELECT * FROM membership_access WHERE user_id = $1',
    [userId],
    client
  );
  const row = result.rows[0];

  if (!row) {
    return seedMembershipFromKeys(userId, client);
  }

  const derived = deriveMembershipFields(row.plan_type, row.expires_at);
  if (row.status !== derived.status || row.access_level !== derived.accessLevel) {
    const updated = await query(
      `
        UPDATE membership_access
        SET status = $2,
            access_level = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING *
      `,
      [userId, derived.status, derived.accessLevel],
      client
    );
    return toMembershipPayload(updated.rows[0]);
  }

  return toMembershipPayload(row);
}

export async function hasConsumedTrial(userId, client = null) {
  const result = await query(
    `
      SELECT COUNT(*) AS count
      FROM entitlement_events
      WHERE user_id = $1
        AND event_type IN ('trial_started', 'paid_activation')
    `,
    [userId],
    client
  );
  return Number(result.rows[0]?.count || 0) > 0;
}

export async function grantTrialMembership(userId, { invited = false } = {}, client = null) {
  const days = invited ? config.invitedTrialDays : config.trialDays;
  const planType = invited ? 'invited_trial' : 'trial';
  const expiresAt = addDaysToIso(new Date().toISOString(), days);
  const membership = await upsertMembershipAccess(
    userId,
    {
      planType,
      expiresAt,
      sourceKeyId: null,
    },
    client
  );
  await recordEntitlementEvent(
    {
      userId,
      eventType: 'trial_started',
      planType,
      daysDelta: days,
      expiresAt,
    },
    client
  );
  return membership;
}

export async function grantMonthCardMembership(userId, { expiresAt, sourceKeyId = null, eventType = 'paid_activation', details = null }, client = null) {
  const membership = await upsertMembershipAccess(
    userId,
    {
      planType: 'month_card',
      expiresAt,
      sourceKeyId,
    },
    client
  );
  await recordEntitlementEvent(
    {
      userId,
      eventType,
      planType: 'month_card',
      daysDelta: 0,
      expiresAt,
      relatedKeyId: sourceKeyId,
      details,
    },
    client
  );
  return membership;
}

export async function addReferralRewardDays(userId, { days, referralId = null }, client = null) {
  const currentMembership = await getMembershipAccess(userId, client);

  if (currentMembership.planType === 'legacy_permanent') {
    await recordEntitlementEvent(
      {
        userId,
        eventType: 'referral_reward',
        planType: currentMembership.planType,
        daysDelta: days,
        expiresAt: null,
        relatedReferralId: referralId,
        details: { ignoredForLegacyPermanent: true },
      },
      client
    );
    return currentMembership;
  }

  const baseTime = currentMembership.isPremium && currentMembership.expiresAt
    ? currentMembership.expiresAt
    : new Date().toISOString();
  const expiresAt = addDaysToIso(baseTime, days);
  const nextPlanType = PREMIUM_PLAN_TYPES.has(currentMembership.planType)
    ? currentMembership.planType
    : 'referral_reward';

  const membership = await upsertMembershipAccess(
    userId,
    {
      planType: nextPlanType,
      expiresAt,
      sourceKeyId: null,
    },
    client
  );

  await recordEntitlementEvent(
    {
      userId,
      eventType: 'referral_reward',
      planType: nextPlanType,
      daysDelta: days,
      expiresAt,
      relatedReferralId: referralId,
    },
    client
  );

  return membership;
}

export async function setManualMembership(userId, {
  planType,
  expiresAt = null,
  sourceKeyId = null,
  details = null,
}, client = null) {
  const membership = await upsertMembershipAccess(
    userId,
    {
      planType,
      expiresAt,
      sourceKeyId,
    },
    client
  );

  await recordEntitlementEvent(
    {
      userId,
      eventType: 'manual_adjustment',
      planType,
      daysDelta: 0,
      expiresAt,
      relatedKeyId: sourceKeyId,
      details,
    },
    client
  );

  return membership;
}

export async function getActivationKeyByCode(keyCode, client = null) {
  const result = await query(
    'SELECT * FROM keys WHERE key_code = $1',
    [String(keyCode).trim()],
    client
  );
  const key = result.rows[0];
  if (!key) {
    return null;
  }
  return syncActivationKeyStatus(key, client);
}

export async function getActivationKeyById(id, client = null) {
  const result = await query(
    'SELECT * FROM keys WHERE id = $1',
    [id],
    client
  );
  const key = result.rows[0];
  if (!key) {
    return null;
  }
  return syncActivationKeyStatus(key, client);
}

export function resolveKeyExpiry(key, baseTime = new Date().toISOString()) {
  if (key.expires_at) {
    return key.expires_at;
  }
  const durationDays = Number.parseInt(key.duration_days, 10);
  const safeDays = Number.isFinite(durationDays) && durationDays > 0
    ? durationDays
    : config.premiumDurationDays;
  return addDaysToIso(baseTime, safeDays);
}

export async function syncActivationKeyStatus(key, client = null) {
  if (!key) {
    return null;
  }

  let nextStatus = key.status;
  if (key.status === 'unused') {
    return key;
  }

  if (!key.expires_at) {
    nextStatus = 'active';
  } else if (isFutureTimestamp(key.expires_at)) {
    nextStatus = 'active';
  } else {
    nextStatus = 'expired';
  }

  if (nextStatus === key.status) {
    return key;
  }

  const result = await query(
    `
      UPDATE keys
      SET status = $2,
          expired_at = CASE WHEN $2 = 'expired' THEN COALESCE(expired_at, CURRENT_TIMESTAMP) ELSE NULL END
      WHERE id = $1
      RETURNING *
    `,
    [key.id, nextStatus],
    client
  );
  return result.rows[0];
}

export async function activateKeyForUser(key, userId, client = null) {
  const expiresAt = resolveKeyExpiry(key);
  if (!isFutureTimestamp(expiresAt)) {
    return null;
  }

  const result = await query(
    `
      UPDATE keys
      SET user_id = $2,
          status = 'active',
          activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
          expired_at = NULL,
          expires_at = $3
      WHERE id = $1
      RETURNING *
    `,
    [key.id, userId, expiresAt],
    client
  );

  await query(
    `
      UPDATE users
      SET key_id = $2
      WHERE id = $1
    `,
    [userId, key.id],
    client
  );

  return result.rows[0];
}

export async function applyExtendedKeyMembership(keyId, expiresAt, client = null) {
  const key = await getActivationKeyById(keyId, client);
  if (!key || !key.user_id) {
    return null;
  }

  return grantMonthCardMembership(
    key.user_id,
    {
      expiresAt,
      sourceKeyId: key.id,
      eventType: 'key_extended',
      details: { appliedByAdmin: true },
    },
    client
  );
}
