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
  const [expandedPanel, setExpandedPanel] = useState('redeem');

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
          <div className="hero-kicker">Language Club</div>
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
          <div className="entry-helper">先体验完整学习流，再决定是否兑换月卡。</div>
          <button
            className="btn-grad trial-btn"
            type="button"
            onClick={handleStartTrial}
            disabled={loadingAction === 'trial'}
          >
            {loadingAction === 'trial' ? t('login.verifying') : t('login.startFreeTrial')}
          </button>
        </div>

        <div className="entry-card animate-float-up stagger-3 advanced-card">
          <button
            type="button"
            className="advanced-toggle"
            aria-expanded={expandedPanel === 'redeem'}
            onClick={() => setExpandedPanel((current) => (current === 'redeem' ? '' : 'redeem'))}
          >
            <div>
              <div className="input-lbl">{t('login.redeemTitle')}</div>
              <div className="advanced-subcopy">已有激活码时再展开。</div>
            </div>
            <i className={`fas fa-chevron-${expandedPanel === 'redeem' ? 'up' : 'down'}`}></i>
          </button>

          <div className={`advanced-panel ${expandedPanel === 'redeem' ? 'open' : ''}`}>
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
        </div>

        <div className="entry-card animate-float-up stagger-4 advanced-card">
          <button
            type="button"
            className="advanced-toggle"
            aria-expanded={expandedPanel === 'password'}
            onClick={() => setExpandedPanel((current) => (current === 'password' ? '' : 'password'))}
          >
            <div>
              <div className="input-lbl">用户名登录</div>
              <div className="advanced-subcopy">老账号或运营入口使用。</div>
            </div>
            <i className={`fas fa-chevron-${expandedPanel === 'password' ? 'up' : 'down'}`}></i>
          </button>
          <div className={`advanced-panel ${expandedPanel === 'password' ? 'open' : ''}`}>
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
          padding: max(30px, env(safe-area-inset-top, 0px) + 18px) 18px 30px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 12px;
        }
        .login-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 22px 20px;
          border-radius: 28px;
          background:
            radial-gradient(circle at top, rgba(30,215,96,0.16), transparent 28%),
            linear-gradient(180deg, rgba(32,32,32,0.94), rgba(20,20,20,0.98));
          border: 1px solid var(--login-card-border);
          box-shadow: var(--panel-shadow);
        }
        .hero-kicker {
          margin-bottom: 14px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--accent-gold);
        }
        .app-logo-wrap {
          position: relative;
          margin-bottom: 18px;
        }
        .app-logo {
          width: 96px;
          height: 96px;
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
          background: radial-gradient(circle, rgba(30,215,96,0.22) 0%, transparent 70%);
          border-radius: 50%;
          z-index: 1;
          animation: breathe 3s ease-in-out infinite;
        }
        .app-name-km {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.08;
        }
        .app-name-cn {
          font-size: 11px;
          color: var(--accent-gold);
          letter-spacing: 0.32em;
          margin-top: 8px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .app-slogan {
          margin-top: 14px;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.65;
          max-width: 320px;
        }
        .hero-highlights {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
        }
        .hero-highlights span,
        .invite-banner {
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--text-primary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
        }
        .invite-banner {
          text-align: center;
          background: rgba(30,215,96,0.12);
          color: var(--text-primary);
        }
        .entry-card {
          width: 100%;
          padding: 18px;
          border-radius: 26px;
          background: var(--login-card-bg);
          border: 1px solid var(--login-card-border);
          box-shadow: var(--panel-shadow);
          backdrop-filter: blur(14px);
        }
        .entry-title,
        .input-lbl {
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--text-primary);
          font-weight: 800;
          margin-bottom: 8px;
        }
        .entry-copy {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.65;
          margin-bottom: 14px;
        }
        .entry-helper {
          font-size: 12px;
          line-height: 1.55;
          color: var(--text-muted);
          margin-bottom: 14px;
        }
        .advanced-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .advanced-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0;
          background: transparent;
          border: none;
          color: inherit;
          text-align: left;
        }
        .advanced-subcopy {
          font-size: 12px;
          color: var(--text-muted);
        }
        .advanced-panel {
          display: none;
        }
        .advanced-panel.open {
          display: block;
        }
        .trial-btn,
        .outline-btn {
          width: 100%;
          min-height: 52px;
          border-radius: 999px;
          font-weight: 800;
        }
        .outline-btn {
          margin-top: 14px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.04);
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.12em;
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
          border-radius: 24px;
          border: 1px solid var(--settings-border);
          background: var(--settings-surface);
          color: var(--text-primary);
          box-shadow: var(--panel-shadow);
        }
        .support-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(30,215,96,0.16);
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
