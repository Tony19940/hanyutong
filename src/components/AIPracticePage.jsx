import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePronunciation } from '../hooks/usePronunciation.js';
import { api } from '../utils/api.js';
import { resolveAvatarUrl } from '../utils/avatar.js';

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

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function buildUserDisplay(user) {
  const displayName = user?.display_name || user?.name || user?.username || '你';
  const username = user?.username ? `@${user.username}` : '今天在线';
  const fallbackAvatarId = user?.fallbackAvatarId || user?.fallback_avatar_id || null;
  return {
    displayName,
    username,
    avatarUrl: resolveAvatarUrl(user, fallbackAvatarId),
    initial: displayName.trim().slice(0, 1) || '你',
  };
}

function buildCoachDisplay(status) {
  return {
    displayName: 'Bunson老师',
    username: status === 'error' ? '连接异常' : '在线',
    avatarUrl: TEACHER_AVATAR,
  };
}

function buildTopicNote(scenario, state) {
  if (!scenario) return '选择一个今日话题';
  const phase = state?.currentLesson?.phase || '';
  const progress = state?.totalLessons ? `${Math.min((state.lessonIndex || 0) + 1, state.totalLessons)}/${state.totalLessons}` : '';
  return [scenario.dailyTopic, phase, progress].filter(Boolean).join(' · ');
}

function buildSystemNote(text) {
  return {
    id: `note-${Date.now()}`,
    sender: 'system',
    kind: 'guide',
    displayText: text,
    createdAt: new Date().toISOString(),
  };
}

function withCreatedAt(message) {
  return {
    ...message,
    createdAt: message?.createdAt || new Date().toISOString(),
  };
}

