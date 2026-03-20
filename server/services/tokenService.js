import crypto from 'crypto';

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function expiresAtFromHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
