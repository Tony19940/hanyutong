import React, { useState } from 'react';
import { api, storage } from '../utils/api.js';
import { getTelegramUser } from '../utils/telegram.js';

export default function LoginPage({ onLogin }) {
  const [keyCode, setKeyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatKey = (value) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const noDash = clean.replace(/-/g, '');
    if (noDash.length <= 3) return noDash;
    const prefix = noDash.slice(0, 3);
    const rest = noDash.slice(3);
    const segments = [prefix];
    for (let i = 0; i < rest.length; i += 4) {
      segments.push(rest.slice(i, i + 4));
    }
    return segments.slice(0, 4).join('-');
  };

  const handleInputChange = (e) => {
    const formatted = formatKey(e.target.value);
    if (formatted.length <= 19) {
      setKeyCode(formatted);
      setError('');
    }
  };

  const handleLogin = async () => {
    if (!keyCode || keyCode.length < 10) {
      setError('សូមបញ្ចូលលេខសម្ងាត់ឱ្យបានត្រឹមត្រូវ');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tgUser = getTelegramUser();
      const data = await api.login(
        keyCode,
        tgUser?.id || null,
        tgUser?.name || 'User',
        tgUser?.avatarUrl || null
      );

      localStorage.setItem(storage.USER_TOKEN_KEY, data.token);
      localStorage.setItem(storage.USER_STORAGE_KEY, JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'បរាជ័យក្នុងការចូល');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSupport = () => {
    const tgUrl = 'https://t.me/sotheary92';
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(tgUrl);
    } else {
      window.open(tgUrl, '_blank');
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
        {/* Decorative particles */}
        <div className="particles">
          <div className="particle p1">汉</div>
          <div className="particle p2">语</div>
          <div className="particle p3">通</div>
          <div className="particle p4">学</div>
          <div className="particle p5">中</div>
        </div>

        <div className="app-logo-wrap animate-pop-in">
          <div className="app-logo">📖</div>
          <div className="logo-glow"></div>
        </div>

        <div className="app-name-km animate-fade-in-up stagger-1">{'\u179A\u17C0\u1793\u1797\u17B6\u179F\u17B6\u1785\u17B7\u1793'}</div>
        <div className="app-name-cn animate-fade-in-up stagger-2">LEARN CHINESE</div>
        <div className="app-slogan animate-fade-in-up stagger-3">
          កម្មវិធីរៀនភាសាចិន<br />
          សម្រាប់អ្នកនិយាយភាសាខ្មែរ<br />
          <span className="slogan-sub">ជាង ៥០០០ ពាក្យ · សំឡេងស្តង់ដារ</span>
        </div>

        <div className="login-form animate-float-up stagger-4">
          <div className="input-lbl">🔐 បញ្ចូលលេខសម្ងាត់របស់អ្នក</div>
          <div className="input-box">
            <i className="fas fa-key"></i>
            <input
              type="text"
              placeholder="HYT-XXXX-XXXX-XXXX"
              value={keyCode}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && (
            <div className="login-error animate-fade-in">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <button
            className="btn-grad"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="btn-spinner"></span>
                កំពុងផ្ទៀងផ្ទាត់...
              </span>
            ) : 'ចាប់ផ្ដើមរៀន'}
          </button>

          <div className="buy-link" onClick={handleContactSupport}>
            <i className="fab fa-telegram"></i>
            <div className="buy-link-text">
              ទំនាក់ទំនងទិញលេខសម្ងាត់
              <span>@sotheary92 · 24/7</span>
            </div>
            <i className="fas fa-chevron-right buy-link-arrow"></i>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          width: 100%; height: 100%;
          position: relative; overflow: hidden;
        }
        .login-content {
          position: relative; z-index: 10;
          height: 100%; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 36px 28px;
        }

        /* Floating particles */
        .particles {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 0;
          overflow: hidden;
        }
        .particle {
          position: absolute;
          font-family: 'Noto Serif SC', serif;
          color: rgba(124,58,237,0.06);
          font-size: 48px; font-weight: 700;
        }
        .p1 { top: 8%; left: 5%; animation: particleFloat 15s ease-in-out infinite; }
        .p2 { top: 15%; right: 8%; animation: particleFloat 18s ease-in-out infinite 2s; font-size: 36px; }
        .p3 { bottom: 25%; left: 10%; animation: particleFloat 20s ease-in-out infinite 4s; font-size: 52px; }
        .p4 { top: 40%; right: 5%; animation: particleFloat 14s ease-in-out infinite 1s; font-size: 32px; }
        .p5 { bottom: 12%; right: 15%; animation: particleFloat 16s ease-in-out infinite 3s; font-size: 40px; }
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
          50% { transform: translateY(-20px) rotate(8deg); opacity: 0.7; }
        }

        .app-logo-wrap { 
          position: relative; margin-bottom: 20px; 
        }
        .app-logo {
          width: 100px; height: 100px;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          border-radius: 28px;
          display: flex; align-items: center; justify-content: center;
          font-size: 48px;
          box-shadow: 0 20px 45px rgba(124,58,237,0.4);
          position: relative; z-index: 2;
          border: 2px solid rgba(255,255,255,0.1);
        }
        .logo-glow {
          position: absolute; inset: -20px;
          background: radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%);
          border-radius: 50%;
          z-index: 1;
          animation: breathe 3s ease-in-out infinite;
        }
        .app-name-km {
          font-size: 22px; font-weight: 700; color: #fff;
          text-align: center; line-height: 1.4; margin-bottom: 4px;
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .app-name-cn {
          font-size: 13px; color: rgba(255,255,255,0.3);
          letter-spacing: 4px; margin-bottom: 6px;
          font-family: 'Noto Sans SC', sans-serif;
        }
        .app-slogan {
          font-size: 12px; color: rgba(255,255,255,0.38);
          text-align: center; line-height: 1.9; margin-bottom: 36px;
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .slogan-sub {
          color: rgba(255,255,255,0.22); font-size: 11px;
        }
        .login-form { width: 100%; }
        .input-lbl {
          font-size: 12px; color: var(--text-sub);
          margin-bottom: 8px;
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .login-error {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: #ef4444;
          margin: 10px 0;
          font-family: 'Noto Sans Khmer', sans-serif;
          background: rgba(239,68,68,0.08);
          padding: 8px 12px; border-radius: 10px;
          border: 1px solid rgba(239,68,68,0.15);
        }
        .login-error i { font-size: 12px; flex-shrink: 0; }
        .login-form .btn-grad {
          margin-top: 14px; margin-bottom: 0;
        }
        .btn-loading {
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        .buy-link {
          margin-top: 14px;
          display: flex; align-items: center; gap: 8px;
          background: rgba(41,182,246,0.08);
          border: 1px solid rgba(41,182,246,0.18);
          border-radius: 14px; padding: 12px 18px;
          width: 100%; cursor: pointer;
          transition: background var(--transition-fast), transform 0.15s ease;
        }
        .buy-link:active { 
          background: rgba(41,182,246,0.15); 
          transform: scale(0.98);
        }
        .buy-link i.fab { color: #29b6f6; font-size: 18px; }
        .buy-link-text {
          font-size: 13px; color: #67d8f7;
          font-family: 'Noto Sans Khmer', sans-serif; font-weight: 500;
          flex: 1;
        }
        .buy-link-text span {
          display: block; font-size: 11px;
          color: rgba(255,255,255,0.3); font-weight: 400;
          margin-top: 1px;
        }
        .buy-link-arrow {
          color: rgba(41,182,246,0.4); font-size: 12px;
        }
      `}</style>
    </div>
  );
}
