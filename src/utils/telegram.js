// Telegram WebApp SDK helpers
export function getTelegramWebApp() {
  return window.Telegram?.WebApp || null;
}

function normalizeTelegramUser(rawUser) {
  if (!rawUser?.id) return null;
  return {
    id: String(rawUser.id),
    name: [rawUser.first_name, rawUser.last_name].filter(Boolean).join(' ') || rawUser.name || 'User',
    username: rawUser.username || '',
    avatarUrl: rawUser.photo_url || rawUser.photoUrl || null,
  };
}

function parseInitDataUser(initData) {
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const value = params.get('user');
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function getTelegramUser() {
  const wa = getTelegramWebApp();
  if (!wa) return null;

  const unsafeUser = wa.initDataUnsafe?.user || null;
  const parsedUser = parseInitDataUser(wa.initData);
  return normalizeTelegramUser({
    ...parsedUser,
    ...unsafeUser,
    photo_url: unsafeUser?.photo_url || parsedUser?.photo_url || parsedUser?.photoUrl || null,
  });
}

export function initTelegramApp() {
  const wa = getTelegramWebApp();
  if (wa) {
    wa.ready();
    wa.expand();
    wa.setHeaderColor('#07071a');
    wa.setBackgroundColor('#07071a');
  }
}

export function isTelegramEnvironment() {
  return !!window.Telegram?.WebApp?.initData;
}
