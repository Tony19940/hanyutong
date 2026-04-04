import React, { useEffect, useMemo, useState } from 'react';
import { api, storage } from '../utils/api.js';
import { getTelegramUser } from '../utils/telegram.js';
import { useAppShell } from '../i18n/index.js';

const PENDING_INVITE_KEY = 'hyt_pending_ref';

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

function persistAuth(response) {
  localStorage.setItem(storage.USER_TOKEN_KEY, response.token);
  localStorage.setItem(storage.USER_STORAGE_KEY, JSON.stringify(response.user));
  localStorage.removeItem(PENDING_INVITE_KEY);
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

export default function LoginPage({ onAuthenticated }) {
  const { t } = useAppShell();
  const [keyCode, setKeyCode] = useState('');
  const [loadingAction, setLoadingAction] = useState('');
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [passwordLoginForm, setPasswordLoginForm] = useState({ username: '', password: '' });

  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = String(url.searchParams.get('ref') || '').trim().toUpperCase();
    const cached = String(localStorage.getItem(PENDING_INVITE_KEY) || '').trim().toUpperCase();
    const nextInviteCode = ref || cached;
    if (nextInviteCode) {
      localStorage.setItem(PENDING_INVITE_KEY, nextInviteCode);
      setInviteCode(nextInviteCode);
    }

    if (ref) {
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  const inviteBanner = useMemo(() => (
    inviteCode
      ? t('login.inviteBanner', { code: inviteCode, days: 3 })
      : ''
  ), [inviteCode, t]);

  const handleStartTrial = async () => {
    setLoadingAction('trial');
    setError('');
    try {
      const tgUser = getTelegramUser();
      const response = await api.startTrial(
        tgUser?.id || null,
        tgUser?.name || 'User',
        tgUser?.avatarUrl || null,
        inviteCode || null
      );
      persistAuth(response);
      onAuthenticated?.(response);
    } catch (err) {
      setError(err.message || t('login.loginFailed'));
    } finally {
      setLoadingAction('');
    }
  };

  const handleRedeem = async () => {
    if (!keyCode || keyCode.length < 10) {
      setError(t('login.invalidKey'));
      return;
    }

    setLoadingAction('redeem');
    setError('');
    try {
      const tgUser = getTelegramUser();
      const response = await api.login(
        keyCode,
        tgUser?.id || null,
        tgUser?.name || 'User',
        tgUser?.avatarUrl || null,
        inviteCode || null
      );
      persistAuth(response);
      onAuthenticated?.(response);
    } catch (err) {
      setError(err.message || t('login.loginFailed'));
    } finally {
      setLoadingAction('');
    }
  };

  const handlePasswordLogin = async () => {
    if (!passwordLoginForm.username || !passwordLoginForm.password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoadingAction('password');
    setError('');
    try {
      const response = await api.passwordLogin(passwordLoginForm.username, passwordLoginForm.password);
      persistAuth(response);
      onAuthenticated?.(response);
    } catch (err) {
      setError(err.message || t('login.loginFailed'));
    } finally {
      setLoadingAction('');
    }
  };

  return (
    <div className="login-page">
      <div className="bg-layer">
        <div className="bg-gradient"></div>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="login-content">
        <div className="login-hero animate-pop-in">
          <div className="app-logo-wrap">
            <div className="app-logo">
              <img src="/bunson-teacher.jpg" alt="Bunson老师" className="app-logo-image" />
            </div>
            <div className="logo-glow"></div>
          </div>
          <div className="app-name-km">{t('login.title')}</div>
          <div className="app-name-cn">BUNSON TEACHER</div>
          <div className="app-slogan">
            {t('login.subtitle')}
          </div>
          <div className="hero-highlights">
            <span>5000+ {t('login.wordHighlights')}</span>
            <span>AI {t('tabs.practice')}</span>
            <span>{t('login.monthCardLabel')}</span>
          </div>
        </div>

        {inviteBanner ? <div className="invite-banner">{inviteBanner}</div> : null}

        <div className="entry-card animate-float-up stagger-2">
          <div className="entry-title">{t('login.startTrialTitle')}</div>
          <div className="entry-copy">{t('login.startTrialCopy')}</div>
          <button
            className="btn-grad trial-btn"
            type="button"
            onClick={handleStartTrial}
            disabled={loadingAction === 'trial'}
          >
            {loadingAction === 'trial' ? t('login.verifying') : t('login.startFreeTrial')}
          </button>
        </div>

        <div className="entry-card animate-float-up stagger-3">
          <div className="input-lbl">{t('login.redeemTitle')}</div>
          <div className="input-box">
            <i className="fas fa-key"></i>
            <input
              type="text"
              placeholder={t('login.placeholder')}
              value={keyCode}
              onChange={(event) => {
                setKeyCode(formatKey(event.target.value).slice(0, 19));
                setError('');
              }}
              onKeyDown={(event) => event.key === 'Enter' && handleRedeem()}
            />
          </div>

          {error ? (
            <div className="login-error animate-fade-in">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          ) : null}

          <button
            className="outline-btn"
            type="button"
            onClick={handleRedeem}
            disabled={loadingAction === 'redeem'}
          >
            {loadingAction === 'redeem' ? t('membership.redeeming') : t('login.redeemButton')}
          </button>
        </div>

        <div className="entry-card animate-float-up stagger-4">
          <div className="input-lbl">用户名登录</div>
          <div className="input-box" style={{ marginBottom: 10 }}>
            <i className="fas fa-user"></i>
            <input
              type="text"
              placeholder="用户名"
              value={passwordLoginForm.username}
              onChange={(event) => {
                setPasswordLoginForm((current) => ({ ...current, username: event.target.value }));
                setError('');
              }}
            />
          </div>
          <div className="input-box">
            <i className="fas fa-lock"></i>
            <input
              type="password"
              placeholder="密码"
              value={passwordLoginForm.password}
              onChange={(event) => {
                setPasswordLoginForm((current) => ({ ...current, password: event.target.value }));
                setError('');
              }}
              onKeyDown={(event) => event.key === 'Enter' && handlePasswordLogin()}
            />
          </div>
          <button
            className="outline-btn"
            type="button"
            onClick={handlePasswordLogin}
            disabled={loadingAction === 'password'}
          >
            {loadingAction === 'password' ? t('login.verifying') : '使用用户名登录'}
          </button>
        </div>

        <button className="support-card animate-float-up stagger-5" type="button" onClick={openSupport}>
          <div className="support-card-icon">
            <i className="fab fa-telegram"></i>
          </div>
          <div className="support-card-copy">
            <strong>{t('login.contactSupport')}</strong>
            <span>{t('login.supportMeta')}</span>
          </div>
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      <style>{`
        .login-page {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        .login-content {
          position: relative;
          z-index: 10;
          min-height: 100%;
          padding: 26px 20px 34px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 14px;
        }
        .login-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .app-logo-wrap {
          position: relative;
          margin-bottom: 18px;
        }
        .app-logo {
          width: 92px;
          height: 92px;
          background: var(--login-logo-bg);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 18px 36px var(--login-logo-shadow);
          position: relative;
          z-index: 2;
          border: 3px solid rgba(225,191,83,0.62);
          overflow: hidden;
        }
        .app-logo-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .logo-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, rgba(225,191,83,0.18) 0%, transparent 70%);
          border-radius: 50%;
          z-index: 1;
          animation: breathe 3s ease-in-out infinite;
        }
        .app-name-km {
          font-size: 24px;
          font-weight: 800;
          color: var(--brand-green);
          line-height: 1.3;
        }
        .app-name-cn {
          font-size: 12px;
          color: var(--accent-gold);
          letter-spacing: 3px;
          margin-top: 4px;
          font-weight: 700;
        }
        .app-slogan {
          margin-top: 10px;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.7;
          max-width: 320px;
        }
        .hero-highlights {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-top: 14px;
        }
        .hero-highlights span,
        .invite-banner {
          padding: 8px 12px;
          border-radius: 999px;
          background: var(--settings-surface);
          border: 1px solid var(--settings-border);
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 700;
        }
        .invite-banner {
          text-align: center;
        }
        .entry-card {
          width: 100%;
          padding: 18px;
          border-radius: 26px;
          background: var(--login-card-bg);
          border: 1px solid var(--login-card-border);
          box-shadow: 0 20px 40px rgba(8, 20, 17, 0.10);
          backdrop-filter: blur(14px);
        }
        .entry-title,
        .input-lbl {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 800;
          margin-bottom: 6px;
        }
        .entry-copy {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 14px;
        }
        .trial-btn,
        .outline-btn {
          width: 100%;
          min-height: 52px;
          border-radius: 18px;
          font-weight: 800;
        }
        .outline-btn {
          margin-top: 14px;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--text-primary);
        }
        .login-error {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #ef4444;
          margin-top: 12px;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.15);
        }
        .support-card {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          border-radius: 22px;
          border: 1px solid var(--settings-border);
          background: var(--settings-surface);
          color: var(--text-primary);
        }
        .support-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(36, 185, 129, 0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--login-support-text);
          font-size: 20px;
        }
        .support-card-copy {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
        }
        .support-card-copy strong {
          font-size: 14px;
        }
        .support-card-copy span {
          color: var(--text-secondary);
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
