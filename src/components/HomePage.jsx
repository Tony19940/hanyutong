import React, { useCallback, useEffect, useState } from 'react';
import WordCard from './WordCard.jsx';
import { api } from '../utils/api.js';
import { useAppShell } from '../i18n/index.js';

export default function HomePage({ user }) {
  const { t, language, languageOptions, setLanguage } = useAppShell();
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ total: 0, learned: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);

  const loadWords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getNextWords(20, 'home');
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
          <div className="home-language-switch" role="group" aria-label={t('common.language')}>
            {languageOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`home-language-btn ${language === item.id ? 'active' : ''}`}
                onClick={() => setLanguage(item.id)}
                aria-label={item.englishLabel}
              >
                <span>{item.flag}</span>
              </button>
            ))}
          </div>
          <h1 className="home-title">{t('home.title')}</h1>
          <p className="home-subtitle">{t('home.subtitle')}</p>
        </header>

        {/* Progress */}
        <section className="home-summary">
          <div className="summary-topline">
            <span>{progressPercent}% {t('home.progress')}</span>
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
              <div className="empty-title">{t('home.doneToday')}</div>
              <div className="empty-sub">{t('home.goQuiz')}</div>
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
            radial-gradient(circle at 18px 18px, var(--bg-pattern-a) 0 1.2px, transparent 1.6px),
            radial-gradient(circle at 62px 62px, var(--bg-pattern-b) 0 1.2px, transparent 1.6px);
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
          position: relative;
        }
        .home-language-switch {
          position: absolute;
          top: 0;
          right: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px;
          border-radius: 16px;
          border: 1px solid var(--settings-border);
          background: var(--settings-surface);
          box-shadow: 0 8px 18px var(--home-card-shadow);
        }
        .home-language-btn {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: var(--text-primary);
          background: transparent;
          border: 1px solid transparent;
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }
        .home-language-btn.active {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.14);
          transform: translateY(-1px);
        }
        .home-title {
          font-size: clamp(28px, 5vw, 36px);
          line-height: 1.1;
          font-weight: 800;
          color: var(--home-title-color);
          text-shadow: 0 2px 10px rgba(0,0,0,0.08);
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
          margin: 0;
        }
        .home-subtitle {
          margin-top: clamp(4px, 0.6vh, 8px);
          font-size: clamp(12px, 1.8vw, 14px);
          color: var(--home-subtitle-color);
        }

        /* Progress */
        .home-summary {
          margin-bottom: clamp(6px, 1vh, 12px);
          padding: clamp(8px, 1.2vh, 14px) 16px;
          border-radius: 18px;
          background: var(--home-card-bg);
          border: 1.5px solid var(--home-card-border);
          box-shadow: 0 12px 24px var(--home-card-shadow);
          flex-shrink: 0;
        }
        .summary-topline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .summary-topline strong {
          color: var(--accent-gold);
          font-size: 14px;
        }
        .summary-track {
          height: 6px;
          border-radius: 999px;
          overflow: hidden;
          background: var(--surface);
        }
        .summary-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--brand-gold) 0%, #c89a41 55%, var(--brand-teal) 100%);
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
          background: var(--word-stage-bg);
          border: 1.5px solid var(--word-stage-border);
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
          background: var(--settings-surface);
          border: 1px solid var(--settings-border);
          font-size: 26px;
          color: var(--accent-gold);
        }
        .empty-title { font-size: 24px; font-weight: 700; color: var(--text-primary); }
        .empty-sub { font-size: 13px; color: var(--text-secondary); }
      `}</style>
    </div>
  );
}
