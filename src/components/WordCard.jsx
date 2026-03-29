import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePronunciation } from '../hooks/usePronunciation.js';
import { getPrimaryExample, getWordExamples } from '../utils/vocabulary.js';

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
        await play({ text: item.text, audioSrc: item.audioSrc });
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
  }, [autoplaySequence, play, showContent, word]);

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
    await play({ text, audioSrc });
    clearSpeakingTimerRef.current = setTimeout(() => setSpeakingTarget(null), 1200);
  }, [play]);

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

        <div className="card-topbar">
          <div className={`auto-play-badge ${isAutoPlaying ? 'active' : ''}`}>
            <i className="fas fa-wave-square"></i>
            <span>{isAutoPlaying ? '朗读中' : '自动朗读'}</span>
          </div>
          {total > 0 && <div className="card-counter">{index + 1}/{total}</div>}
        </div>

        <div className={`word-stage ${showContent ? 'animate-fade-in-up stagger-1' : ''}`} style={{ opacity: showContent ? 1 : 0 }}>
          <div className="word-stage-ring"></div>
          <div className="word-info word-head">
            <div className="wrd-cn">{word.chinese}</div>
            <div className="wrd-py">{word.pinyin}</div>
            <div className="wrd-km">{word.khmer}</div>
            <button
              type="button"
              className={`word-speaker ${speakingTarget === 'word' ? 'speaking' : ''}`}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => handleSpeak({ text: word.chinese, audioSrc: word.audio_word, target: 'word', e })}
            >
              <i className="fas fa-volume-up"></i>
              <span>朗读单词</span>
            </button>
          </div>
        </div>

        <div className="hr"></div>

        <div className={`ex-zone ${showContent ? 'animate-fade-in-up stagger-2' : ''}`} style={{ opacity: showContent ? 1 : 0 }}>
          <div className="ex-lbl">例句</div>
          <div className="example-stack">
            <button
              type="button"
              className={`example-item primary-card ${speakingTarget === 'example' ? 'speaking-item' : ''}`}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => handleSpeak({ text: exampleToSpeak, audioSrc: exampleAudio, target: 'example', e })}
            >
              <span className="example-badge">1</span>
              <span className="example-item-cn">{exampleToSpeak}</span>
              <span className="example-item-km">{primaryExample?.khmer ?? word.example_km}</span>
              <i className="fas fa-volume-up example-item-speaker"></i>
            </button>
            {examples.slice(1).map((example, idx) => (
              <button
                type="button"
                key={example.id}
                className={`example-item ${speakingTarget === example.id ? 'speaking-item' : ''}`}
                onClick={(e) => handleSpeak({ text: example.chinese, audioSrc: example.audio, target: example.id, e })}
              >
                <span className="example-badge">{idx + 2}</span>
                <span className="example-item-cn">{example.chinese}</span>
                <span className="example-item-km">{example.khmer}</span>
                <i className="fas fa-volume-up example-item-speaker"></i>
              </button>
            ))}
          </div>
        </div>

        <div className={`swipe-guide ${showContent ? 'animate-fade-in stagger-3' : ''}`} style={{ opacity: showContent ? 1 : 0 }}>
          <div className="sg lft"><i className="fas fa-arrow-left"></i><span>{leftLabel}</span></div>
          <div className="sg rgt"><i className="fas fa-bookmark"></i><span>{rightLabel}</span></div>
        </div>
      </div>

      <style>{`
        .word-card-container {
          padding: 0;
          flex: 1;
          display: flex;
          align-items: flex-start;
          min-height: 0;
        }
        .word-card {
          width: 100%;
          border-radius: 32px;
          padding: 18px 18px 16px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(18,43,125,0.96), rgba(20,47,135,0.9));
          backdrop-filter: blur(28px) saturate(1.2);
          -webkit-backdrop-filter: blur(28px) saturate(1.2);
          border: 2px solid rgba(237,204,117,0.74);
          box-shadow: 0 28px 60px rgba(8, 20, 70, 0.34);
          cursor: grab;
          touch-action: pan-y;
          will-change: transform;
        }
        .word-card:active { cursor: grabbing; }
        .word-card::before,
        .word-card::after {
          content: '';
          position: absolute;
          pointer-events: none;
        }
        .word-card::before {
          left: 18px;
          right: 18px;
          top: 136px;
          height: 310px;
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(252,245,226,0.78), rgba(240,228,192,0.68));
          border: 1.5px solid rgba(237,204,117,0.54);
          transform: rotate(-4deg) translateX(-8px);
          box-shadow: 0 18px 28px rgba(8, 20, 70, 0.12);
          opacity: 0.96;
          z-index: 0;
        }
        .word-card::after {
          inset: 0;
          background:
            radial-gradient(circle at 12% 14%, rgba(245,216,143,0.12), transparent 22%),
            linear-gradient(180deg, rgba(255,255,255,0.04), transparent 34%);
        }
        .card-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          position: relative;
          z-index: 2;
        }
        .auto-play-badge, .card-counter {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          background: rgba(255,244,214,0.08);
          border: 1px solid rgba(245,216,143,0.18);
          color: rgba(249,235,190,0.72);
        }
        .auto-play-badge.active {
          color: #fff8e3;
          border-color: rgba(245,216,143,0.34);
          background: rgba(245,216,143,0.14);
        }
        .swipe-overlay {
          position: absolute;
          inset: 0;
          border-radius: 32px;
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
        .word-stage {
          position: relative;
          margin: 16px 12px 18px;
          padding: 36px 18px 28px;
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(251,243,223,0.98), rgba(244,233,206,0.96));
          border: 2px solid rgba(228, 189, 96, 0.92);
          box-shadow: inset 0 -10px 0 rgba(224, 188, 110, 0.18);
          overflow: hidden;
          position: relative;
          z-index: 2;
        }
        .word-stage-ring {
          position: absolute;
          inset: 12px;
          border-radius: 24px;
          border: 1px solid rgba(193, 153, 73, 0.24);
          pointer-events: none;
        }
        .word-head {
          margin-top: 0;
          padding-top: 0;
        }
        .word-speaker {
          position: absolute;
          left: 50%;
          bottom: -22px;
          transform: translateX(-50%);
          width: 52px;
          height: 52px;
          padding: 0;
          border-radius: 999px;
          border: 2px solid rgba(255,248,224,0.92);
          background: linear-gradient(180deg, #efce7d, #c39235);
          color: #fffdf1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 12px 22px rgba(173, 123, 36, 0.32);
        }
        .word-speaker.speaking {
          transform: translateX(-50%) translateY(-2px) scale(1.03);
          background: linear-gradient(180deg, #f5da94, #d6a84b);
          box-shadow: 0 18px 30px rgba(214,168,75,0.26);
        }
        .word-speaker span { display: none; }
        .word-info {
          text-align: center;
          position: relative;
          z-index: 2;
        }
        .wrd-cn {
          font-size: 72px;
          font-weight: 800;
          color: #b68f43;
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
          letter-spacing: 1px;
          line-height: 1.04;
        }
        .wrd-py {
          margin-top: 14px;
          font-size: 22px;
          color: #203b8f;
        }
        .wrd-km {
          margin-top: 12px;
          font-size: 17px;
          color: rgba(31, 43, 87, 0.86);
        }
        .hr {
          display: none;
        }
        .ex-zone {
          position: relative;
          z-index: 2;
          margin-top: 8px;
        }
        .ex-lbl {
          font-size: 12px;
          color: rgba(245, 216, 143, 0.82);
          margin-left: 4px;
        }
        .example-stack {
          margin-top: 14px;
          display: grid;
          gap: 18px;
        }
        .example-item {
          width: 100%;
          border: 1.5px solid rgba(237,204,117,0.76);
          background: linear-gradient(180deg, rgba(251,243,223,0.98), rgba(244,233,206,0.96));
          border-radius: 18px;
          padding: 14px 20px 18px 50px;
          text-align: left;
          display: grid;
          gap: 6px;
          color: #fff;
          position: relative;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
          box-shadow: 0 14px 24px rgba(8, 20, 70, 0.12);
        }
        .primary-card {
          border-color: rgba(237,204,117,0.94);
          background: linear-gradient(180deg, rgba(252,245,226,1), rgba(244,232,201,0.98));
        }
        .example-item.speaking-item {
          border-color: rgba(237,204,117,0.94);
          background: linear-gradient(180deg, rgba(255,248,233,1), rgba(247,237,212,0.98));
          transform: translateY(-1px);
        }
        .example-badge {
          position: absolute;
          top: 15px;
          left: 14px;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: linear-gradient(180deg, #f1d285, #d2a44d);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }
        .example-item-cn { font-size: 18px; line-height: 1.5; font-weight: 650; color: #2d3f88; }
        .example-item-km { font-size: 13px; line-height: 1.6; color: rgba(45, 63, 136, 0.74); }
        .example-item-speaker {
          position: absolute;
          left: 50%;
          bottom: -18px;
          transform: translateX(-50%);
          width: 38px;
          height: 38px;
          border-radius: 999px;
          font-size: 13px;
          color: #fffdf1;
          background: linear-gradient(180deg, #efce7d, #c39235);
          border: 2px solid rgba(255,248,224,0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 18px rgba(173, 123, 36, 0.28);
        }
        .swipe-guide {
          display: flex;
          justify-content: space-between;
          margin-top: 16px;
          padding: 0 4px;
          position: relative;
          z-index: 2;
        }
        .sg {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          opacity: 0.78;
          font-weight: 600;
        }
        .sg.lft { color: #d7f0d6; }
        .sg.rgt { color: #f4dd9a; }
      `}</style>
    </div>
  );
}
