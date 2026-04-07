import React from 'react';

export default function OfflineNotice({ online, pending = 0 }) {
  if (online && pending <= 0) return null;

  const label = online
    ? `有 ${pending} 条学习记录等待同步`
    : '当前离线，已切换到本地缓存模式';

  return (
    <div className="offline-notice">
      <i className={`fas ${online ? 'fa-cloud-upload-alt' : 'fa-wifi'}`}></i>
      <span>{label}</span>
      <style>{`
        .offline-notice {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          align-self: flex-start;
          margin-bottom: 10px;
          padding: 10px 12px;
          border-radius: 999px;
          background: rgba(255, 184, 0, 0.12);
          border: 1px solid rgba(255, 184, 0, 0.24);
          color: var(--text-primary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
