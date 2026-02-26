import React, { useState, useEffect, useCallback } from 'react';
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
      const data = await api.getNextWords(user.id, 50);
      setWords(data.words);
      setStats({ total: data.total, learned: data.learned, remaining: data.remaining });
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to load words:', err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const handleSwipeLeft = async () => {
    // Learned
    const word = words[currentIndex];
    if (word) {
      try {
        await api.recordAction(user.id, word.id, 'learned');
        setStats(prev => ({ ...prev, learned: prev.learned + 1 }));
      } catch (e) { console.error(e); }
    }
    nextCard();
  };

  const handleSwipeRight = async () => {
    // Bookmarked
    const word = words[currentIndex];
    if (word) {
      try {
        await api.recordAction(user.id, word.id, 'bookmarked');
      } catch (e) { console.error(e); }
    }
    nextCard();
  };

  const nextCard = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Load more words
      loadWords();
    }
  };

  const currentWord = words[currentIndex];
  const progressPercent = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;

  return (
    <div className="home-page page-enter">
      <div className="home-hd">
        <div>
          <div className="greet-sub">អ្នកសិក្សា, {user.name} 👋</div>
          <div className="greet-main">រៀនពាក្យថ្ងៃនេះ</div>
        </div>
        <div className="progress-area">
          <div className="streak-pill">
            <span className="streak-icon">🔥</span>
            <span className="streak-num">{stats.learned}</span>
            <span className="streak-label">ពាក្យ</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-wrap">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          ></div>
        </div>
        <div className="progress-text">{progressPercent}%</div>
      </div>

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
        />
      ) : (
        <div className="empty-state animate-float-up">
          <div className="empty-celebration">🎉</div>
          <div className="empty-title">អស្ចារ្យ!</div>
          <div className="empty-sub">អ្នកបានរៀនពាក្យទាំងអស់ហើយ!</div>
          <div className="empty-cn">已学完全部单词！</div>
        </div>
      )}

      <style>{`
        .home-page {
          flex: 1; display: flex; flex-direction: column;
          position: relative; z-index: 10;
        }
        .home-hd {
          padding: 4px 22px 8px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .greet-sub {
          font-size: 11px; color: var(--text-muted);
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .greet-main {
          font-size: 20px; font-weight: 700; color: #fff;
          margin-top: 2px;
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .progress-area {
          display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
        }
        .streak-pill {
          display: flex; align-items: center; gap: 4px;
          background: rgba(251,191,36,0.12);
          border: 1px solid rgba(251,191,36,0.22);
          border-radius: 20px; padding: 5px 14px;
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .streak-icon { font-size: 13px; }
        .streak-num { 
          font-size: 14px; color: #fbbf24; font-weight: 700; 
          font-family: 'Noto Sans SC', sans-serif;
        }
        .streak-label { font-size: 11px; color: rgba(251,191,36,0.7); }

        /* Progress bar */
        .progress-wrap {
          padding: 0 22px 12px;
          display: flex; align-items: center; gap: 10px;
          animation: fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }
        .progress-bar {
          flex: 1; height: 4px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px; overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #2563eb, #10b981);
          border-radius: 4px;
          transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          position: relative;
        }
        .progress-fill::after {
          content: '';
          position: absolute; right: 0; top: -1px; bottom: -1px;
          width: 12px;
          background: radial-gradient(circle, rgba(255,255,255,0.5), transparent);
          border-radius: 4px;
        }
        .progress-text {
          font-size: 10px; color: var(--text-muted); font-weight: 600;
          min-width: 28px; text-align: right;
        }

        /* Loading skeleton */
        .loading-state {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; padding: 0 18px;
        }
        .loading-card {
          width: 100%; border-radius: 28px;
          padding: 30px 22px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .loading-emoji-placeholder {
          width: 80px; height: 80px; border-radius: 20px;
        }
        .loading-line-1 { width: 60%; height: 28px; }
        .loading-line-2 { width: 40%; height: 16px; }
        .loading-line-3 { width: 80%; height: 14px; margin-top: 8px; }

        /* Empty state */
        .empty-state {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px;
        }
        .empty-celebration { 
          font-size: 72px; margin-bottom: 8px; 
          animation: emojiCelebrate 1.5s ease infinite;
        }
        @keyframes emojiCelebrate {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-5deg); }
          75% { transform: scale(1.05) rotate(5deg); }
        }
        .empty-title {
          font-size: 24px; font-weight: 700; color: #fff;
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .empty-sub {
          font-size: 14px; color: var(--text-sub);
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .empty-cn {
          font-size: 12px; color: var(--text-muted);
          margin-top: 4px;
          font-family: 'Noto Sans SC', sans-serif;
        }
      `}</style>
    </div>
  );
}
