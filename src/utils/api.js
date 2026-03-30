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
  login: (keyCode, telegramId, name, avatarUrl) =>
    request('/auth/login', {
      method: 'POST',
      auth: 'none',
      body: { keyCode, telegramId, name, avatarUrl },
    }),

  verify: () =>
    request('/auth/verify', {
      method: 'POST',
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  getNextWords: (batch = 20) =>
    request(`/words/next?batch=${batch}`),

  recordAction: (wordId, action) =>
    request('/words/action', {
      method: 'POST',
      body: { wordId, action },
    }),

  getAllWords: () => request('/words/all'),

  getProfile: () => request('/user/profile'),
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

  generateKey: (count = 1) =>
    request('/admin/generate-key', {
      method: 'POST',
      auth: 'admin',
      body: { count },
    }),

  getKeys: (status, page = 1, limit = 50) =>
    request(`/admin/keys?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`, {
      auth: 'admin',
    }),

  getAdminStats: () =>
    request('/admin/stats', {
      auth: 'admin',
    }),

  deleteKey: (id) =>
    request(`/admin/keys/${id}`, {
      method: 'DELETE',
      auth: 'admin',
    }),

  expireKey: (id) =>
    request(`/admin/keys/${id}/expire`, {
      method: 'POST',
      auth: 'admin',
    }),
};
