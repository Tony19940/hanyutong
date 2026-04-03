import { unauthorized } from '../errors.js';
import { getAdminSession, getUserSession } from '../services/sessionService.js';
import { getMembershipAccess } from '../services/membershipService.js';

function readBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7).trim();
}

export async function requireUserAuth(req, _res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) {
      return next(unauthorized('Missing user token', 'MISSING_USER_TOKEN'));
    }

    const session = await getUserSession(token);
    if (!session) {
      return next(unauthorized('Invalid or expired session', 'INVALID_USER_SESSION'));
    }

    req.authToken = token;
    req.session = session;
    const membership = await getMembershipAccess(session.user.id);
    req.user = {
      id: session.user.id,
      telegramId: session.user.telegram_id,
      name: session.user.name,
      avatarUrl: session.user.avatar_url,
      membership,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requirePremiumAccess(_feature = 'premium') {
  return async function premiumAccessMiddleware(req, _res, next) {
    try {
      if (req.user?.membership?.accessLevel === 'premium') {
        return next();
      }

      return next(unauthorized('Premium membership is required', 'PREMIUM_REQUIRED'));
    } catch (error) {
      return next(error);
    }
  };
}

export async function requireAdminAuth(req, _res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) {
      return next(unauthorized('Missing admin token', 'MISSING_ADMIN_TOKEN'));
    }

    const session = await getAdminSession(token);
    if (!session) {
      return next(unauthorized('Invalid or expired admin session', 'INVALID_ADMIN_SESSION'));
    }

    req.authToken = token;
    req.adminSession = session;
    return next();
  } catch (error) {
    return next(error);
  }
}
