import crypto from 'crypto';
import { query } from '../db.js';
import { config } from '../config.js';
import { addReferralRewardDays } from './membershipService.js';

function normalizeInviteCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function ensureInviteCodeForUser(userId, client = null) {
  const existingResult = await query(
    'SELECT invite_code FROM users WHERE id = $1',
    [userId],
    client
  );
  const existingCode = existingResult.rows[0]?.invite_code;
  if (existingCode) {
    return existingCode;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const inviteCode = generateInviteCode();
    try {
      const updated = await query(
        `
          UPDATE users
          SET invite_code = $2
          WHERE id = $1
          RETURNING invite_code
        `,
        [userId, inviteCode],
        client
      );
      return updated.rows[0]?.invite_code || inviteCode;
    } catch (error) {
      if (error.code !== '23505') {
        throw error;
      }
    }
  }

  throw new Error('Unable to generate a unique invite code');
}

export function buildInviteUrl(baseUrl, inviteCode) {
  const safeBaseUrl = String(baseUrl || '').trim();
  if (!safeBaseUrl) {
    return '';
  }

  const url = new URL(safeBaseUrl);
  url.searchParams.set('ref', inviteCode);
  return url.toString();
}

export async function bindReferralIfEligible({ inviteCode, inviteeUserId }, client = null) {
  const cleanedCode = normalizeInviteCode(inviteCode);
  if (!cleanedCode || !inviteeUserId) {
    return null;
  }

  const inviterResult = await query(
    'SELECT id, invite_code FROM users WHERE invite_code = $1',
    [cleanedCode],
    client
  );
  const inviter = inviterResult.rows[0];
  if (!inviter || inviter.id === inviteeUserId) {
    return null;
  }

  const existingResult = await query(
    'SELECT * FROM referrals WHERE invitee_user_id = $1',
    [inviteeUserId],
    client
  );
  if (existingResult.rows[0]) {
    return existingResult.rows[0];
  }

  const inserted = await query(
    `
      INSERT INTO referrals (inviter_user_id, invitee_user_id, invite_code, reward_days)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [inviter.id, inviteeUserId, inviter.invite_code, config.referralRewardDays],
    client
  );

  await query(
    `
      UPDATE users
      SET invited_by_user_id = COALESCE(invited_by_user_id, $2),
          referral_bound_at = COALESCE(referral_bound_at, CURRENT_TIMESTAMP)
      WHERE id = $1
    `,
    [inviteeUserId, inviter.id],
    client
  );

  return inserted.rows[0];
}

export async function awardReferralRewardIfEligible(inviteeUserId, client = null) {
  const referralResult = await query(
    `
      SELECT *
      FROM referrals
      WHERE invitee_user_id = $1
        AND first_paid_reward_granted_at IS NULL
    `,
    [inviteeUserId],
    client
  );
  const referral = referralResult.rows[0];
  if (!referral) {
    return null;
  }

  await query(
    `
      UPDATE referrals
      SET first_paid_reward_granted_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [referral.id],
    client
  );

  const membership = await addReferralRewardDays(
    referral.inviter_user_id,
    {
      days: referral.reward_days,
      referralId: referral.id,
    },
    client
  );

  return {
    referralId: referral.id,
    inviterUserId: referral.inviter_user_id,
    rewardDays: referral.reward_days,
    membership,
  };
}

export async function getInviteSummary(userId, baseUrl, client = null) {
  const inviteCode = await ensureInviteCodeForUser(userId, client);
  const statsResult = await query(
    `
      SELECT
        COUNT(*) AS invited_count,
        COUNT(first_paid_reward_granted_at) AS converted_count,
        COALESCE(SUM(reward_days) FILTER (WHERE first_paid_reward_granted_at IS NOT NULL), 0) AS reward_days_earned
      FROM referrals
      WHERE inviter_user_id = $1
    `,
    [userId],
    client
  );
  const row = statsResult.rows[0] || {};

  return {
    code: inviteCode,
    url: buildInviteUrl(baseUrl, inviteCode),
    stats: {
      invitedCount: Number(row.invited_count || 0),
      convertedCount: Number(row.converted_count || 0),
      rewardDaysEarned: Number(row.reward_days_earned || 0),
      rewardDaysPerConversion: config.referralRewardDays,
    },
  };
}

export async function getInviteLeaderboard(limit = config.inviteLeaderboardLimit, client = null) {
  const result = await query(
    `
      SELECT
        u.id,
        u.name,
        u.avatar_url,
        COUNT(r.id) AS invited_count,
        COUNT(r.first_paid_reward_granted_at) AS converted_count,
        COALESCE(SUM(CASE WHEN r.first_paid_reward_granted_at IS NOT NULL THEN r.reward_days ELSE 0 END), 0) AS reward_days_earned
      FROM users u
      JOIN referrals r ON r.inviter_user_id = u.id
      GROUP BY u.id
      ORDER BY converted_count DESC, reward_days_earned DESC, invited_count DESC, u.id ASC
      LIMIT $1
    `,
    [Math.max(1, Math.min(Number.parseInt(limit, 10) || config.inviteLeaderboardLimit, 20))],
    client
  );

  return result.rows.map((row, index) => ({
    rank: index + 1,
    userId: row.id,
    name: row.name || `Learner ${row.id}`,
    avatarUrl: row.avatar_url || null,
    invitedCount: Number(row.invited_count || 0),
    convertedCount: Number(row.converted_count || 0),
    rewardDaysEarned: Number(row.reward_days_earned || 0),
  }));
}
