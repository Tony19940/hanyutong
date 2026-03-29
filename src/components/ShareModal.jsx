import React, { useCallback, useRef } from 'react';
import InteractiveReceipt from './InteractiveReceipt.jsx';

export default function ShareModal({ user, stats, hskLevel, onClose }) {
  const stageRef = useRef(null);

  const handleSaveImage = useCallback(async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(stageRef.current, {
        backgroundColor: '#ffffff',
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
            const file = new File([blob], 'han-yu-tong-receipt.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: '汉语通',
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
        link.download = 'han-yu-tong-receipt.png';
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
      `我在汉语通已学习 ${stats.wordsLearned} 个词，连续 ${stats.streak} 天。\n` +
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
            <div className="share-kicker">Receipt</div>
            <div className="share-title">学习小票</div>
          </div>
          <button type="button" className="share-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="receipt-wrap" ref={stageRef}>
          <InteractiveReceipt user={user} stats={stats} hskLevel={hskLevel} />
        </div>

        <div className="receipt-tip">长按拖拽小票，保存后可直接分享学习成果。</div>

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
          background: rgba(3, 7, 19, 0.86);
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
          color: rgba(255,255,255,0.5);
        }
        .share-title {
          margin-top: 4px;
          font-size: 20px;
          font-weight: 800;
          color: #fff;
        }
        .share-close {
          width: 38px; height: 38px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.66);
        }
        .receipt-wrap {
          height: 520px;
          border-radius: 28px;
          background: linear-gradient(180deg, #fffdf6 0%, #f5f1e4 100%);
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
          box-shadow: 0 32px 70px rgba(0,0,0,0.28);
        }
        .receipt-tip {
          margin-top: 12px;
          text-align: center;
          font-size: 12px;
          color: rgba(255,255,255,0.56);
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
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
        }
        .sab-save {
          background: linear-gradient(135deg, #f0cc7a 0%, #d0a14a 32%, #2d7a5c 100%);
          color: #fff;
          border: none;
        }
        .sab-fb {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.86);
        }
      `}</style>
    </div>
  );
}
