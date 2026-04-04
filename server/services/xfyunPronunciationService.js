import crypto from 'crypto';
import { Buffer } from 'buffer';
import WebSocket from 'ws';
import { config } from '../config.js';

const FRAME_BYTES = 1280;
const MAX_RETRY_ATTEMPTS = 3;

function normalizeReferenceText(text) {
  return `\uFEFF${String(text || '').trim()}`;
}

function buildAuthorizationUrl(baseUrl) {
  const url = new URL(baseUrl);
  const host = url.host;
  const date = new Date().toUTCString();
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${url.pathname} HTTP/1.1`;
  const signature = crypto
    .createHmac('sha256', config.xfyunApiSecret)
    .update(signatureOrigin)
    .digest('base64');
  const authorizationOrigin = `api_key="${config.xfyunApiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString('base64');

  url.searchParams.set('authorization', authorization);
  url.searchParams.set('date', date);
  url.searchParams.set('host', host);
  return url.toString();
}

function chunkAudioBuffer(buffer, chunkBytes = FRAME_BYTES) {
  const chunks = [];
  for (let offset = 0; offset < buffer.length; offset += chunkBytes) {
    chunks.push(buffer.subarray(offset, Math.min(offset + chunkBytes, buffer.length)));
  }
  return chunks;
}

function encodeXmlSafe(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseScoreFromXml(xml, keys, fallback = null) {
  for (const key of keys) {
    const quoted = new RegExp(`${key}="([\\d.]+)"`, 'i').exec(xml);
    if (quoted) return Number.parseFloat(quoted[1]);
    const tagged = new RegExp(`<${key}>([\\d.]+)</${key}>`, 'i').exec(xml);
    if (tagged) return Number.parseFloat(tagged[1]);
  }
  return fallback;
}

function buildEvaluation(xml) {
  const overallScore = parseScoreFromXml(xml, ['total_score', 'standard_score', 'score'], 0);
  const fluencyScore = parseScoreFromXml(xml, ['fluency_score', 'fluency'], overallScore);
  const phonemeScore = parseScoreFromXml(xml, ['accuracy_score', 'phone_score', 'integrity_score'], overallScore);
  const toneScore = parseScoreFromXml(xml, ['tone_score', 'pitch_score'], phonemeScore);

  return {
    xml,
    overallScore: Number.isFinite(overallScore) ? overallScore : 0,
    toneScore: Number.isFinite(toneScore) ? toneScore : overallScore,
    phonemeScore: Number.isFinite(phonemeScore) ? phonemeScore : overallScore,
    fluencyScore: Number.isFinite(fluencyScore) ? fluencyScore : overallScore,
  };
}

export function isXfyunPronunciationConfigured() {
  return Boolean(
    String(config.xfyunAppId || '').trim()
    && String(config.xfyunApiKey || '').trim()
    && String(config.xfyunApiSecret || '').trim()
  );
}

export async function evaluatePronunciation(audioBuffer, referenceText, options = {}) {
  if (!audioBuffer?.length) {
    throw new Error('Audio buffer is required for pronunciation evaluation.');
  }
  const text = String(referenceText || '').trim();
  if (!text) {
    throw new Error('Reference text is required for pronunciation evaluation.');
  }
  if (!isXfyunPronunciationConfigured()) {
    throw new Error('XFYUN pronunciation configuration missing.');
  }

  const requestUrl = buildAuthorizationUrl(config.xfyunIseWsUrl);
  const audioFrames = chunkAudioBuffer(audioBuffer);
  const category = options.category || 'read_sentence';

  return await new Promise((resolve, reject) => {
    const socket = new WebSocket(requestUrl);
    let settled = false;
    let finalXml = '';

    const cleanup = () => {
      socket.removeAllListeners();
      try {
        socket.close();
      } catch {}
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const sendAudioFrames = () => {
      if (!audioFrames.length) {
        socket.send(JSON.stringify({
          business: {
            cmd: 'auw',
            aus: 4,
          },
          data: {
            status: 2,
            data: '',
          },
        }));
        return;
      }

      audioFrames.forEach((frame, index) => {
        const isFirst = index === 0;
        const isLast = index === audioFrames.length - 1;
        socket.send(JSON.stringify({
          business: {
            cmd: 'auw',
            aus: isLast ? 4 : isFirst ? 1 : 2,
          },
          data: {
            status: isLast ? 2 : 1,
            data: frame.toString('base64'),
          },
        }));
      });
    };

    socket.once('open', () => {
      socket.send(JSON.stringify({
        common: {
          app_id: config.xfyunAppId,
        },
        business: {
          sub: 'ise',
          ent: 'cn_vip',
          category,
          cmd: 'ssb',
          text: normalizeReferenceText(text),
          tte: 'utf-8',
          ttp_skip: true,
          aue: 'raw',
          auf: 'audio/L16;rate=16000',
          extra_ability: 'multi_dimension;pitch;syll_phone_err_msg',
        },
        data: {
          status: 0,
        },
      }));

      sendAudioFrames();
    });

    socket.on('message', (payload) => {
      let data;
      try {
        data = JSON.parse(String(payload));
      } catch (error) {
        fail(error);
        return;
      }

      if (Number(data.code || 0) !== 0) {
        fail(new Error(data.message || `XFYUN evaluation failed with code ${data.code}`));
        return;
      }

      if (data?.data?.data) {
        finalXml = Buffer.from(data.data.data, 'base64').toString('utf8');
      }

      if (Number(data?.data?.status) === 2) {
        if (!finalXml) {
          fail(new Error('XFYUN evaluation returned no result XML.'));
          return;
        }
        if (settled) return;
        settled = true;
        cleanup();
        resolve(buildEvaluation(finalXml));
      }
    });

    socket.once('error', fail);
    socket.once('close', () => {
      if (!settled) {
        fail(new Error('XFYUN evaluation connection closed unexpectedly.'));
      }
    });
  });
}

export function decidePronunciationOutcome(evaluation, attemptIndex = 1) {
  const overall = Number(evaluation?.overallScore || 0);
  const reviewQueued = attemptIndex >= MAX_RETRY_ATTEMPTS && overall < 75;

  if (overall >= 75) {
    return { decision: 'pass', reviewQueued: false };
  }

  if (overall >= 50) {
    return { decision: 'retry', reviewQueued: false };
  }

  return {
    decision: reviewQueued ? 'skip' : 'retry',
    reviewQueued,
  };
}

export function buildPronunciationFallback() {
  return {
    overallScore: null,
    toneScore: null,
    phonemeScore: null,
    fluencyScore: null,
    xml: '',
  };
}
