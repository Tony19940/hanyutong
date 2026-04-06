import React, { useMemo, useState } from 'react';
import { api, storage } from '../utils/api.js';
import { useAppShell } from '../i18n/index.js';

function formatKey(value) {
  const clean = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
  const noDash = clean.replace(/-/g, '');
  if (noDash.length <= 3) return noDash;
  const prefix = noDash.slice(0, 3);
  const rest = noDash.slice(3);
  const segments = [prefix];
  for (let index = 0; index < rest.length; index += 4) {
    segments.push(rest.slice(index, index + 4));
  }
  return segments.slice(0, 4).join('-');
}

function formatExpiry(value) {
  if (!value) return 'Unlimited';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function openSupport() {
  const tgUrl = 'https://t.me/sotheary92';
  if (window.Telegram?.WebApp?.openTelegramLink) {
    window.Telegram.WebApp.openTelegramLink(tgUrl);
    return;
  }
  if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(tgUrl);
    return;
  }
  window.open(tgUrl, '_blank', 'noopener,noreferrer');
}

export default function MembershipGate({
  featureName,
  featureNameKey,
  membership,
  invite,
  onAuthenticated,
  onOpenProfile,
}) {
  const { t } = useAppShell();
  const [keyCode, setKeyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const summary = useMemo(() => invite?.stats || null, [invite]);
  const resolvedFeatureName = featureNameKey ? t(featureNameKey) : featureName;

  const handleRedeem = async () => {
    if (!keyCode || keyCode.length < 10) {
      setError(t('login.invalidKey'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.redeemActivationCode(keyCode);
      localStorage.setItem(storage.USER_TOKEN_KEY, response.token);
      localStorage.setItem(storage.USER_STORAGE_KEY, JSON.stringify(response.user));
      onAuthenticated?.(response);
      setKeyCode('');
    } catch (err) {
      setError(err.message || t('membership.redeemFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="membership-gate page-enter">
      <div className="membership-shell">
        <div className="membership-kicker">{t('membership.premiumOnly')}</div>
        <h2 className="membership-title">{resolvedFeatureName}</h2>
        <p className="membership-subtitle">{t('membership.gateSubtitle')}</p>

        <div className="membership-status-card">
          <div className="membership-status-row">
            <span>{t('membership.currentPlan')}</span>
            <strong>{membership?.accessLevel === 'premium' ? t('membership.monthCard') : t('membership.freeLayer')}</strong>
          </div>
          <div className="membership-status-row">
            <span>{t('membership.validUntil')}</span>
            <strong>{membership?.expiresAt ? formatExpiry(membership.expiresAt) : t('membership.freeTier')}</strong>
          </div>
          <div className="membership-status-note">{t('membership.homeStillAvailable')}</div>
        </div>

        <div className="membership-value-list">
          <div className="membership-value-item">AI {t('tabs.practice')} · {t('membership.valueDialogue')}</div>
          <div className="membership-value-item">{t('tabs.quiz')} · {t('membership.valueQuiz')}</div>
          <div className="membership-value-item">{t('membership.valueSupport')}</div>
        </div>

        <div className="membership-input-card">
          <label className="membership-input-label" htmlFor="membership-key-input">
            {t('membership.redeemLabel')}
          </label>
          <input
            id="membership-key-input"
            className="membership-input"
            type="text"
            value={keyCode}
            placeholder={t('login.placeholder')}
            onChange={(event) => {
              setKeyCode(formatKey(event.target.value).slice(0, 19));
              setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleRedeem();
              }
            }}
          />
          {error ? <div className="membership-error">{error}</div> : null}
          <button type="button" className="membership-primary-btn" onClick={handleRedeem} disabled={loading}>
            {loading ? t('membership.redeeming') : t('membership.redeemNow')}
          </button>
          <button type="button" className="membership-secondary-btn" onClick={openSupport}>
            {t('membership.contactTelegram')}
          </button>
        </div>

        {summary ? (
          <div className="membership-invite-card">
            <div className="membership-invite-head">
              <strong>{t('membership.inviteFriends')}</strong>
              <button type="button" className="membership-link-btn" onClick={() => onOpenProfile?.()}>
                {t('membership.viewInviteCenter')}
              </button>
            </div>
            <div className="membership-invite-grid">
              <div>
                <span>{t('membership.invitedCount')}</span>
                <strong>{summary.invitedCount}</strong>
              </div>
              <div>
                <span>{t('membership.convertedCount')}</span>
                <strong>{summary.convertedCount}</strong>
              </div>
              <div>
                <span>{t('membership.rewardDays')}</span>
                <strong>{summary.rewardDaysEarned}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        .membership-gate {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          position: relative;
          z-index: 10;
        }
        .membership-shell {
          width: 100%;
          max-width: 390px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .membership-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--accent-gold);
          text-align: center;
        }
        .membership-title {
          font-size: 32px;
          line-height: 1.1;
          text-align: center;
          color: var(--text-primary);
          font-family: 'Outfit', 'Noto Sans SC', sans-serif;
        }
        .membership-subtitle {
          text-align: center;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.6;
        }
        .membership-status-card,
        .membership-input-card,
        .membership-invite-card {
          background: var(--settings-surface);
          border: 1px solid var(--settings-border);
          border-radius: 26px;
          padding: 16px;
          box-shadow: var(--panel-shadow);
        }
        .membership-status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .membership-status-row strong {
          color: var(--text-primary);
          font-size: 14px;
        }
        .membership-status-row + .membership-status-row {
          margin-top: 10px;
        }
        .membership-status-note {
          margin-top: 12px;
          color: var(--text-muted);
          font-size: 12px;
        }
        .membership-value-list {
          display: grid;
          gap: 8px;
        }
        .membership-value-item {
          border-radius: 999px;
          padding: 12px 14px;
          background: var(--home-card-bg);
          border: 1px solid var(--home-card-border);
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .membership-input-label {
          display: block;
          margin-bottom: 8px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
        }
        .membership-input {
          width: 100%;
          min-height: 50px;
          border-radius: 999px;
          border: 1px solid var(--input-border);
          background: var(--input-bg);
          color: var(--text-primary);
          padding: 0 14px;
          font-size: 14px;
        }
        .membership-error {
          margin-top: 10px;
          color: #ef4444;
          font-size: 12px;
        }
        .membership-primary-btn,
        .membership-secondary-btn,
        .membership-link-btn {
          width: 100%;
          min-height: 48px;
          border-radius: 999px;
          font-weight: 800;
          margin-top: 12px;
        }
        .membership-primary-btn {
          border: none;
          background: linear-gradient(135deg, var(--button-primary-start), var(--button-primary-mid), var(--button-primary-end));
          color: #041109;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .membership-secondary-btn,
        .membership-link-btn {
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--text-primary);
        }
        .membership-invite-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--text-primary);
        }
        .membership-link-btn {
          width: auto;
          min-height: 36px;
          margin-top: 0;
          padding: 0 12px;
          font-size: 12px;
        }
        .membership-invite-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 14px;
        }
        .membership-invite-grid div {
          border-radius: 20px;
          padding: 12px 10px;
          background: var(--profile-card-bg);
          border: 1px solid var(--profile-card-border);
          text-align: center;
        }
        .membership-invite-grid span {
          display: block;
          color: var(--text-muted);
          font-size: 11px;
        }
        .membership-invite-grid strong {
          display: block;
          margin-top: 6px;
          font-size: 20px;
          color: var(--profile-card-text);
        }
      `}</style>
    </div>
  );
}
