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

function resolveMembershipCopy(membership, t) {
  if (!membership) {
    return t('membership.freeLayer');
  }

  if (membership.status === 'trial_active') {
    return t('profile.trialStatus');
  }

  if (membership.accessLevel === 'premium') {
    return t('membership.monthCard');
  }

  return t('membership.freeLayer');
}

export default function ProfilePage({
  user,
  membership: membershipProp,
  invite: inviteProp,
  profileRefreshKey,
  onOpenCollection,
  onOpenSettings,
}) {
  const { t } = useAppShell();
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
  const displayName = user.name || profile.user?.name || 'User';
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
  const membershipCopy = resolveMembershipCopy(membership, t);
  const membershipBadgeClass = membership?.accessLevel === 'premium' ? 'premium' : 'free';
  const heroStats = [
    {
      key: 'words',
      value: stats.wordsLearned.toLocaleString(),
      label: t('profile.wordsLearned'),
    },
    {
      key: 'hours',
      value: `${stats.totalHours}h`,
      label: t('profile.studyHours'),
    },
    {
      key: 'mastery',
      value: `${stats.mastery}%`,
      label: t('profile.mastery'),
    },
    {
      key: 'streak',
      value: stats.streak,
      label: t('profile.streakDays', { count: stats.streak }),
    },
  ];

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

          <div className="hero-topline">
            <div className="hero-title">{t('profile.title')}</div>
            <div className={`membership-pill ${membershipBadgeClass}`}>
              {membership?.accessLevel === 'premium' ? t('membership.premiumShort') : t('membership.freeShort')}
            </div>
          </div>

          <div className="hero-identity">
            <div className="av-wrap">
              <img
                className="av-img"
                src={resolvedAvatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarLoadFailed(true)}
              />
            </div>

            <div className="hero-copy">
              <div className="prof-name-row">
                <div className="prof-name">{displayName}</div>
                <div className="prof-lv">{hskLabels[profile.user.hskLevel] || hskLabels[1]}</div>
              </div>
              {username ? <div className="prof-handle">{username}</div> : null}

              <div className="hero-membership-line">
                <span>{t('profile.accountStatus')}</span>
                <strong>{membershipCopy}</strong>
              </div>
              <div className="hero-membership-line subdued">
                <span>{t('membership.validUntil')}</span>
                <strong>{expiryText}</strong>
              </div>
            </div>
          </div>

          <div className="hero-stats-grid">
            {heroStats.map((item) => (
              <div key={item.key} className="hero-stat-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="hero-streak-track">
            {stats.last7Days.map((day, index) => (
              <div key={index} className={`hero-streak-dot ${day.learned > 0 ? 'done' : ''} ${day.isToday ? 'today' : ''}`}>
                {day.learned > 0 ? '•' : ''}
              </div>
            ))}
          </div>
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

        <button className="profile-entry-card animate-float-up stagger-3" type="button" onClick={onOpenSettings}>
          <div className="profile-entry-copy">
            <strong>{t('common.settings')}</strong>
            <span>{t('profile.settingsEntrySubtitle')}</span>
          </div>
          <i className="fas fa-chevron-right"></i>
        </button>

        <button className="profile-entry-card animate-float-up stagger-4" type="button" onClick={onOpenCollection}>
          <div className="profile-entry-copy">
            <strong>{t('common.collection')}</strong>
            <span>{t('profile.collectionEntrySubtitle')}</span>
          </div>
          <i className="fas fa-chevron-right"></i>
        </button>

        <button className="share-main-btn animate-float-up stagger-5" type="button" onClick={() => setShowShare(true)}>
          <i className="fas fa-user-plus"></i>
          <span>{t('membership.inviteFriends')}</span>
        </button>

        <button className="logout-btn animate-float-up stagger-6" type="button" onClick={handleLogout}>
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
        .profile-page { position: relative; z-index: 10; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
        .profile-scroll {
          padding: 72px 16px 84px;
          height: 100%;
          overflow-y: auto;
          overflow-x: clip;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
        }
        .profile-scroll::-webkit-scrollbar { display: none; }
        @media (max-width: 375px) {
          .prof-hero { padding: 14px 12px; gap: 12px; border-radius: 24px; }
          .av-wrap { width: 64px; height: 64px; border-radius: 32px; border-width: 2px; }
          .prof-name { font-size: 18px; }
          .prof-lv { font-size: 11px; padding: 3px 8px; }
          .prof-hero .hero-title { font-size: 12px; }
          .hero-membership-line { margin-top: 4px; font-size: 11px; }
          .hero-membership-line.subdued { margin-top: 2px; }
          .prof-handle { font-size: 11px; }
          .hero-stat-card { padding: 8px 8px; border-radius: 14px; }
          .hero-stat-card strong { font-size: 20px; }
          .hero-stat-card span { font-size: 11px; }
          .prof-name-row { gap: 6px; }
          .hero-identity { gap: 12px; }
        }
        .prof-hero {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 18px;
          border-radius: 28px;
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
        .hero-topline,
        .hero-identity,
        .hero-stats-grid,
        .hero-streak-track {
          position: relative;
          z-index: 1;
        }
        .hero-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 4px;
        }
        .hero-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--accent-gold);
        }
        .hero-identity {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          margin-top: 2px;
        }
        .hero-copy {
          min-width: 0;
          flex: 1;
        }
        .av-wrap {
          width: 72px;
          height: 72px;
          border-radius: 36px;
          overflow: hidden;
          flex-shrink: 0;
          border: 3px solid rgba(245,216,143,0.82);
          box-shadow: 0 14px 24px rgba(0,0,0,0.18);
          background: rgba(255,255,255,0.08);
        }
        .av-img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          background: linear-gradient(135deg, var(--brand-green), var(--brand-teal));
        }
        .prof-name-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .prof-name {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary);
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
        }
        .prof-lv {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(245,216,143,0.56);
          background: var(--settings-surface);
          font-size: 12px;
          color: var(--text-secondary);
        }
        .prof-handle {
          margin-top: 2px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .hero-membership-line {
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-items: center;
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .hero-membership-line strong {
          color: var(--text-primary);
        }
        .hero-membership-line.subdued {
          margin-top: 4px;
        }
        .membership-pill {
          padding: 4px 8px;
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
        .hero-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }
        .hero-stat-card {
          border-radius: 16px;
          padding: 10px 8px;
          border: 1.5px solid var(--profile-card-border);
          background: var(--profile-card-bg);
          box-shadow: 0 18px 36px rgba(0,0,0,0.08);
        }
        .hero-stat-card strong {
          display: block;
          font-size: 22px;
          line-height: 1;
          font-weight: 800;
          color: var(--profile-card-text);
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
        }
        .hero-stat-card span {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          line-height: 1.45;
          color: var(--profile-secondary-text);
        }
        .hero-streak-track {
          display: flex;
          gap: 8px;
          justify-content: center;
        }
        .hero-streak-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(245,216,143,0.08);
          border: 1px solid rgba(245,216,143,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: transparent;
        }
        .hero-streak-dot.done {
          color: #fff;
          background: rgba(245,216,143,0.22);
          border-color: rgba(245,216,143,0.42);
          box-shadow: 0 0 18px rgba(245,216,143,0.42);
        }
        .hero-streak-dot.today {
          outline: 1px solid rgba(245,216,143,0.56);
        }
        .invite-card {
          border-radius: 22px;
          padding: 14px;
          background: var(--settings-surface);
          border: 1px solid var(--settings-border);
        }
        .invite-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .invite-card-title {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .invite-card-copy {
          margin-top: 8px;
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.6;
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
        .invite-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 12px;
        }
        .invite-stat {
          border-radius: 18px;
          padding: 12px 8px 10px;
          text-align: center;
          border: 1.5px solid var(--profile-card-border);
          background: var(--profile-card-bg);
          box-shadow: 0 18px 36px rgba(0,0,0,0.08);
        }
        .invite-stat span {
          font-size: 12px;
          color: var(--profile-secondary-text);
        }
        .invite-stat strong {
          display: block;
          margin-top: 4px;
          font-size: 24px;
          font-weight: 800;
          color: var(--profile-card-text);
          font-family: 'Manrope', 'Noto Sans SC', sans-serif;
        }
        .profile-entry-card,
        .share-main-btn,
        .logout-btn {
          width: 100%;
          min-height: 52px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
        }
        .profile-entry-card {
          border: 1px solid var(--settings-border);
          background: var(--settings-surface);
          color: var(--text-primary);
        }
        .profile-entry-copy {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
        }
        .profile-entry-copy strong {
          font-size: 14px;
        }
        .profile-entry-copy span {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
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
        @media (max-width: 380px) {
          .profile-scroll { padding: 72px 12px 84px; }
          .prof-hero { padding: 14px 12px; gap: 12px; border-radius: 22px; }
          .av-wrap { width: 56px; height: 56px; border-radius: 28px; border-width: 2px; }
          .prof-name { font-size: 18px; }
          .prof-lv { font-size: 11px; padding: 3px 8px; }
          .prof-handle { font-size: 10px; }
          .hero-identity { gap: 12px; }
          .hero-membership-line { font-size: 11px; margin-top: 4px; }
          .hero-membership-line.subdued { margin-top: 2px; font-size: 10px; }
          .hero-stats-grid { gap: 5px; }
          .hero-stat-card { padding: 8px 6px; border-radius: 14px; }
          .hero-stat-card strong { font-size: 19px; }
          .hero-stat-card span { font-size: 10px; margin-top: 3px; }
          .invite-card { padding: 10px; border-radius: 18px; }
          .invite-card-title { font-size: 12px; }
        }
      `}</style>
    </div>
  );
}
