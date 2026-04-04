// @vitest-environment jsdom
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithShell } from './renderWithShell.jsx';

const getDialogueScenariosMock = vi.fn();
const stopMock = vi.fn();
const playStub = vi.fn(() => Promise.resolve());
const pronunciationMock = {
  play: (...args) => playStub(...args),
  stop: (...args) => stopMock(...args),
};

vi.mock('../src/utils/api.js', () => ({
  api: {
    getDialogueScenarios: (...args) => getDialogueScenariosMock(...args),
  },
}));

vi.mock('../src/hooks/usePronunciation.js', () => ({
  usePronunciation: () => pronunciationMock,
}));

import AIPracticePage from '../src/components/AIPracticePage.jsx';

describe('AIPracticePage', () => {
  beforeEach(() => {
    getDialogueScenariosMock.mockReset();
    stopMock.mockReset();
    playStub.mockClear();
    getDialogueScenariosMock.mockResolvedValue({
      available: true,
      missing: [],
      scenarios: [{ id: 'greeting', title: '见面寒暄', subtitle: '先问好，再介绍自己。', dailyTopic: '今日推荐 · 见面寒暄' }],
      dailyScenarios: [{ id: 'greeting', title: '见面寒暄', subtitle: '先问好，再介绍自己。', dailyTopic: '今日推荐 · 见面寒暄' }],
    });
  });

  it('renders the daily topic selector before a session starts', async () => {
    renderWithShell(
      <AIPracticePage user={{ name: 'Alice', username: 'alice' }} />,
      {
        language: 'zh-CN',
        theme: 'dark',
        voiceType: 'BV705_streaming',
      }
    );

    await waitFor(() => {
      expect(screen.getByText('今日话题')).toBeInTheDocument();
    });

    expect(screen.getByText('见面寒暄')).toBeInTheDocument();
    expect(screen.getByText('先问好，再介绍自己。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /开始练习/i })).toBeInTheDocument();
  });
});
