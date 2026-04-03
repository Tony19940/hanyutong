import React, { useEffect, useMemo, useState } from 'react';
import { api, storage } from '../utils/api.js';
import ShareModal from './ShareModal.jsx';
import { useAppShell } from '../i18n/index.js';
import { resolveAvatarUrl } from '../utils/avatar.js';

function formatExpiry(value, fallbackText) {
  if (!value) return fallbackText;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallbackText;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ProfilePage({
  user,
  membership: membershipProp,
  invite: inviteProp,
  profileRefreshKey,
  onOpenCollection,
}) {
  const {
    t,
    language,
    setLanguage,
    languageOptions,
    theme,
    setTheme,
    voiceType,
    setVoiceType,
    availableVoices,
    defaultVoiceType,
  } = useAppShell();
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
  }, [profileRefreshKey]);

  const membership = profile?.membership || membershipProp || null;
  const invite = profile?.invite || inviteProp || null;

  const expiryText = useMemo(
    () => formatExpiry(membership?.expiresAt, t('membership.freeTier')),
    [membership?.expiresAt, t]
  );

  if (loading || !profile) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-spinner"></div>
        <style>{`
          .profile-loading { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; z-index: 10; }
          .profile-loading-spinner {
            width: 36px; height: 36px;
            border: 3px solid var(--spinner-track);
            border-top-color: var(--spinner-accent); border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  const { stats } = profile;
  const hskLabels = { 1: 'HSK 1', 2: 'HSK 2', 3: 'HSK 3', 4: 'HSK 4', 5: 'HSK 5', 6: 'HSK 6' };
  const username = user.username ? `@${user.username}` : '';
  const fallbackAvatarId = user.fallbackAvatarId
    || user.fallback_avatar_id
    || profile.settings?.fallbackAvatarId
    || profile.settings?.fallback_avatar_id
    || null;
  const resolvedAvatarUrl = !avatarLoadFailed
    ? resolveAvatarUrl(
        {
          ...profile.user,
          ...user,
          username: user.username || profile.user?.username || '',
        },
        fallbackAvatarId
      )
    : resolveAvatarUrl({}, fallbackAvatarId);

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
          <div className="hero-title">{t('profile.title')}</div>
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
          {username ? <div className="prof-handle">{username}</div> : null}
          <div className="prof-expiry">
            <span>{t('membership.validUntil')}</span>
            <strong>{expiryText}</strong>
          </div>
        </div>

        <div className="membership-card animate-float-up stagger-1">
          <div className="membership-card-head">
            <div>
              <div className="membership-card-title">{t('membership.membershipTitle')}</div>
              <div className="membership-card-status">
                {membership?.accessLevel === 'premium' ? t('membership.monthCard') : t('membership.freeLayer')}
              </div>
            </div>
            <div className={`membership-pill ${membership?.accessLevel === 'premium' ? 'premium' : 'free'}`}>
              {membership?.accessLevel === 'premium' ? t('membership.premiumShort') : t('membership.freeShort')}
            </div>
          </div>
          <div className="membership-card-copy">{t('membership.profileValueCopy')}</div>
        </div>

        <div className="invite-card animate-float-up stagger-2">
          <div className="invite-card-head">
            <div>
              <div className="invite-card-title">{t('membership.inviteFriends')}</div>
              <div className="invite-card-copy">{t('membership.inviteExplainer')}</div>
            </div>
            <button className="invite-cta" type="button" onClick={() => setShowShare(true)}>
              {t('membership.openInvite')}
            </button>
          </div>
          <div className="invite-stats-grid">
            <div className="invite-stat">
              <span>{t('membership.invitedCount')}</span>
              <strong>{invite?.stats?.invitedCount || 0}</strong>
            </div>
            <div className="invite-stat">
              <span>{t('membership.convertedCount')}</span>
              <strong>{invite?.stats?.convertedCount || 0}</strong>
            </div>
            <div className="invite-stat">
              <span>{t('membership.rewardDays')}</span>
              <strong>{invite?.stats?.rewardDaysEarned || 0}</strong>
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="sc animate-float-up stagger-3 tone-cyan">
            <div className="sc-num">{stats.wordsLearned.toLocaleString()}</div>
            <div className="sc-lbl">{t('profile.wordsLearned')}</div>
          </div>
          <div className="sc animate-float-up stagger-4 tone-pink">
            <div className="sc-num">{stats.totalHours}h</div>
            <div className="sc-lbl">{t('profile.studyHours')}</div>
          </div>
          <div className="sc animate-float-up stagger-5 tone-lime">
            <div className="sc-num">{stats.mastery}%</div>
            <div className="sc-lbl">{t('profile.mastery')}</div>
          </div>
        </div>

        <div className="ach-card animate-float-up stagger-5">
          <div className="streak-big">
            <div className="streak-flame">🔥</div>
            <div className="streak-n">{stats.streak}</div>
            <div className="streak-u">{t('profile.streakDays', { count: stats.streak })}</div>
          </div>
          <div className="streak-dots">
            {stats.last7Days.map((day, index) => (
              <div key={index} className={`sd ${day.learned > 0 ? 'done' : ''} ${day.isToday ? 'today' : ''}`}>
                {day.learned > 0 ? '•' : ''}
              </div>
            ))}
          </div>
        </div>

        <div className="settings-card animate-float-up stagger-6">
          <div className="settings-title">{t('common.settings')}</div>
          <div className="setting-row">
            <div className="setting-label">{t('profile.languageSetting')}</div>
            <div className="setting-options">
              {languageOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`setting-chip ${language === item.id ? 'active' : ''}`}
                  onClick={() => setLanguage(item.id)}
                >
                  <span>{item.flag}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-label">{t('profile.themeSetting')}</div>
            <div className="setting-options">
              <button
                type="button"
                className={`setting-chip ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                {t('common.darkMode')}
              </button>
              <button
                type="button"
                className={`setting-chip ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                {t('common.lightMode')}
              </button>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-label">{t('profile.voiceSetting')}</div>
            <div className="setting-options voice-options">
              {(availableVoices || []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`setting-chip voice-chip ${voiceType === item.id ? 'active' : ''}`}
                  onClick={() => setVoiceType(item.id)}
                >
                  <span>{item.label}</span>
                  {item.id === defaultVoiceType ? (
                    <span className="voice-chip-meta">{t('profile.voiceDefault')}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button className="share-main-btn animate-float-up stagger-7" onClick={() => setShowShare(true)}>
          <i className="fas fa-user-plus"></i>
          <span>{t('membership.inviteFriends')}</span>
        </button>

        <button className="collection-entry animate-float-up stagger-7" onClick={onOpenCollection}>
          <span>{t('common.collection')}</span>
        </button>

        <button className="logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
          <span>{t('common.logout')}</span>
        </button>
      </div>

      {showShare ? (
        <ShareModal
          user={user}
          stats={stats}
          hskLevel={profile.user.hskLevel}
          invite={invite}
          membership={membership}
          onClose={() => setShowShare(false)}
        />
      ) : null}

      <style>{`
        .profile-page { flex: 1; position: relative; z-index: 10; overflow: hidden; }
        .profile-scroll { padding: 8px 18px 84px; height: 100%; overflow: auto; max-width: 390px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; }
        .profile-scroll::-webkit-scrollbar { display: none; }
        .prof-hero {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          padding: 14px 16px 16px;
          border-radius: 30px;
          background: var(--profile-hero-bg);
          border: 2px solid var(--profile-hero-border);
          overflow: hidden;
          box-shadow: 0 26px 44px rgba(3,20,12,0.12);
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
        .hero-glow { position: absolute; border-radius: 50%; filter: blur(36px); pointer-events: none; }
        .hero-glow-a { width: 160px; height: 160px; top: -40px; left: -30px; background: rgba(245,216,143,0.18); }
        .hero-glow-b { width: 150px; height: 150px; right: -20px; bottom: -50px; background: rgba(12,96,62,0.22); }
        .hero-title { position: relative; z-index: 1; font-size: 14px; font-weight: 800; color: var(--accent-gold); margin-bottom: 10px; }
        .hero-line {
          position: absolute; left: -8%; right: -8%; top: 82px; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(225,191,83,0.74) 12%, rgba(225,191,83,0.88) 50%, rgba(225,191,83,0.74) 88%, transparent);
          z-index: 0; transform: perspective(400px) rotateX(22deg);
        }
        .av-wrap {
          width: 88px; height: 88px; border-radius: 44px; overflow: hidden; position: relative;
          z-index: 2; border: 4px solid rgba(245,216,143,0.82); box-shadow: 0 18px 30px rgba(0,0,0,0.18);
          background: rgba(255,255,255,0.08);
        }
        .av-img {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          object-fit: cover; font-size: 34px; font-weight: 800; color: #fff;
          background: linear-gradient(135deg, var(--brand-green), var(--brand-teal));
        }
        .prof-name { font-size: 22px; font-weight: 800; color: var(--text-primary); font-family: 'Manrope', 'Noto Sans SC', sans-serif; position: relative; z-index: 1; }
        .prof-name-row { margin-top: 12px; display: flex; align-items: center; gap: 8px; position: relative; z-index: 1; }
        .prof-handle { margin-top: 2px; font-size: 12px; color: var(--text-secondary); position: relative; z-index: 1; }
        .prof-lv {
          position: relative; z-index: 1; padding: 4px 10px; border-radius: 999px;
          border: 1px solid rgba(245,216,143,0.56); background: var(--settings-surface);
          font-size: 12px; color: var(--text-secondary);
        }
        .prof-expiry {
          margin-top: 12px;
          position: relative;
          z-index: 1;
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(225,191,83,0.20);
          color: var(--text-secondary);
          font-size: 12px;
        }
        .prof-expiry strong { color: var(--text-primary); }
        .membership-card,
        .invite-card,
        .ach-card,
        .settings-card {
          border-radius: 22px; padding: 14px;
          background: var(--settings-surface);
          border: 1px solid var(--settings-border);
        }
        .membership-card-head,
        .invite-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .membership-card-title,
        .invite-card-title {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .membership-card-status {
          margin-top: 4px;
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .membership-card-copy,
        .invite-card-copy {
          margin-top: 8px;
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.6;
        }
        .membership-pill {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }
        .membership-pill.premium {
          background: rgba(225,191,83,0.18);
          border: 1px solid rgba(225,191,83,0.24);
          color: var(--accent-gold);
        }
        .membership-pill.free {
          background: rgba(11,106,88,0.16);
          border: 1px solid rgba(11,106,88,0.20);
          color: var(--brand-green);
        }
        .invite-cta {
          min-height: 38px;
          border-radius: 999px;
          padding: 0 14px;
          border: none;
          background: linear-gradient(90deg, var(--brand-gold) 0%, #f6d35b 100%);
          color: #173730;
          font-size: 12px;
          font-weight: 800;
        }
        .invite-stats-grid,
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .invite-stats-grid { margin-top: 12px; }
        .invite-stat,
        .sc {
          border-radius: 18px; padding: 12px 8px 10px; text-align: center;
          border: 1.5px solid var(--profile-card-border);
          background: var(--profile-card-bg);
          box-shadow: 0 18px 36px rgba(0,0,0,0.08);
        }
        .invite-stat span,
        .sc-lbl { font-size: 12px; color: var(--profile-secondary-text); }
        .invite-stat strong,
        .sc-num { display: block; margin-top: 4px; font-size: 24px; font-weight: 800; color: var(--profile-card-text); font-family: 'Manrope', 'Noto Sans SC', sans-serif; }
        .streak-big { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 2px; margin-bottom: 10px; }
        .streak-flame { font-size: 30px; line-height: 1; filter: drop-shadow(0 8px 16px rgba(244,184,63,0.28)); }
        .streak-n {
          font-size: 40px; font-weight: 800;
          background: linear-gradient(135deg, var(--brand-gold), #cfaa52);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          line-height: 1; font-family: 'Manrope', 'Noto Sans SC', sans-serif;
        }
        .streak-u { font-size: 14px; color: var(--profile-secondary-text); font-weight: 700; }
        .streak-dots { display: flex; gap: 8px; justify-content: center; }
        .sd {
          width: 10px; height: 10px; border-radius: 999px;
          background: rgba(245,216,143,0.08); border: 1px solid rgba(245,216,143,0.12);
          display: flex; align-items: center; justify-content: center; color: transparent;
        }
        .sd.done { color: #fff; background: rgba(245,216,143,0.22); border-color: rgba(245,216,143,0.42); box-shadow: 0 0 18px rgba(245,216,143,0.42); }
        .sd.today { outline: 1px solid rgba(245,216,143,0.56); }
        .settings-title { font-size: 13px; font-weight: 800; color: var(--text-primary); margin-bottom: 10px; }
        .setting-row + .setting-row { margin-top: 12px; }
        .setting-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
        .setting-options { display: flex; flex-wrap: wrap; gap: 8px; }
        .setting-chip {
          min-height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg); color: var(--settings-chip-text); display: inline-flex;
          align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 700;
        }
        .setting-chip.active {
          background: var(--settings-chip-active-bg);
          color: var(--settings-chip-active-text);
          border-color: transparent;
        }
        .voice-options { display:grid; grid-template-columns:1fr; gap:8px; }
        .voice-chip { justify-content:space-between; width:100%; padding:10px 12px; min-height:42px; }
        .voice-chip-meta { font-size:11px; opacity:.72; }
        .collection-entry, .share-main-btn, .logout-btn {
          width: 100%; min-height: 50px; border-radius: 18px; display: flex; align-items: center; justify-content: center;
          padding: 12px 16px; gap: 10px; color: #fff;
        }
        .collection-entry {
          border: 1.5px solid rgba(245,216,143,0.38);
          background: var(--settings-surface);
          color: var(--text-primary);
          font-weight: 700;
        }
        .share-main-btn {
          justify-content: center;
          border: none;
          background: linear-gradient(90deg, var(--brand-gold) 0%, #f6d35b 100%);
          color: #173730;
          font-weight: 800;
          box-shadow: 0 16px 28px rgba(11,106,88,0.14);
          min-height: 54px;
          font-size: 15px;
        }
        .logout-btn {
          justify-content: center;
          border: 1.5px solid rgba(245,216,143,0.42);
          background: var(--settings-surface);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
