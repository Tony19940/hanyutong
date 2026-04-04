import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, storage } from '../utils/api.js';

const adminTabs = [
  { id: 'overview', label: '总览' },
  { id: 'keys', label: '会员/密钥' },
  { id: 'banners', label: 'Banner' },
  { id: 'popups', label: '弹窗' },
  { id: 'users', label: '用户' },
  { id: 'analytics', label: '活跃数据' },
];

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function toIsoEndOfDay(value) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildBannerFormData(form) {
  const payload = new FormData();
  if (form.id) payload.append('id', String(form.id));
  payload.append('title', form.title || '');
  payload.append('linkUrl', form.linkUrl || '');
  payload.append('sortOrder', String(form.sortOrder || 0));
  payload.append('isActive', String(form.isActive));
  if (form.file) payload.append('image', form.file);
  return payload;
}

function buildPopupFormData(form) {
  const payload = new FormData();
  if (form.id) payload.append('id', String(form.id));
  payload.append('title', form.title || '');
  payload.append('body', form.body || '');
  payload.append('linkUrl', form.linkUrl || '');
  payload.append('priority', String(form.priority || 0));
  payload.append('isActive', String(form.isActive));
  if (form.startsAt) payload.append('startsAt', new Date(`${form.startsAt}T00:00:00`).toISOString());
  if (form.endsAt) payload.append('endsAt', new Date(`${form.endsAt}T23:59:59`).toISOString());
  if (form.file) payload.append('image', form.file);
  return payload;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [keys, setKeys] = useState([]);
  const [filter, setFilter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState(1);
  const [durationDays, setDurationDays] = useState(30);
  const [fixedExpiry, setFixedExpiry] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [banners, setBanners] = useState([]);
  const [bannerForm, setBannerForm] = useState({ id: null, title: '', linkUrl: '', sortOrder: 0, isActive: true, file: null });
  const [popups, setPopups] = useState([]);
  const [popupForm, setPopupForm] = useState({ id: null, title: '', body: '', linkUrl: '', priority: 0, startsAt: '', endsAt: '', isActive: true, file: null });
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [membershipForm, setMembershipForm] = useState({ planType: 'trial', expiresAt: '' });
  const [error, setError] = useState('');

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) || null,
    [selectedUserId, users]
  );

  useEffect(() => {
    if (!selectedUser) return;
    setMembershipForm({
      planType: selectedUser.membership.planType === 'month_card' ? 'month_card' : selectedUser.membership.planType === 'trial' || selectedUser.membership.planType === 'invited_trial' ? 'trial' : 'free',
      expiresAt: selectedUser.membership.expiresAt ? selectedUser.membership.expiresAt.slice(0, 10) : '',
    });
  }, [selectedUser]);

  const clearAdminSession = useCallback(() => {
    localStorage.removeItem(storage.ADMIN_TOKEN_KEY);
    setAuthed(false);
  }, []);

  const loadStats = useCallback(async () => {
    const [statsData, analyticsData] = await Promise.all([
      api.getAdminStats(),
      api.getAdminAnalyticsOverview(),
    ]);
    setStats(statsData);
    setAnalytics(analyticsData);
  }, []);

  const loadKeys = useCallback(async () => {
    const data = await api.getKeys(filter || undefined);
    setKeys(data.keys || []);
  }, [filter]);

  const loadBanners = useCallback(async () => {
    const data = await api.getAdminBanners();
    setBanners(data.banners || []);
  }, []);

  const loadPopups = useCallback(async () => {
    const data = await api.getAdminPopups();
    setPopups(data.popups || []);
  }, []);

  const loadUsers = useCallback(async () => {
    const data = await api.getAdminUsers(userSearch || '', 1, 100);
    setUsers(data.users || []);
  }, [userSearch]);

  const loadAll = useCallback(async () => {
    try {
      setError('');
      await Promise.all([loadStats(), loadKeys(), loadBanners(), loadPopups(), loadUsers()]);
    } catch (err) {
      if (err.status === 401) {
        clearAdminSession();
      }
      setError(err.message || '加载后台数据失败');
    }
  }, [clearAdminSession, loadBanners, loadKeys, loadPopups, loadStats, loadUsers]);

  useEffect(() => {
    const token = localStorage.getItem(storage.ADMIN_TOKEN_KEY);
    if (!token) {
      setCheckingSession(false);
      return;
    }
    api.verifyAdmin()
      .then(() => setAuthed(true))
      .catch(() => clearAdminSession())
      .finally(() => setCheckingSession(false));
  }, [clearAdminSession]);

  useEffect(() => {
    if (authed) {
      loadAll();
    }
  }, [authed, loadAll]);

  const handleLogin = async () => {
    try {
      const data = await api.adminLogin(password);
      localStorage.setItem(storage.ADMIN_TOKEN_KEY, data.token);
      setAuthed(true);
      setPassword('');
      setError('');
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
        ? { expiresAt: toIsoEndOfDay(fixedExpiry) }
        : { durationDays };
      await api.generateKey(genCount, payload);
      await Promise.all([loadKeys(), loadStats()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveBanner = async () => {
    try {
      await api.saveAdminBanner(buildBannerFormData(bannerForm));
      setBannerForm({ id: null, title: '', linkUrl: '', sortOrder: 0, isActive: true, file: null });
      await loadBanners();
    } catch (err) {
      setError(err.message || '保存 Banner 失败');
    }
  };

  const handleSavePopup = async () => {
    try {
      await api.saveAdminPopup(buildPopupFormData(popupForm));
      setPopupForm({ id: null, title: '', body: '', linkUrl: '', priority: 0, startsAt: '', endsAt: '', isActive: true, file: null });
      await loadPopups();
    } catch (err) {
      setError(err.message || '保存弹窗失败');
    }
  };

  const handleUpdateUserMembership = async () => {
    if (!selectedUserId) return;
    try {
      await api.updateAdminUserMembership(selectedUserId, {
        planType: membershipForm.planType,
        expiresAt: membershipForm.expiresAt ? toIsoEndOfDay(membershipForm.expiresAt) : null,
      });
      await Promise.all([loadUsers(), loadStats(), loadAnalytics()]);
    } catch (err) {
      setError(err.message || '更新会员失败');
    }
  };

  const loadAnalytics = useCallback(async () => {
    const analyticsData = await api.getAdminAnalyticsOverview();
    setAnalytics(analyticsData);
  }, []);

  const handleExtendKey = async (keyId) => {
    try {
      await api.extendKey(keyId, toIsoEndOfDay(extendDate));
      await Promise.all([loadKeys(), loadStats()]);
    } catch (err) {
      setError(err.message || '延期失败');
    }
  };

  const handleExpireKey = async (keyId) => {
    try {
      await api.expireKey(keyId);
      await Promise.all([loadKeys(), loadStats()]);
    } catch (err) {
      setError(err.message || '失效失败');
    }
  };

  const handleDeleteKey = async (keyId) => {
    try {
      await api.deleteKey(keyId);
      await Promise.all([loadKeys(), loadStats()]);
    } catch (err) {
      setError(err.message || '删除失败');
    }
  };

  const handleBannerReorder = async (bannerId, direction) => {
    const index = banners.findIndex((item) => item.id === bannerId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= banners.length) return;

    const reordered = [...banners];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      await api.reorderAdminBanners(
        reordered.map((item, sortOrder) => ({
          id: item.id,
          sortOrder,
        }))
      );
      await loadBanners();
    } catch (err) {
      setError(err.message || '更新 Banner 顺序失败');
    }
  };

  const handleBannerToggle = async (banner) => {
    try {
      await api.saveAdminBanner(buildBannerFormData({
        id: banner.id,
        title: banner.title || '',
        linkUrl: banner.linkUrl || '',
        sortOrder: banner.sortOrder || 0,
        isActive: !banner.isActive,
        file: null,
      }));
      await loadBanners();
    } catch (err) {
      setError(err.message || '更新 Banner 状态失败');
    }
  };

  const handlePopupToggle = async (popup) => {
    try {
      await api.saveAdminPopup(buildPopupFormData({
        id: popup.id,
        title: popup.title || '',
        body: popup.body || '',
        linkUrl: popup.linkUrl || '',
        priority: popup.priority || 0,
        startsAt: popup.startsAt ? popup.startsAt.slice(0, 10) : '',
        endsAt: popup.endsAt ? popup.endsAt.slice(0, 10) : '',
        isActive: !popup.isActive,
        file: null,
      }));
      await loadPopups();
    } catch (err) {
      setError(err.message || '更新弹窗状态失败');
    }
  };

  if (checkingSession) {
    return <div className="admin-shell center"><div className="admin-note">Checking admin session...</div></div>;
  }

  if (!authed) {
    return (
      <div className="admin-shell center">
        <div className="admin-login-card">
          <div className="admin-login-title">运营后台</div>
          <div className="admin-login-subtitle">会员、Banner、弹窗、用户和数据总览</div>
          <div className="input-box" style={{ marginTop: 16 }}>
            <i className="fas fa-lock"></i>
            <input
              type="password"
              placeholder="管理员密码"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
            />
          </div>
          {error ? <div className="admin-error">{error}</div> : null}
          <button className="btn-grad" type="button" style={{ marginTop: 14 }} onClick={handleLogin}>进入后台</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <div>
          <div className="admin-title">Bunson老师 Admin</div>
          <div className="admin-subtitle">增长运营位、用户管理与活跃数据</div>
        </div>
        <button type="button" className="admin-logout" onClick={handleLogout}>退出</button>
      </div>

      <div className="admin-tabbar">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? <div className="admin-error-banner">{error}</div> : null}

      <div className="admin-body">
        {(activeTab === 'overview' || activeTab === 'analytics') && stats && analytics ? (
          <div className="admin-grid">
            <div className="admin-stat-card"><span>总用户</span><strong>{stats.totalUsers}</strong></div>
            <div className="admin-stat-card"><span>今日 DAU</span><strong>{analytics.today.dau}</strong></div>
            <div className="admin-stat-card"><span>今日打开</span><strong>{analytics.today.opens}</strong></div>
            <div className="admin-stat-card"><span>今日试用</span><strong>{analytics.today.newTrials}</strong></div>
            <div className="admin-stat-card"><span>今日开卡</span><strong>{analytics.today.paidActivations}</strong></div>
            <div className="admin-stat-card"><span>对话开始</span><strong>{analytics.today.dialogueStarts}</strong></div>
            <div className="admin-stat-card"><span>同传开始</span><strong>{analytics.today.interpreterStarts}</strong></div>
            <div className="admin-stat-card"><span>Banner 点击</span><strong>{analytics.today.bannerClicks}</strong></div>
            <div className="admin-stat-card"><span>弹窗点击</span><strong>{analytics.today.popupClicks}</strong></div>
          </div>
        ) : null}

        {activeTab === 'overview' ? (
          <div className="admin-panel">
            <div className="admin-panel-title">最近 7 天趋势</div>
            <div className="admin-trend-list">
              {(analytics?.last7Days || []).map((item) => (
                <div key={item.date} className="admin-trend-row">
                  <span>{item.date}</span>
                  <strong>DAU {item.dau}</strong>
                  <strong>打开 {item.opens}</strong>
                  <strong>对话 {item.dialogueStarts}</strong>
                  <strong>同传 {item.interpreterStarts}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'keys' ? (
          <>
            <div className="admin-panel">
              <div className="admin-panel-title">生成密钥</div>
              <div className="admin-form-grid">
                <input className="admin-input" type="number" min="1" value={genCount} onChange={(event) => setGenCount(Number(event.target.value) || 1)} placeholder="数量" />
                <input className="admin-input" type="number" min="1" value={durationDays} onChange={(event) => setDurationDays(Number(event.target.value) || 30)} placeholder="有效天数" />
                <input className="admin-input" type="date" value={fixedExpiry} onChange={(event) => setFixedExpiry(event.target.value)} />
                <button className="admin-primary" type="button" onClick={handleGenerate} disabled={generating}>{generating ? '生成中...' : '生成密钥'}</button>
              </div>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-title">密钥列表</div>
              <div className="admin-filter-row">
                {['', 'unused', 'active', 'expired'].map((value) => (
                  <button key={value} type="button" className={`admin-chip ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>
                    {value || '全部'}
                  </button>
                ))}
                <input className="admin-input compact" type="date" value={extendDate} onChange={(event) => setExtendDate(event.target.value)} />
              </div>
              <div className="admin-list">
                {keys.map((key) => (
                  <div key={key.id} className="admin-list-card">
                    <div className="admin-list-head">
                      <strong>{key.key_code}</strong>
                      <span>{key.status}</span>
                    </div>
                    <div className="admin-list-meta">用户：{key.user_name || '-'}</div>
                    <div className="admin-list-meta">截止：{formatDate(key.expires_at)}</div>
                    <div className="admin-actions-row">
                      {key.status !== 'unused' ? <button type="button" className="admin-chip" onClick={() => handleExtendKey(key.id)}>延期</button> : null}
                      {key.status !== 'expired' ? <button type="button" className="admin-chip" onClick={() => handleExpireKey(key.id)}>失效</button> : null}
                      {key.status === 'unused' ? <button type="button" className="admin-chip danger" onClick={() => handleDeleteKey(key.id)}>删除</button> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {activeTab === 'banners' ? (
          <>
            <div className="admin-panel">
              <div className="admin-panel-title">Banner 配置</div>
              <div className="admin-form-grid">
                <input className="admin-input" value={bannerForm.title} onChange={(event) => setBannerForm((current) => ({ ...current, title: event.target.value }))} placeholder="标题（可选）" />
                <input className="admin-input" value={bannerForm.linkUrl} onChange={(event) => setBannerForm((current) => ({ ...current, linkUrl: event.target.value }))} placeholder="跳转链接" />
                <input className="admin-input" type="number" value={bannerForm.sortOrder} onChange={(event) => setBannerForm((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))} placeholder="排序" />
                <input className="admin-input" type="file" accept="image/*" onChange={(event) => setBannerForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} />
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={bannerForm.isActive}
                    onChange={(event) => setBannerForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  <span>启用此 Banner</span>
                </label>
                <button className="admin-primary" type="button" onClick={handleSaveBanner}>保存 Banner</button>
              </div>
            </div>
            <div className="admin-list">
              {banners.map((banner, index) => (
                <div key={banner.id} className="admin-list-card">
                  <img className="admin-thumb" src={banner.image?.url} alt={banner.title || 'banner'} />
                  <div className="admin-list-head">
                    <strong>{banner.title || `Banner ${banner.id}`}</strong>
                    <span>{banner.isActive ? '已启用' : '已停用'}</span>
                  </div>
                  <div className="admin-list-meta">顺序：#{banner.sortOrder}</div>
                  <div className="admin-list-meta">{banner.linkUrl || '无跳转链接'}</div>
                  <div className="admin-actions-row">
                    <button type="button" className="admin-chip" onClick={() => setBannerForm({ id: banner.id, title: banner.title || '', linkUrl: banner.linkUrl || '', sortOrder: banner.sortOrder || index, isActive: banner.isActive, file: null })}>编辑</button>
                    <button type="button" className="admin-chip" onClick={() => handleBannerToggle(banner)}>{banner.isActive ? '停用' : '启用'}</button>
                    <button type="button" className="admin-chip" onClick={() => handleBannerReorder(banner.id, 'up')} disabled={index === 0}>上移</button>
                    <button type="button" className="admin-chip" onClick={() => handleBannerReorder(banner.id, 'down')} disabled={index === banners.length - 1}>下移</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {activeTab === 'popups' ? (
          <>
            <div className="admin-panel">
              <div className="admin-panel-title">弹窗配置</div>
              <div className="admin-form-grid">
                <input className="admin-input" value={popupForm.title} onChange={(event) => setPopupForm((current) => ({ ...current, title: event.target.value }))} placeholder="标题" />
                <textarea className="admin-textarea" value={popupForm.body} onChange={(event) => setPopupForm((current) => ({ ...current, body: event.target.value }))} placeholder="文案" />
                <input className="admin-input" value={popupForm.linkUrl} onChange={(event) => setPopupForm((current) => ({ ...current, linkUrl: event.target.value }))} placeholder="跳转链接" />
                <input className="admin-input" type="number" value={popupForm.priority} onChange={(event) => setPopupForm((current) => ({ ...current, priority: Number(event.target.value) || 0 }))} placeholder="优先级" />
                <input className="admin-input" type="date" value={popupForm.startsAt} onChange={(event) => setPopupForm((current) => ({ ...current, startsAt: event.target.value }))} />
                <input className="admin-input" type="date" value={popupForm.endsAt} onChange={(event) => setPopupForm((current) => ({ ...current, endsAt: event.target.value }))} />
                <input className="admin-input" type="file" accept="image/*" onChange={(event) => setPopupForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} />
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={popupForm.isActive}
                    onChange={(event) => setPopupForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  <span>启用此弹窗</span>
                </label>
                <button className="admin-primary" type="button" onClick={handleSavePopup}>保存弹窗</button>
              </div>
            </div>
            <div className="admin-list">
              {popups.map((popup) => (
                <div key={popup.id} className="admin-list-card">
                  <img className="admin-thumb" src={popup.image?.url} alt={popup.title || 'popup'} />
                  <div className="admin-list-head">
                    <strong>{popup.title}</strong>
                    <span>{popup.isActive ? `P${popup.priority} / 已启用` : `P${popup.priority} / 已停用`}</span>
                  </div>
                  <div className="admin-list-meta">{popup.body}</div>
                  <div className="admin-list-meta">{popup.startsAt ? `${formatDate(popup.startsAt)} - ${formatDate(popup.endsAt)}` : '长期有效'}</div>
                  <div className="admin-actions-row">
                    <button type="button" className="admin-chip" onClick={() => setPopupForm({
                      id: popup.id,
                      title: popup.title || '',
                      body: popup.body || '',
                      linkUrl: popup.linkUrl || '',
                      priority: popup.priority || 0,
                      startsAt: popup.startsAt ? popup.startsAt.slice(0, 10) : '',
                      endsAt: popup.endsAt ? popup.endsAt.slice(0, 10) : '',
                      isActive: popup.isActive,
                      file: null,
                    })}>编辑</button>
                    <button type="button" className="admin-chip" onClick={() => handlePopupToggle(popup)}>{popup.isActive ? '停用' : '启用'}</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {activeTab === 'users' ? (
          <>
            <div className="admin-panel">
              <div className="admin-panel-title">用户搜索</div>
              <div className="admin-form-grid">
                <input className="admin-input" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="搜索 Telegram ID / 昵称 / 用户名" />
                <button className="admin-primary" type="button" onClick={loadUsers}>查询用户</button>
              </div>
            </div>
            <div className="admin-list">
              {users.map((user) => (
                <button key={user.id} type="button" className={`admin-list-card selectable ${selectedUserId === user.id ? 'selected' : ''}`} onClick={() => setSelectedUserId(user.id)}>
                  <div className="admin-list-head">
                    <strong>{user.name}</strong>
                    <span>{user.membership.status}</span>
                  </div>
                  <div className="admin-list-meta">Telegram: {user.telegramId || '-'}</div>
                  <div className="admin-list-meta">账号: {user.account.username || '未绑定'}</div>
                  <div className="admin-list-meta">截止: {formatDate(user.membership.expiresAt)}</div>
                </button>
              ))}
            </div>
            {selectedUser ? (
              <div className="admin-panel">
                <div className="admin-panel-title">调整用户权益</div>
                <div className="admin-form-grid">
                  <select className="admin-input" value={membershipForm.planType} onChange={(event) => setMembershipForm((current) => ({ ...current, planType: event.target.value }))}>
                    <option value="trial">试用</option>
                    <option value="month_card">会员</option>
                    <option value="free">免费层</option>
                  </select>
                  <input className="admin-input" type="date" value={membershipForm.expiresAt} onChange={(event) => setMembershipForm((current) => ({ ...current, expiresAt: event.target.value }))} />
                  <button className="admin-primary" type="button" onClick={handleUpdateUserMembership}>保存权益</button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {activeTab === 'analytics' && analytics ? (
          <div className="admin-panel">
            <div className="admin-panel-title">7 日明细</div>
            <div className="admin-trend-list">
              {analytics.last7Days.map((item) => (
                <div key={item.date} className="admin-trend-row">
                  <span>{item.date}</span>
                  <strong>DAU {item.dau}</strong>
                  <strong>打开 {item.opens}</strong>
                  <strong>对话 {item.dialogueStarts}</strong>
                  <strong>同传 {item.interpreterStarts}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        .admin-shell {
          width: 100%;
          height: 100%;
          overflow: auto;
          padding: 18px;
          position: relative;
          z-index: 10;
        }
        .admin-shell.center {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .admin-note {
          color: var(--text-primary);
        }
        .admin-login-card,
        .admin-panel,
        .admin-list-card,
        .admin-stat-card {
          background: var(--settings-surface);
          border: 1px solid var(--settings-border);
          border-radius: 22px;
        }
        .admin-login-card {
          width: min(100%, 360px);
          padding: 22px;
        }
        .admin-login-title,
        .admin-title {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .admin-login-subtitle,
        .admin-subtitle {
          margin-top: 6px;
          font-size: 12px;
          line-height: 1.6;
          color: var(--text-secondary);
        }
        .admin-error,
        .admin-error-banner {
          color: #fca5a5;
          font-size: 12px;
          margin-top: 10px;
        }
        .admin-topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .admin-logout {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--text-primary);
        }
        .admin-tabbar {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          margin-top: 16px;
          padding-bottom: 4px;
        }
        .admin-tab {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--text-primary);
          white-space: nowrap;
        }
        .admin-tab.active,
        .admin-chip.active {
          background: var(--settings-chip-active-bg);
        }
        .admin-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 16px;
          padding-bottom: 32px;
        }
        .admin-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .admin-stat-card {
          padding: 16px;
        }
        .admin-stat-card span {
          display: block;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .admin-stat-card strong {
          display: block;
          margin-top: 8px;
          font-size: 28px;
          color: var(--accent-gold);
        }
        .admin-panel {
          padding: 16px;
        }
        .admin-panel-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .admin-form-grid {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }
        .admin-input,
        .admin-textarea {
          width: 100%;
          min-height: 42px;
          border-radius: 14px;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--text-primary);
          padding: 10px 12px;
        }
        .admin-textarea {
          min-height: 90px;
          resize: vertical;
        }
        .admin-toggle {
          min-height: 42px;
          border-radius: 14px;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--text-primary);
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 700;
        }
        .admin-toggle input {
          width: 16px;
          height: 16px;
        }
        .admin-primary {
          min-height: 44px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(90deg, var(--brand-green), #18a184);
          color: #fff;
          font-weight: 800;
        }
        .admin-filter-row,
        .admin-actions-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        .admin-chip {
          min-height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid var(--settings-border);
          background: var(--settings-chip-bg);
          color: var(--text-primary);
        }
        .admin-chip.danger {
          color: #fca5a5;
        }
        .admin-list {
          display: grid;
          gap: 10px;
        }
        .admin-list-card {
          padding: 14px;
          text-align: left;
        }
        .admin-list-card.selectable.selected {
          border-color: rgba(225,191,83,0.32);
          box-shadow: 0 0 0 1px rgba(225,191,83,0.12);
        }
        .admin-list-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: var(--text-primary);
        }
        .admin-list-meta {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.6;
          color: var(--text-secondary);
        }
        .admin-thumb {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 16px;
          margin-bottom: 12px;
          background: rgba(255,255,255,0.06);
        }
        .admin-trend-list {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }
        .admin-trend-row {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .admin-trend-row strong {
          color: var(--text-primary);
          font-weight: 700;
        }
        .compact {
          max-width: 160px;
        }
      `}</style>
    </div>
  );
}
