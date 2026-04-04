import WebSocket, { WebSocketServer } from 'ws';
import { config } from '../config.js';
import { getMembershipAccess } from './membershipService.js';
import { getUserSession } from './sessionService.js';
import { trackAppEvent } from './analyticsService.js';

const INTERPRETER_PROMPT = [
  'You are a simultaneous interpreter between Simplified Chinese and Khmer.',
  'Your only job is translation.',
  'If the speaker uses Simplified Chinese, translate naturally into Khmer and speak only Khmer.',
  'If the speaker uses Khmer, translate naturally into Simplified Chinese and speak only Simplified Chinese.',
  'Never answer questions.',
  'Never chat.',
  'Never explain.',
  'Never add commentary, labels, markdown, romanization, or the source text.',
  'Output only the translated target-language sentence that should be spoken aloud.',
].join(' ');

function writeUpgradeError(socket, statusCode, message) {
  socket.write(`HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function buildSetupPayload() {
  const voiceName = String(config.geminiKhmerVoiceName || '').trim();
  return {
    setup: {
      model: `models/${config.geminiKhmerModel}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        temperature: 0.2,
        maxOutputTokens: 256,
        ...(voiceName
          ? {
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName,
                  },
                },
              },
            }
          : {}),
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: {
        role: 'system',
        parts: [{ text: INTERPRETER_PROMPT }],
      },
    },
  };
}

function createUpstreamSocket() {
  return new WebSocket(
    `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(config.geminiApiKey)}`,
    {
      headers: {
        'x-goog-api-key': config.geminiApiKey,
      },
    }
  );
}

function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

async function authenticateUpgrade(request) {
  const url = new URL(request.url, 'http://localhost');
  const token = String(url.searchParams.get('token') || '').trim();
  if (!token) return { error: [401, 'Unauthorized'] };

  const session = await getUserSession(token);
  if (!session?.user?.id) return { error: [401, 'Unauthorized'] };

  const membership = await getMembershipAccess(session.user.id);
  if (membership.accessLevel !== 'premium') {
    return { error: [403, 'Forbidden'] };
  }

  return {
    auth: {
      userId: session.user.id,
    },
  };
}

function handleClientMessages(clientSocket, upstreamSocket) {
  clientSocket.on('message', (payload) => {
    let data;
    try {
      data = JSON.parse(String(payload));
    } catch {
      sendJson(clientSocket, { type: 'error', message: 'Invalid client payload' });
      return;
    }

    if (upstreamSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (data.type === 'audio_chunk' && data.data) {
      upstreamSocket.send(
        JSON.stringify({
          realtimeInput: {
            audio: {
              data: data.data,
              mimeType: data.mimeType || 'audio/pcm;rate=16000',
            },
          },
        })
      );
      return;
    }

    if (data.type === 'end_turn') {
      upstreamSocket.send(
        JSON.stringify({
          realtimeInput: {
            activityEnd: {},
          },
        })
      );
    }
  });
}

function handleUpstreamMessages(clientSocket, upstreamSocket, auth) {
  upstreamSocket.on('open', () => {
    upstreamSocket.send(JSON.stringify(buildSetupPayload()));
  });

  upstreamSocket.on('message', async (payload) => {
    let data;
    try {
      data = JSON.parse(String(payload));
    } catch {
      sendJson(clientSocket, { type: 'error', message: 'Interpreter returned invalid payload' });
      return;
    }

    if (data.setupComplete) {
      await trackAppEvent({
        userId: auth.userId,
        eventName: 'interpreter_start',
      });
      sendJson(clientSocket, { type: 'ready' });
      return;
    }

    if (data.error) {
      sendJson(clientSocket, {
        type: 'error',
        message: data.error.message || 'Interpreter request failed',
      });
      return;
    }

    const serverContent = data.serverContent;
    if (!serverContent) {
      return;
    }

    if (serverContent.inputTranscription?.text) {
      sendJson(clientSocket, {
        type: 'input_transcript',
        text: serverContent.inputTranscription.text,
      });
    }

    if (serverContent.outputTranscription?.text) {
      sendJson(clientSocket, {
        type: 'output_transcript',
        text: serverContent.outputTranscription.text,
      });
    }

    const parts = serverContent.modelTurn?.parts || [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        sendJson(clientSocket, {
          type: 'audio',
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
        });
      }
    }

    if (serverContent.turnComplete) {
      sendJson(clientSocket, { type: 'turn_complete' });
    }
  });

  upstreamSocket.on('close', () => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close();
    }
  });

  upstreamSocket.on('error', (error) => {
    sendJson(clientSocket, {
      type: 'error',
      message: error.message || 'Interpreter connection failed',
    });
  });
}

export function attachInterpreterGateway(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    if (!request.url?.startsWith('/api/interpreter/live')) {
      return;
    }

    if (!config.geminiApiKey) {
      writeUpgradeError(socket, 503, 'Service Unavailable');
      return;
    }

    const authResult = await authenticateUpgrade(request);
    if (authResult.error) {
      writeUpgradeError(socket, authResult.error[0], authResult.error[1]);
      return;
    }

    wss.handleUpgrade(request, socket, head, (clientSocket) => {
      const upstreamSocket = createUpstreamSocket();
      handleClientMessages(clientSocket, upstreamSocket);
      handleUpstreamMessages(clientSocket, upstreamSocket, authResult.auth);

      clientSocket.on('close', () => {
        try {
          upstreamSocket.close();
        } catch {}
      });
    });
  });
}
