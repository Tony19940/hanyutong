import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WordCard from './WordCard.jsx';
import AnnouncementPopup from './AnnouncementPopup.jsx';
import HomeBannerCarousel from './HomeBannerCarousel.jsx';
import InstallShortcutButton from './InstallShortcutButton.jsx';
import FirstRunGuide from './FirstRunGuide.jsx';
import OfflineNotice from './OfflineNotice.jsx';
import { api } from '../utils/api.js';
import { getTelegramWebApp } from '../utils/telegram.js';
import { useAppShell } from '../i18n/index.js';
import { useStudy } from '../contexts/StudyContext.jsx';

const GUIDE_STORAGE_PREFIX = 'hyt_seen_home_guide_';

export default function HomePage({ user }) {
  const { t, language, languageMeta, languageOptions, setLanguage } = useAppShell();
  const study = useStudy();
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [banners, setBanners] = useState([]);
  const [popup, setPopup] = useState(null);
  const [visiblePopup, setVisiblePopup] = useState(null);
  const [hasEngaged, setHasEngaged] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const languageMenuRef = useRef(null);

  useEffect(() => {
    const nextWords = study.queue?.newWords || [];
    setWords(nextWords);
    setCurrentIndex(0);
  }, [study.queue?.newWords]);

  useEffect(() => {
    if (!user?.id) return;
    const guideKey = `${GUIDE_STORAGE_PREFIX}${user.id}`;
    if (!localStorage.getItem(guideKey)) {
      setShowGuide(true);
    }
  }, [user?.id]);

  useEffect(() => {
    api.getHomeSurfaces()
      .then((data) => {
        setBanners(Array.isArray(data?.banners) ? data.banners : []);
        setPopup(data?.popup || null);
      })
      .catch((error) => {
        console.error('Failed to load home surfaces', error);
      });
  }, []);

  useEffect(() => {
    if (!hasEngaged || !popup || visiblePopup) return undefined;
    setVisiblePopup(popup);
    api.trackEvent('popup_impression', { popupId: popup.id }).catch(() => {});
    return undefined;
  }, [hasEngaged, popup, visiblePopup]);

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
      study.reloadQueue().catch(() => {});
    }
  };

  const handleSwipeLeft = async () => {
    const word = words[currentIndex];
    if (word) {
      try {
        await study.markLearned(word.id);
      } catch (error) {
        console.error(error);
      }
    }
    setHasEngaged(true);
    nextCard();
  };

  const handleSwipeRight = async () => {
    const word = words[currentIndex];
    if (word) {
      try {
        await study.bookmarkWord(word.id);
      } catch (error) {
        console.error(error);
      }
    }
    setHasEngaged(true);
    nextCard();
  };

  const currentWord = words[currentIndex];
  const goalSummary = study.queue?.goalSummary || study.queue?.today || null;
  const progressPercent = goalSummary?.target
    ? Math.round((goalSummary.studiedWords / goalSummary.target) * 100)
    : 0;
  const displayName = user?.display_name || user?.name || user?.username || 'Listener';
  const reviewCount = study.queue?.summary?.dueCount || 0;
  const handleLanguageSelect = useCallback((nextLanguage) => {
    setIsLanguageMenuOpen(false);
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
  }, [language, setLanguage]);

  const openLink = useCallback((url) => {
    if (!url) return;
    const tg = getTelegramWebApp();
    if (tg?.openLink) {
      tg.openLink(url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleBannerClick = useCallback((banner) => {
    api.trackEvent('banner_click', { bannerId: banner.id, linkUrl: banner.linkUrl }).catch(() => {});
    openLink(banner.linkUrl);
  }, [openLink]);

  const handlePopupAction = useCallback((currentPopup) => {
    api.trackEvent('popup_click', { popupId: currentPopup.id, linkUrl: currentPopup.linkUrl }).catch(() => {});
    setVisiblePopup(null);
    openLink(currentPopup.linkUrl);
  }, [openLink]);

  const closeGuide = useCallback(() => {
    if (user?.id) {
      localStorage.setItem(`${GUIDE_STORAGE_PREFIX}${user.id}`, '1');
    }
    setShowGuide(false);
  }, [user?.id]);

  const summaryLabel = useMemo(() => {
    if (!goalSummary) {
      return 'Start today with a few new words';
    }
    return `${goalSummary.studiedWords}/${goalSummary.target} today`;
  }, [goalSummary]);

  return (
    <div className="home-page page-enter">
      <div className="home-layout">
        <InstallShortcutButton />
        <OfflineNotice online={study.syncState.online} pending={study.syncState.pending} />
        <header className="home-head">
          <div className="home-head-copy">
            <div className="home-kicker">Daily Mix</div>
            <div key={language} className="home-copy-block">
              <h1 className="home-title">{t('home.title')}</h1>
              <p className="home-subtitle">{t('home.subtitle')}</p>
            </div>
          </div>
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
        </header>

        <section className="home-summary">
          <div className="summary-identity">
            <div className="summary-avatar">{displayName.slice(0, 1).toUpperCase()}</div>
            <div className="summary-copy">
              <span>For {displayName}</span>
              <strong>{summaryLabel}</strong>
            </div>
          </div>
          <div className="summary-topline">
            <span>{progressPercent}% {t('home.progress')}</span>
            <strong>{reviewCount} due</strong>
          </div>
          <div className="summary-track">
            <div className="summary-fill" style={{ width: `${Math.min(progressPercent, 100)}%` }}></div>
          </div>
        </section>

        <div className="home-card-area">
          {study.loading ? (
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
              examplePlaybackRate={0.76}
            />
          ) : (
            <div className="empty-state animate-float-up">
              <div className="empty-celebration">✓</div>
              <div className="empty-title">{t('home.doneToday')}</div>
              <div className="empty-sub">{t('home.goQuiz')}</div>
            </div>
          )}
        </div>

        <HomeBannerCarousel banners={banners} onBannerClick={handleBannerClick} />
      </div>

      <AnnouncementPopup popup={visiblePopup} onClose={() => setVisiblePopup(null)} onAction={handlePopupAction} />
      <FirstRunGuide visible={showGuide} onClose={closeGuide} />

      <style>{`
        .home-page {
          flex: 1;
          position: relative;
          z-index: 10;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .home-layout {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: clamp(12px, 1.5vh, 18px) 16px 8px;
          position: relative;
          z-index: 1;
          min-height: 0;
          overflow: hidden;
        }
        .home-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: clamp(10px, 1.4vh, 16px);
          flex-shrink: 0;
          position: relative;
        }
        .home-head-copy {
          min-width: 0;
        }
        .home-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--accent-gold);
          margin-bottom: 8px;
        }
        .home-language-switch {
          position: relative;
          z-index: 3;
        }
        .home-language-trigger {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--settings-border);
          box-shadow: var(--panel-shadow);
          backdrop-filter: blur(14px);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .home-language-trigger.open {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
        }
        .home-language-current-flag {
          font-size: 18px;
          line-height: 1;
        }
        .home-language-popover {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 132px;
          padding: 8px;
          border-radius: 20px;
          border: 1px solid var(--settings-border);
          background: rgba(18,18,18,0.94);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.24);
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
          font-size: clamp(30px, 5vw, 40px);
          line-height: 1.1;
          font-weight: 800;
          color: var(--home-title-color);
          font-family: 'Outfit', 'Noto Sans SC', sans-serif;
          margin: 0;
        }
        .home-subtitle {
          margin-top: 6px;
          font-size: clamp(12px, 1.8vw, 14px);
          color: var(--home-subtitle-color);
          max-width: 220px;
          line-height: 1.55;
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

        .home-summary {
          margin-bottom: clamp(8px, 1.2vh, 14px);
          padding: 14px 16px;
          border-radius: 24px;
          background:
            radial-gradient(circle at top right, rgba(30,215,96,0.16), transparent 28%),
            var(--home-card-bg);
          border: 1.5px solid var(--home-card-border);
          box-shadow: 0 16px 32px var(--home-card-shadow);
          flex-shrink: 0;
        }
        .summary-identity {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .summary-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, var(--brand-gold), var(--brand-green));
          color: #041109;
          font-size: 15px;
          font-weight: 800;
        }
        .summary-copy {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .summary-copy span {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: var(--text-secondary);
        }
        .summary-copy strong {
          font-size: 15px;
          color: var(--text-primary);
        }
        .summary-topline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .summary-topline strong {
          color: var(--text-primary);
          font-size: 14px;
        }
        .summary-track {
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.08);
        }
        .summary-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--brand-gold) 0%, var(--brand-teal) 100%);
          transition: width 0.3s ease;
        }
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
