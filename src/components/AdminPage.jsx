import React, { useCallback, useEffect, useState } from 'react';
import { api, storage } from '../utils/api.js';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function toDateInput(daysAhead = 30) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

function toExpiryIso(dateInput) {
  if (!dateInput) return null;
  const date = new Date(`${dateInput}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function statusMeta(status) {
  if (status === 'active') return { label: '有效中', className: 'bg-act' };
  if (status === 'expired') return { label: '已过期', className: 'bg-exp' };
  return { label: '未使用', className: 'bg-new' };
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [stats, setStats] = useState(null);
  const [keys, setKeys] = useState([]);
  const [filter, setFilter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState(1);
  const [durationDays, setDurationDays] = useState(30);
  const [fixedExpiry, setFixedExpiry] = useState('');
  const [extendDate, setExtendDate] = useState(toDateInput(30));
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const clearAdminSession = useCallback(() => {
    localStorage.removeItem(storage.ADMIN_TOKEN_KEY);
    setAuthed(false);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [statsData, keysData] = await Promise.all([
        api.getAdminStats(),
        api.getKeys(filter || undefined),
      ]);
      setStats(statsData);
      setKeys(keysData.keys);
      setError('');
    } catch (err) {
      if (err.status === 401) {
        clearAdminSession();
      }
      setError(err.message);
    }
  }, [clearAdminSession, filter]);

  useEffect(() => {
    const token = localStorage.getItem(storage.ADMIN_TOKEN_KEY);
    if (!token) {
      setCheckingSession(false);
      return;
    }

    api.verifyAdmin()
      .then(() => {
        setAuthed(true);
      })
      .catch(() => {
        clearAdminSession();
      })
      .finally(() => {
        setCheckingSession(false);
      });
  }, [clearAdminSession]);

  useEffect(() => {
    if (authed) {
      loadData();
    }
  }, [authed, loadData]);

  const handleLogin = async () => {
    try {
      const data = await api.adminLogin(password);
      localStorage.setItem(storage.ADMIN_TOKEN_KEY, data.token);
      setAuthed(true);
      setError('');
      setPassword('');
    } catch (err) {
      setError(err.message || '登录失败');
    }
  };

  const handleLogout = async () => {
    try {
      await api.adminLogout();
    } catch (err) {
      console.error(err);
    } finally {
      clearAdminSession();
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const payload = fixedExpiry
        ? { expiresAt: toExpiryIso(fixedExpiry) }
        : { durationDays };
      await api.generateKey(genCount, payload);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteKey(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExpire = async (id) => {
    try {
      await api.expireKey(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExtend = async (id) => {
    const expiresAt = toExpiryIso(extendDate);
    if (!expiresAt) {
      setError('请选择新的截止日期');
      return;
    }

    try {
      await api.extendKey(id, expiresAt);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopyKey = async (keyCode, event) => {
    if (event) event.stopPropagation();
    try {
      await navigator.clipboard.writeText(keyCode);
      setCopiedKey(keyCode);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
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

  if (checkingSession) {
    return (
      <div className="admin-login">
        <div className="admin-login-content">
          <div style={{ color: '#fff' }}>Checking admin session...</div>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-login">
        <div className="bg-layer">
          <div className="bg-gradient" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}></div>
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="admin-login-content">
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>
            会员月卡后台
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24, fontFamily: "'Noto Sans SC', sans-serif" }}>
            Activation Keys Admin
          </div>
          <div className="input-box" style={{ marginBottom: 14 }}>
            <i className="fas fa-lock"></i>
            <input
              type="password"
              placeholder="管理员密码"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
              style={{ letterSpacing: 1 }}
            />
          </div>
          {error ? <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{error}</div> : null}
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
            <div className="adm-ttl">会员密钥管理</div>
            <div className="adm-sub">Month Card Admin</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="adm-av"><i className="fas fa-user-shield"></i></div>
            <button className="logout-small" onClick={handleLogout}>退出</button>
          </div>
        </div>

        {stats ? (
          <div className="adm-stats">
            <div className="adm-s">
              <div className="adm-sn" style={{ color: '#a78bfa' }}>{stats.totalKeys}</div>
              <div className="adm-sl">总密钥</div>
            </div>
            <div className="adm-s">
              <div className="adm-sn" style={{ color: '#34d399' }}>{stats.activeKeys}</div>
              <div className="adm-sl">有效中</div>
            </div>
            <div className="adm-s">
              <div className="adm-sn" style={{ color: '#60a5fa' }}>{stats.unusedKeys}</div>
              <div className="adm-sl">未使用</div>
            </div>
            <div className="adm-s">
              <div className="adm-sn" style={{ color: '#f59e0b' }}>{stats.expiredKeys}</div>
              <div className="adm-sl">已过期</div>
            </div>
          </div>
        ) : null}

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="panel">
          <div className="panel-title">生成新密钥</div>
          <div className="controls-grid">
            <select
              className="gen-select"
              value={genCount}
              onChange={(event) => setGenCount(Number.parseInt(event.target.value, 10))}
            >
              {[1, 5, 10, 20, 50].map((count) => (
                <option key={count} value={count}>生成 {count} 个</option>
              ))}
            </select>

            <input
              className="gen-input"
              type="number"
              min="1"
              value={durationDays}
              onChange={(event) => setDurationDays(Number.parseInt(event.target.value, 10) || 30)}
              placeholder="有效天数"
            />

            <input
              className="gen-input"
              type="date"
              value={fixedExpiry}
              onChange={(event) => setFixedExpiry(event.target.value)}
            />

            <button className="gen-btn" onClick={handleGenerate} disabled={generating}>
              <i className="fas fa-plus-circle"></i>
              {generating ? '生成中...' : '生成月卡密钥'}
            </button>
          </div>
          <div className="panel-hint">填写固定截止日期时优先按截止日期生成；留空时按“有效天数”生成。</div>
        </div>

        <div className="panel">
          <div className="panel-title">延期设置</div>
          <div className="controls-inline">
            <input
              className="gen-input"
              type="date"
              value={extendDate}
              onChange={(event) => setExtendDate(event.target.value)}
            />
            <span className="panel-hint">选择后方按钮统一延期到该日期</span>
          </div>
        </div>

        <div className="keys-hd">
          <span className="keys-hd-lbl">密钥列表</span>
          <div className="keys-filter">
            {['', 'unused', 'active', 'expired'].map((value) => (
              <span
                key={value}
                className={`kf ${filter === value ? 'active' : 'inactive'}`}
                onClick={() => setFilter(value)}
              >
                {value === '' ? '全部' : value === 'unused' ? '未用' : value === 'active' ? '有效' : '过期'}
              </span>
            ))}
          </div>
        </div>

        <div className="keys-list">
          {keys.map((key) => {
            const meta = statusMeta(key.status);
            return (
              <div className={`ki ${key.status === 'active' ? 'ka' : key.status === 'expired' ? 'ku' : ''}`} key={key.id}>
                <div className="ki-r1">
                  <div className="ki-val">{key.key_code}</div>
                  <div className="ki-actions">
                    <button
                      className={`copy-btn ${copiedKey === key.key_code ? 'copied' : ''}`}
                      onClick={(event) => handleCopyKey(key.key_code, event)}
                    >
                      <i className={`fas ${copiedKey === key.key_code ? 'fa-check' : 'fa-copy'}`}></i>
                      <span>{copiedKey === key.key_code ? '已复制' : '复制'}</span>
                    </button>
                    {key.status !== 'unused' ? (
                      <button className="action-btn info" onClick={() => handleExtend(key.id)}>延期</button>
                    ) : null}
                    {key.status !== 'expired' ? (
                      <button className="action-btn warn" onClick={() => handleExpire(key.id)}>失效</button>
                    ) : null}
                    {key.status === 'unused' ? (
                      <button className="action-btn danger" onClick={() => handleDelete(key.id)}>删除</button>
                    ) : null}
                    <div className={`badge ${meta.className}`}>{meta.label}</div>
                  </div>
                </div>
                <div className="ki-r2">
                  <div className="ki-m"><i className="fas fa-hashtag"></i><span>#{key.serial_number}</span></div>
                  <div className="ki-m"><i className="fas fa-calendar-plus"></i><span>{formatDate(key.created_at)}</span></div>
                  <div className="ki-m"><i className="fas fa-hourglass-end"></i><span>{formatDate(key.expires_at)}</span></div>
                  {key.last_extended_at ? (
                    <div className="ki-m"><i className="fas fa-clock-rotate-left"></i><span>{formatDate(key.last_extended_at)}</span></div>
                  ) : null}
                  {key.user_name ? (
                    <div className="ki-m"><i className="fas fa-user"></i><span>{key.user_name}</span></div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .admin-page { width: 100%; height: 100%; position: relative; overflow-y: auto; }
        .admin-page::-webkit-scrollbar { display: none; }
        .admin-content { position: relative; z-index: 10; padding-bottom: 40px; }
        .admin-tb { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px 18px; }
        .adm-ttl { font-size: 21px; font-weight: 700; color: #fff; font-family: 'Noto Sans SC', sans-serif; }
        .adm-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; font-family: 'Noto Sans SC', sans-serif; }
        .adm-av { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #2563eb); display: flex; align-items: center; justify-content: center; font-size: 15px; color: #fff; }
        .logout-small { border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.06); color: #fff; border-radius: 10px; padding: 8px 12px; cursor: pointer; }
        .adm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; padding: 0 22px 16px; }
        .adm-s { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09); border-radius: 13px; padding: 12px 10px; text-align: center; }
        .adm-sn { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
        .adm-sl { font-size: 10px; color: var(--text-muted); font-family: 'Noto Sans SC', sans-serif; }
        .panel { margin: 0 22px 14px; padding: 14px; border-radius: 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09); }
        .panel-title { color: #fff; font-size: 13px; font-weight: 700; margin-bottom: 10px; }
        .panel-hint { margin-top: 8px; font-size: 11px; color: var(--text-muted); }
        .controls-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .controls-inline { display: flex; gap: 10px; align-items: center; }
        .error-banner { margin: 0 22px 16px; padding: 10px 12px; border-radius: 12px; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #fca5a5; font-size: 12px; }
        .gen-select, .gen-input {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 13px;
          color: #fff;
          padding: 10px 14px;
          font-size: 13px;
          font-family: 'Noto Sans SC', sans-serif;
          outline: none;
          width: 100%;
        }
        .gen-select option { background: #1a1a3a; color: #fff; }
        .gen-btn { padding: 13px; background: linear-gradient(135deg, #7c3aed, #2563eb); border: none; border-radius: 13px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Noto Sans SC', sans-serif; display: flex; align-items: center; justify-content: center; gap: 7px; box-shadow: 0 5px 18px rgba(124,58,237,0.38); transition: transform 0.15s ease; }
        .gen-btn:active { transform: scale(0.97); }
        .gen-btn:disabled { opacity: 0.6; }
        .keys-hd { padding: 0 22px 8px; display: flex; justify-content: space-between; align-items: center; }
        .keys-hd-lbl { font-size: 11px; color: var(--text-muted); letter-spacing: 1px; font-family: 'Noto Sans SC', sans-serif; }
        .keys-filter { display: flex; gap: 7px; }
        .kf { font-size: 11px; padding: 2px 9px; border-radius: 9px; cursor: pointer; font-family: 'Noto Sans SC', sans-serif; transition: all 0.2s; }
        .kf.active { background: rgba(124,58,237,0.18); color: #a78bfa; border: 1px solid rgba(124,58,237,0.3); }
        .kf.inactive { color: var(--text-muted); }
        .keys-list { padding: 0 22px; display: flex; flex-direction: column; gap: 8px; }
        .ki { background: rgba(255,255,255,0.055); border: 1px solid rgba(255,255,255,0.09); border-radius: 13px; padding: 13px 14px; }
        .ki.ka { border-color: rgba(16,185,129,0.28); background: rgba(16,185,129,0.05); }
        .ki.ku { border-color: rgba(245,158,11,0.28); background: rgba(245,158,11,0.05); }
        .ki-r1 { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; gap: 8px; }
        .ki-val { font-size: 13px; font-weight: 600; color: #fff; letter-spacing: 1.5px; font-family: monospace; }
        .ki-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .copy-btn, .action-btn { display: flex; align-items: center; gap: 3px; border-radius: 8px; padding: 3px 10px; font-size: 10px; font-weight: 600; cursor: pointer; font-family: 'Noto Sans SC', sans-serif; transition: all 0.2s; }
        .copy-btn { background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3); color: #a78bfa; }
        .copy-btn.copied { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #34d399; }
        .action-btn { border: 1px solid transparent; }
        .action-btn.info { background: rgba(96,165,250,0.14); border-color: rgba(96,165,250,0.24); color: #93c5fd; }
        .action-btn.warn { background: rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.24); color: #fbbf24; }
        .action-btn.danger { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.24); color: #fca5a5; }
        .badge { font-size: 10px; padding: 2px 9px; border-radius: 9px; font-weight: 600; }
        .bg-new { background: rgba(124,58,237,0.18); color: #a78bfa; border: 1px solid rgba(124,58,237,0.3); }
        .bg-act { background: rgba(16,185,129,0.18); color: #34d399; border: 1px solid rgba(16,185,129,0.28); }
        .bg-exp { background: rgba(245,158,11,0.18); color: #fbbf24; border: 1px solid rgba(245,158,11,0.28); }
        .ki-r2 { display: flex; gap: 14px; font-size: 10px; color: var(--text-muted); font-family: 'Noto Sans SC', sans-serif; flex-wrap: wrap; }
        .ki-m { display: flex; align-items: center; gap: 3px; }
        .ki-m i { font-size: 9px; }
      `}</style>
    </div>
  );
}
