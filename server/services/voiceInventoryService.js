import { config } from '../config.js';

const CURATED_VOICES = [
  {
    id: 'BV001_streaming',
    label: '女声老师',
    description: '清晰自然，适合日常教学和口语练习。',
  },
  {
    id: 'BV705_streaming',
    label: '男声老师',
    description: '更稳重的老师声音。',
  },
];

function buildCuratedMap() {
  return new Map(CURATED_VOICES.map((voice) => [voice.id, voice]));
}

export function listAvailableTeacherVoices() {
  const curatedMap = buildCuratedMap();
  const configuredIds = config.doubaoTtsAllowedVoices.length > 0
    ? config.doubaoTtsAllowedVoices
    : CURATED_VOICES.map((voice) => voice.id);

  const voices = [];
  configuredIds.forEach((voiceId) => {
    const curated = curatedMap.get(voiceId);
    voices.push(
      curated || {
        id: voiceId,
        label: voiceId,
        description: '已配置可用音色。',
      }
    );
  });

  return voices;
}

export function resolveTeacherVoice(voiceType) {
  const availableVoices = listAvailableTeacherVoices();
  const requested = String(voiceType || '').trim();
  if (requested && availableVoices.some((voice) => voice.id === requested)) {
    return requested;
  }
  return config.doubaoTtsVoiceType;
}

export function getTeacherVoiceSettings() {
  return {
    defaultVoiceType: resolveTeacherVoice(config.doubaoTtsVoiceType),
    availableVoices: listAvailableTeacherVoices(),
  };
}
