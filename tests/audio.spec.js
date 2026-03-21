// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLikelyMobileDevice, shouldAutoplayPronunciation } from '../src/utils/audio.js';

describe('audio environment helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('disables autoplay on mobile user agents', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });

    expect(isLikelyMobileDevice()).toBe(true);
    expect(shouldAutoplayPronunciation()).toBe(false);
  });

  it('allows autoplay on desktop user agents', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });

    expect(isLikelyMobileDevice()).toBe(false);
    expect(shouldAutoplayPronunciation()).toBe(true);
  });
});
