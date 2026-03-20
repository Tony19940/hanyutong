import { unauthorized } from '../errors.js';
import { getAdminSession, getUserSession } from '../services/sessionService.js';

function readBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7).trim();
}

export function requireUserAuth(req, res, next) {
  const token = readBearerToken(req);
  if (!token) {
    return next(unauthorized('Missing user token', 'MISSING_USER_TOKEN'));
  }

  const session = getUserSession(token);
  if (!session) {
    return next(unauthorized('Invalid or expired session', 'INVALID_USER_SESSION'));
  }

  req.authToken = token;
  req.session = session;
  req.user = {
    id: session.user.id,
    telegramId: session.user.telegram_id,
    name: session.user.name,
    avatarUrl: session.user.avatar_url,
  };

  return next();
}

export function requireAdminAuth(req, res, next) {
  const token = readBearerToken(req);
  if (!token) {
    return next(unauthorized('Missing admin token', 'MISSING_ADMIN_TOKEN'));
  }

  const session = getAdminSession(token);
  if (!session) {
    return next(unauthorized('Invalid or expired admin session', 'INVALID_ADMIN_SESSION'));
  }

  req.authToken = token;
  req.adminSession = session;
  return next();
}
