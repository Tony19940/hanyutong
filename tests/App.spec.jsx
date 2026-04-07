// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyMock = vi.fn();
const getUserSettingsMock = vi.fn();
const getAllWordsMock = vi.fn();
const getProgressQueueMock = vi.fn();
const getQuotaMock = vi.fn();
const trackEventMock = vi.fn();
const getCollectionMock = vi.fn();

vi.mock('../src/utils/api.js', () => ({
  api: {
    verify: (...args) => verifyMock(...args),
    getUserSettings: (...args) => getUserSettingsMock(...args),
    getAllWords: (...args) => getAllWordsMock(...args),
    getProgressQueue: (...args) => getProgressQueueMock(...args),
    getQuota: (...args) => getQuotaMock(...args),
    getCollection: (...args) => getCollectionMock(...args),
    trackEvent: (...args) => trackEventMock(...args),
    recordTime: vi.fn(() => Promise.resolve()),
    logout: vi.fn(() => Promise.resolve()),
    updateUserSettings: vi.fn(() => Promise.resolve({ settings: {}, voiceSettings: { availableVoices: [], defaultVoiceType: '' } })),
  },
  storage: {
    USER_TOKEN_KEY: 'hyt_token',
    USER_STORAGE_KEY: 'hyt_user',
  },
}));

vi.mock('../src/utils/telegram.js', () => ({
  getTelegramUser: () => null,
  getTelegramWebApp: () => null,
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
    getProgressQueueMock.mockReset();
    getQuotaMock.mockReset();
    getCollectionMock.mockReset();
    trackEventMock.mockReset();
    getUserSettingsMock.mockResolvedValue({ settings: {}, voiceSettings: { availableVoices: [], defaultVoiceType: '' } });
    getAllWordsMock.mockResolvedValue([]);
    getProgressQueueMock.mockResolvedValue({
      reviewWords: [],
      newWords: [],
      goalSummary: { target: 8, studiedWords: 0, learnedWords: 0, reviewWords: 0, completed: false },
      summary: { dueCount: 0, newCount: 0 },
    });
    getQuotaMock.mockResolvedValue({
      date: '2026-04-07',
      quiz: { limit: 2, used: 0, remaining: 2 },
      dialogue: { limit: 1, used: 0, remaining: 1 },
    });
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
      freeQuota: {
        date: '2026-04-07',
        quiz: { limit: 2, used: 2, remaining: 0 },
        dialogue: { limit: 1, used: 1, remaining: 0 },
      },
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
