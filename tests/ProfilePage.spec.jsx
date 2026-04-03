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
        voiceType: 'BV705_streaming',
        fallbackAvatarId: null,
      },
      voiceSettings: {
        defaultVoiceType: 'BV705_streaming',
        availableVoices: [
          { id: 'BV705_streaming', label: '男声老师' },
          { id: 'BV001_streaming', label: '女声老师' },
        ],
      },
      invite: {
        stats: {
          invitedCount: 2,
          convertedCount: 1,
          rewardDaysEarned: 7,
        },
      },
    });
  });

  it('renders grouped account info and opens settings from the Me page', async () => {
    const onOpenSettings = vi.fn();
    renderWithShell(
      <ProfilePage user={{ name: 'Alice', username: 'alice' }} onOpenCollection={() => {}} onOpenSettings={onOpenSettings} />,
      {
        language: 'zh-CN',
        theme: 'dark',
        voiceType: 'BV705_streaming',
        availableVoices: [
          { id: 'BV705_streaming', label: '男声老师' },
          { id: 'BV001_streaming', label: '女声老师' },
        ],
        defaultVoiceType: 'BV705_streaming',
      }
    );

    await waitFor(() => {
      expect(screen.getByText('账户状态')).toBeInTheDocument();
    });

    expect(screen.getByText('已学词数')).toBeInTheDocument();
    expect(screen.getByText('学习时长')).toBeInTheDocument();
    expect(screen.getByText('掌握度')).toBeInTheDocument();
    expect(screen.getByText(/连续学习 3 天/)).toBeInTheDocument();
    expect(screen.getByText('管理语言、音色和深浅色模式')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /设置/i }));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('uses the built-in fallback avatar pack when telegram avatar is unavailable', async () => {
    renderWithShell(
      <ProfilePage user={{ name: 'Alice', username: 'alice' }} onOpenCollection={() => {}} onOpenSettings={() => {}} />
    );

    const image = await screen.findByAltText('Alice');
    expect(image.getAttribute('src')).toContain('/avatars/avatar-');
  });
});
