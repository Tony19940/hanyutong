import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePronunciation } from '../hooks/usePronunciation.js';
import { api, storage } from '../utils/api.js';

const INPUT_SAMPLE_RATE = 16000;
const INPUT_CHUNK_MS = 20;
const INPUT_SAMPLES_PER_CHUNK = (INPUT_SAMPLE_RATE * INPUT_CHUNK_MS) / 1000;

function downsampleTo16k(input, sourceRate) {
  if (sourceRate === INPUT_SAMPLE_RATE) {
    return input;
  }

  const ratio = sourceRate / INPUT_SAMPLE_RATE;
  const newLength = Math.round(input.length / ratio);
  const output = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < output.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i += 1) {
      accum += input[i];
      count += 1;
    }

    output[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return output;
}

function mergeFloat32Chunks(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });

  return merged;
}

function floatTo16BitPCMBase64(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function statusCopy(status) {
  switch (status) {
    case 'loading':
      return '读取配置中';
    case 'unsupported':
      return '当前环境不支持';
    case 'connecting':
      return '正在连线';
    case 'active':
      return '实时对话中';
    case 'error':
      return '连接失败';
    default:
      return '准备开始';
  }
}

export default function AIPracticePage({ user }) {
  const [availability, setAvailability] = useState({ available: false, missing: [], scenarios: [] });
  const [scenarioId, setScenarioId] = useState(null);
  const [step, setStep] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [status, setStatus] = useState('loading');
  const [statusDetail, setStatusDetail] = useState('正在读取场景配置。');
  const [eventLog, setEventLog] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const { play, stop } = usePronunciation();

  const activeSessionRef = useRef(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef(Promise.resolve());
  const captureContextRef = useRef(null);
  const processorRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const captureBufferRef = useRef([]);
  const captureChunkSizeRef = useRef(INPUT_SAMPLES_PER_CHUNK);

  const scenarios = availability.scenarios || [];
  const scenario = useMemo(
    () => scenarios.find((item) => item.id === scenarioId) ?? scenarios[0] ?? null,
    [scenarioId, scenarios]
  );
  const currentTurn = scenario?.steps?.[step] ?? null;
  const progress = scenario?.steps?.length ? Math.round(((step + 1) / scenario.steps.length) * 100) : 0;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await api.getDialogueScenarios();
        if (!mounted) return;
        setAvailability(data);
        setScenarioId((value) => value || data.scenarios?.[0]?.id || null);
        if (data.available) {
          setStatus('idle');
          setStatusDetail('选择场景后开始实时对话。');
        } else {
          setStatus('error');
          setStatusDetail('火山 RTC 与 VoiceChat 参数还没配齐。');
        }
      } catch (error) {
        if (!mounted) return;
        setStatus('error');
        setStatusDetail(error.message || '读取对话配置失败。');
      }
    })();

    return () => {
      mounted = false;
      stop();
    };
  }, [stop]);

  useEffect(() => {
    setStep(0);
    setShowHint(false);
    stop();
  }, [scenarioId, stop]);

  useEffect(() => () => {
    teardownSession({ skipServerStop: false }).catch((error) => {
      console.error('Failed to cleanup dialogue session:', error);
    });
  }, []);

  async function teardownSession({ skipServerStop = false } = {}) {
    const currentSession = activeSessionRef.current;
    const socket = wsRef.current;
    activeSessionRef.current = null;
    stopRecording();
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ type: 'finish' }));
      } catch {}
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    if (!skipServerStop && currentSession?.task) {
      try {
        await api.stopDialogueSession({});
      } catch (error) {
        console.error('Failed to stop dialogue session on server:', error);
      }
    }

    setActiveSession(null);
  }

  function appendMessage(message) {
    setMessages((value) => [...value, { id: Date.now() + Math.random(), ...message }].slice(-16));
  }

  function enqueuePcmAudio(base64Audio) {
    if (!base64Audio) return;
    const raw = Uint8Array.from(atob(base64Audio), (char) => char.charCodeAt(0));
    const sampleCount = Math.floor(raw.byteLength / 2);
    const channelData = new Float32Array(sampleCount);
    const pcm = new DataView(raw.buffer);

    for (let i = 0; i < sampleCount; i += 1) {
      channelData[i] = pcm.getInt16(i * 2, true) / 32768;
    }

    audioQueueRef.current = audioQueueRef.current.then(async () => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const buffer = audioContextRef.current.createBuffer(1, channelData.length, 24000);
      buffer.getChannelData(0).set(channelData);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      await new Promise((resolve) => {
        source.onended = resolve;
      });
    }).catch((error) => {
      console.error('Failed to play dialogue pcm audio:', error);
    });
  }

  function stopPlaybackQueue() {
    audioQueueRef.current = Promise.resolve();
    if (audioContextRef.current?.state === 'running') {
      audioContextRef.current.suspend().catch(() => {});
    }
  }

  function stopRecording({ sendEnd = false } = {}) {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (captureContextRef.current) {
      captureContextRef.current.close().catch(() => {});
      captureContextRef.current = null;
    }

    captureBufferRef.current = [];
    setIsRecording(false);

    if (sendEnd && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_asr' }));
    }
  }

  async function startRecording() {
    if (isRecording || status !== 'active' || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
      });

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('当前浏览器不支持音频采集');
      }

      const captureContext = new AudioContextClass();
      const source = captureContext.createMediaStreamSource(stream);
      const processor = captureContext.createScriptProcessor(4096, 1, 1);

      mediaStreamRef.current = stream;
      captureContextRef.current = captureContext;
      processorRef.current = processor;
      captureChunkSizeRef.current = INPUT_SAMPLES_PER_CHUNK;
      captureBufferRef.current = [];

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const downsampled = downsampleTo16k(input, captureContext.sampleRate);
        captureBufferRef.current.push(downsampled);

        const merged = mergeFloat32Chunks(captureBufferRef.current);
        let offset = 0;
        while (merged.length - offset >= captureChunkSizeRef.current) {
          const chunk = merged.slice(offset, offset + captureChunkSizeRef.current);
          offset += captureChunkSizeRef.current;
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'audio_chunk',
              payload: floatTo16BitPCMBase64(chunk),
            }));
          }
        }

        captureBufferRef.current = offset < merged.length ? [merged.slice(offset)] : [];
      };

      source.connect(processor);
      processor.connect(captureContext.destination);
      setIsRecording(true);
      appendMessage({ role: 'system', text: '开始说话…' });
    } catch (error) {
      console.error(error);
      setStatus('error');
      setStatusDetail(error.message || '麦克风启动失败。');
    }
  }

  async function handleStartSession() {
    if (!scenario) return;

    setStatus('connecting');
    setStatusDetail('正在准备豆包端到端连接参数。');
    setEventLog([{ id: Date.now(), text: '正在向服务端申请豆包会话参数。' }]);

    try {
      await teardownSession({ skipServerStop: false });

      const sessionResponse = await api.startDialogueSession(scenario.id);
      const session = sessionResponse.session;

      activeSessionRef.current = session;
      setActiveSession(session);
      setMessages([]);

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const token = localStorage.getItem(storage.USER_TOKEN_KEY);
      const wsUrl = `${protocol}//${window.location.host}/api/dialogue/ws?token=${encodeURIComponent(token || '')}`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'start', sessionId: session.sessionId }));
      });

      socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'proxy_ready') {
          setStatus('connecting');
          setStatusDetail('代理已连上，正在启动豆包会话。');
          return;
        }

        if (data.type === 'session_started') {
          setStatus('active');
          setStatusDetail('已连线，现在可以直接输入中文或按住说话。');
          appendMessage({ role: 'assistant', text: session.scenario.openingLine });
          socket.send(JSON.stringify({ type: 'say_hello', content: session.scenario.openingLine }));
          return;
        }

        if (data.type === 'chat_response') {
          appendMessage({ role: 'assistant', text: data.payload?.content || '' });
          return;
        }

        if (data.type === 'asr_response') {
          const result = data.payload?.results?.[0];
          if (result?.text) {
            appendMessage({ role: result.is_interim ? 'system' : 'user', text: result.text });
          }
          return;
        }

        if (data.type === 'asr_info') {
          stopPlaybackQueue();
          setEventLog((value) => [
            { id: Date.now() + Math.random(), text: '检测到你开始说话。' },
            ...value,
          ].slice(0, 8));
          return;
        }

        if (data.type === 'asr_ended') {
          setEventLog((value) => [
            { id: Date.now() + Math.random(), text: '本轮语音输入已结束。' },
            ...value,
          ].slice(0, 8));
          return;
        }

        if (data.type === 'tts_audio') {
          enqueuePcmAudio(data.payload);
          return;
        }

        if (data.type === 'dialog_error' || data.type === 'session_failed' || data.type === 'proxy_error') {
          setStatus('error');
          setStatusDetail(data.payload?.message || data.error || '豆包会话出错。');
          return;
        }

        if (data.type === 'session_finished' || data.type === 'proxy_closed') {
          setStatus('idle');
          setStatusDetail('对话已结束。可以重新开始下一轮。');
        }
      });

      socket.addEventListener('close', () => {
        wsRef.current = null;
      });

      setEventLog((value) => [
        { id: Date.now() + Math.random(), text: `连接地址：${session.doubao.wsUrl}` },
        { id: Date.now() + Math.random(), text: `resource_id：${session.doubao.resourceId}` },
        { id: Date.now() + Math.random(), text: `bot_name：${session.startSession.dialog.bot_name}` },
        ...value,
      ].slice(0, 8));
    } catch (error) {
      console.error(error);
      await teardownSession({ skipServerStop: false });
      setStatus('error');
      setStatusDetail(error.message || '启动实时对话失败。');
    }
  }

  async function handleStopSession() {
    setStatus('idle');
    setStatusDetail('对话已结束。可以重新开始下一轮。');
    await teardownSession({ skipServerStop: false });
  }

  function handleSendText() {
    const content = textInput.trim();
    if (!content || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'text_query', content }));
    appendMessage({ role: 'user', text: content });
    setTextInput('');
  }

  function handleHoldStart(event) {
    event.preventDefault();
    startRecording();
  }

  function handleHoldEnd(event) {
    event.preventDefault();
    stopRecording({ sendEnd: true });
  }

  const canStart = availability.available && scenario && status !== 'connecting' && status !== 'active';
  const canStop = status === 'active';

  return (
    <div className="practice-page page-enter">
      <div className="practice-scroll">
        <header className="practice-hero animate-fade-in-up">
          <div>
            <div className="practice-kicker">对话</div>
            <div className="practice-title">真人感练口语</div>
            <div className="practice-subtitle">{user?.name ? `${user.name}，` : ''}按固定流程和豆包实时对话。</div>
          </div>
          <div className={`practice-badge ${status}`}>{statusCopy(status)}</div>
        </header>

        <div className="scenario-strip animate-fade-in-up stagger-1">
          {scenarios.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`scenario-pill ${item.id === scenario?.id ? 'active' : ''}`}
              onClick={() => setScenarioId(item.id)}
              disabled={status === 'connecting' || status === 'active'}
            >
              <span>{item.title}</span>
            </button>
          ))}
        </div>

        <div className="mission-card animate-float-up stagger-2">
          <div className="mission-top">
            <div className="mission-title">
              <span>{scenario?.title || '对话场景'}</span>
            </div>
            {currentTurn && (
              <button type="button" className="coach-play" onClick={() => play({ text: currentTurn.coach })}>
                <i className="fas fa-volume-up"></i>
              </button>
            )}
          </div>
          <div className="mission-subtitle">{scenario?.subtitle || '先读取配置。'}</div>
          <div className="practice-progress">
            <div className="practice-progress-bar">
              <div className="practice-progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <span>{currentTurn ? `${step + 1}/${scenario.steps.length}` : '--'}</span>
          </div>
        </div>

        <div className="coach-card animate-float-up stagger-3">
          <div className="coach-label">当前步骤</div>
          <div className="coach-step">{currentTurn?.label || '等待开始'}</div>
          <div className="coach-line">{currentTurn?.coach || '先选择场景，再开始实时语音练习。'}</div>
          <div className="coach-line-km">{currentTurn?.coachKhmer || statusDetail}</div>

          <div className="coach-actions">
            <button
              type="button"
              className="secondary-action"
              onClick={() => setShowHint((value) => !value)}
              disabled={!currentTurn}
            >
              {showHint ? '收起提示' : '看提示'}
            </button>
            {canStop ? (
              <button type="button" className="danger-action" onClick={handleStopSession}>
                结束对话
              </button>
            ) : (
              <button type="button" className="primary-action" onClick={handleStartSession} disabled={!canStart}>
                开始对话
              </button>
            )}
          </div>

          {showHint && currentTurn && (
            <div className="hint-panel animate-fade-in-up">
              {currentTurn.hints.map((hint) => (
                <div key={hint} className="hint-chip">{hint}</div>
              ))}
            </div>
          )}

          <div className="step-actions">
            <button
              type="button"
              className="ghost-action"
              onClick={() => setStep((value) => Math.max(value - 1, 0))}
              disabled={!scenario || step === 0}
            >
              上一步
            </button>
            <button
              type="button"
              className="ghost-action"
              onClick={() => setStep((value) => {
                if (!scenario) return value;
                return Math.min(value + 1, scenario.steps.length - 1);
              })}
              disabled={!scenario || step >= (scenario.steps?.length || 1) - 1}
            >
              下一步
            </button>
          </div>
        </div>

        <div className="roadmap-card animate-float-up stagger-4">
          <div className="roadmap-title">状态</div>
          <div className="roadmap-item">{statusDetail}</div>
          {!availability.available && availability.missing?.length > 0 && (
            <div className="missing-box">
              <div className="missing-title">还缺这些火山参数</div>
              {availability.missing.map((item) => (
                <div key={item} className="missing-item">{item}</div>
              ))}
            </div>
          )}
          {activeSession && (
            <div className="session-box">
              <div className="session-item">地址：{activeSession.doubao.wsUrl}</div>
              <div className="session-item">resource_id：{activeSession.doubao.resourceId}</div>
              <div className="session-item">connect_id：{activeSession.doubao.connectId}</div>
              <div className="session-item">bot_name：{activeSession.startSession.dialog.bot_name}</div>
            </div>
          )}
        </div>

        <div className="roadmap-card animate-float-up stagger-5">
          <div className="roadmap-title">实时事件</div>
          {eventLog.length === 0 ? (
            <div className="roadmap-item">开始后，这里会显示连线和 AI 状态。</div>
          ) : (
            eventLog.map((item) => (
              <div key={item.id} className="roadmap-item">{item.text}</div>
            ))
          )}
        </div>

        <div className="roadmap-card animate-float-up stagger-6">
          <div className="roadmap-title">对话</div>
          <div className="message-list">
            {messages.length === 0 ? (
              <div className="roadmap-item">开始后，这里会出现你和豆包的对话。</div>
            ) : messages.map((message) => (
              <div key={message.id} className={`message-bubble ${message.role}`}>
                {message.text}
              </div>
            ))}
          </div>
          <div className="input-row">
            <input
              className="practice-input"
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              placeholder="输入一句中文"
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSendText();
              }}
            />
            <button type="button" className="send-action" onClick={handleSendText} disabled={status !== 'active'}>
              发送
            </button>
          </div>
          <button
            type="button"
            className={`hold-to-talk ${isRecording ? 'recording' : ''}`}
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={(event) => {
              if (isRecording) handleHoldEnd(event);
            }}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            disabled={status !== 'active'}
          >
            {isRecording ? '松开发送' : '按住说话'}
          </button>
        </div>
      </div>

      <style>{`
        .practice-page { flex: 1; position: relative; z-index: 10; overflow: hidden; }
        .practice-scroll { height: 100%; overflow-y: auto; padding: 12px 20px 104px; }
        .practice-scroll::-webkit-scrollbar { display: none; }
        .practice-hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
        .practice-kicker { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(245, 216, 143, 0.82); }
        .practice-title { margin-top: 6px; font-size: 30px; line-height: 1.04; font-weight: 800; color: #f5edce; font-family: 'Manrope', 'Noto Sans SC', sans-serif; }
        .practice-subtitle { margin-top: 8px; font-size: 13px; color: rgba(245, 241, 225, 0.82); }
        .practice-badge { padding: 10px 12px; border-radius: 18px; background: rgba(17,41,116,0.85); border: 1px solid rgba(245,216,143,0.24); font-size: 12px; color: rgba(245, 226, 179, 0.82); }
        .practice-badge.active { color: #f7f0cf; border-color: rgba(245,216,143,0.56); }
        .practice-badge.connecting { color: #f7f0cf; border-color: rgba(245,216,143,0.56); }
        .practice-badge.error { color: #ffd7b0; border-color: rgba(255,151,111,0.4); }
        .scenario-strip { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 14px; }
        .scenario-strip::-webkit-scrollbar { display: none; }
        .scenario-pill {
          border: 1.5px solid rgba(245,216,143,0.58); background: rgba(17,41,116,0.84);
          color: rgba(245, 232, 192, 0.92); border-radius: 999px; padding: 12px 16px;
          display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; font-size: 13px;
        }
        .scenario-pill.active { background: linear-gradient(180deg, rgba(244,218,146,0.22), rgba(18,41,116,0.92)); border-color: rgba(245,216,143,0.88); color: #fffef3; box-shadow: 0 12px 22px rgba(12,26,76,0.16); }
        .mission-card, .coach-card, .roadmap-card {
          background: linear-gradient(180deg, rgba(17,41,116,0.94), rgba(15,35,103,0.9));
          border: 2px solid rgba(245,216,143,0.58);
          border-radius: 28px;
          box-shadow: 0 24px 60px rgba(6, 16, 56, 0.28);
        }
        .mission-card { padding: 18px; margin-bottom: 14px; }
        .mission-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .mission-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 800; color: #fff6d9; }
        .mission-subtitle { margin-top: 8px; font-size: 13px; color: rgba(245,241,225,0.82); }
        .coach-play {
          width: 46px; height: 46px; border-radius: 16px; border: 1px solid rgba(245,216,143,0.4);
          background: rgba(245,216,143,0.12); color: #fff6d9;
        }
        .practice-progress { margin-top: 16px; display: flex; align-items: center; gap: 10px; font-size: 12px; color: rgba(245, 232, 192, 0.76); }
        .practice-progress-bar { flex: 1; height: 12px; border-radius: 999px; overflow: hidden; background: rgba(245,216,143,0.12); border: 1px solid rgba(245,216,143,0.18); }
        .practice-progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #f4d98f 0%, #2f58c5 100%); transition: width 180ms cubic-bezier(0.16, 1, 0.3, 1); }
        .coach-card { padding: 20px; margin-bottom: 14px; }
        .coach-label, .roadmap-title { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(245, 216, 143, 0.82); }
        .coach-step { margin-top: 10px; font-size: 14px; color: rgba(245,241,225,0.72); }
        .coach-line { margin-top: 10px; font-size: 24px; line-height: 1.35; color: #fff6d9; font-weight: 800; }
        .coach-line-km { margin-top: 10px; font-size: 14px; line-height: 1.7; color: rgba(245, 241, 225, 0.86); }
        .coach-actions { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .step-actions { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .primary-action, .secondary-action, .danger-action, .ghost-action {
          min-height: 48px; border-radius: 18px; font-size: 14px; font-weight: 700;
          border: 1px solid rgba(245,216,143,0.2);
        }
        .primary-action { background: linear-gradient(180deg, #2f58c5, #2347ad); color: #fff; border: none; }
        .secondary-action { background: linear-gradient(180deg, #f4d98f, #caa14a); color: #21408f; border: none; }
        .danger-action { background: linear-gradient(180deg, #a34444, #7a2a2a); color: #fff; border: none; }
        .ghost-action { background: rgba(245,216,143,0.08); color: #fff9e5; }
        .hint-panel { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(245,216,143,0.12); display: flex; flex-wrap: wrap; gap: 10px; }
        .hint-chip { padding: 10px 14px; border-radius: 16px; background: rgba(245,216,143,0.08); border: 1px solid rgba(245,216,143,0.18); color: #fff9e5; font-size: 13px; }
        .roadmap-card { padding: 20px; margin-bottom: 14px; }
        .roadmap-item { margin-top: 10px; font-size: 14px; line-height: 1.7; color: rgba(245, 241, 225, 0.82); word-break: break-word; }
        .missing-box, .session-box {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(245,216,143,0.12);
        }
        .missing-title { font-size: 13px; color: #f8efca; font-weight: 700; }
        .missing-item, .session-item { margin-top: 8px; font-size: 13px; color: rgba(245,241,225,0.78); word-break: break-word; }
        .message-list { display: grid; gap: 10px; margin-top: 12px; }
        .message-bubble {
          border-radius: 16px;
          padding: 12px 14px;
          line-height: 1.6;
          font-size: 14px;
          color: #fff8e3;
          background: rgba(245,216,143,0.08);
          border: 1px solid rgba(245,216,143,0.14);
        }
        .message-bubble.user { background: rgba(47,88,197,0.24); }
        .message-bubble.system { background: rgba(255,255,255,0.04); color: rgba(245,241,225,0.7); }
        .input-row { margin-top: 14px; display: grid; grid-template-columns: 1fr auto; gap: 10px; }
        .practice-input {
          min-height: 46px;
          border-radius: 16px;
          border: 1px solid rgba(245,216,143,0.18);
          background: rgba(245,216,143,0.08);
          color: #fff8e3;
          padding: 0 14px;
          outline: none;
        }
        .send-action {
          min-width: 82px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(180deg, #2f58c5, #2347ad);
          color: #fff;
          font-weight: 700;
        }
        .hold-to-talk {
          margin-top: 12px;
          width: 100%;
          min-height: 54px;
          border-radius: 18px;
          border: 1.5px solid rgba(245,216,143,0.42);
          background: rgba(245,216,143,0.08);
          color: #fff8e3;
          font-weight: 800;
          letter-spacing: 0.02em;
        }
        .hold-to-talk.recording {
          background: linear-gradient(180deg, #a34444, #7a2a2a);
          border-color: rgba(255,193,193,0.6);
        }
      `}</style>
    </div>
  );
}
