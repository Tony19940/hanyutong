import React, { useState, useEffect } from 'react';
import { api, storage } from '../utils/api.js';
import ShareModal from './ShareModal.jsx';

function createDefaultAvatarDataUri(seed, palette) {
  const safeSeed = String(seed || 'U').trim().slice(0, 1).toUpperCase() || 'U';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="100%" stop-color="${palette[1]}"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="128" fill="url(#g)"/>
      <circle cx="128" cy="98" r="44" fill="rgba(255,255,255,0.22)"/>
      <path d="M60 214c18-34 42-50 68-50s50 16 68 50" fill="rgba(255,255,255,0.18)"/>
      <text x="128" y="150" text-anchor="middle" font-size="76" font-family="Arial" font-weight="700" fill="#fff">${safeSeed}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const DEFAULT_AVATARS = [
  createDefaultAvatarDataUri('A', ['#2b66dc', '#67b7ff']),
  createDefaultAvatarDataUri('B', ['#1d4b38', '#4fb281']),
  createDefaultAvatarDataUri('C', ['#8c5a17', '#f0c96c']),
  createDefaultAvatarDataUri('D', ['#5b44b2', '#9f83ff']),
];

function pickDefaultAvatar(seed) {
  const text = String(seed || 'user');
  const index = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
}

export default function ProfilePage({ user, onOpenCollection }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api.getProfile();
        setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !profile) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-spinner"></div>
        <style>{`
          .profile-loading { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; z-index: 10; }
          .profile-loading-spinner {
            width: 36px; height: 36px;
            border: 3px solid rgba(255,255,255,0.06);
            border-top-color: #58d6ff; border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  const { stats } = profile;
  const hskLabels = { 1: 'HSK 1', 2: 'HSK 2', 3: 'HSK 3', 4: 'HSK 4', 5: 'HSK 5', 6: 'HSK 6' };
  const avatarUrl = user.avatar_url || user.avatarUrl || profile.user?.avatar_url || profile.user?.avatarUrl || null;
  const username = user.username ? `@${user.username}` : '';
  const resolvedAvatarUrl = !avatarLoadFailed && avatarUrl ? avatarUrl : pickDefaultAvatar(user.name || username || profile.user?.name || 'U');

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error(error);
    } finally {
      localStorage.removeItem(storage.USER_TOKEN_KEY);
      localStorage.removeItem(storage.USER_STORAGE_KEY);
      window.location.reload();
    }
  };

  return (
    <div className="profile-page page-enter">
      <div className="profile-scroll">
        <div className="prof-hero animate-fade-in-up">
          <div className="hero-glow hero-glow-a"></div>
          <div className="hero-glow hero-glow-b"></div>
          <div className="hero-title">我的</div>
          <div className="hero-line"></div>
          <div className="av-wrap">
            <img
              className="av-img"
              src={resolvedAvatarUrl}
              alt={user.name}
              referrerPolicy="no-referrer"
              onError={() => setAvatarLoadFailed(true)}
            />
          </div>
          <div className="prof-name-row">
            <div className="prof-name">{user.name}</div>
            <div className="prof-lv">{hskLabels[profile.user.hskLevel] || hskLabels[1]}</div>
          </div>
          {username && <div className="prof-handle">{username}</div>}
        </div>

        <div className="stats-grid">
          <div className="sc animate-float-up stagger-1 tone-cyan">
            <div className="sc-num">{stats.wordsLearned.toLocaleString()}</div>
            <div className="sc-lbl">已学词数</div>
          </div>
          <div className="sc animate-float-up stagger-2 tone-pink">
            <div className="sc-num">{stats.totalHours}h</div>
            <div className="sc-lbl">学习时长</div>
          </div>
          <div className="sc animate-float-up stagger-3 tone-lime">
            <div className="sc-num">{stats.mastery}%</div>
            <div className="sc-lbl">掌握度</div>
          </div>
        </div>

        <div className="ach-card animate-float-up stagger-4">
          <div className="streak-big">
            <div className="streak-flame">🔥</div>
            <div className="streak-n">{stats.streak}</div>
            <div className="streak-u">连续学习 {stats.streak} 天</div>
          </div>
          <div className="streak-dots">
            {stats.last7Days.map((day, i) => (
              <div key={i} className={`sd ${day.learned > 0 ? 'done' : ''} ${day.isToday ? 'today' : ''}`}>
                {day.learned > 0 ? '•' : ''}
              </div>
            ))}
          </div>
        </div>

        <button className="share-main-btn animate-float-up stagger-5" onClick={() => setShowShare(true)}>
          <i className="fas fa-sparkles"></i>
          <span>分享成果</span>
        </button>

        <button className="collection-entry animate-float-up stagger-6" onClick={onOpenCollection}>
          <span>收藏词库</span>
        </button>

        <button className="logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
          <span>退出登录</span>
        </button>
      </div>

      {showShare && (
        <ShareModal
          user={user}
          stats={stats}
          hskLevel={profile.user.hskLevel}
          onClose={() => setShowShare(false)}
        />
      )}

        <style>{`
          .profile-page { flex: 1; position: relative; z-index: 10; overflow: hidden; }
        .profile-scroll { padding: 8px 18px 84px; height: 100%; overflow: hidden; max-width: 390px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; }
        .profile-scroll::-webkit-scrollbar { display: none; }
        .prof-hero {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          padding: 14px 16px 16px;
          border-radius: 30px;
          background:
            radial-gradient(circle at 50% -10%, rgba(255,255,255,0.08), transparent 36%),
            radial-gradient(circle at top, rgba(245,216,143,0.08), transparent 36%),
            linear-gradient(180deg, rgba(7,61,43,0.98), rgba(5,49,34,0.96));
          border: 2px solid rgba(245,216,143,0.46);
          overflow: hidden;
          box-shadow: 0 26px 44px rgba(3,20,12,0.22);
        }
        .prof-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(110% 80% at 0% 20%, rgba(255,255,255,0.08), transparent 30%),
            radial-gradient(120% 90% at 100% 10%, rgba(255,255,255,0.06), transparent 34%),
            radial-gradient(90% 70% at 50% 100%, rgba(0,0,0,0.08), transparent 42%);
          pointer-events: none;
        }
        .hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(36px);
          pointer-events: none;
        }
        .hero-glow-a { width: 160px; height: 160px; top: -40px; left: -30px; background: rgba(245,216,143,0.18); }
        .hero-glow-b { width: 150px; height: 150px; right: -20px; bottom: -50px; background: rgba(12,96,62,0.22); }
        .hero-title {
          position: relative;
          z-index: 1;
          font-size: 14px;
          font-weight: 800;
          color: #f5d88f;
          margin-bottom: 10px;
        }
        .hero-line {
          position: absolute;
          left: -8%;
          right: -8%;
          top: 82px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(245,216,143,0.74) 12%, rgba(245,216,143,0.88) 50%, rgba(245,216,143,0.74) 88%, transparent);
          z-index: 0;
          transform: perspective(400px) rotateX(22deg);
        }
        .av-wrap {
          width: 88px; height: 88px;
          border-radius: 44px;
          overflow: hidden;
          position: relative;
          z-index: 1;
          border: 4px solid rgba(245,216,143,0.82);
          box-shadow: 0 18px 30px rgba(0,0,0,0.22);
          background: rgba(255,255,255,0.08);
          z-index: 2;
        }
        .av-img, .av-fallback {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          object-fit: cover;
          font-size: 34px; font-weight: 800; color: #fff;
          background: linear-gradient(135deg, #284fae, #7c49a8);
        }
        .prof-name {
          font-size: 22px; font-weight: 800; color: #f7ebc4;
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
          position: relative; z-index: 1;
        }
        .prof-name-row {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }
        .prof-handle {
          margin-top: 2px;
          font-size: 12px;
          color: rgba(245, 241, 225, 0.8);
          position: relative; z-index: 1;
        }
        .prof-lv {
          position: relative; z-index: 1;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(245,216,143,0.56);
          background: rgba(245,216,143,0.08);
          font-size: 12px;
          color: rgba(247,236,207,0.94);
        }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .sc {
          border-radius: 18px; padding: 12px 8px 10px; text-align: center;
          border: 1.5px solid rgba(245,216,143,0.5);
          background: linear-gradient(180deg, rgba(17,76,53,0.9), rgba(10,59,41,0.92));
          box-shadow: 0 18px 36px rgba(0,0,0,0.12);
        }
        .tone-cyan, .tone-pink, .tone-lime { background: linear-gradient(180deg, rgba(11,68,45,0.94), rgba(8,52,35,0.92)); }
        .sc-num { font-size: 24px; font-weight: 800; color: #f6dc95; font-family: 'Manrope', 'Noto Sans SC', sans-serif; }
        .sc-lbl { margin-top: 4px; font-size: 12px; color: rgba(247,236,207,0.78); }
        .ach-card {
          border-radius: 22px; padding: 12px 14px 14px;
          background: rgba(9,57,40,0.28);
          border: 1px solid rgba(245,216,143,0.14);
        }
        .streak-big { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 2px; margin-bottom: 10px; }
        .streak-flame { font-size: 30px; line-height: 1; filter: drop-shadow(0 8px 16px rgba(244,184,63,0.28)); }
        .streak-n {
          font-size: 40px; font-weight: 800;
          background: linear-gradient(135deg, #f6dc95, #cfaa52);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          line-height: 1;
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
        }
        .streak-u { font-size: 14px; color: rgba(247,236,207,0.86); font-weight: 700; }
        .streak-dots { display: flex; gap: 8px; justify-content: center; }
        .sd {
          width: 10px; height: 10px; border-radius: 999px;
          background: rgba(245,216,143,0.08); border: 1px solid rgba(245,216,143,0.12);
          display: flex; align-items: center; justify-content: center; color: transparent;
        }
        .sd.done { color: #fff; background: rgba(245,216,143,0.22); border-color: rgba(245,216,143,0.42); box-shadow: 0 0 18px rgba(245,216,143,0.42); }
        .sd.today { outline: 1px solid rgba(245,216,143,0.56); }
        .collection-entry, .share-main-btn, .logout-btn {
          width: 100%;
          min-height: 50px;
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          padding: 12px 16px;
          gap: 10px;
          color: #fff;
        }
        .collection-entry {
          border: 1.5px solid rgba(245,216,143,0.38);
          background: rgba(255,255,255,0.03);
          color: rgba(247,236,207,0.92);
          font-weight: 700;
        }
        .share-main-btn {
          justify-content: center;
          border: 2px solid rgba(245,216,143,0.72);
          background: linear-gradient(90deg, #2e59c9 0%, #6040b8 100%);
          font-weight: 800;
          box-shadow: 0 16px 28px rgba(12,34,92,0.24);
          min-height: 54px;
          font-size: 15px;
        }
        .logout-btn {
          justify-content: center;
          border: 1.5px solid rgba(245,216,143,0.42);
          background: rgba(255,255,255,0.03);
          color: rgba(247,236,207,0.88);
        }
      `}</style>
    </div>
  );
}
