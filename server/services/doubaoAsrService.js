import crypto from 'crypto';
import { config } from '../config.js';
import { forbidden, unauthorized } from '../errors.js';

function extractTranscript(payload) {
  const candidates = [
    payload?.result?.text,
    payload?.text,
    payload?.results?.[0]?.text,
    payload?.utterances?.map((item) => item?.text).filter(Boolean).join(' '),
  ].filter(Boolean);

  return String(candidates[0] || '').trim();
}

export async function transcribeDialogueAudio(audioBuffer, audioFormat = 'wav') {
  const payload = {
    app: {
      appid: config.doubaoAsrAppId,
      cluster: config.doubaoAsrResourceId,
      token: 'placeholder',
    },
    user: {
      uid: 'hanyutong-dialogue',
    },
    audio: {
      format: audioFormat,
      data: audioBuffer.toString('base64'),
    },
    request: {
      model_name: 'bigmodel',
      enable_itn: true,
      enable_punc: true,
      show_utterances: true,
    },
  };

  const response = await fetch('https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash', {
    method: 'POST',
    headers: {
      'X-Api-App-Key': config.doubaoAsrAppId,
      'X-Api-Access-Key': config.doubaoAsrAccessToken,
      'X-Api-Resource-Id': config.doubaoAsrResourceId,
      'X-Api-Request-Id': crypto.randomUUID(),
      'X-Api-Sequence': '-1',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw unauthorized('豆包 ASR 鉴权失败，请检查 ASR App ID 或 Access Token。', 'DOUBAO_ASR_AUTH_FAILED');
    }
    if (response.status === 403 && text.includes('requested resource not granted')) {
      throw forbidden(
        '当前豆包 ASR 应用还没有开通录音文件极速识别权限，请确认已开通 volc.bigasr.auc_turbo。',
        'DOUBAO_ASR_RESOURCE_NOT_GRANTED'
      );
    }
    throw new Error(`Doubao ASR failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  if (data?.code && data.code !== 1000 && data.code !== 0) {
    throw new Error(`Doubao ASR returned error: ${JSON.stringify(data)}`);
  }

  return {
    text: extractTranscript(data),
    raw: data,
  };
}
