import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api.js';
import { isTelegramEnvironment } from '../utils/telegram.js';

const DISMISSED_KEY = 'hyt_install_shortcut_hidden';

function isStandaloneMode() {
  return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
}

function getGuideCopy() {
  if (isTelegramEnvironment()) {
    return [
      '在 Telegram 右上角菜单里打开浏览器',
      '点击浏览器菜单中的“添加到桌面”',
      '添加完成后回到应用，点“我已添加”',
    ];
  }

  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) {
    return [
      '点击浏览器底部分享按钮',
      '选择“添加到主屏幕”',
      '添加完成后返回并点“我已添加”',
    ];
  }

  return [
    '点击浏览器右上角菜单',
    '选择“安装应用”或“添加到主屏幕”',
    '添加完成后返回并点“我已添加”',
  ];
}

export default function InstallShortcutButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [hidden, setHidden] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');
  const [showGuide, setShowGuide] = useState(false);
  const guideCopy = useMemo(() => getGuideCopy(), []);

  useEffect(() => {
    if (isStandaloneMode()) {
      setHidden(true);
      localStorage.setItem(DISMISSED_KEY, '1');
      return undefined;
    }

    const handlePrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      api.trackEvent('install_prompt_shown').catch(() => {});
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  if (hidden || isStandaloneMode()) {
    return null;
  }

  const markInstalled = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setHidden(true);
    setShowGuide(false);
    api.trackEvent('install_completed').catch(() => {});
  };

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        markInstalled();
      }
      setDeferredPrompt(null);
      return;
    }

    api.trackEvent('install_prompt_shown').catch(() => {});
    setShowGuide(true);
  };

  return (
    <>
      <button type="button" className="install-shortcut-btn animate-float-up stagger-3" onClick={handleClick}>
        <i className="fas fa-mobile-screen-button"></i>
      </button>

      {showGuide ? (
        <div className="install-guide-mask animate-fade-in">
          <div className="install-guide-card animate-scale-in">
            <div className="install-guide-head">
              <strong>添加到桌面</strong>
              <button type="button" onClick={() => setShowGuide(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="install-guide-steps">
              {guideCopy.map((line, index) => (
                <div key={line} className="install-guide-step">
                  <span>{index + 1}</span>
                  <p>{line}</p>
                </div>
              ))}
            </div>
            <button type="button" className="install-guide-primary" onClick={markInstalled}>
              我已添加
            </button>
          </div>
        </div>
      ) : null}

      <style>{`
        .install-shortcut-btn {
          position: absolute;
          right: 10px;
          top: 42%;
          width: 46px;
          height: 46px;
          border-radius: 16px 16px 16px 6px;
          border: 1px solid rgba(225,191,83,0.22);
          background: linear-gradient(180deg, rgba(225,191,83,0.95), rgba(198,151,44,0.98));
          color: #173730;
          box-shadow: 0 18px 26px rgba(0,0,0,0.18);
          z-index: 5;
        }
        .install-guide-mask {
          position: absolute;
          inset: 0;
          z-index: 70;
          background: rgba(7, 10, 9, 0.82);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }
        .install-guide-card {
          width: 100%;
          max-width: 340px;
          border-radius: 24px;
          background: var(--word-shell-bg);
          border: 1px solid var(--settings-border);
          padding: 18px;
        }
        .install-guide-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-primary);
        }
        .install-guide-head button {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--text-primary);
        }
        .install-guide-steps {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }
        .install-guide-step {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .install-guide-step span {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: rgba(225,191,83,0.14);
          color: var(--accent-gold);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .install-guide-step p {
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.6;
        }
        .install-guide-primary {
          width: 100%;
          min-height: 46px;
          margin-top: 16px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(90deg, var(--brand-gold), #f5d56b);
          color: #173730;
          font-weight: 800;
        }
      `}</style>
    </>
  );
}
