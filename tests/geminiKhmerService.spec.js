import { Buffer } from 'buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const wsState = globalThis.__geminiWsState || (globalThis.__geminiWsState = {
  instances: [],
  payloads: [],
});

vi.mock('ws', async () => {
  const { EventEmitter } = await import('node:events');

  class MockWebSocket extends EventEmitter {
    constructor(url, options) {
      super();
      this.url = url;
      this.options = options;
      wsState.instances.push(this);
      queueMicrotask(() => this.emit('open'));
    }

    send(payload) {
      const parsed = JSON.parse(String(payload));
      wsState.payloads.push(parsed);

      if (parsed.setup) {
        queueMicrotask(() => this.emit('message', JSON.stringify({ setupComplete: {} })));
        return;
      }

      if (parsed.realtimeInput) {
        const audioChunk = Buffer.from([0, 1, 2, 3]).toString('base64');
        queueMicrotask(() => {
          this.emit(
            'message',
            JSON.stringify({
              serverContent: {
                outputTranscription: { text: parsed.realtimeInput.text },
                modelTurn: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'audio/pcm;rate=24000',
                        data: audioChunk,
                      },
                    },
                  ],
                },
              },
            })
          );
          this.emit('message', JSON.stringify({ serverContent: { turnComplete: true } }));
        });
      }
    }

    close() {}
  }

  return {
    default: MockWebSocket,
  };
});

describe('geminiKhmerService', () => {
  beforeEach(() => {
    wsState.instances.length = 0;
    wsState.payloads.length = 0;
    process.env.GEMINI_API_KEY = 'gemini-test-key';
    process.env.GEMINI_KHMER_MODEL = 'gemini-3.1-flash-live-preview';
    vi.resetModules();
  });

  it('uses AUDIO-only setup and realtime input for Khmer speech synthesis', async () => {
    const { synthesizeKhmerTeacherAudio } = await import('../server/services/geminiKhmerService.js');

    const result = await synthesizeKhmerTeacherAudio('សួស្តី');

    expect(result.mimeType).toBe('audio/wav');
    expect(result.text).toBe('សួស្តី');
    expect(result.buffer.subarray(0, 4).toString()).toBe('RIFF');
    expect(wsState.payloads).toHaveLength(2);
    expect(wsState.payloads[0].setup.generationConfig.responseModalities).toEqual(['AUDIO']);
    expect(wsState.payloads[0].setup.outputAudioTranscription).toEqual({});
    expect(wsState.payloads[1]).toEqual({
      realtimeInput: {
        text: 'សួស្តី',
      },
    });
  });
});
