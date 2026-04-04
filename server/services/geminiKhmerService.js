import { Buffer } from 'buffer';
import WebSocket from 'ws';
import { config } from '../config.js';

const DEFAULT_SYSTEM_INSTRUCTION = [
  'You are Bunson老师, a warm Khmer-speaking Chinese teacher.',
  'Respond in Khmer only.',
  'Keep the wording short, supportive, and suitable for absolute beginners.',
  'Do not add Chinese, translations, markdown, or extra commentary.',
].join(' ');

function buildSetupPayload(systemInstruction) {
  return {
    setup: {
      model: `models/${config.geminiKhmerModel}`,
      generationConfig: {
        responseModalities: ['TEXT', 'AUDIO'],
        temperature: 0.4,
        maxOutputTokens: 180,
      },
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION }],
      },
    },
  };
}

function buildPromptPayload(text) {
  return {
    clientContent: {
      turns: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'Speak exactly the following Khmer text in a warm teacher tone.',
                'Do not translate it and do not add extra words.',
                text,
              ].join('\n'),
            },
          ],
        },
      ],
      turnComplete: true,
    },
  };
}

function wrapPcm16ToWav(buffer, sampleRate = 24000, channels = 1) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + buffer.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(buffer.length, 40);

  return Buffer.concat([header, buffer]);
}

function normalizeAudioResult(chunks, mimeType) {
  const joined = Buffer.concat(chunks);
  const normalizedMimeType = String(mimeType || '').toLowerCase();

  if (normalizedMimeType.includes('audio/pcm') || normalizedMimeType.includes('audio/l16')) {
    return {
      buffer: wrapPcm16ToWav(joined),
      mimeType: 'audio/wav',
    };
  }

  return {
    buffer: joined,
    mimeType: mimeType || 'audio/wav',
  };
}

export function isGeminiKhmerConfigured() {
  return Boolean(String(config.geminiApiKey || '').trim());
}

export async function synthesizeKhmerTeacherAudio(text, options = {}) {
  const value = String(text || '').trim();
  if (!value) {
    return null;
  }
  if (!isGeminiKhmerConfigured()) {
    throw new Error('Gemini Khmer configuration missing.');
  }

  return await new Promise((resolve, reject) => {
    const audioChunks = [];
    let audioMimeType = '';
    let transcript = '';
    let settled = false;
    const socket = new WebSocket(
      `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(config.geminiApiKey)}`,
      {
        headers: {
          'x-goog-api-key': config.geminiApiKey,
        },
      }
    );

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

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!audioChunks.length) {
        reject(new Error('Gemini Live returned no audio.'));
        return;
      }

      const normalized = normalizeAudioResult(audioChunks, audioMimeType);
      resolve({
        buffer: normalized.buffer,
        mimeType: normalized.mimeType,
        text: transcript.trim() || value,
      });
    };

    socket.once('open', () => {
      socket.send(JSON.stringify(buildSetupPayload(options.systemInstruction)));
    });

    socket.on('message', (payload) => {
      let data;
      try {
        data = JSON.parse(String(payload));
      } catch (error) {
        fail(error);
        return;
      }

      if (data.setupComplete) {
        socket.send(JSON.stringify(buildPromptPayload(value)));
        return;
      }

      if (data.error) {
        fail(new Error(data.error.message || 'Gemini Live returned an error.'));
        return;
      }

      const serverContent = data.serverContent;
      if (!serverContent) {
        return;
      }

      if (serverContent.outputTranscription?.text) {
        transcript += serverContent.outputTranscription.text;
      }

      const parts = serverContent.modelTurn?.parts || [];
      for (const part of parts) {
        if (typeof part?.text === 'string') {
          transcript += part.text;
        }
        if (part?.inlineData?.data) {
          audioMimeType = part.inlineData.mimeType || audioMimeType;
          audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
        }
      }

      if (serverContent.turnComplete) {
        finish();
      }
    });

    socket.once('error', fail);
    socket.once('close', () => {
      if (!settled) {
        fail(new Error('Gemini Live connection closed unexpectedly.'));
      }
    });
  });
}
