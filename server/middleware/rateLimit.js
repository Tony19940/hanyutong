import { forbidden } from '../errors.js';

const store = new Map();

function getKey(req, keyPrefix) {
  return `${keyPrefix}:${req.ip || 'unknown'}`;
}

export function createRateLimiter({ windowMs, max, keyPrefix }) {
  return (req, res, next) => {
    const key = getKey(req, keyPrefix);
    const now = Date.now();
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      return next(forbidden('Too many requests, try again later', 'RATE_LIMITED'));
    }

    current.count += 1;
    return next();
  };
}
