import { Buffer } from 'buffer';
import crypto from 'crypto';
import { config } from '../config.js';
import { resolveTeacherVoice } from './voiceInventoryService.js';

function buildPayload(text, options = {}) {
  const speedRatio = Number.isFinite(options.speedRatio) ? options.speedRatio : config.doubaoTtsSpeedRatio;
  const audio = {
    voice_type: resolveTeacherVoice(options.voiceType),
    encoding: config.doubaoTtsEncoding,
    compression_rate: 1,
    rate: config.doubaoTtsRate,
    speed_ratio: speedRatio,
    volume_ratio: config.doubaoTtsVolumeRatio,
    pitch_ratio: config.doubaoTtsPitchRatio,
    language: config.doubaoTtsLanguage,
  };

  if (config.doubaoTtsEmotion) {
    audio.emotion = config.doubaoTtsEmotion;
  }

  return {
    app: {
      appid: config.doubaoTtsAppId,
      token: 'placeholder',
      cluster: config.doubaoTtsCluster,
    },
    user: {
      uid: 'hanyutong-dialogue',
    },
    audio,
    request: {
      reqid: crypto.randomUUID(),
      text,
      text_type: 'plain',
      operation: 'query',
    },
  };
}

function inferMimeType() {
  if (config.doubaoTtsEncoding === 'mp3') return 'audio/mpeg';
  if (config.doubaoTtsEncoding === 'wav') return 'audio/wav';
  return 'application/octet-stream';
}

async function requestDialogueTts(text, options = {}) {
  const value = String(text || '').trim();
  if (!value) {
    return null;
  }

  const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer;${config.doubaoTtsToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildPayload(value, options)),
  });

  if (!response.ok) {
    throw new Error(`Doubao TTS failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  if (payload?.code !== 3000 || !payload?.data) {
    throw new Error(`Doubao TTS returned error: ${JSON.stringify(payload)}`);
  }

  return payload.data;
}

export async function synthesizeDialogueText(text, options = {}) {
  const base64 = await requestDialogueTts(text, options);
  if (!base64) {
    return null;
  }

  return {
    base64,
    mimeType: inferMimeType(),
  };
}

export async function synthesizeDialogueAudioBuffer(text, options = {}) {
  const base64 = await requestDialogueTts(text, options);
  if (!base64) {
    return null;
  }

  return {
    buffer: Buffer.from(base64, 'base64'),
    mimeType: inferMimeType(),
  };
}
