import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import LoginPage from './components/LoginPage.jsx';
import HomePage from './components/HomePage.jsx';
import QuizPage from './components/QuizPage.jsx';
import CollectionPage from './components/CollectionPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import AIPracticePage from './components/AIPracticePage.jsx';
import AdminPage from './components/AdminPage.jsx';
import TabBar from './components/TabBar.jsx';
import { api, storage } from './utils/api.js';
import { getTelegramUser, initTelegramApp } from './utils/telegram.js';
import { AppShellProvider } from './i18n/index.js';
import { defaultPreferences, normalizePreferences, storageKeys } from './preferences/defaults.js';
import { applyTheme } from './theme/tokens.js';
import { pickFallbackAvatarId, buildAvatarSeed } from './utils/avatar.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [profileView, setProfileView] = useState('profile');
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({ defaultVoiceType: '', availableVoices: [] });
  const [preferences, setPreferences] = useState(() =>
    normalizePreferences({
      language: localStorage.getItem(storageKeys.language) || defaultPreferences.language,
      theme: localStorage.getItem(storageKeys.theme) || defaultPreferences.theme,
      voiceType: localStorage.getItem(storageKeys.voiceType) || defaultPreferences.voiceType,
    })
  );

  // Check for admin route or preview mode
  useEffect(() => {
    if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
      setIsAdmin(true);
      setLoading(false);
    }
    if (window.location.hash === '#preview') {
      setUser({
        name: 'User',
        username: 'preview',
        avatar_url: null,
        hskLevel: 1,
      });
      setLoading(false);
    }
  }, []);

  // Initialize Telegram WebApp
  useEffect(() => {
    initTelegramApp();
  }, []);

  const mergeTelegramUser = useCallback((incomingUser) => {
    const tgUser = getTelegramUser();
    if (!incomingUser) return incomingUser;
    const merged = {
      ...incomingUser,
      username: tgUser?.username || incomingUser.username || '',
      avatar_url: tgUser?.avatarUrl || incomingUser.avatar_url || incomingUser.avatarUrl || null,
      avatarUrl: tgUser?.avatarUrl || incomingUser.avatarUrl || incomingUser.avatar_url || null,
      display_name: tgUser?.name || incomingUser.display_name || incomingUser.name,
    };
    const fallbackAvatarId = incomingUser.fallbackAvatarId
      || incomingUser.fallback_avatar_id
      || pickFallbackAvatarId(buildAvatarSeed(merged));
    return {
      ...merged,
      fallbackAvatarId,
      fallback_avatar_id: fallbackAvatarId,
    };
  }, []);

  useEffect(() => {
    document.title = isAdmin ? 'Bunson老师 Admin' : 'Bunson老师';
  }, [isAdmin, preferences.language]);

  useEffect(() => {
    applyTheme(preferences.theme);
    localStorage.setItem(storageKeys.language, preferences.language);
    localStorage.setItem(storageKeys.theme, preferences.theme);
    localStorage.setItem(storageKeys.voiceType, preferences.voiceType || '');
  }, [preferences]);

  useEffect(() => {
    if (!user || isAdmin) return;
    api.getUserSettings()
      .then((data) => {
        if (data?.settings) {
          setPreferences((current) => normalizePreferences({ ...current, ...data.settings }));
          if (data.settings.fallbackAvatarId) {
            setUser((current) => {
              if (!current) return current;
              const nextUser = {
                ...current,
                fallbackAvatarId: data.settings.fallbackAvatarId,
                fallback_avatar_id: data.settings.fallbackAvatarId,
              };
              localStorage.setItem(storage.USER_STORAGE_KEY, JSON.stringify(nextUser));
              return nextUser;
            });
          }
        }
        if (data?.voiceSettings) {
          setVoiceSettings(data.voiceSettings);
        }
      })
      .catch(() => {});
  }, [isAdmin, user]);

  // Try to restore session
  useEffect(() => {
    if (isAdmin) return;

    const token = localStorage.getItem(storage.USER_TOKEN_KEY);
    const savedUser = localStorage.getItem(storage.USER_STORAGE_KEY);

    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(mergeTelegramUser(parsed));
        // Verify session in background
        api.verify().then((data) => {
          const mergedUser = mergeTelegramUser(data.user);
          setUser(mergedUser);
          localStorage.setItem(storage.USER_STORAGE_KEY, JSON.stringify(mergedUser));
        }).catch(() => {
          localStorage.removeItem(storage.USER_TOKEN_KEY);
          localStorage.removeItem(storage.USER_STORAGE_KEY);
          setUser(null);
        });
      } catch {
        localStorage.removeItem(storage.USER_TOKEN_KEY);
        localStorage.removeItem(storage.USER_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, [isAdmin, mergeTelegramUser]);

  // Load vocabulary
  useEffect(() => {
    if (user) {
      api.getAllWords().then(setVocabulary).catch(console.error);
    }
  }, [user]);

  // Track learning time
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      api.recordTime(1).catch(console.error);
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = useCallback((userData) => {
    const mergedUser = mergeTelegramUser(userData);
    localStorage.setItem(storage.USER_STORAGE_KEY, JSON.stringify(mergedUser));
    setUser(mergedUser);
  }, [mergeTelegramUser]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'profile') {
      setProfileView('profile');
    }
  }, []);

  const updatePreferences = useCallback(async (patch) => {
    const previous = preferences;
    const optimistic = normalizePreferences({ ...previous, ...patch });
    setPreferences(optimistic);

    if (!user) {
      return optimistic;
    }

    try {
      const response = await api.updateUserSettings(patch);
      const merged = normalizePreferences({ ...optimistic, ...response?.settings });
      setPreferences(merged);
      if (response?.voiceSettings) {
        setVoiceSettings(response.voiceSettings);
      }
      return merged;
    } catch (error) {
      setPreferences(previous);
      throw error;
    }
  }, [preferences, user]);

  const shellValue = {
    ...preferences,
    setLanguage: (language) => updatePreferences({ language }),
    cycleLanguage: () => {
      const order = ['zh-CN', 'en', 'km'];
      const nextLanguage = order[(order.indexOf(preferences.language) + 1 + order.length) % order.length];
      return updatePreferences({ language: nextLanguage });
    },
    setTheme: (theme) => updatePreferences({ theme }),
    setVoiceType: (voiceType) => updatePreferences({ voiceType }),
    availableVoices: voiceSettings.availableVoices || [],
    defaultVoiceType: voiceSettings.defaultVoiceType || '',
  };

  const tabViewStyle = (visible) => ({
    display: visible ? 'flex' : 'none',
    flex: '1 1 0%',
    minHeight: 0,
    width: '100%',
  });

  if (loading) {
    return (
      <AppShellProvider value={shellValue}>
        <div className="app-container">
          <div className="bg-layer">
            <div className="bg-gradient"></div>
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>
          </div>
          <div style={{
            position: 'relative', zIndex: 10,
            height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12
          }}>
            <div style={{
              width: 56, height: 56,
              background: 'linear-gradient(135deg, var(--brand-gold), var(--brand-green))',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28
            }}>📖</div>
            <div style={{
              width: 30, height: 30,
              border: '3px solid var(--spinner-track)',
              borderTopColor: 'var(--spinner-accent)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}></div>
          </div>
        </div>
      </AppShellProvider>
    );
  }

  // Admin page
  if (isAdmin) {
    return (
      <AppShellProvider value={shellValue}>
        <div className="app-container">
          <AdminPage />
        </div>
      </AppShellProvider>
    );
  }

  // Login page
  if (!user) {
    return (
      <AppShellProvider value={shellValue}>
        <div className="app-container">
          <LoginPage onLogin={handleLogin} />
        </div>
      </AppShellProvider>
    );
  }

  // Main app
  return (
    <AppShellProvider value={shellValue}>
      <div className="app-container">
        <div className="bg-layer">
          <div className="bg-gradient"></div>
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>

        <div className="page-content">
          <div style={tabViewStyle(activeTab === 'home')}>
            <HomePage user={user} />
          </div>
          <div style={tabViewStyle(activeTab === 'quiz')}>
            <QuizPage user={user} />
          </div>
          <div style={tabViewStyle(activeTab === 'practice')}>
            <AIPracticePage user={user} />
          </div>
          <div style={tabViewStyle(activeTab === 'profile' && profileView === 'profile')}>
            <ProfilePage user={user} onOpenCollection={() => setProfileView('collection')} />
          </div>
          <div style={tabViewStyle(activeTab === 'profile' && profileView === 'collection')}>
            <CollectionPage vocabulary={vocabulary} onBack={() => setProfileView('profile')} />
          </div>
        </div>

        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </AppShellProvider>
  );
}
