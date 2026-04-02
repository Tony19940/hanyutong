export const DEFAULT_AVATAR_IDS = [
  'avatar-1',
  'avatar-2',
  'avatar-3',
  'avatar-4',
  'avatar-5',
  'avatar-6',
];

function hashText(input) {
  return [...String(input || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function buildAvatarSeed(user = {}) {
  return user.telegramId
    || user.telegram_id
    || user.username
    || user.name
    || user.display_name
    || user.id
    || 'user';
}

export function pickFallbackAvatarId(seed) {
  const index = hashText(seed || 'user') % DEFAULT_AVATAR_IDS.length;
  return DEFAULT_AVATAR_IDS[index];
}

export function getAvatarAssetUrl(avatarId) {
  return avatarId ? `/avatars/${avatarId}.svg` : null;
}

export function resolveAvatarUrl(user = {}, fallbackAvatarId = null) {
  const directUrl = user.avatarUrl || user.avatar_url || null;
  if (directUrl) {
    return directUrl;
  }

  const resolvedId = fallbackAvatarId || pickFallbackAvatarId(buildAvatarSeed(user));
  return getAvatarAssetUrl(resolvedId);
}
