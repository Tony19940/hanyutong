import React, { useCallback, useRef } from 'react';
import AchievementPoster from './AchievementPoster.jsx';

export default function ShareModal({ user, stats, hskLevel, onClose }) {
  const stageRef = useRef(null);

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
          alert('保存失败');
          return;
        }

        if (navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], 'bunson-teacher-share-card.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Bunson老师',
                text: `${user.name} 已学习 ${stats.wordsLearned} 个词，连续 ${stats.streak} 天。`,
              });
              return;
            }
          } catch (e) {
            if (e.name === 'AbortError') return;
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
      alert('保存失败');
    }
  }, [stats, user.name]);

  const handleShareFacebook = useCallback(() => {
    const shareText =
      `我在Bunson老师已学习 ${stats.wordsLearned} 个词，连续 ${stats.streak} 天。\n` +
      `当前掌握度 ${stats.mastery}%`;
    const encodedText = encodeURIComponent(shareText);
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?quote=${encodedText}`;
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(fbUrl);
    } else {
      window.open(fbUrl, '_blank');
    }
  }, [stats]);

  return (
    <div className="share-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="share-shell">
        <div className="share-head">
          <div>
            <div className="share-kicker">Share Card</div>
            <div className="share-title">分享成果</div>
          </div>
          <button type="button" className="share-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="receipt-wrap" ref={stageRef}>
          <AchievementPoster user={user} stats={stats} hskLevel={hskLevel} />
        </div>

        <div className="receipt-tip">保存这张学习成果卡，直接分享到聊天或社交平台。</div>

        <div className="share-actions">
          <button className="sab sab-save" onClick={handleSaveImage}>
            <i className="fas fa-download"></i>
            <span>保存图片</span>
          </button>
          <button className="sab sab-fb" onClick={handleShareFacebook}>
            <i className="fab fa-facebook"></i>
            <span>Facebook</span>
          </button>
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
          max-width: 380px;
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
          width: 38px; height: 38px;
          border-radius: 50%;
          border: 1px solid var(--settings-border);
          background: var(--settings-surface);
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
        .receipt-tip {
          margin-top: 12px;
          text-align: center;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .share-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 16px;
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
        }
        .sab-save {
          background: linear-gradient(135deg, var(--brand-gold) 0%, #d0a14a 32%, var(--brand-green) 100%);
          color: #fffef9;
          border: none;
        }
        .sab-fb {
          background: var(--settings-surface);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
