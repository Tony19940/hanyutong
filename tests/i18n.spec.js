import { describe, expect, it } from 'vitest';
import { createTranslation, getLanguageMeta, getNextLanguage } from '../src/i18n/index.js';

describe('i18n helpers', () => {
  it('translates keys and interpolates params', () => {
    const t = createTranslation('en');
    expect(t('profile.streakDays', { count: 5 })).toBe('5 day streak');
    expect(t('common.language')).toBe('Language');
  });

  it('falls back to Chinese for missing translations', () => {
    const t = createTranslation('km');
    expect(t('brand.appTitle')).toBe('Bunson老师');
    expect(t('missing.path')).toBe('missing.path');
  });

  it('returns language metadata and cycling order', () => {
    expect(getLanguageMeta('zh-CN').flag).toBe('🇨🇳');
    expect(getNextLanguage('zh-CN')).toBe('en');
    expect(getNextLanguage('en')).toBe('km');
    expect(getNextLanguage('km')).toBe('zh-CN');
  });
});
