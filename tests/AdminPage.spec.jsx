// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const adminLoginMock = vi.fn();
const verifyAdminMock = vi.fn();
const getAdminStatsMock = vi.fn();
const getAdminAnalyticsOverviewMock = vi.fn();
const getKeysMock = vi.fn();
const generateKeyMock = vi.fn();
const adminLogoutMock = vi.fn();
const deleteKeyMock = vi.fn();
const expireKeyMock = vi.fn();
const extendKeyMock = vi.fn();
const getAdminBannersMock = vi.fn();
const getAdminPopupsMock = vi.fn();
const getAdminUsersMock = vi.fn();

vi.mock('../src/utils/api.js', () => ({
  api: {
    adminLogin: (...args) => adminLoginMock(...args),
    verifyAdmin: (...args) => verifyAdminMock(...args),
    getAdminStats: (...args) => getAdminStatsMock(...args),
    getAdminAnalyticsOverview: (...args) => getAdminAnalyticsOverviewMock(...args),
    getKeys: (...args) => getKeysMock(...args),
    generateKey: (...args) => generateKeyMock(...args),
    adminLogout: (...args) => adminLogoutMock(...args),
    deleteKey: (...args) => deleteKeyMock(...args),
    expireKey: (...args) => expireKeyMock(...args),
    extendKey: (...args) => extendKeyMock(...args),
    getAdminBanners: (...args) => getAdminBannersMock(...args),
    getAdminPopups: (...args) => getAdminPopupsMock(...args),
    getAdminUsers: (...args) => getAdminUsersMock(...args),
  },
  storage: {
    ADMIN_TOKEN_KEY: 'hyt_admin_token',
  },
}));

import AdminPage from '../src/components/AdminPage.jsx';

describe('AdminPage', () => {
  beforeEach(() => {
    adminLoginMock.mockReset();
    verifyAdminMock.mockReset();
    getAdminStatsMock.mockReset();
    getAdminAnalyticsOverviewMock.mockReset();
    getKeysMock.mockReset();
    generateKeyMock.mockReset();
    adminLogoutMock.mockReset();
    deleteKeyMock.mockReset();
    expireKeyMock.mockReset();
    extendKeyMock.mockReset();
    getAdminBannersMock.mockReset();
    getAdminPopupsMock.mockReset();
    getAdminUsersMock.mockReset();
    localStorage.clear();

    verifyAdminMock.mockRejectedValue(new Error('no session'));
    getAdminStatsMock.mockResolvedValue({
      totalKeys: 3,
      activeKeys: 1,
      unusedKeys: 2,
      expiredKeys: 0,
      totalUsers: 2,
      activeToday: 1,
    });
    getAdminAnalyticsOverviewMock.mockResolvedValue({
      today: {
        dau: 1,
        opens: 2,
        newTrials: 1,
        paidActivations: 1,
        dialogueStarts: 1,
        interpreterStarts: 0,
        bannerClicks: 0,
        popupClicks: 0,
      },
      last7Days: [],
    });
    getKeysMock.mockResolvedValue({ keys: [] });
    generateKeyMock.mockResolvedValue({ count: 1, keys: [{ keyCode: 'HYT-2026-TEST-0001' }] });
    adminLogoutMock.mockResolvedValue({ success: true });
    deleteKeyMock.mockResolvedValue({ success: true });
    expireKeyMock.mockResolvedValue({ success: true });
    getAdminBannersMock.mockResolvedValue({ banners: [] });
    getAdminPopupsMock.mockResolvedValue({ popups: [] });
    getAdminUsersMock.mockResolvedValue({ users: [] });
  });

  it('restores an existing admin session on refresh', async () => {
    localStorage.setItem('hyt_admin_token', 'existing-admin-token');
    verifyAdminMock.mockResolvedValue({ authenticated: true });

    render(<AdminPage />);

    await waitFor(() => {
      expect(verifyAdminMock).toHaveBeenCalled();
      expect(getAdminStatsMock).toHaveBeenCalled();
      expect(screen.getByText('Bunson老师 Admin')).toBeInTheDocument();
    });
  });

  it('logs in and can generate a new key', async () => {
    adminLoginMock.mockResolvedValue({ token: 'fresh-admin-token' });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('管理员密码')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('管理员密码'), {
      target: { value: 'secret-admin' },
    });
    fireEvent.click(screen.getByText('进入后台'));

    await waitFor(() => {
      expect(adminLoginMock).toHaveBeenCalledWith('secret-admin');
      expect(localStorage.getItem('hyt_admin_token')).toBe('fresh-admin-token');
      expect(getAdminStatsMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('会员/密钥'));
    fireEvent.click(screen.getByRole('button', { name: '生成密钥' }));

    await waitFor(() => {
      expect(generateKeyMock).toHaveBeenCalledWith(1, { durationDays: 30 });
    });
  });
});
