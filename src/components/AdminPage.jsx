import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState(null);
  const [keys, setKeys] = useState([]);
  const [filter, setFilter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState(1);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const loadData = useCallback(async () => {
    if (!password) return;
    try {
      const [statsData, keysData] = await Promise.all([
        api.getAdminStats(password),
        api.getKeys(password, filter || undefined),
      ]);
      setStats(statsData);
      setKeys(keysData.keys);
    } catch (err) {
      setError(err.message);
    }
  }, [password, filter]);

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  const handleLogin = async () => {
    try {
      await api.getAdminStats(password);
      setAuthed(true);
      setError('');
    } catch {
      setError('密码错误');
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.generateKey(genCount, password);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyKey = async (keyCode, e) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(keyCode);
      setCopiedKey(keyCode);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback for environments where clipboard API is not available
      const textArea = document.createElement('textarea');
      textArea.value = keyCode;
      textArea.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedKey(keyCode);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${min}`;
  };

  if (!authed) {
    return (
      <div className="admin-login">
        <div className="bg-layer">
          <div className="bg-gradient" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}></div>
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="admin-login-content">
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>
            密钥管理后台
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24, fontFamily: "'Noto Sans SC', sans-serif" }}>
            汉语通 · 运营后台
          </div>
          <div className="input-box" style={{ marginBottom: 14 }}>
            <i className="fas fa-lock"></i>
            <input
              type="password"
              placeholder="管理员密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              style={{ letterSpacing: 1 }}
            />
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <button className="btn-grad" onClick={handleLogin}>进入后台</button>
        </div>
        <style>{`
          .admin-login { width: 100%; height: 100%; position: relative; }
          .admin-login-content {
            position: relative; z-index: 10;
            height: 100%; display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            padding: 36px 28px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="bg-layer">
        <div className="bg-gradient" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}></div>
        <div className="blob blob-1" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)' }}></div>
        <div className="blob blob-2" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)' }}></div>
      </div>

      <div className="admin-content">
        <div className="admin-tb">
          <div>
            <div className="adm-ttl">密钥管理</div>
            <div className="adm-sub">汉语通 · 运营后台</div>
          </div>
          <div className="adm-av"><i className="fas fa-user-shield"></i></div>
        </div>

        {stats && (
          <div className="adm-stats">
            <div className="adm-s">
              <div className="adm-sn" style={{ color: '#a78bfa' }}>{stats.totalKeys}</div>
              <div className="adm-sl">总密钥</div>
            </div>
            <div className="adm-s">
              <div className="adm-sn" style={{ color: '#34d399' }}>{stats.activatedKeys}</div>
              <div className="adm-sl">已激活</div>
            </div>
            <div className="adm-s">
              <div className="adm-sn" style={{ color: '#60a5fa' }}>{stats.unusedKeys}</div>
              <div className="adm-sl">未使用</div>
            </div>
          </div>
        )}

        <div className="gen-row">
          <select
            className="gen-select"
            value={genCount}
            onChange={(e) => setGenCount(parseInt(e.target.value))}
          >
            {[1, 5, 10, 20, 50].map(n => (
              <option key={n} value={n}>生成 {n} 个</option>
            ))}
          </select>
          <button className="gen-btn" onClick={handleGenerate} disabled={generating}>
            <i className="fas fa-plus-circle"></i>
            {generating ? '生成中...' : '生成新密钥'}
          </button>
        </div>

        <div className="keys-hd">
          <span className="keys-hd-lbl">密钥列表</span>
          <div className="keys-filter">
            {['', 'unused', 'activated'].map(f => (
              <span
                key={f}
                className={`kf ${filter === f ? 'active' : 'inactive'}`}
                onClick={() => setFilter(f)}
              >
                {f === '' ? '全部' : f === 'unused' ? '未用' : '已用'}
              </span>
            ))}
          </div>
        </div>

        <div className="keys-list">
          {keys.map(key => (
            <div
              className={`ki ${key.status === 'activated' ? 'ka' : key.status === 'unused' ? '' : 'ku'}`}
              key={key.id}
            >
              <div className="ki-r1">
                <div className="ki-val">{key.key_code}</div>
                <div className="ki-actions">
                  <button
                    className={`copy-btn ${copiedKey === key.key_code ? 'copied' : ''}`}
                    onClick={(e) => handleCopyKey(key.key_code, e)}
                  >
                    <i className={`fas ${copiedKey === key.key_code ? 'fa-check' : 'fa-copy'}`}></i>
                    <span>{copiedKey === key.key_code ? '已复制' : '复制'}</span>
                  </button>
                  <div className={`badge ${key.status === 'unused' ? 'bg-new' :
                      key.status === 'activated' ? 'bg-act' : 'bg-use'
                    }`}>
                    {key.status === 'unused' ? '新建' :
                      key.status === 'activated' ? '已激活' : '已使用'}
                  </div>
                </div>
              </div>
              <div className="ki-r2">
                <div className="ki-m"><i className="fas fa-hashtag"></i><span>#{key.serial_number}</span></div>
                <div className="ki-m"><i className="fas fa-calendar"></i><span>{formatDate(key.created_at)}</span></div>
                {key.user_name && (
                  <div className="ki-m"><i className="fas fa-user"></i><span>{key.user_name}</span></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .admin-page { width: 100%; height: 100%; position: relative; overflow-y: auto; }
        .admin-page::-webkit-scrollbar { display: none; }
        .admin-content { position: relative; z-index: 10; padding-bottom: 40px; }
        .admin-tb {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 22px 18px;
        }
        .adm-ttl { font-size: 21px; font-weight: 700; color: #fff; font-family: 'Noto Sans SC', sans-serif; }
        .adm-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; font-family: 'Noto Sans SC', sans-serif; }
        .adm-av {
          width: 38px; height: 38px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; color: #fff;
        }
        .adm-stats { display: flex; gap: 9px; padding: 0 22px 16px; }
        .adm-s {
          flex: 1; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 13px; padding: 12px 10px; text-align: center;
        }
        .adm-sn { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
        .adm-sl { font-size: 10px; color: var(--text-muted); font-family: 'Noto Sans SC', sans-serif; }

        .gen-row {
          display: flex; gap: 9px; padding: 0 22px 16px;
        }
        .gen-select {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 13px; color: #fff;
          padding: 10px 14px; font-size: 13px;
          font-family: 'Noto Sans SC', sans-serif;
          outline: none; flex-shrink: 0;
        }
        .gen-select option { background: #1a1a3a; color: #fff; }
        .gen-btn {
          flex: 1; padding: 13px;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          border: none; border-radius: 13px; color: #fff;
          font-size: 13px; font-weight: 600; cursor: pointer;
          font-family: 'Noto Sans SC', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          box-shadow: 0 5px 18px rgba(124,58,237,0.38);
          transition: transform 0.15s ease;
        }
        .gen-btn:active { transform: scale(0.97); }
        .gen-btn:disabled { opacity: 0.6; }

        .keys-hd {
          padding: 0 22px 8px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .keys-hd-lbl { font-size: 11px; color: var(--text-muted); letter-spacing: 1px; font-family: 'Noto Sans SC', sans-serif; }
        .keys-filter { display: flex; gap: 7px; }
        .kf {
          font-size: 11px; padding: 2px 9px; border-radius: 9px;
          cursor: pointer; font-family: 'Noto Sans SC', sans-serif;
          transition: all 0.2s;
        }
        .kf.active {
          background: rgba(124,58,237,0.18); color: #a78bfa;
          border: 1px solid rgba(124,58,237,0.3);
        }
        .kf.inactive { color: var(--text-muted); }

        .keys-list { padding: 0 22px; display: flex; flex-direction: column; gap: 8px; }
        .ki {
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 13px; padding: 13px 14px;
        }
        .ki.ka { border-color: rgba(16,185,129,0.28); background: rgba(16,185,129,0.05); }
        .ki.ku { opacity: 0.6; }
        .ki-r1 { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
        .ki-val { font-size: 13px; font-weight: 600; color: #fff; letter-spacing: 1.5px; font-family: monospace; }
        .ki-actions { display: flex; align-items: center; gap: 6px; }

        .copy-btn {
          display: flex; align-items: center; gap: 3px;
          background: rgba(124,58,237,0.15);
          border: 1px solid rgba(124,58,237,0.3);
          border-radius: 8px; padding: 3px 10px;
          color: #a78bfa; font-size: 10px; font-weight: 600;
          cursor: pointer; font-family: 'Noto Sans SC', sans-serif;
          transition: all 0.2s;
        }
        .copy-btn:active { transform: scale(0.95); }
        .copy-btn.copied {
          background: rgba(16,185,129,0.15);
          border-color: rgba(16,185,129,0.3);
          color: #34d399;
        }
        .copy-btn i { font-size: 10px; }

        .badge { font-size: 10px; padding: 2px 9px; border-radius: 9px; font-weight: 600; }
        .bg-new { background: rgba(124,58,237,0.18); color: #a78bfa; border: 1px solid rgba(124,58,237,0.3); }
        .bg-act { background: rgba(16,185,129,0.18); color: #34d399; border: 1px solid rgba(16,185,129,0.28); }
        .bg-use { background: rgba(255,255,255,0.06); color: var(--text-muted); border: 1px solid rgba(255,255,255,0.09); }
        .ki-r2 { display: flex; gap: 14px; font-size: 10px; color: var(--text-muted); font-family: 'Noto Sans SC', sans-serif; flex-wrap: wrap; }
        .ki-m { display: flex; align-items: center; gap: 3px; }
        .ki-m i { font-size: 9px; }
      `}</style>
    </div>
  );
}
