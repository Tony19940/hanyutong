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
      // Preview fallback
      if (window.location.hash === '#preview') {
        const mock = [
          { id: 1, chinese: '胖', pinyin: 'pàng', khmer: 'ជាត់ / ជាត់ទ្រលុកទ្រលន់', example_cn: '宝宝胖胖的。', example_km: 'កូនក្មេងជាត់ទ្រលុកទ្រលន់។', examples: [{ id: 'e1', chinese: '宝宝胖胖的。', khmer: 'កូនក្មេងជាត់ទ្រលុកទ្រលន់។' }, { id: 'e2', chinese: '长胖了。', khmer: 'ជាត់ជាងមុនហើយ។' }] },
          { id: 2, chinese: '瘦', pinyin: 'shòu', khmer: 'ស្គម', example_cn: '他很瘦。', example_km: 'គាត់ស្គមណាស់។', examples: [{ id: 'e3', chinese: '他很瘦。', khmer: 'គាត់ស្គមណាស់។' }] },
        ];
        setWords(mock);
        setStats({ total: 900, learned: 69, remaining: 831 });
        setCurrentIndex(0);
      }
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
      {/* Temple silhouette decorations */}
      <div className="temple-deco" aria-hidden="true"></div>
      <div className="home-pattern" aria-hidden="true"></div>

      <div className="home-layout">
        {/* Header */}
        <header className="home-head">
          <h1 className="home-title">滑卡背词</h1>
          <p className="home-subtitle">左滑学会，右滑收藏。</p>
        </header>

        {/* Progress */}
        <section className="home-summary">
          <div className="summary-topline">
            <span>{progressPercent}% 进度</span>
            <strong>{stats.learned}/{stats.total || 0}</strong>
          </div>
          <div className="summary-track">
            <div className="summary-fill" style={{ width: `${Math.min(progressPercent, 100)}%` }}></div>
          </div>
        </section>

        {/* Card Area */}
        <div className="home-card-area">
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
              <div className="empty-sub">去"测验"再刷一轮。</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .home-page {
          flex: 1;
          position: relative;
          z-index: 10;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .home-pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.32;
          background-image:
            radial-gradient(circle at 18px 18px, rgba(245,216,143,0.14) 0 1.2px, transparent 1.6px),
            radial-gradient(circle at 62px 62px, rgba(245,216,143,0.10) 0 1.2px, transparent 1.6px);
          background-size: 80px 80px, 80px 80px;
          background-position: 0 0, 40px 40px;
          z-index: 0;
        }
        .home-layout {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: clamp(8px, 1.5vh, 14px) 18px 8px;
          position: relative;
          z-index: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* Header */
        .home-head {
          text-align: center;
          margin-bottom: clamp(6px, 1.2vh, 12px);
          flex-shrink: 0;
        }
        .home-title {
          font-size: clamp(28px, 5vw, 36px);
          line-height: 1.1;
          font-weight: 800;
          color: #f7f0cf;
          text-shadow: 0 2px 10px rgba(0,0,0,0.18);
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
          margin: 0;
        }
        .home-subtitle {
          margin-top: clamp(4px, 0.6vh, 8px);
          font-size: clamp(12px, 1.8vw, 14px);
          color: rgba(245, 241, 225, 0.78);
        }

        /* Progress */
        .home-summary {
          margin-bottom: clamp(6px, 1vh, 12px);
          padding: clamp(8px, 1.2vh, 14px) 16px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(19,46,133,0.94), rgba(17,41,116,0.86));
          border: 1.5px solid rgba(245,216,143,0.34);
          box-shadow: 0 12px 24px rgba(10,22,75,0.18);
          flex-shrink: 0;
        }
        .summary-topline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 12px;
          color: rgba(247, 236, 207, 0.78);
        }
        .summary-topline strong {
          color: #f7e3a5;
          font-size: 14px;
        }
        .summary-track {
          height: 6px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(245,216,143,0.12);
        }
        .summary-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #f5d88f 0%, #c89a41 55%, #8a6628 100%);
          transition: width 0.3s ease;
        }

        /* Card Area */
        .home-card-area {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Loading */
        .loading-state { display: flex; justify-content: center; flex: 1; }
        .loading-card {
          width: 100%;
          border-radius: 24px;
          padding: clamp(20px, 3vh, 30px) 22px;
          background: linear-gradient(180deg, rgba(244,236,212,0.98), rgba(235,225,194,0.94));
          border: 2px solid rgba(219,180,97,0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .loading-emoji-placeholder { width: 60px; height: 60px; border-radius: 16px; }
        .loading-line-1 { width: 60%; height: 24px; }
        .loading-line-2 { width: 40%; height: 14px; }
        .loading-line-3 { width: 80%; height: 12px; }

        /* Empty */
        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
        }
        .empty-celebration {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(245, 216, 143, 0.16);
          border: 1px solid rgba(245, 216, 143, 0.32);
          font-size: 26px;
          color: #f5d88f;
        }
        .empty-title { font-size: 24px; font-weight: 700; color: #f7ebc4; }
        .empty-sub { font-size: 13px; color: rgba(245, 236, 207, 0.78); }
      `}</style>
    </div>
  );
}
