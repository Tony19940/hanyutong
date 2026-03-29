import { describe, expect, it } from 'vitest';
import { createQuestRounds } from '../src/utils/quest.js';

const pool = [
  { id: 1, chinese: '你', pinyin: 'nǐ', khmer: 'អ្នក', example_cn: '你好。', example_km: 'សួស្តី។' },
  { id: 2, chinese: '我', pinyin: 'wǒ', khmer: 'ខ្ញុំ', example_cn: '我是学生。', example_km: 'ខ្ញុំជាសិស្ស។' },
  { id: 3, chinese: '好', pinyin: 'hǎo', khmer: 'ល្អ', example_cn: '很好。', example_km: 'ល្អណាស់។' },
  { id: 4, chinese: '是', pinyin: 'shì', khmer: 'ជា', example_cn: '他是老师。', example_km: 'គាត់ជាគ្រូ។' },
  { id: 5, chinese: '吃', pinyin: 'chī', khmer: 'ញ៉ាំ', example_cn: '你吃饭了吗？', example_km: 'អ្នកញ៉ាំបាយហើយឬនៅ?' },
  { id: 6, chinese: '喝', pinyin: 'hē', khmer: 'ផឹក', example_cn: '我喝茶。', example_km: 'ខ្ញុំផឹកតែ។' },
];

describe('quest builder', () => {
  it('creates five rounds with a correct option for each round', () => {
    const rounds = createQuestRounds(pool.slice(0, 5), pool);

    expect(rounds).toHaveLength(5);
    for (const round of rounds) {
      expect(round.options.length).toBeGreaterThanOrEqual(2);
      expect(round.options.some((option) => option.id === round.correctOptionId)).toBe(true);
    }
  });
});
