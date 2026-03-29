import { getPrimaryExample } from './vocabulary.js';

const CHALLENGE_TYPES = [
  'meaning_to_word',
  'word_to_meaning',
  'example_to_word',
  'pinyin_to_word',
  'listen_to_meaning',
];

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function pickDistractors(pool, currentWord, accessor, count = 3) {
  const seen = new Set([accessor(currentWord)]);
  const candidates = shuffle(
    pool.filter((word) => word.id !== currentWord.id && accessor(word))
  );
  const picked = [];

  for (const word of candidates) {
    const value = accessor(word);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    picked.push(word);
    if (picked.length >= count) break;
  }

  return picked;
}

export function createQuestRounds(words, pool) {
  return words.map((word, index) => {
    const type = CHALLENGE_TYPES[index % CHALLENGE_TYPES.length];
    const primaryExample = getPrimaryExample(word);

    if (type === 'word_to_meaning' || type === 'listen_to_meaning') {
      const distractors = pickDistractors(pool, word, (item) => item.khmer);
      const options = shuffle([word, ...distractors]).map((option) => ({
        id: option.id,
        primary: option.khmer,
        secondary: option.chinese,
      }));
      return {
        id: `${word.id}-${type}`,
        word,
        type,
        promptLabel: type === 'listen_to_meaning' ? '听发音，选意思' : '看中文，选意思',
        promptValue: type === 'listen_to_meaning' ? '点击播放中文发音' : word.chinese,
        promptSubValue: type === 'listen_to_meaning' ? word.pinyin : word.pinyin,
        correctOptionId: word.id,
        options,
      };
    }

    const distractors = pickDistractors(pool, word, (item) => item.chinese);
    const options = shuffle([word, ...distractors]).map((option) => ({
      id: option.id,
      primary: option.chinese,
      secondary: option.pinyin,
    }));

    if (type === 'example_to_word') {
      return {
        id: `${word.id}-${type}`,
        word,
        type,
        promptLabel: '看例句，找重点词',
        promptValue: primaryExample?.chinese ?? word.example_cn ?? word.chinese,
        promptSubValue: primaryExample?.khmer ?? word.example_km ?? word.khmer,
        correctOptionId: word.id,
        options,
      };
    }

    return {
      id: `${word.id}-${type}`,
      word,
      type,
      promptLabel: type === 'pinyin_to_word' ? '看拼音，选单词' : '看高棉语，选中文',
      promptValue: type === 'pinyin_to_word' ? word.pinyin : word.khmer,
      promptSubValue: type === 'pinyin_to_word' ? word.khmer : word.pinyin,
      correctOptionId: word.id,
      options,
    };
  });
}
