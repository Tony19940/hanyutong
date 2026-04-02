export const storageKeys = {
  language: 'hyt_language',
  theme: 'hyt_theme',
  voiceType: 'hyt_voice',
};

export const defaultPreferences = {
  language: 'zh-CN',
  theme: 'dark',
  voiceType: '',
};

export function normalizeLanguage(value) {
  return ['zh-CN', 'en', 'km'].includes(value) ? value : defaultPreferences.language;
}

export function normalizeTheme(value) {
  return ['dark', 'light'].includes(value) ? value : defaultPreferences.theme;
}

export function normalizePreferences(input = {}) {
  return {
    language: normalizeLanguage(input.language),
    theme: normalizeTheme(input.theme),
    voiceType: typeof input.voiceType === 'string' ? input.voiceType : defaultPreferences.voiceType,
  };
}

