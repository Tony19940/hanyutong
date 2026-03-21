import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePronunciation } from '../hooks/usePronunciation.js';
import { shouldAutoplayPronunciation } from '../utils/audio.js';

const SWIPE_THRESHOLD = 80;
const TAP_THRESHOLD = 10;

export default function WordCard({ word, index, total, onSwipeLeft, onSwipeRight, mode = 'home' }) {
  const [overlayDir, setOverlayDir] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [speakingTarget, setSpeakingTarget] = useState(null);
  const cardRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const clearSpeakingTimerRef = useRef(null);
  const { play, stop } = usePronunciation();

  useEffect(() => {
    stop();
    setSpeakingTarget(null);
    setShowContent(false);
    const timer = setTimeout(() => setShowContent(true), 80);

    return () => {
      clearTimeout(timer);
      clearTimeout(clearSpeakingTimerRef.current);
      stop();
    };
  }, [stop, word?.id]);

  useEffect(() => {
    if (showContent && word?.chinese && shouldAutoplayPronunciation()) {
      const timer = setTimeout(() => {
        play({
          text: word.chinese,
          audioSrc: word.audio_word,
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [play, showContent, word?.audio_word, word?.chinese]);

  const handleSpeak = useCallback(async ({ text, audioSrc, target, e }) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!text && !audioSrc) return;

    clearTimeout(clearSpeakingTimerRef.current);
    setSpeakingTarget(target);
    await play({ text, audioSrc });
    clearSpeakingTimerRef.current = setTimeout(() => setSpeakingTarget(null), 1200);
  }, [play]);

  const handleStart = useCallback((clientX, clientY) => {
    if (animating) return;
    isDragging.current = true;
    hasMoved.current = false;
    startXRef.current = clientX;
    startYRef.current = clientY || 0;
    if (cardRef.current) cardRef.current.style.transition = 'none';
  }, [animating]);

  const handleMove = useCallback((clientX) => {
    if (!isDragging.current || animating) return;
    const dx = clientX - startXRef.current;

    if (Math.abs(dx) > TAP_THRESHOLD) {
      hasMoved.current = true;
    }

    if (cardRef.current && hasMoved.current) {
      const rotation = dx * 0.05;
      const scale = 1 - Math.abs(dx) * 0.0003;
      cardRef.current.style.transform = `translateX(${dx}px) rotate(${rotation}deg) scale(${Math.max(scale, 0.95)})`;
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
      card.style.transition = 'transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.4s';
    }

    if (dx < -SWIPE_THRESHOLD && onSwipeLeft) {
      setAnimating(true);
      if (card) { card.style.transform = 'translateX(-140%) rotate(-12deg) scale(0.9)'; card.style.opacity = '0'; }
      setTimeout(() => { onSwipeLeft(); resetCard(); }, 380);
    } else if (dx > SWIPE_THRESHOLD && onSwipeRight) {
      setAnimating(true);
      if (card) { card.style.transform = 'translateX(140%) rotate(12deg) scale(0.9)'; card.style.opacity = '0'; }
      setTimeout(() => { onSwipeRight(); resetCard(); }, 380);
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

  const leftLabel = mode === 'collection' ? '釣呩焷釤囜灎釣踞灆 路 釣娽瀫釣呩焷釣?' : '釣呩焷釤囜灎釣踞灆';
  const rightLabel = mode === 'collection' ? '釣戓灮釣€釣氠焵釣撫瀾釤€釣?' : '釣呩瀯釤嬦灇釤€釣撫瀾釤€釣?';

  return (
    <div className="word-card-container">
      <div
        className="word-card"
        ref={cardRef}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => { lastClientX.current = e.touches[0].clientX; handleMove(e.touches[0].clientX); }}
        onTouchEnd={() => handleEnd(lastClientX.current)}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => { if (isDragging.current) handleMove(e.clientX); }}
        onMouseUp={(e) => handleEnd(e.clientX)}
        onMouseLeave={(e) => { if (isDragging.current) handleEnd(e.clientX); }}
      >
        <div className={`swipe-overlay left-ov ${overlayDir === 'left' ? 'visible' : ''}`}>
          <div className="ov-icon-wrap ov-green">
            <i className="fas fa-check-circle" style={{ fontSize: 36 }}></i>
          </div>
          <span className="ov-label">釣呩焷釤囜灎釣踞灆!</span>
          <span className="ov-label-cn">宸插浼?鉁?</span>
        </div>

        <div className={`swipe-overlay right-ov ${overlayDir === 'right' ? 'visible' : ''}`}>
          <div className="ov-icon-wrap ov-gold">
            <i className="fas fa-bookmark" style={{ fontSize: 32 }}></i>
          </div>
          <span className="ov-label">釣娽灦釣€釤嬦瀫釤掅灀釣会瀯釣斸瀴釤掅瀲釣?</span>
          <span className="ov-label-cn">宸叉敹钘?鈽?</span>
        </div>

        {total > 0 && (
          <div className="card-counter">{index + 1} / {total}</div>
        )}

        <div className={`icon-zone ${showContent ? 'animate-pop-in' : ''}`} style={{ opacity: showContent ? 1 : 0 }}>
          <div
            className={`word-emoji ${speakingTarget === 'emoji' ? 'speaking' : ''}`}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleSpeak({
                text: word.chinese,
                audioSrc: word.audio_word,
                target: 'emoji',
                e,
              });
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => handleSpeak({ text: word.chinese, audioSrc: word.audio_word, target: 'emoji', e })}
          >
            {word.emoji || '馃摑'}
          </div>
          <div className="spk-badge">
            <i className="fas fa-volume-up"></i>
          </div>
        </div>

        <div className={`word-info ${showContent ? 'animate-fade-in-up stagger-1' : ''}`} style={{ opacity: showContent ? 1 : 0 }}>
          <div className="wrd-cn">{word.chinese}</div>
          <div className="wrd-py">{word.pinyin}</div>
          <div className="wrd-km">{word.khmer}</div>
        </div>

        <div className="hr"></div>

        <div className={`ex-zone ${showContent ? 'animate-fade-in-up stagger-2' : ''}`} style={{ opacity: showContent ? 1 : 0 }}>
          <div className="ex-lbl">釣п瀾釣夺灎釣氠瀻釤?路 渚嬪彞</div>
          <div
            className={`ex-cn ${speakingTarget === 'example' ? 'speaking-text' : ''}`}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleSpeak({
                text: word.example_cn,
                audioSrc: word.audio_example,
                target: 'example',
                e,
              });
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => handleSpeak({ text: word.example_cn, audioSrc: word.audio_example, target: 'example', e })}
          >
            {word.example_cn}
            <i className="fas fa-volume-up ex-speaker"></i>
          </div>
          <div className="ex-km">{word.example_km}</div>
        </div>

        <div className={`swipe-guide ${showContent ? 'animate-fade-in stagger-3' : ''}`} style={{ opacity: showContent ? 1 : 0 }}>
          <div className="sg lft">
            <i className="fas fa-arrow-left"></i>
            <span>{leftLabel}</span>
          </div>
          <div className="sg rgt">
            <i className="fas fa-bookmark"></i>
            <span>{rightLabel}</span>
          </div>
        </div>
      </div>

      <style>{`
        .word-card-container {
          padding: 0 18px;
          flex: 1;
          display: flex;
          align-items: flex-start;
          padding-top: 4px;
          min-height: 0;
        }
        .word-card {
          width: 100%;
          border-radius: 28px;
          padding: 20px 20px 16px;
          position: relative; overflow: hidden;
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(32px) saturate(1.4);
          -webkit-backdrop-filter: blur(32px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 24px 60px rgba(0,0,0,0.4),
                      0 0 0 1px rgba(255,255,255,0.05) inset;
          cursor: grab; touch-action: pan-y;
          will-change: transform;
        }
        .word-card::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #7c3aed, #2563eb, #10b981);
          opacity: 0.8;
        }
        .word-card::after {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 45%;
          background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent);
          pointer-events: none;
          border-radius: 28px 28px 0 0;
        }
        .word-card:active { cursor: grabbing; }

        .swipe-overlay {
          position: absolute; inset: 0; border-radius: 28px;
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
          flex-direction: column; gap: 8px;
          font-family: 'Noto Sans Khmer', sans-serif;
          z-index: 20;
        }
        .swipe-overlay.left-ov {
          background: rgba(16,185,129,0.2);
          backdrop-filter: blur(4px);
          border: 2px solid rgba(16,185,129,0.5);
        }
        .swipe-overlay.right-ov {
          background: rgba(251,191,36,0.15);
          backdrop-filter: blur(4px);
          border: 2px solid rgba(251,191,36,0.45);
        }
        .swipe-overlay.visible { opacity: 1; }
        .ov-icon-wrap {
          width: 64px; height: 64px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .ov-green { background: rgba(16,185,129,0.2); color: #34d399; }
        .ov-gold { background: rgba(251,191,36,0.2); color: #fbbf24; }
        .ov-label { font-size: 16px; font-weight: 700; color: #fff; }
        .ov-label-cn {
          font-size: 12px; color: rgba(255,255,255,0.5);
          font-family: 'Noto Sans SC', sans-serif;
        }

        .card-counter {
          position: absolute; top: 18px; right: 20px;
          font-size: 11px; color: var(--text-muted); font-weight: 500;
          font-family: 'Noto Sans SC', sans-serif;
          background: rgba(255,255,255,0.05);
          padding: 2px 10px; border-radius: 10px;
          z-index: 5;
        }

        .icon-zone {
          display: flex; flex-direction: column;
          align-items: center; margin-bottom: 8px; position: relative;
          transition: opacity 0.3s;
          z-index: 15;
        }
        .word-emoji {
          font-size: 72px; line-height: 1.1;
          filter: drop-shadow(0 12px 24px rgba(0,0,0,0.4));
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
          position: relative;
          z-index: 15;
          padding: 8px;
        }
        .word-emoji:active { transform: scale(0.88); }
        .word-emoji.speaking {
          animation: emojiPulse 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes emojiPulse {
          0% { transform: scale(1); }
          30% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .spk-badge {
          position: absolute; top: 2px; right: calc(50% - 58px);
          width: 28px; height: 28px;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; color: #fff;
          box-shadow: 0 4px 12px rgba(124,58,237,0.45);
          border: 2px solid rgba(255,255,255,0.1);
          pointer-events: none;
        }

        .word-info {
          text-align: center; margin-bottom: 10px;
          transition: opacity 0.3s;
          position: relative; z-index: 5;
        }
        .wrd-cn {
          font-size: 34px; font-weight: 700; color: #fff;
          font-family: 'Noto Serif SC', serif;
          letter-spacing: 6px; margin-bottom: 5px;
          text-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }
        .wrd-py {
          font-size: 15px; color: #a78bfa; margin-bottom: 7px;
          letter-spacing: 1px;
        }
        .wrd-km {
          font-size: 17px; color: rgba(255,255,255,0.7);
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .hr {
          height: 1px; margin: 10px 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
        }

        .ex-zone {
          position: relative; transition: opacity 0.3s;
          z-index: 15;
        }
        .ex-lbl {
          font-size: 10px; color: var(--text-muted);
          letter-spacing: 2px; margin-bottom: 7px;
          font-family: 'Noto Sans SC', sans-serif;
          text-transform: uppercase;
        }
        .ex-cn {
          font-size: 14px; color: #fff; line-height: 1.8;
          margin-bottom: 5px; cursor: pointer;
          font-family: 'Noto Sans SC', sans-serif;
          transition: color var(--transition-fast);
          display: flex; align-items: center; gap: 4px;
          flex-wrap: wrap;
          touch-action: manipulation;
          padding: 4px 0;
        }
        .ex-cn:active { color: #a78bfa; }
        .ex-speaker {
          font-size: 10px; color: #a78bfa;
          opacity: 0.5;
          transition: opacity var(--transition-fast), transform 0.3s;
        }
        .ex-cn:active .ex-speaker { opacity: 1; }
        .speaking-text .ex-speaker {
          opacity: 1;
          animation: speakPulse 0.5s ease;
        }
        @keyframes speakPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        .ex-km {
          font-size: 13px; color: var(--text-sub); line-height: 1.8;
          font-family: 'Noto Sans Khmer', sans-serif;
        }

        .swipe-guide {
          display: flex; justify-content: space-between;
          margin-top: 12px; padding: 0 2px;
          position: relative; z-index: 5;
        }
        .sg {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-family: 'Noto Sans Khmer', sans-serif;
          opacity: 0.7;
          transition: opacity var(--transition-fast);
        }
        .sg.lft { color: #34d399; }
        .sg.rgt { color: #fbbf24; }
      `}</style>
    </div>
  );
}
