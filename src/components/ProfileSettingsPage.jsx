import React from 'react';
import { useAppShell } from '../i18n/index.js';

export default function ProfileSettingsPage({ onBack }) {
  const {
    t,
    language,
    setLanguage,
    languageOptions,
    theme,
    setTheme,
    voiceType,
    setVoiceType,
    availableVoices,
    defaultVoiceType,
  } = useAppShell();

  return (
    <div className="settings-page page-enter">
      <div className="settings-scroll">
        <div className="settings-top">
          <button type="button" className="settings-back-btn" onClick={onBack}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <div className="settings-page-title">{t('common.settings')}</div>
            <div className="settings-page-subtitle">{t('profile.settingsPageSubtitle')}</div>
          </div>
        </div>

        <section className="settings-panel animate-float-up stagger-1">
          <div className="settings-section-title">{t('profile.languageSetting')}</div>
          <div className="settings-chip-grid">
            {languageOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`settings-pill ${language === item.id ? 'active' : ''}`}
                onClick={() => setLanguage(item.id)}
              >
                <span>{item.flag}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-panel animate-float-up stagger-2">
          <div className="settings-section-title">{t('profile.themeSetting')}</div>
          <div className="settings-chip-grid">
            <button
              type="button"
              className={`settings-pill ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              {t('common.darkMode')}
            </button>
            <button
              type="button"
              className={`settings-pill ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              {t('common.lightMode')}
            </button>
          </div>
        </section>

        <section className="settings-panel animate-float-up stagger-3">
          <div className="settings-section-title">{t('profile.voiceSetting')}</div>
          <div className="settings-voice-list">
            {(availableVoices || []).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`settings-voice-row ${voiceType === item.id ? 'active' : ''}`}
                onClick={() => setVoiceType(item.id)}
              >
                <span>{item.label}</span>
                {item.id === defaultVoiceType ? (
                  <span className="settings-voice-meta">{t('profile.voiceDefault')}</span>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        .settings-page {
          flex: 1;
          position: relative;
          z-index: 10;
          overflow: hidden;
        }
        .settings-scroll {
          height: 100%;
          overflow: auto;
          padding: 10px 18px 92px;
          max-width: 390px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .settings-scroll::-webkit-scrollbar {
          display: none;
        }
        .settings-top {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 2px 0 4px;
        }
        .settings-back-btn {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          border: 1px solid var(--settings-border);
          background: var(--settings-surface);
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .settings-page-title {
          font-size: 24px;
          line-height: 1.1;
          font-weight: 800;
          color: var(--home-title-color);
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
        }
        .settings-page-subtitle {
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .settings-panel {
          border-radius: 22px;
          padding: 16px;
          background: var(--settings-surface);
          border: 1px solid var(--settings-border);
        }
        .settings-section-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .settings-chip-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .settings-pill {
          min-height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--settings-chip-text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
        }
        .settings-pill.active,
        .settings-voice-row.active {
          background: var(--settings-chip-active-bg);
          color: var(--settings-chip-active-text);
          border-color: transparent;
        }
        .settings-voice-list {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }
        .settings-voice-row {
          min-height: 46px;
          padding: 0 14px;
          border-radius: 16px;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--settings-chip-text);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 13px;
          font-weight: 700;
          text-align: left;
        }
        .settings-voice-meta {
          font-size: 11px;
          opacity: 0.74;
        }
      `}</style>
    </div>
  );
}
