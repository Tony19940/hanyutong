import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import ShareModal from './ShareModal.jsx';

export default function ProfilePage({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await api.getProfile(user.id);
        setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  if (loading || !profile) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-spinner"></div>
        <style>{`
          .profile-loading {
            flex: 1; display: flex; align-items: center; justify-content: center;
            position: relative; z-index: 10;
          }
          .profile-loading-spinner {
            width: 36px; height: 36px;
            border: 3px solid rgba(255,255,255,0.06);
            border-top-color: #a78bfa; border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  const { stats } = profile;
  const hskLabels = {
    1: 'អ្នករៀនថ្នាក់ដំបូង · HSK 1',
    2: 'អ្នករៀនថ្នាក់ទី ២ · HSK 2',
    3: 'អ្នករៀនមធ្យម · HSK 3',
    4: 'អ្នករៀនកម្រិតខ្ពស់ · HSK 4',
    5: 'អ្នកជំនាញ · HSK 5',
    6: 'មាស្ទ័រ · HSK 6',
  };

  const handleLogout = () => {
    localStorage.removeItem('hyt_token');
    localStorage.removeItem('hyt_user');
    window.location.reload();
  };

  return (
    <div className="profile-page page-enter">
      <div className="profile-scroll">
        {/* Hero */}
        <div className="prof-hero animate-fade-in-up">
          <div className="av-wrap">
            <div className="av">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="av-ring"></div>
            <div className="av-glow"></div>
          </div>
          <div className="prof-name">{user.name}</div>
          <div className="prof-lv">⭐ {hskLabels[profile.user.hskLevel] || hskLabels[1]}</div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="sc animate-float-up stagger-1">
            <div className="sc-icon">📚</div>
            <div className="sc-num" style={{ color: '#a78bfa' }}>{stats.wordsLearned.toLocaleString()}</div>
            <div className="sc-lbl">ពាក្យដែលបានរៀន</div>
          </div>
          <div className="sc animate-float-up stagger-2">
            <div className="sc-icon">⏱️</div>
            <div className="sc-num" style={{ color: '#60a5fa' }}>{stats.totalHours}h</div>
            <div className="sc-lbl">ម៉ោងរៀន</div>
          </div>
          <div className="sc animate-float-up stagger-3">
            <div className="sc-icon">🎯</div>
            <div className="sc-num" style={{ color: '#34d399' }}>{stats.mastery}%</div>
            <div className="sc-lbl">ចំណេះ</div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="ach-card animate-float-up stagger-4">
          <div className="ach-glow"></div>
          <div className="ach-lbl">🔥 <span>ការសិក្សាបន្ត</span></div>
          <div className="streak-big">
            <div className="streak-n">{stats.streak}</div>
            <div className="streak-u">ថ្ងៃ · {stats.streak >= 7 ? '🏆' : '⭐'}</div>
          </div>
          <div className="streak-dots">
            {stats.last7Days.map((day, i) => (
              <div
                key={i}
                className={`sd ${day.learned > 0 ? 'done' : ''} ${day.isToday ? 'today' : ''}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {day.learned > 0 && !day.isToday ? (
                  <i className="fas fa-check" style={{ fontSize: 8 }}></i>
                ) : day.isToday ? (
                  <span style={{ fontSize: 8, fontWeight: 600 }}>ថ្ងៃ</span>
                ) : (
                  <span style={{ fontSize: 8 }}>{day.dayName}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Share Button */}
        <button className="share-main-btn animate-float-up stagger-5" onClick={() => setShowShare(true)}>
          <i className="fas fa-share-alt"></i>
          <span>ចែករំលែកសមិទ្ធផលរបស់ខ្ញុំ</span>
        </button>

        {/* Logout Button */}
        <button className="logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
          <span>ចាកចេញ</span>
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
        .profile-page {
          flex: 1; position: relative; z-index: 10;
          overflow: hidden;
        }
        .profile-scroll {
          padding: 0 22px;
          height: 100%;
          overflow-y: auto; padding-bottom: 100px;
        }
        .profile-scroll::-webkit-scrollbar { display: none; }

        .prof-hero {
          display: flex; flex-direction: column;
          align-items: center; padding: 8px 0 22px;
        }
        .av-wrap { position: relative; margin-bottom: 14px; }
        .av {
          width: 86px; height: 86px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          display: flex; align-items: center; justify-content: center;
          font-size: 36px; font-weight: 700; color: #fff;
          border: 3px solid rgba(255,255,255,0.15);
          position: relative; z-index: 2;
          box-shadow: 0 12px 32px rgba(124,58,237,0.35);
        }
        .av-ring {
          position: absolute; inset: -6px; border-radius: 50%;
          border: 2px solid transparent;
          background: linear-gradient(#07071a, #07071a) padding-box,
                      linear-gradient(135deg, #7c3aed, #2563eb, #10b981) border-box;
          animation: spin 12s linear infinite;
          z-index: 1;
        }
        .av-glow {
          position: absolute; inset: -16px;
          background: radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%);
          border-radius: 50%;
          z-index: 0;
          animation: breathe 3s ease-in-out infinite;
        }
        .prof-name {
          font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 6px;
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .prof-lv {
          display: inline-flex; align-items: center; gap: 5px;
          background: linear-gradient(135deg, rgba(124,58,237,0.18), rgba(37,99,235,0.18));
          border: 1px solid rgba(124,58,237,0.3);
          border-radius: 20px; padding: 4px 16px;
          font-size: 11px; color: #a78bfa; font-weight: 500;
          font-family: 'Noto Sans Khmer', sans-serif;
        }

        .stats-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 9px; margin-bottom: 14px;
        }
        .sc {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 16px 8px 14px; text-align: center;
          position: relative; overflow: hidden;
          transition: transform 0.15s ease, border-color var(--transition-fast);
        }
        .sc:active { transform: scale(0.96); }
        .sc-icon { font-size: 20px; margin-bottom: 6px; }
        .sc-num { font-size: 24px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
        .sc-lbl {
          font-size: 10px; color: var(--text-muted);
          font-family: 'Noto Sans Khmer', sans-serif;
        }

        .ach-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 22px; padding: 20px;
          margin-bottom: 14px; position: relative; overflow: hidden;
        }
        .ach-glow {
          position: absolute;
          top: -30px; right: -30px; width: 120px; height: 120px;
          background: radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .ach-lbl {
          font-size: 11px; color: var(--text-muted);
          margin-bottom: 10px; display: flex; align-items: center; gap: 5px;
          font-family: 'Noto Sans Khmer', sans-serif;
          position: relative; z-index: 1;
        }
        .streak-big {
          display: flex; align-items: baseline; gap: 8px; margin-bottom: 14px;
          position: relative; z-index: 1;
        }
        .streak-n {
          font-size: 50px; font-weight: 700;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          line-height: 1;
        }
        .streak-u {
          font-size: 14px; color: var(--text-sub);
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .streak-dots { 
          display: flex; gap: 6px; 
          position: relative; z-index: 1;
        }
        .sd {
          flex: 1; height: 30px; border-radius: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; color: var(--text-muted);
          font-family: 'Noto Sans Khmer', sans-serif;
          transition: all var(--transition-smooth);
        }
        .sd.done {
          background: linear-gradient(135deg, rgba(251,191,36,0.25), rgba(249,115,22,0.25));
          border-color: rgba(249,115,22,0.35); color: #fff;
        }
        .sd.today {
          background: rgba(251,191,36,0.12);
          border-color: rgba(251,191,36,0.3); color: #fbbf24;
          animation: breathe 2s ease-in-out infinite;
        }

        .share-main-btn {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          border: none; border-radius: 16px;
          color: #fff; font-size: 14px; font-weight: 600;
          cursor: pointer;
          font-family: 'Noto Sans Khmer', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 8px 28px rgba(124,58,237,0.3),
                      inset 0 1px 0 rgba(255,255,255,0.12);
          margin-bottom: 12px;
          position: relative; overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .share-main-btn::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.1), transparent);
          pointer-events: none;
          border-radius: 16px 16px 0 0;
        }
        .share-main-btn:active { 
          transform: scale(0.97); 
          box-shadow: 0 4px 16px rgba(124,58,237,0.25);
        }

        .logout-btn {
          width: 100%; padding: 13px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: var(--text-muted); font-size: 13px;
          cursor: pointer;
          font-family: 'Noto Sans Khmer', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: background var(--transition-fast), color var(--transition-fast), transform 0.15s ease;
        }
        .logout-btn:active { 
          background: rgba(239,68,68,0.1);
          color: #ef4444;
          transform: scale(0.97);
        }
      `}</style>
    </div>
  );
}
