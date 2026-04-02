export const languageOptions = [
  { id: 'zh-CN', label: '中文', englishLabel: 'Chinese', flag: '🇨🇳' },
  { id: 'en', label: 'English', englishLabel: 'English', flag: '🇺🇸' },
  { id: 'km', label: 'ខ្មែរ', englishLabel: 'Khmer', flag: '🇰🇭' },
];

export function getLanguageMeta(language) {
  return languageOptions.find((item) => item.id === language) || languageOptions[0];
}

export function getNextLanguage(language) {
  const index = languageOptions.findIndex((item) => item.id === language);
  return languageOptions[(index + 1 + languageOptions.length) % languageOptions.length].id;
}
