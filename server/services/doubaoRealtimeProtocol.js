import zlib from 'zlib';

const PROTOCOL_VERSION = 0x1;
const HEADER_SIZE = 0x1;

export const MessageType = {
  FULL_CLIENT_REQUEST: 0x1,
  AUDIO_ONLY_REQUEST: 0x2,
  FULL_SERVER_RESPONSE: 0x9,
  AUDIO_ONLY_RESPONSE: 0xb,
  ERROR_INFORMATION: 0xf,
};

export const Serialization = {
  RAW: 0x0,
  JSON: 0x1,
};

export const Compression = {
  NONE: 0x0,
  GZIP: 0x1,
};

export const EventId = {
  START_CONNECTION: 1,
  FINISH_CONNECTION: 2,
  START_SESSION: 100,
  FINISH_SESSION: 102,
  TASK_REQUEST: 200,
  UPDATE_CONFIG: 201,
  SAY_HELLO: 300,
  END_ASR: 400,
  CHAT_TTS_TEXT: 500,
  CHAT_TEXT_QUERY: 501,
  CHAT_RAG_TEXT: 502,
  CONVERSATION_CREATE: 510,
  CONVERSATION_UPDATE: 511,
  CONVERSATION_RETRIEVE: 512,
  CONVERSATION_TRUNCATE: 513,
  CONVERSATION_DELETE: 514,
  CLIENT_INTERRUPT: 515,
  CONNECTION_STARTED: 50,
  CONNECTION_FAILED: 51,
  CONNECTION_FINISHED: 52,
  SESSION_STARTED: 150,
  SESSION_FINISHED: 152,
  SESSION_FAILED: 153,
  USAGE_RESPONSE: 154,
  CONFIG_UPDATED: 251,
  TTS_SENTENCE_START: 350,
  TTS_SENTENCE_END: 351,
  TTS_RESPONSE: 352,
  TTS_ENDED: 359,
  ASR_INFO: 450,
  ASR_RESPONSE: 451,
  ASR_ENDED: 459,
  CHAT_RESPONSE: 550,
  CHAT_TEXT_QUERY_CONFIRMED: 553,
  CHAT_ENDED: 559,
  CONVERSATION_CREATED: 567,
  CONVERSATION_UPDATED: 568,
  CONVERSATION_RETRIEVED: 569,
  CONVERSATION_TRUNCATED: 570,
  CONVERSATION_DELETED: 571,
  DIALOG_COMMON_ERROR: 599,
};

function packUInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);
  return buffer;
}

function packString(value) {
  return Buffer.from(value ?? '', 'utf8');
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

function maybeInflate(buffer, compression) {
  if (compression === Compression.GZIP) {
    return zlib.gunzipSync(buffer);
  }
  return buffer;
}

export function buildEventFrame({
  event,
  payload = {},
  sessionId,
  connectId,
  messageType = MessageType.FULL_CLIENT_REQUEST,
  serialization = Serialization.JSON,
  compression = Compression.NONE,
}) {
  const payloadBuffer = serialization === Serialization.JSON
    ? Buffer.from(JSON.stringify(payload), 'utf8')
    : Buffer.from(payload);

  const parts = [
    Buffer.from([
      (PROTOCOL_VERSION << 4) | HEADER_SIZE,
      (messageType << 4) | 0x4,
      (serialization << 4) | compression,
      0x00,
    ]),
    packUInt32(event),
  ];

  if (connectId) {
    const connectBytes = packString(connectId);
    parts.push(packUInt32(connectBytes.length), connectBytes);
  }

  if (sessionId) {
    const sessionBytes = packString(sessionId);
    parts.push(packUInt32(sessionBytes.length), sessionBytes);
  }

  parts.push(packUInt32(payloadBuffer.length), payloadBuffer);
  return Buffer.concat(parts);
}

export function parseServerFrame(frame) {
  const header = frame.subarray(0, 4);
  const messageType = header[1] >> 4;
  const flags = header[1] & 0x0f;
  const serialization = header[2] >> 4;
  const compression = header[2] & 0x0f;
  let offset = 4;

  let code = null;
  if (messageType === MessageType.ERROR_INFORMATION) {
    code = readUInt32(frame, offset);
    offset += 4;
  }

  let sequence = null;
  if (flags === 0x1 || flags === 0x3) {
    sequence = readUInt32(frame, offset);
    offset += 4;
  } else if (flags === 0x2) {
    sequence = -1;
  }

  let event = null;
  if (flags === 0x4) {
    event = readUInt32(frame, offset);
    offset += 4;
  }

  let connectId = null;
  if (
    event === EventId.CONNECTION_STARTED ||
    event === EventId.CONNECTION_FAILED ||
    event === EventId.CONNECTION_FINISHED
  ) {
    const connectLength = readUInt32(frame, offset);
    offset += 4;
    if (connectLength > 0) {
      connectId = frame.subarray(offset, offset + connectLength).toString('utf8');
      offset += connectLength;
    }
  }

  let sessionId = null;
  if (
    event !== null &&
    ![EventId.CONNECTION_STARTED, EventId.CONNECTION_FAILED, EventId.CONNECTION_FINISHED].includes(event)
  ) {
    const sessionLength = readUInt32(frame, offset);
    offset += 4;
    if (sessionLength > 0) {
      sessionId = frame.subarray(offset, offset + sessionLength).toString('utf8');
      offset += sessionLength;
    }
  }

  const payloadLength = readUInt32(frame, offset);
  offset += 4;
  const payloadBytes = frame.subarray(offset, offset + payloadLength);
  const finalPayloadBytes = maybeInflate(payloadBytes, compression);

  let payload = finalPayloadBytes;
  if (serialization === Serialization.JSON) {
    payload = JSON.parse(finalPayloadBytes.toString('utf8') || '{}');
  }

  return {
    messageType,
    flags,
    serialization,
    compression,
    code,
    sequence,
    event,
    connectId,
    sessionId,
    payload,
  };
}
