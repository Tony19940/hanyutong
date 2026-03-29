import { describe, expect, it } from 'vitest';
import { getPrimaryExample, getWordExamples } from '../src/utils/vocabulary.js';

describe('vocabulary helpers', () => {
  it('normalizes the new examples array shape', () => {
    const examples = getWordExamples({
      id: 12,
      examples: [
        { chinese: '你好。', pinyin: 'Nǐ hǎo.', khmer: 'សួស្តី។', audio: '/audio/examples/0012-1.mp3' },
        { chinese: '你好吗？', pinyin: 'Nǐ hǎo ma?', khmer: 'អ្នកសុខសប្បាយទេ?', audio: '/audio/examples/0012-2.mp3' },
      ],
    });

    expect(examples).toHaveLength(2);
    expect(examples[0].audio).toBe('/audio/examples/0012-1.mp3');
  });

  it('falls back to the legacy single-example fields', () => {
    const primary = getPrimaryExample({
      id: 1,
      example_cn: '我是学生。',
      example_pinyin: 'Wǒ shì xuésheng.',
      example_km: 'ខ្ញុំជាសិស្ស។',
      audio_example: '/audio/examples/0001.mp3',
    });

    expect(primary).toEqual({
      id: '1-0',
      chinese: '我是学生。',
      pinyin: 'Wǒ shì xuésheng.',
      khmer: 'ខ្ញុំជាសិស្ស។',
      audio: '/audio/examples/0001.mp3',
    });
  });
});
