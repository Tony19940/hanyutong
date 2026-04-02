import React from 'react';
import { resolveAvatarUrl } from '../utils/avatar.js';

function formatDate() {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function AchievementPoster({ user, stats, hskLevel }) {
  const fallbackAvatarId = user.fallbackAvatarId || user.fallback_avatar_id || null;
  const avatarUrl = resolveAvatarUrl(user, fallbackAvatarId);
  const displayName = user.username ? `@${user.username}` : user.name;

  const rows = [
    {
      icon: 'menu_book',
      label: 'Progress',
      value: `${stats.wordsLearned} Words Learned`,
    },
    {
      icon: 'local_fire_department',
      label: 'Consistency',
      value: `${stats.streak} Days Streak`,
    },
    {
      icon: 'verified',
      label: 'Accuracy',
      value: `${stats.mastery}% Mastery`,
    },
  ];

  return (
    <div className="achievement-poster">
      <div className="poster-pattern" aria-hidden="true"></div>
      <div className="poster-card">
        <div className="poster-brand-line"></div>

        <div className="poster-brand">
          <div className="poster-brand-title">Bunson老师</div>
          <div className="poster-brand-subtitle">ACADEMIC EXCELLENCE</div>
        </div>

        <div className="poster-avatar-shell">
          <div className="poster-avatar-glow"></div>
          <img
            className="poster-avatar"
            src={avatarUrl}
            alt={user.name}
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="poster-user-name">{displayName}</div>
        <div className="poster-user-level">
          <i className="fas fa-circle poster-level-dot"></i>
          <span>MASTERY LEVEL {hskLevel}</span>
        </div>

        <div className="poster-metric-list">
          {rows.map((row) => (
            <div key={row.label} className="poster-metric-row">
              <div className="poster-metric-icon">
                <span className="material-symbols-outlined">{row.icon}</span>
              </div>
              <div className="poster-metric-copy">
                <div className="poster-metric-label">{row.label}</div>
                <div className="poster-metric-value">{row.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="poster-mark">
          <span className="material-symbols-outlined">temple_buddhist</span>
        </div>
      </div>

      <div className="poster-footer">
        <div className="poster-footer-title">Bunson老师 学习成果卡</div>
        <div className="poster-footer-date">{formatDate()}</div>
      </div>

      <style>{`
        .achievement-poster {
          width: 100%;
          height: 100%;
          padding: 24px 20px 18px;
          background:
            radial-gradient(circle at top, rgba(233,195,73,0.08), transparent 28%),
            linear-gradient(180deg, #141612 0%, #11130f 100%);
          color: #f6f2e8;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .poster-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.08;
          background-image:
            radial-gradient(circle at 20px 20px, rgba(255,255,255,0.18) 0 1px, transparent 1.6px),
            radial-gradient(circle at 60px 60px, rgba(255,255,255,0.12) 0 1px, transparent 1.6px);
          background-size: 80px 80px, 80px 80px;
          background-position: 0 0, 40px 40px;
          pointer-events: none;
        }
        .poster-card {
          position: relative;
          z-index: 1;
          border-radius: 34px;
          border: 1.5px solid rgba(233,195,73,0.24);
          background:
            linear-gradient(180deg, rgba(29,31,26,0.98) 0%, rgba(21,23,19,0.98) 100%);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.02),
            0 22px 48px rgba(0,0,0,0.32),
            0 0 0 1px rgba(233,195,73,0.04);
          padding: 26px 22px 22px;
          overflow: hidden;
        }
        .poster-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at top left, rgba(148,211,193,0.06), transparent 28%),
            radial-gradient(circle at bottom right, rgba(233,195,73,0.05), transparent 28%);
          pointer-events: none;
        }
        .poster-brand-line {
          width: 78px;
          height: 3px;
          border-radius: 999px;
          background: rgba(233,195,73,0.32);
          margin: 0 auto 24px;
        }
        .poster-brand {
          text-align: center;
          margin-bottom: 28px;
        }
        .poster-brand-title {
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: #f4f1e7;
          line-height: 1.1;
        }
        .poster-brand-subtitle {
          margin-top: 8px;
          font-size: 10px;
          letter-spacing: 0.24em;
          color: #e9c349;
          font-weight: 700;
        }
        .poster-avatar-shell {
          position: relative;
          width: 104px;
          height: 104px;
          margin: 0 auto;
        }
        .poster-avatar-glow {
          position: absolute;
          inset: 10px;
          border-radius: 50%;
          background: rgba(233,195,73,0.26);
          filter: blur(18px);
        }
        .poster-avatar {
          position: relative;
          z-index: 1;
          width: 104px;
          height: 104px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #f1cc59;
          background: #1f4037;
        }
        .poster-user-name {
          margin-top: 18px;
          text-align: center;
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
          font-size: 34px;
          font-weight: 800;
          line-height: 1.08;
        }
        .poster-user-level {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #e9c349;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }
        .poster-level-dot {
          font-size: 8px;
        }
        .poster-metric-list {
          margin-top: 32px;
          display: grid;
          gap: 12px;
        }
        .poster-metric-row {
          border-radius: 22px;
          background: rgba(56,56,52,0.72);
          padding: 16px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .poster-metric-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(233,195,73,0.12);
          color: #e9c349;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .poster-metric-icon .material-symbols-outlined {
          font-size: 21px;
        }
        .poster-metric-copy {
          min-width: 0;
        }
        .poster-metric-label {
          font-size: 10px;
          letter-spacing: 0.18em;
          color: rgba(244,241,231,0.56);
          text-transform: uppercase;
          font-weight: 700;
        }
        .poster-metric-value {
          margin-top: 6px;
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
          color: #f0c746;
          font-size: 22px;
          font-weight: 800;
          line-height: 1.15;
        }
        .poster-mark {
          margin-top: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(233,195,73,0.32);
        }
        .poster-mark .material-symbols-outlined {
          font-size: 42px;
        }
        .poster-footer {
          position: relative;
          z-index: 1;
          margin-top: 14px;
          text-align: center;
        }
        .poster-footer-title {
          font-size: 12px;
          color: rgba(244,241,231,0.78);
          font-weight: 700;
        }
        .poster-footer-date {
          margin-top: 4px;
          font-size: 11px;
          color: rgba(244,241,231,0.44);
        }
      `}</style>
    </div>
  );
}
