import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePronunciation } from '../hooks/usePronunciation.js';
import { getPrimaryExample, getWordExamples } from '../utils/vocabulary.js';
import { useAppShell } from '../i18n/index.js';

const SWIPE_THRESHOLD = 80;
const TAP_THRESHOLD = 10;

export default function WordCard({
  word,
  index,
  total,
  onSwipeLeft,
  onSwipeRight,
  mode = 'home',
  autoplaySequence = false,
}) {
  const { voiceType, defaultVoiceType } = useAppShell();
  const [overlayDir, setOverlayDir] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [speakingTarget, setSpeakingTarget] = useState(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const cardRef = useRef(null);
  const startXRef = useRef(0);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const clearSpeakingTimerRef = useRef(null);
  const autoPlayCancelledRef = useRef(false);
  const { play, stop } = usePronunciation();
  const shouldUseDynamicVoice = Boolean(voiceType && voiceType !== defaultVoiceType);

  useEffect(() => {
    stop();
    autoPlayCancelledRef.current = true;
    setSpeakingTarget(null);
    setShowContent(false);
    setIsAutoPlaying(false);
    const timer = setTimeout(() => {
      autoPlayCancelledRef.current = false;
      setShowContent(true);
    }, 80);

    return () => {
      autoPlayCancelledRef.current = true;
      clearTimeout(timer);
      clearTimeout(clearSpeakingTimerRef.current);
      stop();
    };
  }, [stop, word?.id]);

  useEffect(() => {
    if (!showContent || !autoplaySequence || !word?.chinese) return undefined;

    let mounted = true;
    const examples = getWordExamples(word).slice(0, 2);

    const runSequence = async () => {
      setIsAutoPlaying(true);
      const queue = [
        { target: 'word', text: word.chinese, audioSrc: word.audio_word },
        ...examples.map((example, position) => ({
          target: position === 0 ? 'example' : example.id,
          text: example.chinese,
          audioSrc: example.audio,
        })),
      ].filter((item) => item.text || item.audioSrc);

      for (const item of queue) {
        if (!mounted || autoPlayCancelledRef.current) break;
        setSpeakingTarget(item.target);
        await play({
          text: item.text,
          audioSrc: shouldUseDynamicVoice ? null : item.audioSrc,
          voiceType: shouldUseDynamicVoice ? voiceType : '',
        });
        if (!mounted || autoPlayCancelledRef.current) break;
        await new Promise((resolve) => setTimeout(resolve, 220));
      }

      if (mounted) {
        setSpeakingTarget(null);
        setIsAutoPlaying(false);
      }
    };

    const timer = setTimeout(() => {
      if (!autoPlayCancelledRef.current) runSequence();
    }, 320);

    return () => {
      mounted = false;
      autoPlayCancelledRef.current = true;
      clearTimeout(timer);
    };
  }, [autoplaySequence, play, shouldUseDynamicVoice, showContent, voiceType, word]);

  const handleSpeak = useCallback(async ({ text, audioSrc, target, e }) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!text && !audioSrc) return;

    autoPlayCancelledRef.current = true;
    setIsAutoPlaying(false);
    clearTimeout(clearSpeakingTimerRef.current);
    setSpeakingTarget(target);
    await play({
      text,
      audioSrc: shouldUseDynamicVoice ? null : audioSrc,
      voiceType: shouldUseDynamicVoice ? voiceType : '',
    });
    clearSpeakingTimerRef.current = setTimeout(() => setSpeakingTarget(null), 1200);
  }, [play, shouldUseDynamicVoice, voiceType]);

  const handleStart = useCallback((clientX) => {
    if (animating) return;
    autoPlayCancelledRef.current = true;
    setIsAutoPlaying(false);
    stop();
    isDragging.current = true;
    hasMoved.current = false;
    startXRef.current = clientX;
    if (cardRef.current) cardRef.current.style.transition = 'none';
  }, [animating, stop]);

  const handleMove = useCallback((clientX) => {
    if (!isDragging.current || animating) return;
    const dx = clientX - startXRef.current;

    if (Math.abs(dx) > TAP_THRESHOLD) hasMoved.current = true;

    if (cardRef.current && hasMoved.current) {
      const rotation = dx * 0.045;
      const scale = 1 - Math.abs(dx) * 0.00024;
      cardRef.current.style.transform = `translateX(${dx}px) rotate(${rotation}deg) scale(${Math.max(scale, 0.96)})`;
    }
    if (dx < -30) setOverlayDir('left');
    else if (dx > 30) setOverlayDir('right');
    else setOverlayDir(null);
  }, [animating]);

  const handleEnd = useCallback((clientX) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (!hasMoved.current) {
      setOverlayDir(null);
      return;
    }

    const dx = (clientX || 0) - startXRef.current;
    const card = cardRef.current;
    if (card) {
      card.style.transition = 'transform 0.34s cubic-bezier(.22,1,.36,1), opacity 0.34s';
    }

    if (dx < -SWIPE_THRESHOLD && onSwipeLeft) {
      setAnimating(true);
      if (card) {
        card.style.transform = 'translateX(-140%) rotate(-12deg) scale(0.92)';
        card.style.opacity = '0';
      }
      setTimeout(() => { onSwipeLeft(); resetCard(); }, 320);
    } else if (dx > SWIPE_THRESHOLD && onSwipeRight) {
      setAnimating(true);
      if (card) {
        card.style.transform = 'translateX(140%) rotate(12deg) scale(0.92)';
        card.style.opacity = '0';
      }
      setTimeout(() => { onSwipeRight(); resetCard(); }, 320);
    } else {
      if (card) card.style.transform = '';
      setOverlayDir(null);
    }
  }, [onSwipeLeft, onSwipeRight]);

  const resetCard = () => {
    const card = cardRef.current;
    if (card) {
      card.style.transition = 'none';
      card.style.transform = '';
      card.style.opacity = '';
    }
    setOverlayDir(null);
    setAnimating(false);
  };

  const lastClientX = useRef(0);

  if (!word) return null;

  const leftLabel = mode === 'collection' ? '左滑移出收藏' : '左滑学会';
  const rightLabel = mode === 'collection' ? '右滑保留' : '右滑收藏';
  const examples = getWordExamples(word);
  const primaryExample = getPrimaryExample(word);
  const exampleToSpeak = primaryExample?.chinese ?? word.example_cn;
  const exampleAudio = primaryExample?.audio ?? word.audio_example;

  return (
    <div className="word-card-container">
      <div
        className="word-card"
        ref={cardRef}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => { lastClientX.current = e.touches[0].clientX; handleMove(e.touches[0].clientX); }}
        onTouchEnd={() => handleEnd(lastClientX.current)}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => { if (isDragging.current) handleMove(e.clientX); }}
        onMouseUp={(e) => handleEnd(e.clientX)}
        onMouseLeave={(e) => { if (isDragging.current) handleEnd(e.clientX); }}
      >
        <div className={`swipe-overlay left-ov ${overlayDir === 'left' ? 'visible' : ''}`}>
          <span className="ov-label">学会</span>
        </div>
        <div className={`swipe-overlay right-ov ${overlayDir === 'right' ? 'visible' : ''}`}>
          <span className="ov-label">收藏</span>
        </div>

        {/* Main word stage - cream card */}
        <div className={`word-stage ${showContent ? 'animate-fade-in-up stagger-1' : ''}`} style={{ opacity: showContent ? 1 : 0 }}>
          <div className="word-info word-head">
            <div className="wrd-cn">{word.chinese}</div>
            <div className="wrd-py">{word.pinyin}</div>
            <div className="wrd-km">{word.khmer}</div>
          </div>
          <button
            type="button"
            className={`word-speaker ${speakingTarget === 'word' ? 'speaking' : ''}`}
            onClick={(e) => handleSpeak({ text: word.chinese, audioSrc: word.audio_word, target: 'word', e })}
          >
            <i className="fas fa-volume-up"></i>
            <span className="sr-only">朗读单词</span>
          </button>
        </div>

        {/* Example sentences */}
        <div className={`ex-zone ${showContent ? 'animate-fade-in-up stagger-2' : ''}`} style={{ opacity: showContent ? 1 : 0 }}>
          <button
            type="button"
            className={`example-item ${speakingTarget === 'example' ? 'speaking-item' : ''}`}
            onClick={(e) => handleSpeak({ text: exampleToSpeak, audioSrc: exampleAudio, target: 'example', e })}
          >
            <span className="example-badge">①</span>
            <span className="example-item-cn">{exampleToSpeak}</span>
            <span className="example-item-km">{primaryExample?.khmer ?? word.example_km}</span>
            <div className="example-speaker-wrap">
              <i className="fas fa-volume-up example-item-speaker"></i>
            </div>
          </button>
          {examples.slice(1, 2).map((example, idx) => (
            <button
              type="button"
              key={example.id}
              className={`example-item ${speakingTarget === example.id ? 'speaking-item' : ''}`}
              onClick={(e) => handleSpeak({ text: example.chinese, audioSrc: example.audio, target: example.id, e })}
            >
              <span className="example-badge">②</span>
              <span className="example-item-cn">{example.chinese}</span>
              <span className="example-item-km">{example.khmer}</span>
              <div className="example-speaker-wrap">
                <i className="fas fa-volume-up example-item-speaker"></i>
              </div>
            </button>
          ))}
        </div>

        {/* Swipe guide */}
        <div className={`swipe-guide ${showContent ? 'animate-fade-in stagger-3' : ''}`} style={{ opacity: showContent ? 1 : 0 }}>
          <div className="sg lft"><i className="fas fa-arrow-left"></i><span>{leftLabel}</span></div>
          <div className="sg rgt"><i className="fas fa-bookmark"></i><span>{rightLabel}</span></div>
        </div>
      </div>

      <style>{`
        .word-card-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        .word-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-radius: clamp(20px, 4vw, 28px);
          padding: clamp(10px, 1.5vh, 16px) clamp(12px, 2vw, 18px) clamp(8px, 1vh, 14px);
          position: relative;
          overflow: hidden;
          background: var(--word-shell-bg);
          border: 1.5px solid var(--word-shell-border);
          box-shadow: 0 20px 48px rgba(8, 20, 17, 0.22);
          cursor: grab;
          touch-action: pan-y;
          will-change: transform;
          min-height: 0;
        }
        .word-card:active { cursor: grabbing; }
        .word-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 12% 14%, rgba(245,216,143,0.10), transparent 22%),
            linear-gradient(180deg, rgba(255,255,255,0.03), transparent 34%);
          pointer-events: none;
        }

        /* Swipe overlays */
        .swipe-overlay {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
          z-index: 3;
        }
        .swipe-overlay.left-ov { background: rgba(80, 215, 168, 0.16); }
        .swipe-overlay.right-ov { background: rgba(246, 199, 104, 0.14); }
        .swipe-overlay.visible { opacity: 1; }
        .ov-label { font-size: 18px; font-weight: 700; color: #fff; }

        /* Word stage - cream card */
        .word-stage {
          position: relative;
          margin: 0 clamp(4px, 1vw, 10px);
          padding: clamp(16px, 3vh, 32px) clamp(12px, 2vw, 18px) clamp(20px, 3.5vh, 36px);
          border-radius: clamp(18px, 3vw, 24px);
          background: var(--word-stage-bg);
          border: 1.5px solid var(--word-stage-border);
          box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.05);
          overflow: visible;
          z-index: 2;
          flex-shrink: 0;
        }

        /* Word info */
        .word-info {
          text-align: center;
          position: relative;
          z-index: 2;
        }
        .wrd-cn {
          font-size: clamp(48px, 12vw, 78px);
          font-weight: 800;
          color: var(--word-stage-title);
          font-family: 'Manrope', 'Noto Sans SC', serif;
          letter-spacing: 1px;
          line-height: 1.05;
        }
        .wrd-py {
          margin-top: clamp(4px, 0.8vh, 10px);
          font-size: clamp(16px, 3vw, 22px);
          color: var(--word-stage-subtitle);
          font-weight: 500;
        }
        .wrd-km {
          margin-top: clamp(4px, 0.6vh, 8px);
          font-size: clamp(13px, 2.2vw, 17px);
          color: var(--word-stage-khmer);
          line-height: 1.5;
        }

        /* Speaker button - centered at bottom of card */
        .word-speaker {
          position: absolute;
          left: 50%;
          bottom: -20px;
          transform: translateX(-50%);
          width: 44px;
          height: 44px;
          padding: 0;
          border-radius: 999px;
          border: 1.5px solid var(--word-speaker-border);
          background: var(--word-speaker-bg);
          color: var(--word-speaker-icon);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
          z-index: 5;
        }
        .word-speaker.speaking {
          transform: translateX(-50%) translateY(-2px) scale(1.04);
          box-shadow: 0 14px 26px rgba(214,168,75,0.26);
        }
        .word-speaker .sr-only {
          position: absolute;
          width: 1px; height: 1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
        }

        /* Examples zone */
        .ex-zone {
          position: relative;
          z-index: 2;
          margin-top: clamp(14px, 2.5vh, 22px);
          display: flex;
          flex-direction: column;
          gap: clamp(10px, 1.8vh, 16px);
          flex: 1;
          min-height: 0;
        }
        .example-item {
          width: 100%;
          border: 1.5px solid var(--example-card-border);
          background: var(--example-card-bg);
          border-radius: clamp(14px, 2.5vw, 18px);
          padding: clamp(10px, 1.5vh, 14px) 16px clamp(14px, 2vh, 20px) 44px;
          text-align: left;
          display: grid;
          gap: 3px;
          color: #fff;
          position: relative;
          transition: transform 0.18s ease, border-color 0.18s ease;
          box-shadow: 0 10px 20px rgba(8, 20, 17, 0.08);
          overflow: visible;
          flex-shrink: 1;
          min-height: 0;
        }
        .example-item.speaking-item {
          border-color: var(--word-stage-border);
          background: var(--word-stage-bg);
          transform: translateY(-1px);
        }
        .example-badge {
          position: absolute;
          top: clamp(10px, 1.5vh, 14px);
          left: 12px;
          font-size: 14px;
          font-weight: 700;
          color: var(--accent-gold);
        }
        .example-item-cn {
          font-size: clamp(14px, 2.2vw, 17px);
          line-height: 1.45;
          font-weight: 650;
          color: var(--example-text-main);
        }
        .example-item-km {
          font-size: clamp(12px, 1.8vw, 14px);
          line-height: 1.5;
          color: var(--example-text-sub);
        }
        .example-speaker-wrap {
          position: absolute;
          left: 50%;
          bottom: -14px;
          transform: translateX(-50%);
          z-index: 5;
        }
        .example-item-speaker {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          font-size: 12px;
          color: var(--word-speaker-icon);
          background: var(--word-speaker-bg);
          border: 1.5px solid var(--word-speaker-border);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 14px rgba(173, 123, 36, 0.26);
        }

        /* Swipe guide */
        .swipe-guide {
          display: flex;
          justify-content: space-between;
          margin-top: clamp(8px, 1.2vh, 14px);
          padding: 0 4px;
          position: relative;
          z-index: 2;
          flex-shrink: 0;
        }
        .sg {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          opacity: 0.72;
          font-weight: 600;
        }
        .sg.lft { color: var(--accent-secondary); }
        .sg.rgt { color: var(--accent-gold); }
      `}</style>
    </div>
  );
}
