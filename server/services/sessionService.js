import db from '../db.js';
import { config } from '../config.js';
import { expiresAtFromHours, generateToken, hashToken } from './tokenService.js';

function isExpired(isoTimestamp) {
  return new Date(isoTimestamp).getTime() <= Date.now();
}

export function createUserSession(userId) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = expiresAtFromHours(config.userSessionTtlHours);

  db.prepare(`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(userId, tokenHash, expiresAt);

  return token;
}

export function getUserSession(token) {
  const tokenHash = hashToken(token);
  const row = db.prepare(`
    SELECT s.id, s.user_id, s.expires_at, u.id AS userId, u.telegram_id, u.name, u.avatar_url
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `).get(tokenHash);

  if (!row) {
    return null;
  }

  if (isExpired(row.expires_at)) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.id);
    return null;
  }

  db.prepare('UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id);

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

export function revokeUserSession(token) {
  const tokenHash = hashToken(token);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function revokeAllUserSessionsForUser(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function createAdminSession() {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = expiresAtFromHours(config.adminSessionTtlHours);

  const result = db.prepare(`
    INSERT INTO admin_sessions (token_hash, expires_at)
    VALUES (?, ?)
  `).run(tokenHash, expiresAt);

  return {
    token,
    sessionId: result.lastInsertRowid,
  };
}

export function getAdminSession(token) {
  const tokenHash = hashToken(token);
  const session = db.prepare(`
    SELECT id, expires_at
    FROM admin_sessions
    WHERE token_hash = ?
  `).get(tokenHash);

  if (!session) {
    return null;
  }

  if (isExpired(session.expires_at)) {
    db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(session.id);
    return null;
  }

  db.prepare('UPDATE admin_sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(session.id);
  return session;
}

export function revokeAdminSession(token) {
  const tokenHash = hashToken(token);
  db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
}
