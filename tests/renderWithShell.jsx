import React from 'react';
import { render } from '@testing-library/react';
import { AppShellProvider } from '../src/i18n/index.js';
import { defaultPreferences } from '../src/preferences/defaults.js';

export function createShellValue(overrides = {}) {
  return {
    ...defaultPreferences,
    setLanguage: () => Promise.resolve(),
    cycleLanguage: () => Promise.resolve(),
    setTheme: () => Promise.resolve(),
    setVoiceType: () => Promise.resolve(),
    availableVoices: [],
    defaultVoiceType: '',
    ...overrides,
  };
}

export function renderWithShell(ui, overrides = {}) {
  const shellValue = createShellValue(overrides);
  return {
    ...render(<AppShellProvider value={shellValue}>{ui}</AppShellProvider>),
    shellValue,
  };
}
