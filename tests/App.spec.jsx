// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyMock = vi.fn();
const getUserSettingsMock = vi.fn();
const getAllWordsMock = vi.fn();
const trackEventMock = vi.fn();
const getCollectionMock = vi.fn();

vi.mock('../src/utils/api.js', () => ({
  api: {
    verify: (...args) => verifyMock(...args),
    getUserSettings: (...args) => getUserSettingsMock(...args),
    getAllWords: (...args) => getAllWordsMock(...args),
    getCollection: (...args) => getCollectionMock(...args),
    trackEvent: (...args) => trackEventMock(...args),
    recordTime: vi.fn(() => Promise.resolve()),
  },
  storage: {
    USER_TOKEN_KEY: 'hyt_token',
    USER_STORAGE_KEY: 'hyt_user',
  },
}));

vi.mock('../src/utils/telegram.js', () => ({
  getTelegramUser: () => null,
  initTelegramApp: vi.fn(),
}));

vi.mock('../src/components/LoginPage.jsx', () => ({
  default: function LoginPageStub() {
    return <div>login page</div>;
  },
}));

vi.mock('../src/components/HomePage.jsx', () => ({
  default: function HomePageStub() {
    return <div>home page</div>;
  },
}));

vi.mock('../src/components/ProfilePage.jsx', () => ({
  default: function ProfilePageStub() {
    return <div>profile page</div>;
  },
}));

vi.mock('../src/components/ProfileSettingsPage.jsx', () => ({
  default: function ProfileSettingsPageStub() {
    return <div>settings page</div>;
  },
}));

vi.mock('../src/components\CollectionPage.jsx', () => ({
  default: function CollectionPageStub() {
    return <div>collection page</div>;
  },
}));

vi.mock('../src/components/AIPracticePage.jsx', () => ({
  default: function AIPracticePageStub() {
    return <div>practice page</div>;
  },
}));

vi.mock('../src/components/QuizPage.jsx', () => ({
  default: function QuizPageStub() {
    return <div>quiz page</div>;
  },
}));

vi.mock('../src/components/MembershipGate.jsx', () => ({
  default: function MembershipGateStub() {
    return <div>membership gate</div>;
  },
}));

import App from '../src/App.jsx';

function freeMembership() {
  return {
    status: 'free',
    planType: 'free',
    accessLevel: 'free',
    expiresAt: null,
    startedAt: null,
    isPremium: false,
  };
}

describe('App shell', () => {
  beforeEach(() => {
    localStorage.clear();
    verifyMock.mockReset();
    getUserSettingsMock.mockReset();
    getAllWordsMock.mockReset();
    getCollectionMock.mockReset();
    trackEventMock.mockReset();
    getUserSettingsMock.mockResolvedValue({ settings: {}, voiceSettings: { availableVoices: [], defaultVoiceType: '' } });
    getAllWordsMock.mockResolvedValue([]);
    getCollectionMock.mockResolvedValue({ bookmarks: [] });
    trackEventMock.mockResolvedValue({});
    window.history.replaceState({}, '', '/');
  });

  it('renders the auth shell when there is no saved session', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('login page')).toBeInTheDocument();
    });

    expect(document.querySelector('.auth-shell')).toBeTruthy();
  });

  it('shows the membership gate when a free user opens a locked tab', async () => {
    localStorage.setItem('hyt_token', 'token-123');
    localStorage.setItem('hyt_user', JSON.stringify({ id: 1, name: 'Alice' }));
    verifyMock.mockResolvedValue({
      user: { id: 1, name: 'Alice' },
      membership: freeMembership(),
      invite: null,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('home page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('测验'));

    await waitFor(() => {
      expect(screen.getAllByText('membership gate').length).toBeGreaterThan(0);
    });
  });

  it('applies the stored theme to the document root', async () => {
    localStorage.setItem('hyt_theme', 'light');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('login page')).toBeInTheDocument();
    });

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
