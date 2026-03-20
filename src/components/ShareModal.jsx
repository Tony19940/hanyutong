import React, { useRef, useCallback } from 'react';

export default function ShareModal({ user, stats, hskLevel, onClose }) {
  const cardRef = useRef(null);

  const handleSaveImage = useCallback(async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a20',
        scale: 2,
        useCORS: true,
      });

      // Convert to blob for better mobile compatibility
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('រក្សាទុកបរាជ័យ');
          return;
        }

        // Try using Web Share API first (works on mobile)
        if (navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], 'learn-chinese-achievement.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: '\u179A\u17C0\u1793\u1797\u17B6\u179F\u17B6\u1785\u17B7\u1793',
                text: `?? \u179A\u17C0\u1793\u1797\u17B6\u179F\u17B6\u1785\u17B7\u1793\n?? ${stats.wordsLearned} words ? ${stats.streak} days`,
              });
              return;
            }
          } catch (e) {
            // User cancelled or share failed, fall through to download
            if (e.name === 'AbortError') return;
          }
        }

        // Fallback: direct download via blob URL
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'learn-chinese-achievement.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }, 'image/png');
    } catch (err) {
      console.error('Save failed:', err);
      alert('រក្សាទុកបរាជ័យ');
    }
  }, [stats]);

  const handleShareFacebook = useCallback(() => {
    const shareText =
      `?? \u179A\u17C0\u1793\u1797\u17B6\u179F\u17B6\u1785\u17B7\u1793!\n` +
      `?? ${stats.wordsLearned} words ? ${stats.streak} day streak\n` +
      `?? Mastery ${stats.mastery}%\n\n` +
      `Learn Chinese with @sotheary92\n` +
      `#LearnChinese #Khmer #Chinese`;

    const encodedText = encodeURIComponent(shareText);
    // Use Facebook's feed dialog which allows pre-filled text
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?quote=${encodedText}`;

    // Try Telegram's openLink first (better for in-app experience)
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(fbUrl);
    } else {
      window.open(fbUrl, '_blank');
    }
  }, [stats]);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  return (
    <div className="share-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="share-ttl">✨ សមិទ្ធផលរបស់ខ្ញុំ</div>

      <div className="share-card" ref={cardRef}>
        <div className="sc-blobs">
          <div className="scb1"></div>
          <div className="scb2"></div>
        </div>
        <div className="sc-inner">
          <div className="sc-hd">
            <div className="sc-logo">📖</div>
            <div>
              <div className="sc-name">
                {'\u179A\u17C0\u1793\u1797\u17B6\u179F\u17B6\u1785\u17B7\u1793'}
                <span>Learn Chinese</span>
              </div>
            </div>
          </div>
          <div className="sc-av-area">
            <div className="sc-av">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="sc-uname">{user.name}</div>
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,0.38)',
              fontFamily: "'Noto Sans Khmer', sans-serif"
            }}>
              ⭐ HSK {hskLevel}
            </div>
          </div>
          <div className="sc-ach-main">
            <div className="sc-streak">{stats.streak}</div>
            <div className="sc-streak-lbl">🔥 ថ្ងៃ · ការសិក្សាបន្ត</div>
          </div>
          <div className="sc-stats">
            <div className="sc-stat">
              <div className="sc-sn" style={{ color: '#a78bfa' }}>
                {stats.wordsLearned.toLocaleString()}
              </div>
              <div className="sc-sl">ពាក្យ</div>
            </div>
            <div className="sc-stat">
              <div className="sc-sn" style={{ color: '#60a5fa' }}>{stats.totalHours}h</div>
              <div className="sc-sl">ម៉ោង</div>
            </div>
            <div className="sc-stat">
              <div className="sc-sn" style={{ color: '#34d399' }}>{stats.mastery}%</div>
              <div className="sc-sl">ចំណេះ</div>
            </div>
          </div>
          <div className="sc-ft">{today} ? {'\u179A\u17C0\u1793\u1797\u17B6\u179F\u17B6\u1785\u17B7\u1793'}</div>
        </div>
      </div>

      <div className="share-actions">
        <button className="sab sab-save" onClick={handleSaveImage}>
          <i className="fas fa-download"></i>
          <span>រក្សាទុក</span>
        </button>
        <button className="sab sab-fb" onClick={handleShareFacebook}>
          <i className="fab fa-facebook"></i>
          <span>Facebook</span>
        </button>
      </div>

      <div className="share-close" onClick={onClose}>
        <i className="fas fa-times"></i>
      </div>

      <style>{`
        .share-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.75);
          z-index: 100;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 28px 22px;
          animation: fadeIn 0.3s ease;
        }
        .share-ttl {
          font-size: 13px; color: rgba(255,255,255,0.5);
          margin-bottom: 14px; letter-spacing: 2px;
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .share-card {
          width: 100%; max-width: 296px;
          border-radius: 22px; overflow: hidden;
          background: linear-gradient(135deg, #1a1040, #0d1b3e, #0a2a1a);
          box-shadow: 0 22px 55px rgba(0,0,0,0.55);
          position: relative;
        }
        .sc-blobs { position: absolute; inset: 0; }
        .scb1 {
          position: absolute; width: 170px; height: 170px; border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.42) 0%, transparent 70%);
          top: -45px; left: -45px; filter: blur(28px);
        }
        .scb2 {
          position: absolute; width: 140px; height: 140px; border-radius: 50%;
          background: radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%);
          bottom: -25px; right: -25px; filter: blur(22px);
        }
        .sc-inner { position: relative; z-index: 10; padding: 24px 20px; }
        .sc-hd { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .sc-logo {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        }
        .sc-name {
          font-size: 16px; font-weight: 700; color: #fff;
          letter-spacing: 2px; font-family: 'Noto Sans SC', sans-serif;
        }
        .sc-name span {
          font-size: 10px; color: rgba(255,255,255,0.38);
          letter-spacing: 1px; display: block; font-weight: 400;
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .sc-av-area {
          display: flex; flex-direction: column;
          align-items: center; margin-bottom: 18px;
        }
        .sc-av {
          width: 58px; height: 58px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; font-weight: 700; color: #fff;
          margin-bottom: 8px; border: 2px solid rgba(255,255,255,0.18);
        }
        .sc-uname { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 3px; }
        .sc-ach-main {
          text-align: center; background: rgba(255,255,255,0.06);
          border-radius: 14px; padding: 14px; margin-bottom: 14px;
        }
        .sc-streak {
          font-size: 52px; font-weight: 700;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          line-height: 1; margin-bottom: 4px;
        }
        .sc-streak-lbl {
          font-size: 12px; color: var(--text-sub);
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .sc-stats { display: flex; gap: 7px; margin-bottom: 14px; }
        .sc-stat {
          flex: 1; background: rgba(255,255,255,0.06);
          border-radius: 11px; padding: 9px 6px; text-align: center;
        }
        .sc-sn { font-size: 16px; font-weight: 700; }
        .sc-sl {
          font-size: 9px; color: var(--text-muted);
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .sc-ft {
          text-align: center; font-size: 9px;
          color: rgba(255,255,255,0.28);
          font-family: 'Noto Sans Khmer', sans-serif;
        }

        .share-actions {
          display: flex; gap: 9px;
          margin-top: 16px; width: 100%; max-width: 296px;
        }
        .sab {
          flex: 1; padding: 11px 8px; border-radius: 11px;
          font-size: 11px; font-weight: 600; border: none; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          font-family: 'Noto Sans Khmer', sans-serif;
          transition: transform 0.15s ease;
        }
        .sab i { font-size: 18px; }
        .sab:active { transform: scale(0.95); }
        .sab-save {
          background: linear-gradient(135deg, #7c3aed, #2563eb); color: #fff;
        }
        .sab-fb {
          background: rgba(24,119,242,0.2);
          border: 1px solid rgba(24,119,242,0.35); color: #4299e1;
        }
        .share-close {
          position: absolute; top: 16px; right: 16px;
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,0.1);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.5); font-size: 14px; cursor: pointer;
        }
        .share-close:active { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
