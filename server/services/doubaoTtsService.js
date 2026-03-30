import crypto from 'crypto';
import { config } from '../config.js';

function buildPayload(text) {
  const audio = {
    voice_type: config.doubaoTtsVoiceType,
    encoding: config.doubaoTtsEncoding,
    compression_rate: 1,
    rate: config.doubaoTtsRate,
    speed_ratio: config.doubaoTtsSpeedRatio,
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

export async function synthesizeDialogueText(text) {
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
    body: JSON.stringify(buildPayload(value)),
  });

  if (!response.ok) {
    throw new Error(`Doubao TTS failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  if (payload?.code !== 3000 || !payload?.data) {
    throw new Error(`Doubao TTS returned error: ${JSON.stringify(payload)}`);
  }

  return {
    base64: payload.data,
    mimeType: inferMimeType(),
  };
}
