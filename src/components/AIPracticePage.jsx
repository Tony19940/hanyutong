import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePronunciation } from '../hooks/usePronunciation.js';
import { api } from '../utils/api.js';

const INPUT_SAMPLE_RATE = 16000;
const CHUNK_SIZE = 4096;
const TEACHER_AVATAR = '/bunson-teacher.jpg';

function downsampleTo16k(input, sourceRate) {
  if (sourceRate === INPUT_SAMPLE_RATE) return input;
  const ratio = sourceRate / INPUT_SAMPLE_RATE;
  const length = Math.round(input.length / ratio);
  const output = new Float32Array(length);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < output.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let index = offsetBuffer; index < nextOffsetBuffer && index < input.length; index += 1) {
      sum += input[index];
      count += 1;
    }
    output[offsetResult] = count ? sum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return output;
}

function mergeFloat32Chunks(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });
  return merged;
}

function float32ToWavBlob(float32Array, sampleRate = INPUT_SAMPLE_RATE) {
  const pcmBuffer = new ArrayBuffer(float32Array.length * 2);
  const pcmView = new DataView(pcmBuffer);
  for (let index = 0; index < float32Array.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, float32Array[index]));
    pcmView.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  const wavBuffer = new ArrayBuffer(44 + pcmBuffer.byteLength);
  const wavView = new DataView(wavBuffer);
  const writeString = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      wavView.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  wavView.setUint32(4, 36 + pcmBuffer.byteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  wavView.setUint32(16, 16, true);
  wavView.setUint16(20, 1, true);
  wavView.setUint16(22, 1, true);
  wavView.setUint32(24, sampleRate, true);
  wavView.setUint32(28, sampleRate * 2, true);
  wavView.setUint16(32, 2, true);
  wavView.setUint16(34, 16, true);
  writeString(36, 'data');
  wavView.setUint32(40, pcmBuffer.byteLength, true);
  new Uint8Array(wavBuffer, 44).set(new Uint8Array(pcmBuffer));

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function formatTimer(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatClock(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusCopy(status) {
  return {
    loading: '连接中',
    idle: '待开始',
    starting: '准备中',
    active: '在线',
    sending: '发送中',
    complete: '已完成',
    error: '异常',
  }[status] || '待开始';
}

function mapAudio(message, audioUrlsRef) {
  const createdAt = message?.createdAt || new Date().toISOString();
  if (!message?.audio?.base64) {
    return {
      ...message,
      createdAt,
    };
  }

  const bytes = Uint8Array.from(atob(message.audio.base64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: message.audio.mimeType || 'audio/mpeg' });
  const audioUrl = URL.createObjectURL(blob);
  audioUrlsRef.current.add(audioUrl);
  return {
    ...message,
    createdAt,
    audioUrl,
  };
}

function buildUserDisplay(user) {
  const displayName = user?.display_name || user?.name || user?.username || '你';
  const username = user?.username ? `@${user.username}` : '今天在线';
  const avatarUrl = user?.avatarUrl || user?.avatar_url || null;
  return {
    displayName,
    username,
    avatarUrl,
    initial: displayName.trim().slice(0, 1) || '你',
  };
}

function buildCoachDisplay(scenario, status) {
  const coachName = 'Bunson老师';
  return {
    displayName: coachName,
    username: status === 'error' ? '连接异常' : '在线',
    avatarUrl: TEACHER_AVATAR,
    initial: coachName.slice(0, 1) || '豆',
  };
}

function buildTopicNote(scenario, state) {
  if (!scenario) return '选择一个今日话题';
  const stage = state?.currentLesson?.stage || '准备中';
  const progress = state?.totalLessons ? `${Math.min((state.lessonIndex || 0) + 1, state.totalLessons)}/${state.totalLessons}` : '';
  return [scenario.dailyTopic, stage, progress].filter(Boolean).join(' · ');
}

function renderVoiceDuration(message) {
  if (message.durationSeconds) {
    return formatTimer(message.durationSeconds);
  }
  return message.audioUrl ? '00:03' : '--:--';
}

export default function AIPracticePage({ user }) {
  const [availability, setAvailability] = useState({ available: false, missing: [], scenarios: [] });
  const [scenarioId, setScenarioId] = useState(null);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [state, setState] = useState(null);
  const [status, setStatus] = useState('loading');
  const [statusDetail, setStatusDetail] = useState('正在读取对话配置。');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [startingTopicId, setStartingTopicId] = useState(null);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [playingProgress, setPlayingProgress] = useState({ currentTime: 0, duration: 0 });
  const { play, stop } = usePronunciation();

  const scrollRef = useRef(null);
  const captureContextRef = useRef(null);
  const processorRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioUrlsRef = useRef(new Set());

  const scenarios = availability.scenarios || [];
  const dailyScenarios = availability.dailyScenarios || [];
  const topicChoices = dailyScenarios.length > 0 ? dailyScenarios : scenarios.slice(0, 3);
  const scenario = useMemo(
    () =>
      scenarios.find((item) => item.id === scenarioId)
      ?? dailyScenarios.find((item) => item.id === scenarioId)
      ?? dailyScenarios[0]
      ?? scenarios[0]
      ?? null,
    [dailyScenarios, scenarioId, scenarios]
  );
  const coach = useMemo(() => buildCoachDisplay(scenario, status), [scenario, status]);
  const learner = useMemo(() => buildUserDisplay(user), [user]);

  function clearAudioUrls() {
    audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    audioUrlsRef.current.clear();
  }

  function teardownRecording() {
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
    chunksRef.current = [];
    setIsRecording(false);
    setRecordSeconds(0);
  }

  function appendMessages(nextMessages) {
    setMessages((current) => [...current, ...nextMessages]);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.getDialogueScenarios();
        if (!mounted) return;
        setAvailability(data);
        setScenarioId((value) => value || data.dailyScenarios?.[0]?.id || data.scenarios?.[0]?.id || null);
        setStatus(data.available ? 'idle' : 'error');
        setStatusDetail(data.available ? '选择一个今日话题。' : '对话配置还没配齐。');
      } catch (error) {
        if (!mounted) return;
        setStatus('error');
        setStatusDetail(error.message || '读取对话配置失败。');
      }
    })();

    return () => {
      mounted = false;
      clearAudioUrls();
      stop();
      teardownRecording();
    };
  }, [stop]);

  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = window.setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setSession(null);
    setState(null);
    clearAudioUrls();
    setStartingTopicId(null);
    setPlayingMessageId(null);
    setPlayingProgress({ currentTime: 0, duration: 0 });
    setStatus(availability.available ? 'idle' : 'error');
    setStatusDetail(availability.available ? '选择一个今日话题。' : '对话配置还没配齐。');
    stop();
    teardownRecording();
  }, [scenarioId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStartTopic(nextScenarioId = scenario?.id) {
    const selectedScenario = scenarios.find((item) => item.id === nextScenarioId)
      ?? dailyScenarios.find((item) => item.id === nextScenarioId)
      ?? scenario;
    if (!selectedScenario) return;
    setScenarioId(selectedScenario.id);
    setStatus('starting');
    setStatusDetail('正在生成今日话题。');
    setStartingTopicId(selectedScenario.id);
    try {
      const response = await api.startDialogueSession(selectedScenario.id);
      setSession(response.session);
      setState(response.state);
      setMessages([
        {
          id: `topic-note-${Date.now()}`,
          role: 'system',
          type: 'note',
          text: buildTopicNote(response.session.scenario, response.state),
          createdAt: new Date().toISOString(),
        },
        ...response.messages.map((message) => mapAudio(message, audioUrlsRef)),
      ]);
      setStatus(response.state?.isComplete ? 'complete' : 'active');
      setStatusDetail('现在可以开始录音了。');
    } catch (error) {
      setStatus('error');
      setStatusDetail(error.message || '启动对话失败。');
    } finally {
      setStartingTopicId(null);
    }
  }

  async function handleStopTopic() {
    if (!session?.sessionId) {
      setStatus(availability.available ? 'idle' : 'error');
      setStatusDetail(availability.available ? '选择一个今日话题。' : '对话配置还没配齐。');
      return;
    }

    teardownRecording();
    try {
      await api.stopDialogueSession({ sessionId: session.sessionId });
    } catch {}
    setSession(null);
    setState(null);
    setPlayingMessageId(null);
    setPlayingProgress({ currentTime: 0, duration: 0 });
    setStatus(availability.available ? 'idle' : 'error');
    setStatusDetail(availability.available ? '重新选择一个今日话题。' : '对话配置还没配齐。');
  }

  async function startRecording() {
    if (isRecording || isSending || status !== 'active') return;
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true, autoGainControl: true },
      });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('当前浏览器不支持录音。');
      }

      const context = new AudioContextClass();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(CHUNK_SIZE, 1, 1);
      chunksRef.current = [];
      mediaStreamRef.current = stream;
      captureContextRef.current = context;
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        const channelData = event.inputBuffer.getChannelData(0);
        chunksRef.current.push(downsampleTo16k(channelData, context.sampleRate));
      };
      source.connect(processor);
      processor.connect(context.destination);
      setRecordSeconds(0);
      setIsRecording(true);
      setStatusDetail('录音中，再点一次就会发送。');
    } catch (error) {
      setStatus('error');
      setStatusDetail(error.message || '麦克风启动失败。');
    }
  }

  async function stopRecordingAndSend() {
    if (!isRecording || !session?.sessionId) return;
    setIsSending(true);
    const durationSeconds = Math.max(recordSeconds, 1);

    const merged = mergeFloat32Chunks(chunksRef.current);
    const audioBlob = float32ToWavBlob(merged);
    const localAudioUrl = URL.createObjectURL(audioBlob);
    audioUrlsRef.current.add(localAudioUrl);
    teardownRecording();

    const localMessageId = `local-${Date.now()}`;
    appendMessages([
      {
        id: localMessageId,
        role: 'user',
        type: 'audio',
        text: '正在识别…',
        audioUrl: localAudioUrl,
        durationSeconds,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const response = await api.sendDialogueMessage(session.sessionId, audioBlob);
      setState(response.state);
      setStatus(response.state?.isComplete ? 'complete' : 'active');
      setStatusDetail(response.state?.isComplete ? '本次话题已完成。' : '继续下一句。');

      setMessages((current) =>
        current.map((message) =>
          message.id === localMessageId
            ? {
                ...message,
                text: response.userMessage?.text || '我刚才没有听清。',
                createdAt: response.userMessage?.createdAt || message.createdAt,
              }
            : message
        )
      );

      appendMessages(response.aiMessages.map((message) => mapAudio(message, audioUrlsRef)));
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === localMessageId
            ? {
                ...message,
                text: '发送失败，请再试一次。',
              }
            : message
        )
      );
      setStatus('error');
      setStatusDetail(error.message || '发送语音失败。');
    } finally {
      setIsSending(false);
    }
  }

  const recordButtonLabel = isRecording ? '结束录音' : '开始录音';
  const recordButtonDisabled = !session?.sessionId || isSending || status === 'complete';
  const handlePrimaryAction = isRecording ? stopRecordingAndSend : startRecording;
  const playbackRatio = playingProgress.duration > 0
    ? Math.min(1, Math.max(0, playingProgress.currentTime / playingProgress.duration))
    : 0;

  return (
    <div className="im-page page-enter">
      <div className="im-shell">
        <header className="tg-chat-header animate-fade-in-up">
          <div className="tg-chat-peer">
            <img className="tg-peer-avatar image" src={coach.avatarUrl} alt={coach.displayName} />
            <div className="tg-peer-meta">
              <div className="tg-peer-name">{coach.displayName}</div>
              <div className="tg-peer-status">
                <span className={`tg-status-dot ${status === 'error' ? 'error' : ''}`}></span>
                <span>{coach.username}</span>
              </div>
            </div>
          </div>
        </header>

        {!availability.available && availability.missing?.length > 0 && (
          <div className="tg-warning">{availability.missing.join('、')}</div>
        )}

        <div ref={scrollRef} className="tg-chat-stream animate-float-up stagger-2">
          {!session?.sessionId ? (
            <div className="tg-topic-grid-shell">
              <div className="tg-topic-grid-title">今日话题</div>
              <div className="tg-topic-grid">
                {topicChoices.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`tg-topic-card ${startingTopicId === item.id ? 'loading' : ''}`}
                    onClick={() => handleStartTopic(item.id)}
                    disabled={!availability.available || isSending || isRecording || Boolean(startingTopicId)}
                  >
                    <div className="tg-topic-card-kicker">
                      {startingTopicId === item.id ? '正在进入' : '开始练习'}
                    </div>
                    <div className="tg-topic-card-title">{item.title}</div>
                    <div className="tg-topic-card-subtitle">{item.subtitle}</div>
                    {startingTopicId === item.id && (
                      <div className="tg-topic-card-loading" aria-hidden="true">
                        <i></i><i></i><i></i>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              if (message.type === 'note') {
                return (
                  <div key={message.id} className="tg-date-chip">
                    {message.text}
                  </div>
                );
              }

              const isAssistant = message.role === 'assistant';
              return (
                <div key={message.id} className={`tg-message-row ${isAssistant ? 'assistant' : 'user'} tg-message-enter`}>
                  {isAssistant && (
                    <div className="tg-message-avatar">
                      <img className="tg-peer-avatar image small" src={coach.avatarUrl} alt={coach.displayName} />
                    </div>
                  )}

                  <div className={`tg-bubble ${isAssistant ? 'assistant' : 'user'}`}>
                    {isAssistant && <div className="tg-bubble-name">{coach.displayName}</div>}
                    {message.text && <div className="tg-bubble-text">{message.text}</div>}
                    {message.khmerText && <div className="tg-bubble-translation">{message.khmerText}</div>}

                    {message.type === 'audio' && (
                      <button
                        type="button"
                        className={`tg-voice-card ${message.audioUrl ? 'ready' : 'loading'} ${playingMessageId === message.id ? 'playing' : ''}`}
                        onClick={() => message.audioUrl && play({
                          audioSrc: message.audioUrl,
                          onStateChange: (stateEvent) => {
                            if (stateEvent.kind === 'playing') {
                              setPlayingMessageId(message.id);
                              setPlayingProgress({
                                currentTime: stateEvent.currentTime || 0,
                                duration: stateEvent.duration || 0,
                              });
                              return;
                            }

                            setPlayingMessageId((currentId) => (currentId === message.id ? null : currentId));
                            setPlayingProgress({ currentTime: 0, duration: 0 });
                          },
                        })}
                        disabled={!message.audioUrl}
                      >
                        <span className="tg-voice-play">{message.audioUrl ? '▶' : '…'}</span>
                        <span className="tg-voice-progress" style={{ width: playingMessageId === message.id ? `${playbackRatio * 100}%` : '0%' }}></span>
                        <span className="tg-voice-wave">
                          <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
                        </span>
                        <span className="tg-voice-duration">{renderVoiceDuration(message)}</span>
                      </button>
                    )}

                    <div className="tg-bubble-meta">
                      <span>{formatClock(message.createdAt)}</span>
                      {!isAssistant && <span className="tg-bubble-check">✓✓</span>}
                    </div>
                  </div>

                  {!isAssistant && (
                    <div className="tg-message-avatar">
                      {learner.avatarUrl ? (
                        <img className="tg-peer-avatar image small" src={learner.avatarUrl} alt={learner.displayName} />
                      ) : (
                        <div className="tg-peer-avatar user small">{learner.initial}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="tg-composer-wrap">
          <div className="tg-composer">
            <div className="tg-composer-actions">
              <button
                type="button"
                className={`tg-record-action full ${isRecording ? 'recording' : ''}`}
                onClick={handlePrimaryAction}
                disabled={recordButtonDisabled}
              >
                <span className="tg-record-left">
                  <span className="tg-record-icon">{isRecording ? '●' : '🎙'}</span>
                  <span>{recordButtonLabel}</span>
                </span>
                <span className={`tg-record-timer ${isRecording ? 'live' : ''}`}>
                  <span className="tg-record-inline-dot"></span>
                  <span>{formatTimer(recordSeconds)}</span>
                </span>
                {isRecording && (
                  <span className="tg-record-wave-live" aria-hidden="true">
                    <i></i><i></i><i></i><i></i><i></i>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .im-page{flex:1;position:relative;overflow:hidden;z-index:10}
        .im-shell{height:100%;display:flex;flex-direction:column;overflow:hidden;padding:10px 12px 0;max-width:430px;margin:0 auto}
        .im-shell::-webkit-scrollbar,.tg-chat-stream::-webkit-scrollbar{display:none}
        .tg-chat-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 2px 8px}
        .tg-chat-peer{display:flex;align-items:center;gap:12px;min-width:0}
        .tg-peer-avatar{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#7ed0ff,#3d7ef4);color:#fff;font-size:18px;font-weight:800;box-shadow:0 10px 24px rgba(9,29,87,.28)}
        .tg-peer-avatar.user{background:linear-gradient(180deg,#f3d78d,#d0a54a);color:#173b7f}
        .tg-peer-avatar.small{width:34px;height:34px;font-size:13px}
        .tg-peer-avatar.image{object-fit:cover}
        .tg-peer-meta{min-width:0}
        .tg-peer-name{font-size:17px;font-weight:800;color:#f8fbff;line-height:1.15}
        .tg-peer-status{margin-top:4px;display:flex;align-items:center;gap:6px;font-size:12px;color:rgba(236,244,255,.7)}
        .tg-status-dot{width:8px;height:8px;border-radius:50%;background:#59d37c;box-shadow:0 0 0 4px rgba(89,211,124,.14)}
        .tg-status-dot.error{background:#ff8b73;box-shadow:0 0 0 4px rgba(255,139,115,.14)}
        .tg-warning{margin-bottom:10px;padding:10px 12px;border-radius:16px;background:rgba(201,96,80,.18);border:1px solid rgba(255,165,142,.22);font-size:12px;color:#ffd9c7}
        .tg-chat-stream{flex:1;min-height:0;display:grid;gap:10px;padding:8px 0 188px;overflow-y:auto;align-content:start;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
        .tg-date-chip{justify-self:center;max-width:92%;padding:7px 12px;border-radius:999px;background:rgba(18,35,92,.72);color:rgba(241,247,255,.78);font-size:11px;border:1px solid rgba(255,255,255,.08)}
        .tg-topic-grid-shell{display:grid;align-content:center;gap:16px;min-height:480px;padding:12px 0 24px}
        .tg-topic-grid-title{justify-self:center;font-size:15px;font-weight:800;color:#f7fbff;letter-spacing:.08em}
        .tg-topic-grid{display:grid;gap:14px}
        .tg-topic-card{display:block;width:100%;min-height:124px;padding:20px 18px;border:none;border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.1));border:1px solid rgba(255,255,255,.12);text-align:left;color:#f7fbff;box-shadow:0 18px 40px rgba(5,16,53,.2)}
        .tg-topic-card.loading{transform:scale(.985);background:linear-gradient(180deg,rgba(106,154,255,.28),rgba(74,118,226,.18))}
        .tg-topic-card-kicker{font-size:11px;font-weight:800;letter-spacing:.12em;color:rgba(246,216,131,.95);text-transform:uppercase}
        .tg-topic-card-title{margin-top:10px;font-size:24px;font-weight:900;line-height:1.15}
        .tg-topic-card-subtitle{margin-top:8px;font-size:13px;line-height:1.65;color:rgba(236,244,255,.78)}
        .tg-topic-card-loading{margin-top:12px;display:flex;gap:6px}
        .tg-topic-card-loading i{width:8px;height:8px;border-radius:999px;background:#f8fbff;opacity:.35;animation:tgTopicPulse 1s ease-in-out infinite}
        .tg-topic-card-loading i:nth-child(2){animation-delay:.15s}
        .tg-topic-card-loading i:nth-child(3){animation-delay:.3s}
        .tg-message-row{display:flex;align-items:flex-end;gap:8px}
        .tg-message-row.assistant{justify-content:flex-start}
        .tg-message-row.user{justify-content:flex-end}
        .tg-message-enter{animation:tgMessageIn .22s ease-out}
        .tg-message-avatar{width:34px;display:flex;justify-content:center;flex-shrink:0}
        .tg-bubble{max-width:min(78%,304px);padding:10px 12px 8px;border-radius:18px;box-shadow:0 10px 28px rgba(5,16,53,.16)}
        .tg-bubble.assistant{background:rgba(245,248,255,.96);color:#163873;border-top-left-radius:8px}
        .tg-bubble.user{background:linear-gradient(180deg,#2b69de,#2559c0);color:#fff;border-top-right-radius:8px}
        .tg-bubble-name{margin-bottom:4px;font-size:11px;font-weight:800;color:#5084df}
        .tg-bubble-text{font-size:14px;line-height:1.65;white-space:pre-wrap}
        .tg-bubble-translation{margin-top:6px;font-size:13px;line-height:1.65;white-space:pre-wrap;color:rgba(28,61,123,.72)}
        .tg-bubble.user .tg-bubble-translation{color:rgba(255,255,255,.78)}
        .tg-voice-card{position:relative;overflow:hidden;margin-top:8px;width:100%;height:42px;border:none;border-radius:999px;display:flex;align-items:center;gap:10px;padding:0 12px;background:rgba(25,85,191,.08);color:inherit}
        .tg-voice-card.loading{opacity:.65}
        .tg-voice-card.playing{box-shadow:inset 0 0 0 1px rgba(80,132,223,.24)}
        .tg-voice-play{width:20px;text-align:center;font-size:12px;font-weight:900}
        .tg-voice-progress{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,rgba(102,173,255,.22),rgba(80,132,223,.14));border-radius:999px;transition:width .08s linear}
        .tg-voice-wave{position:relative;z-index:1;display:inline-flex;align-items:flex-end;gap:3px;flex:1}
        .tg-voice-wave i{width:3px;background:currentColor;border-radius:999px;opacity:.55}
        .tg-voice-card.playing .tg-voice-wave i{animation:tgVoiceWave 1.05s ease-in-out infinite}
        .tg-voice-wave i:nth-child(1){height:8px}.tg-voice-wave i:nth-child(2){height:14px}.tg-voice-wave i:nth-child(3){height:11px}.tg-voice-wave i:nth-child(4){height:17px}.tg-voice-wave i:nth-child(5){height:9px}.tg-voice-wave i:nth-child(6){height:15px}.tg-voice-wave i:nth-child(7){height:7px}
        .tg-voice-card.playing .tg-voice-wave i:nth-child(1){animation-delay:0s}.tg-voice-card.playing .tg-voice-wave i:nth-child(2){animation-delay:.08s}.tg-voice-card.playing .tg-voice-wave i:nth-child(3){animation-delay:.16s}.tg-voice-card.playing .tg-voice-wave i:nth-child(4){animation-delay:.24s}.tg-voice-card.playing .tg-voice-wave i:nth-child(5){animation-delay:.32s}.tg-voice-card.playing .tg-voice-wave i:nth-child(6){animation-delay:.4s}.tg-voice-card.playing .tg-voice-wave i:nth-child(7){animation-delay:.48s}
        .tg-voice-duration{position:relative;z-index:1;font-size:12px;font-weight:700;opacity:.72}
        .tg-bubble-meta{margin-top:6px;display:flex;justify-content:flex-end;align-items:center;gap:6px;font-size:11px;opacity:.72}
        .tg-bubble-check{font-size:11px;letter-spacing:-0.08em}
        .tg-composer-wrap{position:fixed;left:0;right:0;bottom:78px;padding:0 12px 10px;z-index:40;display:flex;justify-content:center}
        .tg-composer{width:min(430px,calc(100vw - 24px));padding:12px;border-radius:22px;background:rgba(10,24,70,.94);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(18px);box-shadow:0 18px 42px rgba(5,16,53,.34)}
        .tg-composer-actions{display:grid;grid-template-columns:1fr}
        .tg-record-action{height:56px;border:none;border-radius:18px;font-size:15px;font-weight:800;background:linear-gradient(180deg,#52a2ff,#2e71ea);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 18px;box-shadow:0 12px 26px rgba(28,82,194,.26)}
        .tg-record-action.full{width:100%}
        .tg-record-action.recording{background:linear-gradient(180deg,#d56459,#9d2f31)}
        .tg-record-action:disabled{opacity:.42;box-shadow:none}
        .tg-record-left{display:flex;align-items:center;gap:10px}
        .tg-record-icon{font-size:16px}
        .tg-record-timer{display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.12);font-size:12px;font-weight:800;color:rgba(255,255,255,.9)}
        .tg-record-timer.live{background:rgba(255,255,255,.18)}
        .tg-record-inline-dot{width:8px;height:8px;border-radius:999px;background:rgba(255,255,255,.4)}
        .tg-record-timer.live .tg-record-inline-dot{background:#fff3eb;box-shadow:0 0 0 4px rgba(255,255,255,.12)}
        .tg-record-wave-live{display:inline-flex;align-items:flex-end;gap:3px;margin-left:4px}
        .tg-record-wave-live i{width:3px;border-radius:999px;background:rgba(255,255,255,.9);animation:tgWave 1s ease-in-out infinite}
        .tg-record-wave-live i:nth-child(1){height:9px;animation-delay:0s}
        .tg-record-wave-live i:nth-child(2){height:15px;animation-delay:.1s}
        .tg-record-wave-live i:nth-child(3){height:20px;animation-delay:.2s}
        .tg-record-wave-live i:nth-child(4){height:13px;animation-delay:.3s}
        .tg-record-wave-live i:nth-child(5){height:8px;animation-delay:.4s}
        @keyframes tgWave{0%,100%{transform:scaleY(.55);opacity:.55}50%{transform:scaleY(1.15);opacity:1}}
        @keyframes tgTopicPulse{0%,100%{transform:translateY(0);opacity:.35}50%{transform:translateY(-3px);opacity:1}}
        @keyframes tgMessageIn{0%{opacity:0;transform:translateY(10px) scale(.985)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes tgVoiceWave{0%,100%{transform:scaleY(.55);opacity:.45}50%{transform:scaleY(1.18);opacity:.95}}
        @media (min-width:641px){
          .im-page{background:
            radial-gradient(circle at top, rgba(255,255,255,.04), transparent 32%),
            linear-gradient(180deg,#1a2f88 0%,#132872 100%)}
        }
        @media (max-width:640px){
          .im-shell{padding:8px 10px 0}
          .tg-composer-wrap{bottom:74px;padding:0 10px 8px}
          .tg-composer{width:calc(100vw - 20px)}
          .tg-bubble{max-width:calc(100% - 42px)}
          .tg-topic-card-title{font-size:22px}
          .tg-chat-stream{padding-bottom:182px}
        }
      `}</style>
    </div>
  );
}
