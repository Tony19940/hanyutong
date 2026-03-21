import { query } from '../db.js';
import { config } from '../config.js';
import { expiresAtFromHours, generateToken, hashToken } from './tokenService.js';

function isExpired(isoTimestamp) {
  return new Date(isoTimestamp).getTime() <= Date.now();
}

export async function createUserSession(userId) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = expiresAtFromHours(config.userSessionTtlHours);

  await query(
    `
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt]
  );

  return token;
}

export async function getUserSession(token) {
  const tokenHash = hashToken(token);
  const result = await query(
    `
      SELECT s.id, s.user_id, s.expires_at, u.id AS "userId", u.telegram_id, u.name, u.avatar_url
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
    `,
    [tokenHash]
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  if (isExpired(row.expires_at)) {
    await query('DELETE FROM sessions WHERE id = $1', [row.id]);
    return null;
  }

  await query('UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [row.id]);

  return {
    id: row.id,
    user: {
      id: row.userId,
      telegram_id: row.telegram_id,
      name: row.name,
      avatar_url: row.avatar_url,
    },
  };
}

export async function revokeUserSession(token) {
  const tokenHash = hashToken(token);
  await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

export async function revokeAllUserSessionsForUser(userId) {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

export async function createAdminSession() {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = expiresAtFromHours(config.adminSessionTtlHours);

  const result = await query(
    `
      INSERT INTO admin_sessions (token_hash, expires_at)
      VALUES ($1, $2)
      RETURNING id
    `,
    [tokenHash, expiresAt]
  );

  return {
    token,
    sessionId: result.rows[0].id,
  };
}

export async function getAdminSession(token) {
  const tokenHash = hashToken(token);
  const result = await query(
    `
      SELECT id, expires_at
      FROM admin_sessions
      WHERE token_hash = $1
    `,
    [tokenHash]
  );
  const session = result.rows[0];

  if (!session) {
    return null;
  }

  if (isExpired(session.expires_at)) {
    await query('DELETE FROM admin_sessions WHERE id = $1', [session.id]);
    return null;
  }

  await query('UPDATE admin_sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [session.id]);
  return session;
}

export async function revokeAdminSession(token) {
  const tokenHash = hashToken(token);
  await query('DELETE FROM admin_sessions WHERE token_hash = $1', [tokenHash]);
}
