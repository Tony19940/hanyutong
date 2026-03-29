import { resolveWordVisual } from './iconography.js';

export function getWordExamples(word) {
  if (!word) return [];

  if (Array.isArray(word.examples) && word.examples.length > 0) {
    return word.examples
      .filter(Boolean)
      .map((example, index) => ({
        id: example.id ?? `${word.id ?? 'word'}-${index}`,
        chinese: example.chinese ?? '',
        pinyin: example.pinyin ?? '',
        khmer: example.khmer ?? '',
        audio: example.audio ?? example.audio_example ?? null,
      }))
      .filter((example) => example.chinese);
  }

  const fallbackExamples = [
    {
      chinese: word.example_cn,
      pinyin: word.example_pinyin,
      khmer: word.example_km,
      audio: word.audio_example,
    },
    {
      chinese: word.example_cn_2,
      pinyin: word.example_pinyin_2,
      khmer: word.example_km_2,
      audio: word.audio_example_2,
    },
  ];

  return fallbackExamples
    .filter((example) => example.chinese)
    .map((example, index) => ({
      id: `${word.id ?? 'word'}-${index}`,
      ...example,
    }));
}

export function getPrimaryExample(word) {
  return getWordExamples(word)[0] ?? null;
}

export function getWordVisual(word) {
  return resolveWordVisual(word);
}
