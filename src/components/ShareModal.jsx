import React, { useCallback, useState } from 'react';
import { useAppShell } from '../i18n/index.js';

function openExternal(url) {
  if (window.Telegram?.WebApp?.openLink && /^https?:/i.test(url)) {
    window.Telegram.WebApp.openLink(url);
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

function openMessengerShare(inviteUrl, shareText) {
  const encodedUrl = encodeURIComponent(inviteUrl);
  const fallbackUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(shareText)}`;

  try {
    window.location.assign(`fb-messenger://share/?link=${encodedUrl}`);
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        openExternal(fallbackUrl);
      }
    }, 700);
  } catch (error) {
    console.error(error);
    openExternal(fallbackUrl);
  }
}

export default function ShareModal({ invite, onClose }) {
  const { t } = useAppShell();
  const [copied, setCopied] = useState(false);

  const inviteUrl = invite?.url || '';
  const inviteStats = invite?.stats || {
    invitedCount: 0,
    convertedCount: 0,
    rewardDaysEarned: 0,
  };

  const handleCopy = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error(error);
    }
  }, [inviteUrl]);

  const shareText = `${t('share.inviteCopy')} ${inviteUrl}`.trim();
  const encodedUrl = encodeURIComponent(inviteUrl);
  const encodedText = encodeURIComponent(shareText);

  return (
    <div className="share-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="share-shell">
        <div className="share-head">
          <div>
            <div className="share-kicker">{t('membership.inviteFriends')}</div>
            <div className="share-title">{t('share.inviteTitle')}</div>
          </div>
          <button type="button" className="share-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="invite-panel">
          <div className="invite-panel-copy">{t('membership.inviteExplainer')}</div>
          <div className="invite-link">{inviteUrl || t('share.noInviteLink')}</div>
          <div className="invite-grid">
            <div>
              <span>{t('membership.invitedCount')}</span>
              <strong>{inviteStats.invitedCount}</strong>
            </div>
            <div>
              <span>{t('membership.convertedCount')}</span>
              <strong>{inviteStats.convertedCount}</strong>
            </div>
            <div>
              <span>{t('membership.rewardDays')}</span>
              <strong>{inviteStats.rewardDaysEarned}</strong>
            </div>
          </div>

          <div className="share-actions">
            <button type="button" className="sab sab-copy" onClick={handleCopy}>
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              <span>{copied ? t('share.copied') : t('share.copyLink')}</span>
            </button>
            <button
              type="button"
              className="sab"
              onClick={() => openExternal(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`)}
            >
              <i className="fab fa-telegram"></i>
              <span>Telegram</span>
            </button>
            <button
              type="button"
              className="sab"
              onClick={() => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`)}
            >
              <i className="fab fa-facebook"></i>
              <span>Facebook</span>
            </button>
            <button
              type="button"
              className="sab"
              onClick={() => openMessengerShare(inviteUrl, shareText)}
              disabled={!inviteUrl}
            >
              <i className="fab fa-facebook-messenger"></i>
              <span>Messenger</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .share-overlay {
          position: fixed;
          inset: 0;
          background: rgba(8, 12, 10, 0.72);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          animation: fadeIn 0.24s ease;
        }
        .share-shell {
          width: 100%;
          max-width: 396px;
        }
        .share-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .share-kicker {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--accent-gold);
        }
        .share-title {
          margin-top: 4px;
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .share-close {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid var(--settings-border);
          background: var(--settings-surface);
          color: var(--text-secondary);
        }
        .invite-panel {
          border-radius: 24px;
          background: var(--settings-surface);
          border: 1px solid var(--settings-border);
          padding: 16px;
        }
        .invite-panel-copy {
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.6;
        }
        .invite-link {
          margin-top: 12px;
          border-radius: 16px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          padding: 12px;
          color: var(--text-primary);
          font-size: 12px;
          word-break: break-all;
        }
        .invite-grid,
        .share-actions {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }
        .invite-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        .share-actions {
          grid-template-columns: repeat(2, 1fr);
        }
        .invite-grid div {
          border-radius: 16px;
          background: var(--profile-card-bg);
          border: 1px solid var(--profile-card-border);
          padding: 12px 8px;
          text-align: center;
        }
        .invite-grid span {
          display: block;
          color: var(--text-muted);
          font-size: 11px;
        }
        .invite-grid strong {
          display: block;
          margin-top: 6px;
          color: var(--profile-card-text);
          font-size: 20px;
        }
        .sab {
          min-height: 52px;
          border-radius: 16px;
          border: 1px solid var(--settings-border);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          background: var(--settings-surface);
          color: var(--text-primary);
        }
        .sab:disabled {
          opacity: 0.52;
        }
        .sab-copy {
          background: linear-gradient(135deg, rgba(225,191,83,0.16), rgba(142,212,195,0.12));
        }
      `}</style>
    </div>
  );
}
