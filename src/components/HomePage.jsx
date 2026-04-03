import React, { useCallback, useEffect, useRef, useState } from 'react';
import WordCard from './WordCard.jsx';
import { api } from '../utils/api.js';
import { useAppShell } from '../i18n/index.js';

export default function HomePage({ user }) {
  const { t, language, languageMeta, languageOptions, setLanguage } = useAppShell();
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ total: 0, learned: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef(null);

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

  useEffect(() => {
    if (!isLanguageMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!languageMenuRef.current?.contains(event.target)) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isLanguageMenuOpen]);

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
  const handleLanguageSelect = useCallback((nextLanguage) => {
    setIsLanguageMenuOpen(false);
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
  }, [language, setLanguage]);

  return (
    <div className="home-page page-enter">
      {/* Temple silhouette decorations */}
      <div className="temple-deco" aria-hidden="true"></div>
      <div className="home-pattern" aria-hidden="true"></div>

      <div className="home-layout">
        {/* Header */}
        <header className="home-head">
          <div className="home-language-switch" ref={languageMenuRef}>
            <button
              type="button"
              className={`home-language-trigger ${isLanguageMenuOpen ? 'open' : ''}`}
              aria-label={t('common.language')}
              aria-expanded={isLanguageMenuOpen}
              aria-haspopup="listbox"
              onClick={() => setIsLanguageMenuOpen((current) => !current)}
            >
              <span className="home-language-current-flag">{languageMeta.flag}</span>
            </button>

            <div className={`home-language-popover ${isLanguageMenuOpen ? 'open' : ''}`} role="listbox">
              {languageOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`home-language-option ${language === item.id ? 'active' : ''}`}
                  onClick={() => handleLanguageSelect(item.id)}
                  aria-label={item.englishLabel}
                >
                  <span>{item.flag}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div key={language} className="home-copy-block">
            <h1 className="home-title">{t('home.title')}</h1>
            <p className="home-subtitle">{t('home.subtitle')}</p>
          </div>
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
          z-index: 3;
        }
        .home-language-trigger {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          background: var(--settings-surface);
          border: 1px solid var(--settings-border);
          box-shadow: 0 6px 14px rgba(0,0,0,0.16);
          backdrop-filter: blur(14px);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .home-language-trigger.open {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(8, 20, 17, 0.18);
        }
        .home-language-current-flag {
          font-size: 15px;
          line-height: 1;
        }
        .home-language-popover {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 132px;
          padding: 8px;
          border-radius: 18px;
          border: 1px solid var(--settings-border);
          background: color-mix(in srgb, var(--settings-surface) 88%, transparent);
          box-shadow: 0 20px 40px rgba(8, 20, 17, 0.16);
          backdrop-filter: blur(18px);
          display: grid;
          gap: 6px;
          opacity: 0;
          transform: translateY(-4px) scale(0.98);
          pointer-events: none;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .home-language-popover.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .home-language-option {
          min-height: 38px;
          padding: 0 10px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 700;
          text-align: left;
        }
        .home-language-option.active {
          background: var(--settings-chip-active-bg);
          color: var(--settings-chip-active-text);
          border-color: transparent;
        }
        .home-copy-block {
          animation: homeCopySwap 0.3s cubic-bezier(.22,1,.36,1);
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
        @keyframes homeCopySwap {
          from {
            opacity: 0;
            transform: translateY(8px);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
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
