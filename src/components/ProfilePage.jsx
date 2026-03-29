import React, { useState, useEffect } from 'react';
import { api, storage } from '../utils/api.js';
import ShareModal from './ShareModal.jsx';

export default function ProfilePage({ user, onOpenCollection }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

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
  const avatarUrl = user.avatar_url || user.avatarUrl || null;
  const username = user.username ? `@${user.username}` : '';

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
          <div className="hero-title">User Profile</div>
          <div className="hero-line"></div>
          <div className="av-wrap">
            {avatarUrl ? (
              <img className="av-img" src={avatarUrl} alt={user.name} referrerPolicy="no-referrer" />
            ) : (
              <div className="av-fallback">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            )}
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
          <div className="ach-lbl">连续学习</div>
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
        .profile-scroll { padding: 8px 22px 100px; height: 100%; overflow-y: auto; max-width: 390px; margin: 0 auto; }
        .profile-scroll::-webkit-scrollbar { display: none; }
        .prof-hero {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          padding: 20px 18px 24px;
          border-radius: 40px;
          background:
            radial-gradient(circle at 50% -10%, rgba(255,255,255,0.08), transparent 36%),
            radial-gradient(circle at top, rgba(245,216,143,0.08), transparent 36%),
            linear-gradient(180deg, rgba(7,61,43,0.98), rgba(5,49,34,0.96));
          border: 2px solid rgba(245,216,143,0.46);
          overflow: hidden;
          margin-bottom: 14px;
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
          font-size: 16px;
          font-weight: 800;
          color: #f5d88f;
          margin-bottom: 18px;
        }
        .hero-line {
          position: absolute;
          left: -8%;
          right: -8%;
          top: 104px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(245,216,143,0.74) 12%, rgba(245,216,143,0.88) 50%, rgba(245,216,143,0.74) 88%, transparent);
          z-index: 0;
          transform: perspective(400px) rotateX(22deg);
        }
        .av-wrap {
          width: 112px; height: 112px;
          border-radius: 56px;
          overflow: hidden;
          position: relative;
          z-index: 1;
          border: 5px solid rgba(245,216,143,0.82);
          box-shadow: 0 24px 42px rgba(0,0,0,0.26);
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
          font-size: 26px; font-weight: 800; color: #f7ebc4;
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
          position: relative; z-index: 1;
        }
        .prof-name-row {
          margin-top: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }
        .prof-handle {
          margin-top: 4px;
          font-size: 13px;
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
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
        .sc {
          border-radius: 18px; padding: 16px 8px 14px; text-align: center;
          border: 1.5px solid rgba(245,216,143,0.5);
          background: linear-gradient(180deg, rgba(17,76,53,0.9), rgba(10,59,41,0.92));
          box-shadow: 0 18px 36px rgba(0,0,0,0.12);
        }
        .tone-cyan, .tone-pink, .tone-lime { background: linear-gradient(180deg, rgba(11,68,45,0.94), rgba(8,52,35,0.92)); }
        .sc-num { font-size: 28px; font-weight: 800; color: #f6dc95; font-family: 'Manrope', 'Noto Sans SC', sans-serif; }
        .sc-lbl { margin-top: 6px; font-size: 13px; color: rgba(247,236,207,0.78); }
        .ach-card {
          border-radius: 28px; padding: 18px 20px 20px;
          background: transparent;
          border: none;
          margin-bottom: 14px;
        }
        .ach-lbl { display: none; }
        .streak-big { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 2px; margin-bottom: 14px; }
        .streak-flame { font-size: 42px; line-height: 1; filter: drop-shadow(0 8px 16px rgba(244,184,63,0.28)); }
        .streak-n {
          font-size: 62px; font-weight: 800;
          background: linear-gradient(135deg, #f6dc95, #cfaa52);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          line-height: 1;
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
        }
        .streak-u { font-size: 16px; color: rgba(247,236,207,0.86); font-weight: 700; }
        .streak-dots { display: flex; gap: 10px; justify-content: center; }
        .sd {
          width: 12px; height: 12px; border-radius: 999px;
          background: rgba(245,216,143,0.08); border: 1px solid rgba(245,216,143,0.12);
          display: flex; align-items: center; justify-content: center; color: transparent;
        }
        .sd.done { color: #fff; background: rgba(245,216,143,0.22); border-color: rgba(245,216,143,0.42); box-shadow: 0 0 18px rgba(245,216,143,0.42); }
        .sd.today { outline: 1px solid rgba(245,216,143,0.56); }
        .collection-entry, .share-main-btn, .logout-btn {
          width: 100%;
          min-height: 56px;
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          padding: 15px 16px;
          gap: 12px;
          margin-bottom: 12px;
          color: #fff;
        }
        .collection-entry {
          border: 1.5px solid rgba(245,216,143,0.38);
          background: transparent;
          color: rgba(247,236,207,0.92);
          font-weight: 700;
        }
        .share-main-btn {
          justify-content: center;
          border: 2px solid rgba(245,216,143,0.72);
          background: linear-gradient(90deg, #2e59c9 0%, #6040b8 100%);
          font-weight: 800;
          box-shadow: 0 20px 34px rgba(12,34,92,0.28);
          min-height: 62px;
          font-size: 16px;
        }
        .logout-btn {
          justify-content: center;
          border: 1.5px solid rgba(245,216,143,0.42);
          background: transparent;
          color: rgba(247,236,207,0.88);
        }
      `}</style>
    </div>
  );
}
