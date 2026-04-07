import React from 'react';

export default function AnnouncementPopup({ popup, onClose, onAction }) {
  if (!popup) return null;

  return (
    <div className="announce-mask animate-fade-in">
      <div className="announce-card animate-scale-in">
        <button type="button" className="announce-close" onClick={onClose} aria-label="close">
          <i className="fas fa-times"></i>
        </button>
        <img className="announce-image" src={popup.image?.url} alt={popup.title || 'popup'} />
        <div className="announce-copy">
          <h3>{popup.title}</h3>
          {popup.body ? <p>{popup.body}</p> : null}
        </div>
        <button type="button" className="announce-primary" onClick={() => onAction?.(popup)}>
          立即查看
        </button>
      </div>

      <style>{`
        .announce-mask {
          position: absolute;
          inset: 0;
          z-index: 80;
          background: rgba(5, 10, 9, 0.82);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
        }
        .announce-card {
          width: 100%;
          max-width: 360px;
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          background: var(--word-shell-bg);
          border: 1px solid var(--settings-border);
          box-shadow: 0 28px 48px rgba(0,0,0,0.28);
        }
        .announce-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(0,0,0,0.26);
          color: #fff;
          z-index: 2;
        }
        .announce-image {
          width: 100%;
          height: 180px;
          display: block;
          object-fit: cover;
          background: rgba(255,255,255,0.04);
        }
        .announce-copy {
          padding: 18px 18px 12px;
        }
        .announce-copy h3 {
          font-size: 19px;
          color: var(--text-primary);
        }
        .announce-copy p {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.7;
          color: var(--text-secondary);
        }
        .announce-primary {
          width: calc(100% - 36px);
          margin: 0 18px 18px;
          min-height: 48px;
          border-radius: 16px;
          border: none;
          background: linear-gradient(90deg, var(--brand-gold), #f4d76a);
          color: #1a4037;
          font-size: 15px;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}
