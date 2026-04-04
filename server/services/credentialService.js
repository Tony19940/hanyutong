import crypto from 'crypto';
import { query } from '../db.js';
import { badRequest, forbidden } from '../errors.js';

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function validateUsername(value) {
  const username = String(value || '').trim();
  if (!/^[a-zA-Z0-9_]{4,24}$/.test(username)) {
    throw badRequest('Username must be 4-24 characters using letters, numbers, or underscores', 'INVALID_USERNAME');
  }
  return username;
}

function validatePassword(value) {
  const password = String(value || '');
  if (password.length < 6) {
    throw badRequest('Password must be at least 6 characters', 'INVALID_PASSWORD');
  }
  return password;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasswordHash(password, storedHash) {
  const [salt, expected] = String(storedHash || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

export async function getCredentialByUserId(userId, client = null) {
  const result = await query(
    `
      SELECT user_id, username, username_normalized, password_hash, created_at, updated_at
      FROM user_credentials
      WHERE user_id = $1
    `,
    [userId],
    client
  );
  return result.rows[0] || null;
}

export async function getCredentialByUsername(username, client = null) {
  const normalized = normalizeUsername(username);
  const result = await query(
    `
      SELECT user_id, username, username_normalized, password_hash, created_at, updated_at
      FROM user_credentials
      WHERE username_normalized = $1
    `,
    [normalized],
    client
  );
  return result.rows[0] || null;
}

export async function bindUserCredentials(userId, { username, password }, client = null) {
  const cleanUsername = validateUsername(username);
  const normalized = normalizeUsername(cleanUsername);
  const cleanPassword = validatePassword(password);
  const passwordHash = hashPassword(cleanPassword);

  const existing = await getCredentialByUsername(cleanUsername, client);
  if (existing && Number(existing.user_id) !== Number(userId)) {
    throw forbidden('Username is already in use', 'USERNAME_TAKEN');
  }

  const result = await query(
    `
      INSERT INTO user_credentials (user_id, username, username_normalized, password_hash)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE
      SET username = EXCLUDED.username,
          username_normalized = EXCLUDED.username_normalized,
          password_hash = EXCLUDED.password_hash,
          updated_at = CURRENT_TIMESTAMP
      RETURNING user_id, username, username_normalized, created_at, updated_at
    `,
    [userId, cleanUsername, normalized, passwordHash],
    client
  );

  return result.rows[0];
}

export async function verifyPasswordCredentials(username, password, client = null) {
  const credential = await getCredentialByUsername(username, client);
  if (!credential) {
    throw forbidden('Invalid username or password', 'INVALID_CREDENTIALS');
  }
  if (!verifyPasswordHash(String(password || ''), credential.password_hash)) {
    throw forbidden('Invalid username or password', 'INVALID_CREDENTIALS');
  }
  return credential;
}
