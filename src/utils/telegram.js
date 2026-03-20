// Telegram WebApp SDK helpers
export function getTelegramWebApp() {
  return window.Telegram?.WebApp || null;
}

export function getTelegramUser() {
  const wa = getTelegramWebApp();
  if (!wa || !wa.initDataUnsafe?.user) return null;
  const u = wa.initDataUnsafe.user;
  return {
    id: String(u.id),
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || 'User',
    username: u.username || '',
    avatarUrl: u.photo_url || null,
  };
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
