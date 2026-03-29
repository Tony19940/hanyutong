import { describe, expect, it } from 'vitest';
import { ICON_SOURCE_VERSION, resolveWordVisual } from '../src/utils/iconography.js';

describe('iconography resolver', () => {
  it('maps food-related vocabulary to a semantic icon', () => {
    const visual = resolveWordVisual({
      chinese: '吃',
      khmer: 'ញ៉ាំ',
      example_cn: '你吃饭了吗？',
    });

    expect(visual.key).toBe('food');
    expect(visual.assetUrl).toContain('openmoji');
  });

  it('prefers existing visual metadata when the source version matches', () => {
    const visual = resolveWordVisual({
      chinese: '任意词',
      visual: {
        source: ICON_SOURCE_VERSION,
        symbol: '🧪',
        key: 'custom',
        accent: 'blue',
      },
    });

    expect(visual.symbol).toBe('🧪');
    expect(visual.key).toBe('custom');
    expect(visual.accent).toBe('blue');
  });

  it('avoids the old book fallback for general vocabulary', () => {
    const visual = resolveWordVisual({
      chinese: '但是',
      khmer: 'ប៉ុន្តែ',
    });

    expect(visual.key).not.toBe('fallback');
    expect(visual.symbol).not.toBe('📘');
  });

  it('uses exact visual overrides for high-frequency words', () => {
    const visual = resolveWordVisual({
      chinese: '谢谢',
    });

    expect(visual.key).toBe('gratitude');
    expect(visual.symbol).toBe('🙏');
  });
});
