// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithShell } from './renderWithShell.jsx';

const loginMock = vi.fn();
const startTrialMock = vi.fn();
const getTelegramUserMock = vi.fn();

vi.mock('../src/utils/api.js', () => ({
  api: {
    startTrial: (...args) => startTrialMock(...args),
    login: (...args) => loginMock(...args),
  },
  storage: {
    USER_TOKEN_KEY: 'hyt_token',
    USER_STORAGE_KEY: 'hyt_user',
  },
}));

vi.mock('../src/utils/telegram.js', () => ({
  getTelegramUser: () => getTelegramUserMock(),
}));

import LoginPage from '../src/components/LoginPage.jsx';

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    startTrialMock.mockReset();
    getTelegramUserMock.mockReset();
    localStorage.clear();
  });

  it('stores the session and calls onAuthenticated after a successful activation-code login', async () => {
    const onAuthenticated = vi.fn();
    getTelegramUserMock.mockReturnValue({
      id: 'tg-user-1',
      name: 'Alice',
      avatarUrl: 'https://example.com/avatar.png',
    });
    loginMock.mockResolvedValue({
      token: 'user-session-token',
      user: { id: 1, name: 'Alice' },
    });

    renderWithShell(<LoginPage onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByPlaceholderText('HYT-XXXX-XXXX-XXXX'), {
      target: { value: 'HYT2026AAAA0001' },
    });
    fireEvent.click(screen.getByRole('button', { name: /redeem activation code|输入激活码继续|បញ្ចូលលេខកូដដើម្បីបន្ត/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(
        'HYT-2026-AAAA-0001',
        'tg-user-1',
        'Alice',
        'https://example.com/avatar.png',
        null
      );
      expect(onAuthenticated).toHaveBeenCalledWith({
        token: 'user-session-token',
        user: { id: 1, name: 'Alice' },
      });
    });

    expect(localStorage.getItem('hyt_token')).toBe('user-session-token');
    expect(localStorage.getItem('hyt_user')).toBe(JSON.stringify({ id: 1, name: 'Alice' }));
  });
});
