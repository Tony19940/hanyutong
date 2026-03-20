import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import LoginPage from './components/LoginPage.jsx';
import HomePage from './components/HomePage.jsx';
import CollectionPage from './components/CollectionPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import AdminPage from './components/AdminPage.jsx';
import TabBar from './components/TabBar.jsx';
import { api, storage } from './utils/api.js';
import { initTelegramApp } from './utils/telegram.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
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

  // Try to restore session
  useEffect(() => {
    if (isAdmin) return;

    const token = localStorage.getItem(storage.USER_TOKEN_KEY);
    const savedUser = localStorage.getItem(storage.USER_STORAGE_KEY);

    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Verify session in background
        api.verify().then((data) => {
          setUser(data.user);
          localStorage.setItem(storage.USER_STORAGE_KEY, JSON.stringify(data.user));
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
  }, [isAdmin]);

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
    setUser(userData);
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
            background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28
          }}>📖</div>
          <div style={{
            width: 30, height: 30,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#a78bfa', borderRadius: '50%',
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
        {activeTab === 'collection' && <CollectionPage user={user} vocabulary={vocabulary} />}
        {activeTab === 'profile' && <ProfilePage user={user} />}
      </div>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
