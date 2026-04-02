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

export function pickFallbackAvatarId(seed) {
  const index = hashText(seed || 'user') % DEFAULT_AVATAR_IDS.length;
  return DEFAULT_AVATAR_IDS[index];
}

export function resolveFallbackAvatarId(value, seed) {
  if (value && DEFAULT_AVATAR_IDS.includes(String(value))) {
    return String(value);
  }
  return pickFallbackAvatarId(seed);
}

export function buildUserAvatarSeed(user) {
  return user?.telegramId
    || user?.telegram_id
    || user?.name
    || user?.id
    || 'user';
}