export default function AIPracticePage({ user }) {
  const [availability, setAvailability] = useState({ available: false, missing: [], scenarios: [], dailyScenarios: [] });
  const [scenarioId, setScenarioId] = useState(null);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [state, setState] = useState(null);
  const [status, setStatus] = useState('loading');
  const [statusDetail, setStatusDetail] = useState('正在读取对话配置。');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isAwaitingReply, setIsAwaitingReply] = useState(false);
  const [startingTopicId, setStartingTopicId] = useState(null);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [playingProgress, setPlayingProgress] = useState({ currentTime: 0, duration: 0 });
  const [learnerAvatarFailed, setLearnerAvatarFailed] = useState(false);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [inputUnlocked, setInputUnlocked] = useState(false);
  const { play, stop } = usePronunciation();

  const scrollRef = useRef(null);
  const captureContextRef = useRef(null);
  const processorRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const pendingQueueRef = useRef([]);
  const drainingRef = useRef(false);
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
  const coach = useMemo(() => buildCoachDisplay(status), [status]);
  const learner = useMemo(() => {
    const nextLearner = buildUserDisplay(user);
    if (learnerAvatarFailed) {
      return {
        ...nextLearner,
        avatarUrl: resolveAvatarUrl({}, user?.fallbackAvatarId || user?.fallback_avatar_id || null),
      };
    }
    return nextLearner;
  }, [learnerAvatarFailed, user]);

  function clearAudioUrls() {
    audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    audioUrlsRef.current.clear();
  }

  async function playMessageAudio(message, audioSrc = message.audioUrl) {
    if (!audioSrc) return;
    await play({
      audioSrc,
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
    });
  }

  async function drainMessageQueue() {
    if (drainingRef.current) return;
    drainingRef.current = true;
    setInputUnlocked(false);

    while (pendingQueueRef.current.length > 0) {
      const nextMessage = pendingQueueRef.current.shift();
      setMessages((current) => [...current, nextMessage]);
      setStatusDetail(nextMessage.language === 'zh' ? '老师在示范中文。' : 'Bunson老师正在引导。');
      await wait(240);
      if (nextMessage.audioUrl) {
        await playMessageAudio(nextMessage);
      }
      if (nextMessage.activatesRecording) {
        setInputUnlocked(true);
        setStatusDetail('轮到你说了，点击录音开始。');
        break;
      }
      if (nextMessage.delayBeforeShowMs > 0) {
        await wait(nextMessage.delayBeforeShowMs);
      }
    }

    drainingRef.current = false;
  }

  function enqueueMessages(nextMessages) {
    pendingQueueRef.current.push(...nextMessages.map(withCreatedAt));
    void drainMessageQueue();
  }

  async function ensureMicrophoneAccess() {
    if (mediaStreamRef.current) {
      return mediaStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
      },
    });
    mediaStreamRef.current = stream;
    setMicrophoneReady(true);
    return stream;
  }

  function teardownRecording({ preserveStream = true } = {}) {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (!preserveStream && mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      setMicrophoneReady(false);
    }
    if (captureContextRef.current) {
      captureContextRef.current.close().catch(() => {});
      captureContextRef.current = null;
    }
    chunksRef.current = [];
    setIsRecording(false);
    setRecordSeconds(0);
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
      teardownRecording({ preserveStream: false });
    };
  }, [stop]);

  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = window.setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    setLearnerAvatarFailed(false);
  }, [user?.avatarUrl, user?.avatar_url]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const node = scrollRef.current;
    const rafId = window.requestAnimationFrame(() => {
      if (typeof node.scrollTo === 'function') {
        node.scrollTo({
          top: node.scrollHeight,
          behavior: 'smooth',
        });
      } else {
        node.scrollTop = node.scrollHeight;
      }
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [messages, isAwaitingReply]);

  useEffect(() => {
    pendingQueueRef.current = [];
    clearAudioUrls();
    setMessages([]);
    setSession(null);
    setState(null);
    setStartingTopicId(null);
    setPlayingMessageId(null);
    setPlayingProgress({ currentTime: 0, duration: 0 });
    setIsAwaitingReply(false);
    setInputUnlocked(false);
    setMicrophoneReady(Boolean(mediaStreamRef.current));
    setStatus(availability.available ? 'idle' : 'error');
    setStatusDetail(availability.available ? '选择一个今日话题。' : '对话配置还没配齐。');
    stop();
    teardownRecording({ preserveStream: false });
  }, [availability.available, scenarioId, stop]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStartTopic(nextScenarioId = scenario?.id) {
    const selectedScenario = scenarios.find((item) => item.id === nextScenarioId)
      ?? dailyScenarios.find((item) => item.id === nextScenarioId)
      ?? scenario;
    if (!selectedScenario) return;

    setScenarioId(selectedScenario.id);
    setStatus('starting');
    setStatusDetail('正在准备今日话题。');
    setStartingTopicId(selectedScenario.id);
    setMessages([]);
    setInputUnlocked(false);
    pendingQueueRef.current = [];

    try {
      const response = await api.startDialogueSession(selectedScenario.id);
      setSession(response.session);
      setState(response.state);
      setMessages([buildSystemNote(buildTopicNote(response.session.scenario, response.state))]);
      enqueueMessages(response.messages || []);
      setStatus(response.state?.isComplete ? 'complete' : 'active');
      setStatusDetail('Bunson老师正在开始今天的课程。');
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

    teardownRecording({ preserveStream: false });
    try {
      await api.stopDialogueSession({ sessionId: session.sessionId });
    } catch {}
    pendingQueueRef.current = [];
    setSession(null);
    setState(null);
    setMessages([]);
    setPlayingMessageId(null);
    setPlayingProgress({ currentTime: 0, duration: 0 });
    setIsAwaitingReply(false);
    setInputUnlocked(false);
    setStatus(availability.available ? 'idle' : 'error');
    setStatusDetail(availability.available ? '重新选择一个今日话题。' : '对话配置还没配齐。');
  }

  async function startRecording() {
    if (isRecording || isSending || status !== 'active' || !inputUnlocked) return;
    try {
      stop();
      const stream = await ensureMicrophoneAccess();
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
    setIsAwaitingReply(true);
    setInputUnlocked(false);
    const durationSeconds = Math.max(recordSeconds, 1);

    const merged = mergeFloat32Chunks(chunksRef.current);
    const audioBlob = float32ToWavBlob(merged);
    const localAudioUrl = URL.createObjectURL(audioBlob);
    audioUrlsRef.current.add(localAudioUrl);
    teardownRecording();

    const localMessageId = `local-${Date.now()}`;
    setMessages((current) => current.concat({
      id: localMessageId,
      sender: 'learner',
      kind: 'learner_audio',
      displayText: '识别中...',
      audioUrl: localAudioUrl,
      createdAt: new Date().toISOString(),
      durationSeconds,
    }));

    try {
      const response = await api.sendDialogueMessage(session.sessionId, audioBlob);
      setState(response.state);
      setStatus(response.state?.isComplete ? 'complete' : 'active');
      setStatusDetail(response.state?.isComplete ? '本次话题已完成。' : 'Bunson老师正在回复...');

      setMessages((current) =>
        current.map((message) =>
          message.id === localMessageId
            ? {
                ...message,
                displayText: response.userMessage?.displayText || '我刚才没有听清。',
                createdAt: response.userMessage?.createdAt || message.createdAt,
              }
            : message
        )
      );

      enqueueMessages(response.messages || []);
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === localMessageId
            ? {
                ...message,
                displayText: '发送失败，请再试一次。',
              }
            : message
        )
      );
      setStatus('error');
      setStatusDetail(error.message || '发送语音失败。');
    } finally {
      setIsAwaitingReply(false);
      setIsSending(false);
    }
  }

  const recordButtonLabel = isRecording ? '结束录音' : '开始录音';
  const recordButtonDisabled = !session?.sessionId || isSending || status === 'complete' || (!inputUnlocked && !isRecording);
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
                <span>{isAwaitingReply ? '正在回复…' : coach.username}</span>
              </div>
            </div>
          </div>
          {session?.sessionId ? (
            <button type="button" className="tg-stop-btn" onClick={handleStopTopic}>
              结束
            </button>
          ) : null}
        </header>

        <div className="tg-chat-body">
          {!availability.available && availability.missing?.length > 0 ? (
            <div className="tg-warning">{availability.missing.join('、')}</div>
          ) : null}

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
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  if (message.sender === 'system') {
                    return (
                      <div key={message.id} className="tg-date-chip">
                        {message.displayText}
                      </div>
                    );
                  }

                  const isTeacher = message.sender === 'teacher';
                  return (
                    <div key={message.id} className={`tg-message-row ${isTeacher ? 'assistant' : 'user'} tg-message-enter`}>
                      {isTeacher ? (
                        <div className="tg-message-avatar">
                          <img className="tg-peer-avatar image small" src={coach.avatarUrl} alt={coach.displayName} />
                        </div>
                      ) : null}

                      <div className={`tg-bubble ${isTeacher ? 'assistant' : 'user'}`}>
                        {isTeacher ? <div className="tg-bubble-name">{coach.displayName}</div> : null}
                        {message.displayText ? <div className="tg-bubble-text">{message.displayText}</div> : null}
                        {message.pinyin ? <div className="tg-bubble-pinyin">{message.pinyin}</div> : null}
                        {message.khmerText && message.language === 'zh' ? (
                          <div className="tg-bubble-translation">{message.khmerText}</div>
                        ) : null}

                        {message.audioUrl ? (
                          <div className="tg-voice-stack">
                            <button
                              type="button"
                              className={`tg-voice-card ${playingMessageId === message.id ? 'playing' : ''}`}
                              onClick={() => playMessageAudio(message)}
                            >
                              <span className="tg-voice-play">{playingMessageId === message.id ? '❚❚' : '▶'}</span>
                              <span className="tg-voice-progress" style={{ width: playingMessageId === message.id ? `${playbackRatio * 100}%` : '0%' }}></span>
                              <span className="tg-voice-wave">
                                <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
                              </span>
                              <span className="tg-voice-duration">{message.durationSeconds ? formatTimer(message.durationSeconds) : '--:--'}</span>
                            </button>
                            {message.audioSlowUrl && message.language === 'zh' ? (
                              <button
                                type="button"
                                className="tg-slow-replay-btn"
                                onClick={() => playMessageAudio(message, message.audioSlowUrl)}
                              >
                                慢速重播
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="tg-bubble-meta">
                          <span>{formatClock(message.createdAt)}</span>
                          {!isTeacher ? <span className="tg-bubble-check">✓✓</span> : null}
                        </div>
                      </div>

                      {!isTeacher ? (
                        <div className="tg-message-avatar">
                          {learner.avatarUrl ? (
                            <img
                              className="tg-peer-avatar image small"
                              src={learner.avatarUrl}
                              alt={learner.displayName}
                              onError={() => setLearnerAvatarFailed(true)}
                            />
                          ) : (
                            <div className="tg-peer-avatar user small">{learner.initial}</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {isAwaitingReply ? (
                  <div className="tg-message-row assistant">
                    <div className="tg-message-avatar">
                      <img className="tg-peer-avatar image small" src={coach.avatarUrl} alt={coach.displayName} />
                    </div>
                    <div className="tg-bubble assistant tg-typing-bubble">
                      <div className="tg-bubble-name">{coach.displayName}</div>
                      <div className="tg-typing-indicator" aria-label="对方正在输入">
                        <i></i><i></i><i></i>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="tg-composer-wrap">
          <div className="tg-composer">
            <div className="tg-composer-phase">{buildTopicNote(session?.scenario, state)}</div>
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
              <span className="tg-record-timer">
                <span className="tg-record-inline-dot"></span>
                <span>{formatTimer(recordSeconds)}</span>
              </span>
            </button>
            <div className="tg-mic-hint">
              <span className={`tg-mic-status-dot ${microphoneReady ? 'ready' : ''}`}></span>
              <span>{statusDetail}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .im-page{flex:1 1 0%;display:flex;min-height:0;position:relative;overflow:hidden;z-index:10}
        .im-shell{flex:1 1 0%;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:12px 12px 0;max-width:430px;margin:0 auto;width:100%}
        .tg-chat-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 4px 12px;border-bottom:1px solid rgba(255,255,255,0.06)}
        .tg-chat-peer{display:flex;align-items:center;gap:12px;min-width:0}
        .tg-peer-avatar{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,var(--brand-teal),var(--brand-green));color:#041109;font-size:18px;font-weight:800}
        .tg-peer-avatar.user{background:linear-gradient(180deg,var(--brand-gold),#d0a54a);color:var(--dialog-user-text)}
        .tg-peer-avatar.small{width:34px;height:34px;font-size:13px}
        .tg-peer-avatar.image{object-fit:cover}
        .tg-peer-name{font-size:18px;font-weight:800;color:var(--home-title-color);line-height:1.15;font-family:'Outfit','Noto Sans SC',sans-serif}
        .tg-peer-status{margin-top:4px;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary)}
        .tg-status-dot{width:8px;height:8px;border-radius:50%;background:var(--brand-teal)}
        .tg-status-dot.error{background:#d66767}
        .tg-stop-btn{min-width:70px;height:38px;border-radius:999px;border:1px solid var(--surface-border);background:var(--settings-surface);color:var(--text-primary);font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
        .tg-chat-body{flex:1 1 0%;min-height:0;display:flex;flex-direction:column;overflow:hidden}
        .tg-warning{margin-bottom:10px;padding:10px 12px;border-radius:16px;background:rgba(225,191,83,.10);border:1px solid rgba(225,191,83,.22);font-size:12px;color:var(--text-secondary)}
        .tg-chat-stream{flex:1;min-height:0;display:grid;gap:10px;padding:12px 0 226px;overflow-y:auto;align-content:start;scroll-behavior:smooth;background:var(--dialog-shell-bg)}
        .tg-date-chip{justify-self:center;max-width:92%;padding:7px 12px;border-radius:999px;background:var(--dialog-chip-bg);color:var(--dialog-chip-text);font-size:11px;border:1px solid var(--surface-border)}
        .tg-topic-grid-shell{display:grid;align-content:center;gap:16px;min-height:480px;padding:12px 0 24px}
        .tg-topic-grid-title{justify-self:center;font-size:12px;font-weight:800;color:var(--accent-gold);letter-spacing:.22em;text-transform:uppercase}
        .tg-topic-grid{display:grid;gap:14px}
        .tg-topic-card{display:block;width:100%;min-height:124px;padding:20px 18px;border:none;border-radius:28px;background:var(--home-card-bg);border:1px solid var(--home-card-border);text-align:left;color:var(--text-primary);box-shadow:var(--panel-shadow)}
        .tg-topic-card-kicker{font-size:11px;font-weight:800;color:var(--accent-gold);text-transform:uppercase;letter-spacing:.18em}
        .tg-topic-card-title{margin-top:10px;font-size:24px;font-weight:900;line-height:1.15;font-family:'Outfit','Noto Sans SC',sans-serif}
        .tg-topic-card-subtitle{margin-top:8px;font-size:13px;line-height:1.65;color:var(--text-secondary)}
        .tg-message-row{display:flex;align-items:flex-end;gap:8px}
        .tg-message-row.assistant{justify-content:flex-start}
        .tg-message-row.user{justify-content:flex-end}
        .tg-message-avatar{width:34px;display:flex;justify-content:center;flex-shrink:0}
        .tg-bubble{max-width:min(82%,312px);padding:10px 12px 8px;border-radius:18px;box-shadow:0 10px 20px rgba(0,0,0,.12)}
        .tg-bubble.assistant{background:var(--dialog-assistant-bubble);color:var(--dialog-assistant-text);border-top-left-radius:8px}
        .tg-bubble.user{background:var(--dialog-user-bubble);color:var(--dialog-user-text);border-top-right-radius:8px}
        .tg-bubble-name{margin-bottom:4px;font-size:11px;font-weight:800;color:var(--brand-teal)}
        .tg-bubble-text{font-size:14px;line-height:1.65;white-space:pre-wrap}
        .tg-bubble-pinyin{margin-top:6px;font-size:12px;line-height:1.6;color:rgba(255,255,255,.74)}
        .tg-bubble.user .tg-bubble-pinyin{color:rgba(32,66,59,.76)}
        .tg-bubble-translation{margin-top:6px;font-size:12px;line-height:1.65;color:var(--dialog-assistant-translation)}
        .tg-voice-stack{display:grid;gap:8px;margin-top:8px}
        .tg-voice-card{position:relative;overflow:hidden;width:100%;height:42px;border:1px solid rgba(255,255,255,.06);border-radius:999px;display:flex;align-items:center;gap:10px;padding:0 12px;background:var(--surface);color:inherit}
        .tg-voice-play,.tg-voice-wave,.tg-voice-duration{position:relative;z-index:1}
        .tg-voice-play{width:20px;text-align:center;font-size:12px;font-weight:900}
        .tg-voice-progress{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,rgba(142,212,195,.22),rgba(225,191,83,.16));border-radius:999px;transition:width .08s linear}
        .tg-voice-wave{display:inline-flex;align-items:flex-end;gap:3px;flex:1}
        .tg-voice-wave i{width:3px;background:currentColor;border-radius:999px;opacity:.55}
        .tg-voice-duration{font-size:12px;font-weight:700;opacity:.72}
        .tg-slow-replay-btn{justify-self:end;min-width:88px;height:32px;padding:0 12px;border-radius:999px;border:1px solid rgba(245,216,143,.32);background:rgba(245,216,143,.12);color:var(--accent-gold);font-size:12px;font-weight:700}
        .tg-bubble-meta{margin-top:6px;display:flex;justify-content:flex-end;align-items:center;gap:6px;font-size:11px;opacity:.72}
        .tg-bubble-check{font-size:11px;letter-spacing:-0.08em}
        .tg-typing-bubble{min-width:88px}
        .tg-typing-indicator{display:inline-flex;align-items:center;gap:6px;padding:6px 2px 2px}
        .tg-typing-indicator i{width:8px;height:8px;border-radius:999px;background:rgba(142,212,195,.7)}
        .tg-composer-wrap{position:fixed;left:0;right:0;bottom:78px;padding:0 12px 10px;z-index:40;display:flex;justify-content:center;pointer-events:none}
        .tg-composer{width:min(430px,calc(100vw - 24px));padding:12px;border-radius:24px;background:var(--dialog-composer-bg);border:1px solid var(--surface-border);backdrop-filter:blur(18px);pointer-events:auto;box-shadow:var(--panel-shadow)}
        .tg-composer-phase{margin-bottom:10px;font-size:11px;color:var(--text-secondary);letter-spacing:.1em;text-transform:uppercase}
        .tg-record-action{height:56px;border:none;border-radius:999px;font-size:15px;font-weight:800;background:var(--dialog-record-bg);color:var(--dialog-record-text);display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 18px}
        .tg-record-action.full{width:100%}
        .tg-record-action.recording{background:var(--dialog-record-bg-active);color:var(--dialog-user-text)}
        .tg-record-action:disabled{opacity:.42}
        .tg-record-left{display:flex;align-items:center;gap:10px}
        .tg-record-timer{display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.12);font-size:12px;font-weight:800;color:var(--dialog-record-text)}
        .tg-record-inline-dot{width:8px;height:8px;border-radius:999px;background:rgba(255,255,255,.4)}
        .tg-mic-hint{margin-top:10px;display:flex;align-items:flex-start;gap:8px;font-size:11px;color:var(--text-secondary);line-height:1.45}
        .tg-mic-status-dot{width:8px;height:8px;border-radius:999px;background:rgba(225,191,83,.52);flex-shrink:0;margin-top:4px}
        .tg-mic-status-dot.ready{background:var(--brand-teal)}
        @media (max-width:640px){
          .im-shell{padding:8px 10px 0}
          .tg-composer-wrap{bottom:74px;padding:0 10px 8px}
          .tg-composer{width:calc(100vw - 20px)}
          .tg-bubble{max-width:calc(100% - 42px)}
          .tg-chat-stream{padding-bottom:212px}
        }
      `}</style>
    </div>
  );
}
