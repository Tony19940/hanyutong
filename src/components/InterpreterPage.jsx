import React, { useEffect, useRef, useState } from 'react';
import { storage } from '../utils/api.js';

function toBase64(uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < uint8Array.length; index += chunkSize) {
    const chunk = uint8Array.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}

function decodeBase64ToBytes(value) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function downsampleBuffer(float32Array, inputSampleRate, outputSampleRate) {
  if (inputSampleRate === outputSampleRate) return float32Array;
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(float32Array.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let index = offsetBuffer; index < nextOffsetBuffer && index < float32Array.length; index += 1) {
      accum += float32Array[index];
      count += 1;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let index = 0; index < float32Array.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, float32Array[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

function pcm16BytesToAudioBuffer(audioContext, bytes, sampleRate) {
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const audioBuffer = audioContext.createBuffer(1, samples.length, sampleRate);
  const channel = audioBuffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) {
    channel[index] = samples[index] / 0x8000;
  }
  return audioBuffer;
}

function createInterpreterSocket(token) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new WebSocket(`${protocol}//${window.location.host}/api/interpreter/live?token=${encodeURIComponent(token)}`);
}

export default function InterpreterPage({ onBack }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const socketRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const captureContextRef = useRef(null);
  const playbackContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const nextPlaybackTimeRef = useRef(0);

  const closeSocket = () => {
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {}
      socketRef.current = null;
    }
  };

  const stopCapture = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    if (captureContextRef.current) {
      captureContextRef.current.close().catch(() => {});
      captureContextRef.current = null;
    }
  };

  useEffect(() => () => {
    stopCapture();
    closeSocket();
    if (playbackContextRef.current) {
      playbackContextRef.current.close().catch(() => {});
    }
  }, []);

  const ensureSocket = async () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return socketRef.current;
    }

    const token = localStorage.getItem(storage.USER_TOKEN_KEY);
    if (!token) {
      throw new Error('Missing session token');
    }

    setStatus('connecting');
    setError('');

    const socket = createInterpreterSocket(token);
    socketRef.current = socket;

    return await new Promise((resolve, reject) => {
      let settled = false;

      socket.onopen = () => {};
      socket.onclose = () => {
        if (status !== 'idle') {
          setStatus('idle');
        }
        if (!settled) {
          settled = true;
          reject(new Error('Interpreter connection closed'));
        }
      };
      socket.onerror = () => {
        setError('实时同传连接失败');
        if (!settled) {
          settled = true;
          reject(new Error('Interpreter connection failed'));
        }
      };
      socket.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'ready') {
          settled = true;
          setStatus('ready');
          resolve(socket);
          return;
        }
        if (message.type === 'input_transcript') {
          setSourceText(message.text || '');
          return;
        }
        if (message.type === 'output_transcript') {
          setTranslatedText(message.text || '');
          return;
        }
        if (message.type === 'audio' && message.data) {
          if (!playbackContextRef.current) {
            playbackContextRef.current = new window.AudioContext();
          }
          const playbackContext = playbackContextRef.current;
          const bytes = decodeBase64ToBytes(message.data);
          const sampleRate = String(message.mimeType || '').includes('16000') ? 16000 : 24000;
          const audioBuffer = pcm16BytesToAudioBuffer(playbackContext, bytes, sampleRate);
          const source = playbackContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(playbackContext.destination);
          const startAt = Math.max(playbackContext.currentTime, nextPlaybackTimeRef.current || playbackContext.currentTime);
          source.start(startAt);
          nextPlaybackTimeRef.current = startAt + audioBuffer.duration;
          return;
        }
        if (message.type === 'turn_complete') {
          setStatus((current) => (current === 'capturing' ? current : 'ready'));
          return;
        }
        if (message.type === 'error') {
          setError(message.message || '同传暂时不可用');
          setStatus('idle');
          if (!settled) {
            settled = true;
            reject(new Error(message.message || 'Interpreter unavailable'));
          }
        }
      };
    });
  };

  const startCapture = async () => {
    try {
      const socket = await ensureSocket();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      const audioContext = new window.AudioContext();
      captureContextRef.current = audioContext;
      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(input, audioContext.sampleRate, 16000);
        const pcm = floatTo16BitPCM(downsampled);
        socket.send(JSON.stringify({
          type: 'audio_chunk',
          data: toBase64(pcm),
          mimeType: 'audio/pcm;rate=16000',
        }));
      };
      sourceNode.connect(processor);
      processor.connect(audioContext.destination);
      setStatus('capturing');
    } catch (captureError) {
      console.error(captureError);
      setError('无法开启麦克风或同传连接');
      setStatus('idle');
      stopCapture();
    }
  };

  const stopInterpreter = () => {
    stopCapture();
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'end_turn' }));
    }
    setStatus('ready');
  };

  const handleToggle = async () => {
    if (status === 'capturing') {
      stopInterpreter();
      return;
    }
    await startCapture();
  };

  const handleReset = () => {
    setSourceText('');
    setTranslatedText('');
    setError('');
    nextPlaybackTimeRef.current = 0;
  };

  return (
    <div className="interpreter-page page-enter">
      <div className="interpreter-head">
        <button type="button" className="interpreter-back-btn" onClick={onBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <div className="interpreter-title">同声传译</div>
          <div className="interpreter-subtitle">中文与高棉语双向实时翻译</div>
        </div>
      </div>

      <div className="interpreter-stage">
        <div className="interpreter-panel">
          <span>识别内容</span>
          <strong>{sourceText || '开始后，这里会显示你刚刚说的话'}</strong>
        </div>
        <div className="interpreter-panel accent">
          <span>翻译字幕</span>
          <strong>{translatedText || '模型播报的翻译会显示在这里'}</strong>
        </div>
        <div className="interpreter-status">
          {error || (status === 'capturing'
            ? '正在聆听并实时翻译'
            : status === 'connecting'
              ? '正在连接翻译服务'
              : '点击开始同传')}
        </div>
      </div>

      <div className="interpreter-controls">
        <button type="button" className={`interpreter-primary ${status === 'capturing' ? 'live' : ''}`} onClick={handleToggle}>
          <i className={`fas ${status === 'capturing' ? 'fa-stop' : 'fa-microphone'}`}></i>
          <span>{status === 'capturing' ? '停止同传' : '开始同传'}</span>
        </button>
        <button type="button" className="interpreter-secondary" onClick={handleReset}>
          <i className="fas fa-rotate-left"></i>
          <span>清空字幕</span>
        </button>
      </div>

      <style>{`
        .interpreter-page {
          position: absolute;
          inset: 0;
          z-index: 60;
          display: flex;
          flex-direction: column;
          padding: 18px 18px 24px;
          background: var(--app-shell-gradient);
        }
        .interpreter-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: max(8px, env(safe-area-inset-top, 0px));
        }
        .interpreter-back-btn {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid var(--settings-border);
          background: var(--settings-surface);
          color: var(--text-primary);
          flex-shrink: 0;
        }
        .interpreter-title {
          font-size: 24px;
          font-weight: 800;
          color: var(--home-title-color);
        }
        .interpreter-subtitle {
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .interpreter-stage {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          justify-content: center;
        }
        .interpreter-panel {
          min-height: 132px;
          border-radius: 24px;
          padding: 16px;
          background: var(--settings-surface);
          border: 1px solid var(--settings-border);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .interpreter-panel.accent {
          background: linear-gradient(180deg, rgba(11,106,88,0.18), rgba(11,106,88,0.10));
          border-color: rgba(142,212,195,0.18);
        }
        .interpreter-panel span {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .interpreter-panel strong {
          font-size: 22px;
          line-height: 1.45;
          color: var(--text-primary);
          font-family: 'Noto Sans SC', 'Noto Sans Khmer', sans-serif;
        }
        .interpreter-status {
          min-height: 40px;
          text-align: center;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
          padding: 0 12px;
        }
        .interpreter-controls {
          display: grid;
          gap: 12px;
          padding-bottom: calc(6px + env(safe-area-inset-bottom, 0px));
        }
        .interpreter-primary,
        .interpreter-secondary {
          width: 100%;
          min-height: 56px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 800;
        }
        .interpreter-primary {
          border: none;
          background: linear-gradient(90deg, var(--brand-green), #17a585);
          color: #fff;
        }
        .interpreter-primary.live {
          background: linear-gradient(90deg, #d2aa36, #f1ca49);
          color: #183a33;
        }
        .interpreter-secondary {
          border: 1px solid var(--settings-border);
          background: var(--settings-surface);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
