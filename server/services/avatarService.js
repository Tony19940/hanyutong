export const DEFAULT_AVATAR_IDS = [
  'animal-bear',
  'animal-bunny',
  'animal-cat',
  'animal-chick',
  'animal-corgi',
  'animal-fox',
  'animal-frog',
  'animal-koala',
  'animal-panda',
  'animal-tiger',
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

export function isBuiltinAvatarId(value) {
  return DEFAULT_AVATAR_IDS.includes(String(value || ''));
}

export function buildUserAvatarSeed(user) {
  return user?.telegramId
    || user?.telegram_id
    || user?.username
    || user?.name
    || user?.id
    || 'user';
}
