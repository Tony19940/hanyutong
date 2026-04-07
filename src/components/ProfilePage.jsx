import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, storage } from '../utils/api.js';
import AvatarPickerModal from './AvatarPickerModal.jsx';
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
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);
  const scrollRef = useRef(null);

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
  }, [profileRefreshKey, avatarRefreshKey]);

  useEffect(() => {
    const wordsLearned = profile?.stats?.wordsLearned || 0;
    const streakDays = profile?.stats?.streak || 0;
    if (!profile) return;
    const milestone = streakDays >= 7
      ? `streak-${streakDays}`
      : wordsLearned >= 50 && wordsLearned % 50 === 0
        ? `words-${wordsLearned}`
        : null;
    if (!milestone) return;
    const storageKey = `hyt_share_milestone_${milestone}`;
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, '1');
    setShowShare(true);
  }, [profile]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
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
  const username = user.username
    ? `@${user.username}`
    : profile.account?.username
      ? `@${profile.account.username}`
      : '';
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
          preferredAvatarId: profile.settings?.preferredAvatarId || profile.settings?.preferred_avatar_id || null,
          avatarAssetId: profile.settings?.avatarAssetId || profile.settings?.avatar_asset_id || null,
        },
        fallbackAvatarId
      )
    : resolveAvatarUrl({}, fallbackAvatarId);
  const membershipCopy = resolveMembershipCopy(membership, t);
  const membershipBadgeClass = membership?.accessLevel === 'premium' ? 'premium' : 'free';
  const goalSummary = profile.studySummary || null;
  const calendar = profile.checkin?.calendar || [];
  const leaderboard = profile.socialProof?.inviteLeaderboard || [];
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
      <div className="profile-scroll" ref={scrollRef}>
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
              <button type="button" className="av-btn" onClick={() => setShowAvatarPicker(true)}>
                <img
                  className="av-img"
                  src={resolvedAvatarUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarLoadFailed(true)}
                />
                <span className="av-edit-badge">
                  <i className="fas fa-camera"></i>
                </span>
              </button>
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
          {goalSummary ? (
            <div className="goal-panel">
              <div className="goal-panel-copy">
                <strong>今日目标</strong>
                <span>{goalSummary.studiedWords}/{goalSummary.target} 已完成</span>
              </div>
              <div className={`goal-ring ${goalSummary.completed ? 'done' : ''}`}>
                {Math.min(Math.round((goalSummary.studiedWords / goalSummary.target) * 100), 100)}%
              </div>
            </div>
          ) : null}
          {calendar.length > 0 ? (
            <div className="checkin-strip">
              {calendar.slice(-14).map((day) => (
                <div key={day.date} className={`checkin-cell ${day.studied ? 'active' : ''} ${day.goalCompleted ? 'goal' : ''}`}>
                  <span>{day.date.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="invite-card-head">
            <div>
              <div className="invite-card-title">{t('membership.inviteFriends')}</div>
              <div className="invite-card-copy">{t('membership.inviteExplainer')}</div>
            </div>
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
          <button className="share-main-btn invite-card-action" type="button" onClick={() => setShowShare(true)}>
            <i className="fas fa-user-plus"></i>
            <span>{t('membership.inviteFriends')}</span>
          </button>
          {leaderboard.length > 0 ? (
            <div className="leaderboard-card">
              <div className="leaderboard-title">Invite Leaderboard</div>
              {leaderboard.slice(0, 3).map((entry) => (
                <div key={entry.rank} className="leaderboard-row">
                  <span>#{entry.rank} {entry.name}</span>
                  <strong>{entry.rewardDaysEarned} days</strong>
                </div>
              ))}
            </div>
          ) : null}
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

        <button className="logout-btn animate-float-up stagger-5" type="button" onClick={handleLogout}>
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

      {showAvatarPicker ? (
        <AvatarPickerModal
          avatars={profile.avatarOptions || []}
          onClose={() => setShowAvatarPicker(false)}
          onUpdated={() => {
            setAvatarLoadFailed(false);
            setAvatarRefreshKey((value) => value + 1);
          }}
        />
      ) : null}

      <style>{`
        .profile-page { position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 10; overflow: hidden; display: flex; flex-direction: column; }
        .profile-scroll {
          flex: 1 1 0%;
          min-height: 0;
          padding: 14px 14px calc(104px + env(safe-area-inset-bottom, 0px));
          overflow-y: auto;
          overflow-x: hidden;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .profile-scroll::-webkit-scrollbar { display: none; }
        .prof-hero {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 18px;
          min-height: 292px;
          border-radius: 28px;
          background: var(--profile-hero-bg);
          border: 1px solid var(--profile-hero-border);
          overflow: hidden;
          box-shadow: var(--panel-shadow);
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
        .hero-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 4px;
          position: relative;
          z-index: 1;
        }
        .hero-title {
          font-size: 11px;
          font-weight: 800;
          color: var(--accent-gold);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .hero-identity {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          margin-top: 2px;
          position: relative;
          z-index: 1;
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
          border: 2px solid rgba(255,255,255,0.14);
          box-shadow: 0 14px 24px rgba(0,0,0,0.22);
          background: rgba(255,255,255,0.08);
        }
        .av-btn {
          position: relative;
          width: 100%;
          height: 100%;
          border: none;
          background: transparent;
          padding: 0;
        }
        .av-img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          background: linear-gradient(135deg, var(--brand-green), var(--brand-teal));
        }
        .av-edit-badge {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: linear-gradient(180deg, var(--brand-gold), var(--brand-green));
          color: #041109;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          border: 2px solid rgba(8,14,12,0.85);
        }
        .prof-name-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .prof-name {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
          font-family: 'Outfit', 'Noto Sans SC', sans-serif;
        }
        .prof-lv {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.06);
          font-size: 11px;
          color: var(--text-secondary);
          letter-spacing: 0.08em;
          text-transform: uppercase;
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
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .membership-pill.premium {
          background: rgba(30,215,96,0.2);
          border: 1px solid rgba(30,215,96,0.22);
          color: var(--text-primary);
        }
        .membership-pill.free {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--text-secondary);
        }
        .hero-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
          position: relative;
          z-index: 1;
        }
        .hero-stat-card {
          border-radius: 16px;
          padding: 10px 8px;
          border: 1px solid var(--profile-card-border);
          background: var(--profile-card-bg);
          box-shadow: 0 12px 24px rgba(0,0,0,0.12);
        }
        .hero-stat-card strong {
          display: block;
          font-size: 22px;
          line-height: 1;
          font-weight: 800;
          color: var(--profile-card-text);
          font-family: 'Outfit', 'Noto Sans SC', sans-serif;
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
          position: relative;
          z-index: 1;
        }
        .hero-streak-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: transparent;
        }
        .hero-streak-dot.done {
          color: #fff;
          background: rgba(30,215,96,0.28);
          border-color: rgba(30,215,96,0.42);
          box-shadow: 0 0 18px rgba(30,215,96,0.28);
        }
        .hero-streak-dot.today {
          outline: 1px solid rgba(255,255,255,0.3);
        }
        .invite-card {
          border-radius: 22px;
          padding: 14px;
          background: var(--settings-surface);
          border: 1px solid var(--settings-border);
          box-shadow: var(--panel-shadow);
        }
        .goal-panel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
          padding: 14px;
          border-radius: 20px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .goal-panel-copy {
          display: grid;
          gap: 4px;
        }
        .goal-panel-copy strong {
          font-size: 16px;
          color: var(--text-primary);
        }
        .goal-panel-copy span {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .goal-ring {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 6px solid rgba(255,255,255,0.08);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-gold);
          font-size: 12px;
          font-weight: 800;
        }
        .goal-ring.done {
          border-color: rgba(30,215,96,0.38);
          color: var(--brand-teal);
        }
        .checkin-strip {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 14px;
        }
        .checkin-cell {
          min-height: 34px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 700;
        }
        .checkin-cell.active {
          background: rgba(225,191,83,0.12);
          color: var(--text-primary);
        }
        .checkin-cell.goal {
          border-color: rgba(30,215,96,0.24);
        }
        .invite-card-head {
          display: flex;
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
        .invite-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 12px;
        }
        .invite-card-action {
          margin-top: 12px;
        }
        .leaderboard-card {
          margin-top: 12px;
          border-radius: 18px;
          padding: 12px 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          display: grid;
          gap: 8px;
        }
        .leaderboard-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .leaderboard-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--text-secondary);
          font-size: 12px;
        }
        .leaderboard-row strong {
          color: var(--text-primary);
        }
        .invite-stat {
          border-radius: 18px;
          padding: 12px 8px 10px;
          text-align: center;
          border: 1px solid var(--profile-card-border);
          background: var(--profile-card-bg);
          box-shadow: 0 12px 24px rgba(0,0,0,0.12);
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
          font-family: 'Outfit', 'Noto Sans SC', sans-serif;
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
          box-shadow: var(--panel-shadow);
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
          background: linear-gradient(90deg, var(--brand-gold) 0%, var(--brand-green) 100%);
          color: #041109;
          font-weight: 800;
          box-shadow: 0 16px 28px rgba(30,215,96,0.2);
          min-height: 54px;
          font-size: 15px;
        }
        .logout-btn {
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.14);
          background: var(--settings-surface);
          color: var(--text-primary);
          box-shadow: var(--panel-shadow);
        }
        @media (max-width: 420px) {
          .profile-scroll {
            padding-top: max(38px, env(safe-area-inset-top, 0px) + 4px);
            padding-left: 12px;
            padding-right: 12px;
          }
          .prof-hero { padding: 16px 14px 18px; gap: 12px; border-radius: 24px; min-height: 304px; }
          .hero-topline { align-items: flex-start; }
          .hero-identity { align-items: center; gap: 12px; }
          .hero-copy { width: auto; flex: 1; }
          .hero-stats-grid { gap: 6px; }
        }
        @media (max-width: 380px) {
          .profile-scroll {
            padding-top: max(34px, env(safe-area-inset-top, 0px) + 2px);
            padding-left: 10px;
            padding-right: 10px;
          }
          .prof-hero { padding: 14px 12px 16px; gap: 10px; border-radius: 22px; min-height: 296px; }
          .av-wrap { width: 62px; height: 62px; border-radius: 31px; border-width: 2px; }
          .prof-name { font-size: 18px; }
          .prof-lv { font-size: 11px; padding: 3px 8px; }
          .prof-handle { font-size: 10px; }
          .hero-membership-line { font-size: 11px; margin-top: 4px; }
          .hero-membership-line.subdued { margin-top: 2px; font-size: 10px; }
          .hero-stats-grid { gap: 5px; }
          .hero-stat-card { padding: 8px 6px; border-radius: 14px; }
          .hero-stat-card strong { font-size: 19px; }
          .hero-stat-card span { font-size: 10px; margin-top: 3px; }
          .invite-card { padding: 10px; border-radius: 18px; }
          .invite-card-title { font-size: 12px; }
        }
        @media (max-width: 340px) {
          .profile-scroll {
            padding-top: max(30px, env(safe-area-inset-top, 0px) + 2px);
            padding-left: 8px;
            padding-right: 8px;
          }
          .prof-hero { padding: 12px 8px 14px; gap: 8px; border-radius: 18px; min-height: 276px; }
          .av-wrap { width: 52px; height: 52px; border-radius: 26px; border-width: 2px; }
          .prof-name { font-size: 16px; }
          .prof-lv { font-size: 10px; padding: 2px 6px; }
          .prof-handle { font-size: 10px; }
          .hero-identity { gap: 8px; }
          .hero-topline { gap: 8px; }
          .hero-title { font-size: 12px; }
          .hero-membership-line { font-size: 10px; }
          .hero-membership-line.subdued { font-size: 9px; }
          .prof-name-row { gap: 4px; }
          .hero-stats-grid { gap: 4px; }
          .hero-stat-card { padding: 6px 4px; border-radius: 12px; }
          .hero-stat-card strong { font-size: 16px; }
          .hero-stat-card span { font-size: 9px; }
          .membership-pill { padding: 3px 6px; font-size: 10px; }
          .invite-card { padding: 8px; border-radius: 16px; gap: 8px; }
          .invite-card-head { gap: 8px; }
          .invite-stat { padding: 6px 4px 6px; }
          .invite-stat strong { font-size: 16px; }
          .invite-stats-grid { gap: 4px; }
        }
      `}</style>
    </div>
  );
}
