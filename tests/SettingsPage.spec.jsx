// @vitest-environment jsdom
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithShell } from './renderWithShell.jsx';
import ProfileSettingsPage from '../src/components/ProfileSettingsPage.jsx';

describe('ProfileSettingsPage', () => {
  it('renders language, theme, and voice controls in the secondary settings page', () => {
    const setLanguage = vi.fn();
    const setTheme = vi.fn();
    const setVoiceType = vi.fn();

    renderWithShell(
      <ProfileSettingsPage onBack={() => {}} />,
      {
        language: 'zh-CN',
        theme: 'dark',
        voiceType: 'BV705_streaming',
        availableVoices: [
          { id: 'BV705_streaming', label: '男声老师' },
          { id: 'BV001_streaming', label: '女声老师' },
        ],
        defaultVoiceType: 'BV705_streaming',
        setLanguage,
        setTheme,
        setVoiceType,
      }
    );

    expect(screen.getByText('界面语言')).toBeInTheDocument();
    expect(screen.getByText('外观模式')).toBeInTheDocument();
    expect(screen.getByText('老师音色')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /english/i }));
    fireEvent.click(screen.getByRole('button', { name: /白天模式/i }));
    fireEvent.click(screen.getByRole('button', { name: /女声老师/i }));

    expect(setLanguage).toHaveBeenCalledWith('en');
    expect(setTheme).toHaveBeenCalledWith('light');
    expect(setVoiceType).toHaveBeenCalledWith('BV001_streaming');
  });
});
