import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePronunciation } from '../hooks/usePronunciation.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { getPrimaryExample, getWordExamples } from '../utils/vocabulary.js';
import { useAppShell } from '../i18n/index.js';
import CardFront from './word-card/CardFront.jsx';
import CardBack from './word-card/CardBack.jsx';
import QuickActions from './word-card/QuickActions.jsx';

const SWIPE_THRESHOLD = 80;
const TAP_THRESHOLD = 10;
const DEFAULT_SLOW_EXAMPLE_RATE = 0.76;

export default function WordCard({
  word,
  index,
  total,
  onSwipeLeft,
  onSwipeRight,
  onReview,
  mode = 'home',
  autoplaySequence = false,
  examplePlaybackRate = 1,
}) {
  const { voiceType } = useAppShell();
  const telegram = useTelegram();
  const { play, stop } = usePronunciation();
  const [overlayDir, setOverlayDir] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [speakingTarget, setSpeakingTarget] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [sequenceActive, setSequenceActive] = useState(autoplaySequence);
  const [showContent, setShowContent] = useState(false);
  const cardRef = useRef(null);
  const startXRef = useRef(0);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const lastClientX = useRef(0);
  const sequenceTokenRef = useRef(0);
  const shouldUseDynamicVoice = Boolean(voiceType);

  const examples = getWordExamples(word).slice(0, 2);
  const primaryExample = getPrimaryExample(word);
  const reviewDue = Boolean(word?.reviewState);
  const showReviewActions = Boolean(onReview || reviewDue);

  useEffect(() => {
    stop();
    sequenceTokenRef.current += 1;
    setOverlayDir(null);
    setAnimating(false);
    setFlipped(false);
    setSpeakingTarget(null);
    setAudioError(null);
    setSequenceActive(autoplaySequence);
    setShowContent(false);
    const timer = window.setTimeout(() => setShowContent(true), 50);
    return () => {
      window.clearTimeout(timer);
      stop();
      sequenceTokenRef.current += 1;
    };
  }, [autoplaySequence, stop, word?.id]);

  const handlePlaybackState = useCallback((target) => (state) => {
    if (state.kind === 'playing') {
      setSpeakingTarget(target);
      return;
    }
    if (state.kind === 'ended' || state.kind === 'stopped') {
      setSpeakingTarget((current) => (current === target ? null : current));
    }
  }, []);

  const playAudio = useCallback(async ({
    target,
    text,
    audioSrc,
    playbackRate = 1,
    ttsRate = 0.85,
  }) => {
    setAudioError(null);
    try {
      const result = await play({
        text,
        audioSrc: shouldUseDynamicVoice ? null : audioSrc,
        voiceType: shouldUseDynamicVoice ? voiceType : '',
        playbackRate,
        ttsRate,
        onStateChange: handlePlaybackState(target),
      });
      if (result?.mode === 'none') {
        setAudioError(target);
      }
      return result;
    } catch (error) {
      setAudioError(target);
      throw error;
    }
  }, [handlePlaybackState, play, shouldUseDynamicVoice, voiceType]);

  useEffect(() => {
    if (!showContent || !sequenceActive || !autoplaySequence || !word?.chinese) return undefined;
    const token = sequenceTokenRef.current;

    const run = async () => {
      const queue = [
        {
          target: 'word',
          text: word.chinese,
          audioSrc: word.audio_word,
          playbackRate: 1,
          ttsRate: 0.85,
        },
        ...examples.map((example) => ({
          target: example.id,
          text: example.chinese,
          audioSrc: example.audio,
          playbackRate: examplePlaybackRate,
          ttsRate: examplePlaybackRate < 1 ? DEFAULT_SLOW_EXAMPLE_RATE : 0.85,
        })),
      ];

      for (const item of queue) {
        if (sequenceTokenRef.current !== token || !sequenceActive) break;
        await playAudio(item);
        if (sequenceTokenRef.current !== token || !sequenceActive) break;
        await new Promise((resolve) => window.setTimeout(resolve, 180));
      }
    };

    run().catch(() => {});
    return () => {
      sequenceTokenRef.current += 1;
    };
  }, [autoplaySequence, examplePlaybackRate, examples, playAudio, sequenceActive, showContent, word]);

  const triggerCardAction = useCallback((direction) => {
    if (animating) return;
    telegram.haptic('impact', direction === 'left' ? 'medium' : 'light');
    setAnimating(true);
    setOverlayDir(direction);
    const card = cardRef.current;
    if (card) {
      card.style.transition = 'transform 0.28s cubic-bezier(.22,1,.36,1), opacity 0.28s';
      card.style.transform = direction === 'left'
        ? 'translateX(-120%) rotate(-10deg) scale(0.94)'
        : 'translateX(120%) rotate(10deg) scale(0.94)';
      card.style.opacity = '0';
    }
    window.setTimeout(() => {
      if (direction === 'left') {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
      if (card) {
        card.style.transition = 'none';
        card.style.transform = '';
        card.style.opacity = '';
      }
      setAnimating(false);
      setOverlayDir(null);
    }, 260);
  }, [animating, onSwipeLeft, onSwipeRight, telegram]);

  const handleStart = useCallback((clientX) => {
    if (animating) return;
    stop();
    isDragging.current = true;
    hasMoved.current = false;
    startXRef.current = clientX;
    if (cardRef.current) cardRef.current.style.transition = 'none';
  }, [animating, stop]);

  const handleMove = useCallback((clientX) => {
    if (!isDragging.current || animating) return;
    const dx = clientX - startXRef.current;
    if (Math.abs(dx) > TAP_THRESHOLD) {
      hasMoved.current = true;
    }
    if (cardRef.current && hasMoved.current) {
      const rotation = dx * 0.045;
      cardRef.current.style.transform = `translateX(${dx}px) rotate(${rotation}deg)`;
    }
    if (dx < -30) setOverlayDir('left');
    else if (dx > 30) setOverlayDir('right');
    else setOverlayDir(null);
  }, [animating]);

  const handleEnd = useCallback((clientX) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dx = clientX - startXRef.current;
    const card = cardRef.current;

    if (!hasMoved.current) {
      setOverlayDir(null);
      setFlipped((current) => !current);
      telegram.haptic('selection');
      return;
    }

    if (card) {
      card.style.transition = 'transform 0.24s cubic-bezier(.22,1,.36,1)';
    }

    if (dx <= -SWIPE_THRESHOLD) {
      triggerCardAction('left');
      return;
    }
    if (dx >= SWIPE_THRESHOLD) {
      triggerCardAction('right');
      return;
    }

    if (card) card.style.transform = '';
    setOverlayDir(null);
  }, [telegram, triggerCardAction]);

  if (!word) return null;

  return (
    <div className="word-card-container">
      <div
        className={`word-card-shell ${flipped ? 'flipped' : ''}`}
        ref={cardRef}
        onTouchStart={(event) => handleStart(event.touches[0].clientX)}
        onTouchMove={(event) => {
          lastClientX.current = event.touches[0].clientX;
          handleMove(event.touches[0].clientX);
        }}
        onTouchEnd={() => handleEnd(lastClientX.current)}
        onMouseDown={(event) => handleStart(event.clientX)}
        onMouseMove={(event) => {
          if (isDragging.current) handleMove(event.clientX);
        }}
        onMouseUp={(event) => handleEnd(event.clientX)}
        onMouseLeave={(event) => {
          if (isDragging.current) handleEnd(event.clientX);
        }}
      >
        <div className={`swipe-overlay left-ov ${overlayDir === 'left' ? 'visible' : ''}`}>
          <span className="ov-label">{mode === 'collection' ? '移出' : '学会'}</span>
        </div>
        <div className={`swipe-overlay right-ov ${overlayDir === 'right' ? 'visible' : ''}`}>
          <span className="ov-label">{mode === 'collection' ? '保留' : '收藏'}</span>
        </div>

        <div className={`word-card-inner ${showContent ? 'visible' : ''}`}>
          <div className="word-card-face">
            <CardFront
              word={word}
              reviewDue={reviewDue}
              example={primaryExample}
              speakingTarget={speakingTarget}
              audioError={audioError}
              onPlayWord={() => playAudio({ target: 'word', text: word.chinese, audioSrc: word.audio_word })}
              onPlayExample={() => playAudio({
                target: 'example',
                text: primaryExample?.chinese ?? word.example_cn,
                audioSrc: primaryExample?.audio ?? word.audio_example,
                playbackRate: examplePlaybackRate,
                ttsRate: examplePlaybackRate < 1 ? DEFAULT_SLOW_EXAMPLE_RATE : 0.85,
              })}
            />
          </div>
          <div className="word-card-face back">
            <CardBack
              examples={examples.length ? examples : [{ id: 'fallback', chinese: word.example_cn || '', khmer: word.example_km || '', pinyin: word.example_pinyin || '', audio: word.audio_example || null }]}
              speakingTarget={speakingTarget}
              audioError={audioError}
              showReviewActions={showReviewActions}
              onPlayExample={(example) => playAudio({
                target: example.id,
                text: example.chinese,
                audioSrc: example.audio,
                playbackRate: examplePlaybackRate,
                ttsRate: examplePlaybackRate < 1 ? DEFAULT_SLOW_EXAMPLE_RATE : 0.85,
              })}
              onReview={(quality) => onReview?.(quality)}
            />
          </div>
        </div>
      </div>

      <QuickActions
        mode={mode}
        flipped={flipped}
        onFlip={() => setFlipped((current) => !current)}
        onLeftAction={() => triggerCardAction('left')}
        onRightAction={() => triggerCardAction('right')}
        sequenceActive={sequenceActive}
        onToggleSequence={() => {
          setSequenceActive((current) => {
            const next = !current;
            if (!next) stop();
            return next;
          });
        }}
      />

      <div className="word-card-footer">
        <span>{index + 1}/{total}</span>
        <span>{showReviewActions ? '翻面后可直接打分复习' : '左右滑动或点按翻面'}</span>
      </div>

      <style>{`
        .word-card-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          gap: 10px;
        }
        .word-card-shell {
          flex: 1;
          min-height: 0;
          position: relative;
          border-radius: 30px;
          background: var(--word-shell-bg);
          border: 1px solid var(--word-shell-border);
          box-shadow: 0 24px 60px rgba(0,0,0,0.32);
          overflow: hidden;
          touch-action: pan-y;
        }
        .word-card-inner {
          height: 100%;
          display: grid;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .word-card-inner.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .word-card-shell.flipped .word-card-inner {
          transform: rotateY(180deg);
        }
        .word-card-face {
          grid-area: 1 / 1;
          backface-visibility: hidden;
          padding: 14px;
          display: flex;
          flex-direction: column;
        }
        .word-card-face.back {
          transform: rotateY(180deg);
        }
        .word-face {
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: 100%;
        }
        .word-stage,
        .word-preview-card,
        .word-back-copy {
          border-radius: 24px;
          background: var(--word-stage-bg);
          border: 1px solid var(--word-stage-border);
        }
        .word-stage {
          padding: 16px;
          display: grid;
          gap: 14px;
        }
        .word-preview-card {
          padding: 14px 16px;
          background: rgba(255,255,255,0.04);
        }
        .word-face-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--text-muted);
          font-weight: 800;
        }
        .wrd-cn {
          font-size: clamp(48px, 12vw, 78px);
          font-weight: 800;
          text-align: center;
          line-height: 1;
          color: var(--text-primary);
          font-family: 'Outfit', 'Noto Sans SC', sans-serif;
        }
        .wrd-py {
          margin-top: 6px;
          text-align: center;
          color: var(--accent-gold);
          font-size: 16px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .wrd-km {
          margin-top: 12px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 17px;
          line-height: 1.6;
          font-family: 'Noto Sans Khmer', 'Noto Sans SC', sans-serif;
        }
        .word-face-audio-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .word-audio-btn {
          min-height: 44px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: var(--text-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
        }
        .word-audio-btn.active {
          background: rgba(30,215,96,0.18);
          border-color: rgba(30,215,96,0.32);
        }
        .word-audio-btn.error {
          background: rgba(239,68,68,0.12);
          border-color: rgba(239,68,68,0.24);
        }
        .word-preview-chip {
          display: inline-flex;
          align-self: flex-start;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          color: var(--accent-gold);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .word-preview-cn {
          margin-top: 12px;
          font-size: 18px;
          color: var(--text-primary);
          font-weight: 700;
          line-height: 1.4;
        }
        .word-preview-km {
          margin-top: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.7;
          font-family: 'Noto Sans Khmer', 'Noto Sans SC', sans-serif;
        }
        .word-back-copy {
          flex: 1;
          min-height: 0;
          padding: 16px;
          display: flex;
          flex-direction: column;
        }
        .word-example-stack {
          margin-top: 14px;
          display: grid;
          gap: 10px;
          overflow: auto;
        }
        .word-example-card {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
          padding: 12px;
          border-radius: 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .word-example-index {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.08);
          color: var(--accent-gold);
          font-size: 11px;
          font-weight: 800;
        }
        .word-example-copy {
          min-width: 0;
        }
        .word-example-cn {
          font-size: 16px;
          color: var(--text-primary);
          line-height: 1.45;
        }
        .word-example-py {
          margin-top: 4px;
          font-size: 12px;
          color: var(--accent-gold);
        }
        .word-example-km {
          margin-top: 6px;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.6;
          font-family: 'Noto Sans Khmer', 'Noto Sans SC', sans-serif;
        }
        .review-score-row {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .review-score-btn {
          min-height: 48px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--text-primary);
          font-weight: 800;
          background: rgba(255,255,255,0.04);
        }
        .review-score-btn.success {
          background: rgba(30,215,96,0.16);
        }
        .review-score-btn.danger {
          background: rgba(239,68,68,0.14);
        }
        .review-hint {
          margin-top: 10px;
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.6;
        }
        .word-quick-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }
        .word-quick {
          min-height: 46px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.05);
          color: var(--text-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
        }
        .word-quick.center {
          background: linear-gradient(135deg, rgba(225,191,83,0.22), rgba(30,215,96,0.18));
        }
        .word-quick.slim {
          grid-column: 1 / -1;
          min-height: 40px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .word-quick.slim.active {
          background: rgba(30,215,96,0.16);
        }
        .word-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 11px;
          color: var(--text-muted);
          padding: 0 2px;
        }
        .swipe-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.16s ease;
          z-index: 4;
          pointer-events: none;
        }
        .swipe-overlay.visible {
          opacity: 1;
        }
        .swipe-overlay.left-ov {
          background: rgba(30,215,96,0.16);
        }
        .swipe-overlay.right-ov {
          background: rgba(225,191,83,0.16);
        }
        .ov-label {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
