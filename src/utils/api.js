const API_BASE = '/api';

const USER_TOKEN_KEY = 'hyt_token';
const USER_STORAGE_KEY = 'hyt_user';
const ADMIN_TOKEN_KEY = 'hyt_admin_token';

async function request(path, options = {}) {
  const {
    auth = 'user',
    headers: inputHeaders = {},
    body,
    ...rest
  } = options;

  let token = null;
  if (auth === 'user') {
    token = localStorage.getItem(USER_TOKEN_KEY);
  } else if (auth === 'admin') {
    token = localStorage.getItem(ADMIN_TOKEN_KEY);
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isJsonBody = body && !isFormData;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...inputHeaders,
    },
    ...(isJsonBody ? { body: JSON.stringify(body) } : {}),
    ...(isFormData ? { body } : {}),
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const error = new Error(data?.error || 'Request failed');
    error.status = res.status;
    error.code = data?.code;
    error.data = data;
    throw error;
  }

  return data;
}

export const storage = {
  USER_TOKEN_KEY,
  USER_STORAGE_KEY,
  ADMIN_TOKEN_KEY,
};

export const api = {
  startTrial: (telegramId, name, avatarUrl, inviteCode = null) =>
    request('/auth/start-trial', {
      method: 'POST',
      auth: 'none',
      body: { telegramId, name, avatarUrl, inviteCode },
    }),

  login: (keyCode, telegramId, name, avatarUrl, inviteCode = null) =>
    request('/auth/login', {
      method: 'POST',
      auth: 'none',
      body: { keyCode, telegramId, name, avatarUrl, inviteCode },
    }),

  passwordLogin: (username, password) =>
    request('/auth/password-login', {
      method: 'POST',
      auth: 'none',
      body: { username, password },
    }),

  redeemActivationCode: (keyCode) =>
    request('/auth/login', {
      method: 'POST',
      auth: 'user',
      body: { keyCode },
    }),

  verify: () =>
    request('/auth/verify', {
      method: 'POST',
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  getNextWords: (batch = 20, mode = 'home') =>
    request(`/words/next?batch=${batch}&mode=${encodeURIComponent(mode)}`),

  recordAction: (wordId, action) =>
    request('/words/action', {
      method: 'POST',
      body: { wordId, action },
    }),

  getAllWords: () => request('/words/all'),
  getProgressQueue: (limit = 20) => request(`/progress/queue?limit=${limit}`),
  reviewWord: (wordId, quality) =>
    request('/progress/review', {
      method: 'POST',
      body: { wordId, quality },
    }),
  getCheckinSummary: (days = 21) => request(`/checkin/summary?days=${days}`),

  getProfile: () => request('/user/profile'),
  getUserSettings: () => request('/user/settings'),
  getInvite: () => request('/user/invite'),
  getInviteLeaderboard: () => request('/user/invite/leaderboard'),
  getQuota: () => request('/user/quota'),
  consumeQuota: (feature, amount = 1) =>
    request('/user/quota/consume', {
      method: 'POST',
      body: { feature, amount },
    }),
  getHomeSurfaces: () => request('/home/surfaces'),
  trackEvent: (eventName, metadata = null) =>
    request('/events/track', {
      method: 'POST',
      body: { eventName, metadata },
    }),
  updateUserSettings: (payload) =>
    request('/user/settings', {
      method: 'POST',
      body: payload,
    }),
  bindUserCredentials: (username, password) =>
    request('/user/account/bind-credentials', {
      method: 'POST',
      body: { username, password },
    }),
  getAvatarOptions: () => request('/user/avatar-options'),
  selectAvatar: (avatarId) =>
    request('/user/avatar/select', {
      method: 'POST',
      body: { avatarId },
    }),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return request('/user/avatar/upload', {
      method: 'POST',
      body: formData,
    });
  },
  synthesizePreviewAudio: (text, voiceType) =>
    request('/user/tts-preview', {
      method: 'POST',
      body: { text, voiceType },
    }),
  getCollection: () => request('/user/collection'),
  getDialogueScenarios: () => request('/dialogue/scenarios'),
  startDialogueSession: (scenarioId) =>
    request('/dialogue/session/start', {
      method: 'POST',
      body: { scenarioId },
    }),
  sendDialogueMessage: (sessionId, audio) => {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('audio', audio, 'dialogue-message.wav');
    return request('/dialogue/session/message', {
      method: 'POST',
      body: formData,
    });
  },
  stopDialogueSession: (payload = {}) =>
    request('/dialogue/session/stop', {
      method: 'POST',
      body: payload,
    }),
  recordTime: (minutes) =>
    request('/user/time', {
      method: 'POST',
      body: { minutes },
    }),

  adminLogin: (password) =>
    request('/admin/login', {
      method: 'POST',
      auth: 'none',
      body: { password },
    }),

  verifyAdmin: () => request('/admin/session', { auth: 'admin' }),
  adminLogout: () => request('/admin/logout', { method: 'POST', auth: 'admin' }),

  generateKey: (count = 1, options = {}) =>
    request('/admin/generate-key', {
      method: 'POST',
      auth: 'admin',
      body: { count, ...options },
    }),

  getKeys: (status, page = 1, limit = 50) =>
    request(`/admin/keys?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`, {
      auth: 'admin',
    }),

  getAdminStats: () =>
    request('/admin/stats', {
      auth: 'admin',
    }),
  getAdminBanners: () => request('/admin/banners', { auth: 'admin' }),
  saveAdminBanner: (payload) =>
    request('/admin/banners', {
      method: 'POST',
      auth: 'admin',
      body: payload,
    }),
  reorderAdminBanners: (items) =>
    request('/admin/banners/reorder', {
      method: 'POST',
      auth: 'admin',
      body: { items },
    }),
  getAdminPopups: () => request('/admin/popups', { auth: 'admin' }),
  saveAdminPopup: (payload) =>
    request('/admin/popups', {
      method: 'POST',
      auth: 'admin',
      body: payload,
    }),
  getAdminUsers: (search = '', page = 1, limit = 50) =>
    request(`/admin/users?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`, {
      auth: 'admin',
    }),
  updateAdminUserMembership: (userId, payload) =>
    request(`/admin/users/${userId}/membership`, {
      method: 'POST',
      auth: 'admin',
      body: payload,
    }),
  getAdminAnalyticsOverview: () => request('/admin/analytics/overview', { auth: 'admin' }),

  deleteKey: (id) =>
    request(`/admin/keys/${id}`, {
      method: 'DELETE',
      auth: 'admin',
    }),

  extendKey: (id, expiresAt) =>
    request(`/admin/keys/${id}/extend`, {
      method: 'POST',
      auth: 'admin',
      body: { expiresAt },
    }),

  expireKey: (id) =>
    request(`/admin/keys/${id}/expire`, {
      method: 'POST',
      auth: 'admin',
    }),
};
