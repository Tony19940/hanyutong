import React, { useCallback, useRef, useState } from 'react';
import AchievementPoster from './AchievementPoster.jsx';
import { useAppShell } from '../i18n/index.js';

function openExternal(url) {
  if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function ShareModal({ user, stats, hskLevel, invite, onClose }) {
  const { t } = useAppShell();
  const stageRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const inviteUrl = invite?.url || '';
  const inviteStats = invite?.stats || {
    invitedCount: 0,
    convertedCount: 0,
    rewardDaysEarned: 0,
  };

  const handleSaveImage = useCallback(async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(stageRef.current, {
        backgroundColor: '#141612',
        scale: Math.max(window.devicePixelRatio || 1, 4),
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          return;
        }

        if (navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], 'bunson-teacher-share-card.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Bunson老师',
                text: `${user.name} ${t('share.posterText', { words: stats.wordsLearned, streak: stats.streak })}`,
              });
              return;
            }
          } catch (error) {
            if (error.name === 'AbortError') return;
          }
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'bunson-teacher-share-card.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }, 'image/png');
    } catch (err) {
      console.error('Save failed:', err);
    }
  }, [stats.streak, stats.wordsLearned, t, user.name]);

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

  const shareText = encodeURIComponent(t('share.inviteCopy'));
  const encodedUrl = encodeURIComponent(inviteUrl);

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
            <button className="sab sab-copy" onClick={handleCopy}>
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              <span>{copied ? t('share.copied') : t('share.copyLink')}</span>
            </button>
            <button className="sab" onClick={() => openExternal(`https://t.me/share/url?url=${encodedUrl}&text=${shareText}`)}>
              <i className="fab fa-telegram"></i>
              <span>Telegram</span>
            </button>
            <button className="sab" onClick={() => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${shareText}`)}>
              <i className="fab fa-facebook"></i>
              <span>Facebook</span>
            </button>
            <button className="sab" onClick={() => openExternal(`fb-messenger://share?link=${encodedUrl}`)}>
              <i className="fab fa-facebook-messenger"></i>
              <span>Messenger</span>
            </button>
          </div>
        </div>

        <div className="receipt-head">
          <div className="share-kicker">{t('share.posterLabel')}</div>
          <div className="receipt-tip">{t('share.posterTip')}</div>
        </div>

        <div className="receipt-wrap" ref={stageRef}>
          <AchievementPoster user={user} stats={stats} hskLevel={hskLevel} />
        </div>

        <button className="sab sab-save" onClick={handleSaveImage}>
          <i className="fas fa-download"></i>
          <span>{t('share.saveImage')}</span>
        </button>
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
          max-height: calc(100dvh - 44px);
          overflow: auto;
        }
        .share-head,
        .receipt-head {
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
          width: 38px; height: 38px;
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
          margin-bottom: 16px;
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
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 14px;
        }
        .invite-grid {
          grid-template-columns: repeat(3, 1fr);
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
        .receipt-head {
          margin-top: 4px;
          margin-bottom: 10px;
          display: block;
        }
        .receipt-tip {
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .receipt-wrap {
          min-height: 620px;
          border-radius: 28px;
          background: linear-gradient(180deg, #171914 0%, #10120f 100%);
          border: 1px solid rgba(225,191,83,0.18);
          overflow: hidden;
          box-shadow: 0 32px 70px rgba(0,0,0,0.22);
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
        .sab-save {
          width: 100%;
          margin-top: 14px;
          background: linear-gradient(135deg, var(--brand-gold) 0%, #d0a14a 32%, var(--brand-green) 100%);
          color: #fffef9;
          border: none;
        }
        .sab-copy {
          background: linear-gradient(135deg, rgba(225,191,83,0.16), rgba(142,212,195,0.12));
        }
      `}</style>
    </div>
  );
}
