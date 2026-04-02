// @vitest-environment jsdom
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithShell } from './renderWithShell.jsx';

const getProfileMock = vi.fn();
const logoutMock = vi.fn();

vi.mock('../src/utils/api.js', () => ({
  api: {
    getProfile: (...args) => getProfileMock(...args),
    logout: (...args) => logoutMock(...args),
  },
  storage: {
    USER_TOKEN_KEY: 'hyt_token',
    USER_STORAGE_KEY: 'hyt_user',
  },
}));

vi.mock('../src/components/ShareModal.jsx', () => ({
  default: function ShareModalStub() {
    return <div>share modal</div>;
  },
}));

import ProfilePage from '../src/components/ProfilePage.jsx';

describe('ProfilePage', () => {
  beforeEach(() => {
    getProfileMock.mockReset();
    logoutMock.mockReset();
    getProfileMock.mockResolvedValue({
      user: { hskLevel: 1, name: 'Alice' },
      stats: {
        wordsLearned: 12,
        totalHours: 2,
        mastery: 8,
        streak: 3,
        last7Days: Array.from({ length: 7 }, (_, index) => ({
          learned: index % 2,
          isToday: index === 6,
        })),
      },
      settings: {
        language: 'zh-CN',
        theme: 'dark',
        voiceType: 'BV001_streaming',
        fallbackAvatarId: null,
      },
      voiceSettings: {
        defaultVoiceType: 'BV001_streaming',
        availableVoices: [
          { id: 'BV001_streaming', label: '温柔女声' },
          { id: 'BV002_streaming', label: '活力女声' },
        ],
      },
    });
  });

  it('renders language, theme, and voice settings and triggers voice selection', async () => {
    const setVoiceType = vi.fn();
    renderWithShell(
      <ProfilePage user={{ name: 'Alice', username: 'alice' }} onOpenCollection={() => {}} />,
      {
        language: 'zh-CN',
        theme: 'dark',
        voiceType: 'BV001_streaming',
        availableVoices: [
          { id: 'BV001_streaming', label: '温柔女声' },
          { id: 'BV002_streaming', label: '活力女声' },
        ],
        defaultVoiceType: 'BV001_streaming',
        setVoiceType,
      }
    );

    await waitFor(() => {
      expect(screen.getByText('老师音色')).toBeInTheDocument();
    });

    expect(screen.getByText('温柔女声')).toBeInTheDocument();
    expect(screen.getByText('活力女声')).toBeInTheDocument();
    expect(screen.getByText('默认音色')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /活力女声/i }));
    expect(setVoiceType).toHaveBeenCalledWith('BV002_streaming');
  });

  it('uses the built-in fallback avatar pack when telegram avatar is unavailable', async () => {
    renderWithShell(
      <ProfilePage user={{ name: 'Alice', username: 'alice' }} onOpenCollection={() => {}} />
    );

    const image = await screen.findByAltText('Alice');
    expect(image.getAttribute('src')).toContain('/avatars/avatar-');
  });
});
