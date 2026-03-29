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

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [profileView, setProfileView] = useState('profile');
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check for admin route
  useEffect(() => {
    if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
      setIsAdmin(true);
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
    return {
      ...incomingUser,
      username: tgUser?.username || incomingUser.username || '',
      avatar_url: tgUser?.avatarUrl || incomingUser.avatar_url || incomingUser.avatarUrl || null,
      avatarUrl: tgUser?.avatarUrl || incomingUser.avatarUrl || incomingUser.avatar_url || null,
      display_name: tgUser?.name || incomingUser.display_name || incomingUser.name,
    };
  }, []);

  useEffect(() => {
    document.title = isAdmin ? '\u179A\u17C0\u1793\u1797\u17B6\u179F\u17B6\u1785\u17B7\u1793 Admin' : '\u179A\u17C0\u1793\u1797\u17B6\u179F\u17B6\u1785\u17B7\u1793';
  }, [isAdmin]);

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

  if (loading) {
    return (
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
            background: 'linear-gradient(135deg, #f0cc7a, #1e5b43)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28
          }}>📖</div>
          <div style={{
            width: 30, height: 30,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#d8b45c', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}></div>
        </div>
      </div>
    );
  }

  // Admin page
  if (isAdmin) {
    return (
      <div className="app-container">
        <AdminPage />
      </div>
    );
  }

  // Login page
  if (!user) {
    return (
      <div className="app-container">
        <LoginPage onLogin={handleLogin} />
      </div>
    );
  }

  // Main app
  return (
    <div className="app-container">
      <div className="bg-layer">
        <div className="bg-gradient"></div>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="page-content">
        {activeTab === 'home' && <HomePage user={user} />}
        {activeTab === 'quiz' && <QuizPage user={user} />}
        {activeTab === 'practice' && <AIPracticePage user={user} />}
        {activeTab === 'profile' && profileView === 'profile' && (
          <ProfilePage user={user} onOpenCollection={() => setProfileView('collection')} />
        )}
        {activeTab === 'profile' && profileView === 'collection' && (
          <CollectionPage vocabulary={vocabulary} onBack={() => setProfileView('profile')} />
        )}
      </div>

      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
