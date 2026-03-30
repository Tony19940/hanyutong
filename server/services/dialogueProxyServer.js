import { WebSocketServer, WebSocket } from 'ws';
import { getUserSession } from './sessionService.js';
import { getDialogueSession, removeDialogueSession } from './dialogueSessionStore.js';
import { EventId, buildEventFrame, parseServerFrame, MessageType } from './doubaoRealtimeProtocol.js';

function eventName(event) {
  const mapping = {
    [EventId.CONNECTION_STARTED]: 'connection_started',
    [EventId.CONNECTION_FAILED]: 'connection_failed',
    [EventId.CONNECTION_FINISHED]: 'connection_finished',
    [EventId.SESSION_STARTED]: 'session_started',
    [EventId.SESSION_FINISHED]: 'session_finished',
    [EventId.SESSION_FAILED]: 'session_failed',
    [EventId.CONFIG_UPDATED]: 'config_updated',
    [EventId.TTS_SENTENCE_START]: 'tts_sentence_start',
    [EventId.TTS_SENTENCE_END]: 'tts_sentence_end',
    [EventId.TTS_RESPONSE]: 'tts_audio',
    [EventId.TTS_ENDED]: 'tts_ended',
    [EventId.ASR_INFO]: 'asr_info',
    [EventId.ASR_RESPONSE]: 'asr_response',
    [EventId.ASR_ENDED]: 'asr_ended',
    [EventId.CHAT_RESPONSE]: 'chat_response',
    [EventId.CHAT_TEXT_QUERY_CONFIRMED]: 'chat_text_query_confirmed',
    [EventId.CHAT_ENDED]: 'chat_ended',
    [EventId.DIALOG_COMMON_ERROR]: 'dialog_error',
  };
  return mapping[event] || `event_${event}`;
}

export function attachDialogueProxyServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname !== '/api/dialogue/ws') {
      return;
    }

    const token = url.searchParams.get('token');
    const session = token ? await getUserSession(token) : null;
    if (!session) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (client) => {
      client.userSession = session;
      wss.emit('connection', client, request);
    });
  });

  wss.on('connection', (client) => {
    let upstream = null;
    let active = null;

    function sendToClient(data) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    }

    async function closeUpstream() {
      if (!upstream) return;
      try {
        upstream.close();
      } catch {}
      upstream = null;
      active = null;
    }

    client.on('message', (raw) => {
      try {
        const message = JSON.parse(String(raw));

        if (message.type === 'start') {
          const session = getDialogueSession(message.sessionId);
          if (!session) {
            sendToClient({ type: 'proxy_error', error: 'Dialogue session not found' });
            return;
          }
          active = session;

          upstream = new WebSocket(session.doubao.wsUrl, {
            headers: {
              [session.doubao.headerNames.appId]: session.doubao.appId,
              [session.doubao.headerNames.accessToken]: session.doubao.accessToken,
              [session.doubao.headerNames.resourceId]: session.doubao.resourceId,
              [session.doubao.headerNames.appKey]: session.doubao.appKey,
              [session.doubao.headerNames.connectId]: session.doubao.connectId,
            },
          });

          upstream.on('open', () => {
            upstream.send(buildEventFrame({
              event: EventId.START_CONNECTION,
              payload: {},
              connectId: session.doubao.connectId,
            }));
            upstream.send(buildEventFrame({
              event: EventId.START_SESSION,
              payload: session.startSession,
              sessionId: session.sessionId,
            }));
            sendToClient({ type: 'proxy_ready' });
          });

          upstream.on('message', (packet) => {
            const parsed = parseServerFrame(Buffer.from(packet));
            if (parsed.event === EventId.TTS_RESPONSE && parsed.messageType === MessageType.AUDIO_ONLY_RESPONSE) {
              sendToClient({
                type: 'tts_audio',
                sessionId: parsed.sessionId,
                payload: Buffer.from(parsed.payload).toString('base64'),
              });
              return;
            }

            sendToClient({
              type: eventName(parsed.event),
              sessionId: parsed.sessionId,
              payload: parsed.payload,
              event: parsed.event,
              code: parsed.code,
            });
          });

          upstream.on('error', (error) => {
            sendToClient({ type: 'proxy_error', error: error.message });
          });

          upstream.on('close', () => {
            sendToClient({ type: 'proxy_closed' });
          });
          return;
        }

        if (!upstream || upstream.readyState !== WebSocket.OPEN || !active) {
          sendToClient({ type: 'proxy_error', error: 'Proxy is not connected' });
          return;
        }

        if (message.type === 'text_query') {
          upstream.send(buildEventFrame({
            event: EventId.CHAT_TEXT_QUERY,
            payload: { content: message.content || '' },
            sessionId: active.sessionId,
          }));
          return;
        }

        if (message.type === 'tts_text') {
          upstream.send(buildEventFrame({
            event: EventId.CHAT_TTS_TEXT,
            payload: {
              start: true,
              content: message.content || '',
              end: true,
            },
            sessionId: active.sessionId,
          }));
          return;
        }

        if (message.type === 'update_config') {
          upstream.send(buildEventFrame({
            event: EventId.UPDATE_CONFIG,
            payload: message.payload || {},
            sessionId: active.sessionId,
          }));
          return;
        }

        if (message.type === 'audio_chunk') {
          const audioBytes = Buffer.from(message.payload || '', 'base64');
          upstream.send(buildEventFrame({
            event: EventId.TASK_REQUEST,
            payload: audioBytes,
            sessionId: active.sessionId,
            messageType: MessageType.AUDIO_ONLY_REQUEST,
            serialization: 0,
          }));
          return;
        }

        if (message.type === 'end_asr') {
          upstream.send(buildEventFrame({
            event: EventId.END_ASR,
            payload: {},
            sessionId: active.sessionId,
          }));
          return;
        }

        if (message.type === 'interrupt') {
          upstream.send(buildEventFrame({
            event: EventId.CLIENT_INTERRUPT,
            payload: {},
            sessionId: active.sessionId,
          }));
          return;
        }

        if (message.type === 'say_hello') {
          upstream.send(buildEventFrame({
            event: EventId.SAY_HELLO,
            payload: { content: message.content || '' },
            sessionId: active.sessionId,
          }));
          return;
        }

        if (message.type === 'finish') {
          upstream.send(buildEventFrame({
            event: EventId.FINISH_SESSION,
            payload: {},
            sessionId: active.sessionId,
          }));
          upstream.send(buildEventFrame({
            event: EventId.FINISH_CONNECTION,
            payload: {},
            connectId: active.doubao.connectId,
          }));
          return;
        }
      } catch (error) {
        sendToClient({ type: 'proxy_error', error: error.message });
      }
    });

    client.on('close', () => {
      if (active?.sessionId) {
        removeDialogueSession(active.sessionId);
      }
      closeUpstream().catch(() => {});
    });
  });

  return wss;
}
