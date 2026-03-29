import React, { useCallback, useEffect, useState } from 'react';
import WordCard from './WordCard.jsx';
import { api } from '../utils/api.js';

export default function HomePage({ user }) {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ total: 0, learned: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);

  const loadWords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getNextWords(20);
      setWords(data.words);
      setStats({ total: data.total, learned: data.learned, remaining: data.remaining });
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to load words:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const nextCard = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((value) => value + 1);
    } else {
      loadWords();
    }
  };

  const handleSwipeLeft = async () => {
    const word = words[currentIndex];
    if (word) {
      try {
        const result = await api.recordAction(word.id, 'learned');
        setStats((prev) => ({
          ...prev,
          learned: prev.learned + (result.countedAsLearned ? 1 : 0),
          remaining: Math.max(prev.remaining - (result.countedAsLearned ? 1 : 0), 0),
        }));
      } catch (error) {
        console.error(error);
      }
    }
    nextCard();
  };

  const handleSwipeRight = async () => {
    const word = words[currentIndex];
    if (word) {
      try {
        await api.recordAction(word.id, 'bookmarked');
      } catch (error) {
        console.error(error);
      }
    }
    nextCard();
  };

  const currentWord = words[currentIndex];
  const progressPercent = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;

  return (
    <div className="home-page page-enter">
      <div className="home-pattern" aria-hidden="true"></div>
      <div className="home-scroll">
        <header className="home-head">
          <div className="home-ornament left"></div>
          <div className="home-ornament right"></div>
          <div className="home-copy">
            <div className="home-kicker">学习</div>
            <h1 className="home-title">滑卡背词</h1>
            <p className="home-subtitle">左滑学会，右滑收藏。</p>
          </div>
        </header>

        <section className="home-summary">
          <div className="summary-topline">
            <span>{progressPercent}% 进度</span>
            <strong>{stats.learned}/{stats.total || 0}</strong>
          </div>
          <div className="summary-track">
            <div className="summary-fill" style={{ width: `${Math.min(progressPercent, 100)}%` }}></div>
          </div>
        </section>

        {loading ? (
          <div className="loading-state">
            <div className="loading-card">
              <div className="loading-emoji-placeholder loading-shimmer"></div>
              <div className="loading-line-1 loading-shimmer"></div>
              <div className="loading-line-2 loading-shimmer"></div>
              <div className="loading-line-3 loading-shimmer"></div>
            </div>
          </div>
        ) : currentWord ? (
          <WordCard
            key={currentWord.id}
            word={currentWord}
            index={currentIndex}
            total={words.length}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            mode="home"
            autoplaySequence
          />
        ) : (
          <div className="empty-state animate-float-up">
            <div className="empty-celebration">✓</div>
            <div className="empty-title">今天已完成</div>
            <div className="empty-sub">去“测验”再刷一轮。</div>
          </div>
        )}
      </div>

      <style>{`
        .home-page { flex: 1; position: relative; z-index: 10; overflow: hidden; }
        .home-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.52;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M22 70h76v6H22zM26 66l8-20 8 10 10-20 8 12 8-18 10 18 8-12 8 20' fill='none' stroke='rgba(245,216,143,0.38)' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M30 76h60' fill='none' stroke='rgba(245,216,143,0.22)' stroke-width='2'/%3E%3C/svg%3E"),
            radial-gradient(circle at 18px 18px, rgba(245,216,143,0.16) 0 1.5px, transparent 2px),
            radial-gradient(circle at 62px 62px, rgba(245,216,143,0.12) 0 1.5px, transparent 2px);
          background-size: 120px 120px, 80px 80px, 80px 80px;
          background-position: 0 6px, 0 0, 40px 40px;
          mix-blend-mode: screen;
        }
        .home-scroll { height: 100%; overflow-y: auto; padding: 12px 18px 104px; }
        .home-scroll::-webkit-scrollbar { display: none; }
        .home-head {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          text-align: center;
          min-height: 88px;
        }
        .home-ornament {
          position: absolute;
          top: 22px;
          width: 54px;
          height: 24px;
          opacity: 0.88;
        }
        .home-ornament::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(245,216,143,0.82), rgba(192,144,49,0.58));
          clip-path: polygon(0 100%, 18% 26%, 34% 100%, 50% 22%, 66% 100%, 82% 26%, 100% 100%);
        }
        .home-ornament.left { left: 6px; }
        .home-ornament.right { right: 6px; transform: scaleX(-1); }
        .home-copy {
          width: 100%;
        }
        .home-kicker {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(245, 216, 143, 0.82);
        }
        .home-title {
          margin-top: 6px;
          font-size: 34px;
          line-height: 1.02;
          font-weight: 800;
          color: #f7f0cf;
          text-shadow: 0 2px 10px rgba(0,0,0,0.18);
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
        }
        .home-subtitle {
          margin-top: 8px;
          font-size: 14px;
          color: rgba(245, 241, 225, 0.82);
        }
        .home-summary {
          margin-bottom: 14px;
          padding: 14px 16px 16px;
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(19,46,133,0.94), rgba(17,41,116,0.86));
          border: 1.5px solid rgba(245,216,143,0.34);
          box-shadow: 0 16px 30px rgba(10,22,75,0.18);
        }
        .summary-topline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          font-size: 12px;
          color: rgba(247, 236, 207, 0.78);
        }
        .summary-topline strong {
          color: #f7e3a5;
          font-size: 14px;
        }
        .summary-track {
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(245,216,143,0.12);
        }
        .summary-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #f5d88f 0%, #c89a41 55%, #8a6628 100%);
        }
        .loading-state { display: flex; justify-content: center; }
        .loading-card {
          width: 100%;
          border-radius: 28px;
          padding: 30px 22px;
          background: linear-gradient(180deg, rgba(244,236,212,0.98), rgba(235,225,194,0.94));
          border: 2px solid rgba(219,180,97,0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .loading-emoji-placeholder { width: 80px; height: 80px; border-radius: 20px; }
        .loading-line-1 { width: 60%; height: 28px; }
        .loading-line-2 { width: 40%; height: 16px; }
        .loading-line-3 { width: 80%; height: 14px; }
        .empty-state {
          min-height: 58vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
        }
        .empty-celebration {
          width: 76px;
          height: 76px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(245, 216, 143, 0.16);
          border: 1px solid rgba(245, 216, 143, 0.32);
          font-size: 30px;
          color: #f5d88f;
        }
        .empty-title { font-size: 28px; font-weight: 700; color: #f7ebc4; }
        .empty-sub { font-size: 14px; color: rgba(245, 236, 207, 0.78); }
      `}</style>
    </div>
  );
}
