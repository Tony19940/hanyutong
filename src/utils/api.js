const API_BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('hyt_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (keyCode, telegramId, name, avatarUrl) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ keyCode, telegramId, name, avatarUrl }),
    }),

  verify: (token) =>
    request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  // Words
  getNextWords: (userId, batch = 20) =>
    request(`/words/next?userId=${userId}&batch=${batch}`),

  recordAction: (userId, wordId, action) =>
    request('/words/action', {
      method: 'POST',
      body: JSON.stringify({ userId, wordId, action }),
    }),

  getAllWords: () => request('/words/all'),

  // User
  getProfile: (userId) => request(`/user/profile?userId=${userId}`),
  getCollection: (userId) => request(`/user/collection?userId=${userId}`),
  recordTime: (userId, seconds) =>
    request('/user/time', {
      method: 'POST',
      body: JSON.stringify({ userId, seconds }),
    }),

  // Admin
  generateKey: (count = 1, adminPassword) =>
    request('/admin/generate-key', {
      method: 'POST',
      body: JSON.stringify({ count }),
      headers: { 'x-admin-password': adminPassword },
    }),

  getKeys: (adminPassword, status, page = 1) =>
    request(`/admin/keys?page=${page}${status ? `&status=${status}` : ''}`, {
      headers: { 'x-admin-password': adminPassword },
    }),

  getAdminStats: (adminPassword) =>
    request('/admin/stats', {
      headers: { 'x-admin-password': adminPassword },
    }),

  deleteKey: (id, adminPassword) =>
    request(`/admin/keys/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword },
    }),
};
