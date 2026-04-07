import React from 'react';

export default function FirstRunGuide({ visible, onClose }) {
  if (!visible) return null;

  return (
    <div className="first-run-guide">
      <div className="first-run-sheet">
        <div className="first-run-kicker">Quick start</div>
        <h3>先滑一张词卡</h3>
        <p>左滑表示今天学会，右滑表示先加入收藏。点按卡片可以翻面，查看例句后再打复习分。</p>
        <div className="first-run-gestures">
          <div><strong>左滑</strong><span>学会</span></div>
          <div><strong>右滑</strong><span>收藏</span></div>
          <div><strong>点按</strong><span>翻面</span></div>
        </div>
        <button type="button" className="first-run-button" onClick={onClose}>开始学习</button>
      </div>

      <style>{`
        .first-run-guide {
          position: absolute;
          inset: 0;
          z-index: 30;
          display: flex;
          align-items: flex-end;
          padding: 18px;
          background: rgba(4, 7, 17, 0.54);
          backdrop-filter: blur(12px);
        }
        .first-run-sheet {
          width: 100%;
          border-radius: 28px;
          padding: 18px;
          background: rgba(10, 14, 24, 0.94);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 22px 48px rgba(0,0,0,0.34);
          color: var(--text-primary);
        }
        .first-run-kicker {
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--accent-gold);
          font-weight: 800;
        }
        .first-run-sheet h3 {
          margin-top: 8px;
          font-size: 24px;
          font-family: 'Outfit', 'Noto Sans SC', sans-serif;
        }
        .first-run-sheet p {
          margin-top: 10px;
          color: var(--text-secondary);
          line-height: 1.65;
          font-size: 13px;
        }
        .first-run-gestures {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }
        .first-run-gestures div {
          border-radius: 18px;
          padding: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          display: grid;
          gap: 4px;
          text-align: center;
        }
        .first-run-gestures strong {
          font-size: 14px;
        }
        .first-run-gestures span {
          font-size: 11px;
          color: var(--text-muted);
        }
        .first-run-button {
          margin-top: 16px;
          width: 100%;
          min-height: 50px;
          border-radius: 999px;
          border: none;
          font-weight: 800;
          color: #041109;
          background: linear-gradient(135deg, var(--brand-gold), var(--brand-teal));
        }
      `}</style>
    </div>
  );
}
