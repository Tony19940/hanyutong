import React, { useMemo, useRef, useState } from 'react';
import './App.css';
import LoginPage from './components/LoginPage.jsx';
import HomePage from './components/HomePage.jsx';
import QuizPage from './components/QuizPage.jsx';
import CollectionPage from './components/CollectionPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import ProfileSettingsPage from './components/ProfileSettingsPage.jsx';
import AIPracticePage from './components/AIPracticePage.jsx';
import AdminPage from './components/AdminPage.jsx';
import TabBar from './components/TabBar.jsx';
import MembershipGate from './components/MembershipGate.jsx';
import { AppShellProvider } from './i18n/index.js';
import { PreferencesProvider, usePreferences } from './contexts/PreferencesContext.jsx';
import { UserProvider, useUser } from './contexts/UserContext.jsx';
import { StudyProvider, useStudy } from './contexts/StudyContext.jsx';

const TAB_ORDER = ['home', 'quiz', 'practice', 'profile'];

function AppChrome({ children }) {
  return (
    <div className="app-container">
      <div className="bg-layer">
        <div className="bg-gradient"></div>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>
      {children}
    </div>
  );
}

function AppShellBridge({ children }) {
  const preferences = usePreferences();
  const shellValue = useMemo(() => ({
    ...preferences,
  }), [preferences]);

  return React.createElement(AppShellProvider, { value: shellValue }, children);
}

function LoadingScreen() {
  return (
    <AppChrome>
      <div style={{
        position: 'relative',
        zIndex: 10,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div className="app-shell-logo">B</div>
        <div style={{
          width: 34,
          height: 34,
          border: '3px solid var(--spinner-track)',
          borderTopColor: 'var(--spinner-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}></div>
      </div>
    </AppChrome>
  );
}

function AuthenticatedApp() {
  const study = useStudy();
  const { user, membership, invite, freeQuota, profileRefreshKey, membershipGate, openMembershipGate, closeMembershipGate, onAuthenticated } = useUser();
  const [activeTab, setActiveTab] = useState('home');
  const [profileView, setProfileView] = useState('profile');
  const [transitionDirection, setTransitionDirection] = useState('forward');
  const previousTabRef = useRef('home');

  const hasPremiumAccess = membership?.accessLevel === 'premium';
  const quizLocked = !hasPremiumAccess && Number(freeQuota?.quiz?.remaining || 0) <= 0;
  const practiceLocked = !hasPremiumAccess && Number(freeQuota?.dialogue?.remaining || 0) <= 0;

  const handleTabChange = (tabId) => {
    const previousTab = previousTabRef.current;
    const nextDirection = TAB_ORDER.indexOf(tabId) >= TAB_ORDER.indexOf(previousTab) ? 'forward' : 'backward';
    previousTabRef.current = tabId;
    setTransitionDirection(nextDirection);
    setActiveTab(tabId);
    if (tabId !== 'profile') {
      setProfileView('profile');
    }
    if (tabId === 'quiz' && quizLocked) {
      openMembershipGate('quiz');
    }
    if (tabId === 'practice' && practiceLocked) {
      openMembershipGate('practice');
    }
  };

  const tabViewStyle = (visible) => ({
    display: visible ? 'flex' : 'none',
    flex: '1 1 0%',
    minHeight: 0,
    width: '100%',
    position: 'relative',
  });

  const shellBadgeLabel = hasPremiumAccess ? 'Premium' : 'Preview';

  return (
    <AppChrome>
      <div className="app-shell">
        <div className="app-shell-chrome">
          <div className="app-shell-brand">
            <div className="app-shell-logo">B</div>
            <div className="app-shell-brand-copy">
              <strong>Bunson老师</strong>
              <span>{user?.display_name || user?.name || user?.username || 'Daily Chinese coach'}</span>
            </div>
          </div>
          <div className={`app-shell-badge ${hasPremiumAccess ? 'premium' : ''}`}>
            {shellBadgeLabel}
          </div>
        </div>

        <div className={`page-content tab-direction-${transitionDirection}`}>
          <div className={`tab-stage ${activeTab === 'home' ? 'is-active' : ''}`} style={tabViewStyle(activeTab === 'home')}>
            <HomePage user={user} />
          </div>
          <div className={`tab-stage ${activeTab === 'quiz' ? 'is-active' : ''}`} style={tabViewStyle(activeTab === 'quiz')}>
            <QuizPage user={user} />
          </div>
          <div className={`tab-stage ${activeTab === 'practice' ? 'is-active' : ''}`} style={tabViewStyle(activeTab === 'practice')}>
            <AIPracticePage user={user} />
          </div>
          <div
            className={`tab-stage ${activeTab === 'profile' && profileView === 'profile' ? 'is-active' : ''}`}
            style={tabViewStyle(activeTab === 'profile' && profileView === 'profile')}
          >
            <ProfilePage
              user={user}
              membership={membership}
              invite={invite}
              profileRefreshKey={profileRefreshKey}
              onOpenCollection={() => setProfileView('collection')}
              onOpenSettings={() => setProfileView('settings')}
            />
          </div>
          <div
            className={`tab-stage ${activeTab === 'profile' && profileView === 'settings' ? 'is-active' : ''}`}
            style={tabViewStyle(activeTab === 'profile' && profileView === 'settings')}
          >
            <ProfileSettingsPage onBack={() => setProfileView('profile')} />
          </div>
          <div
            className={`tab-stage ${activeTab === 'profile' && profileView === 'collection' ? 'is-active' : ''}`}
            style={tabViewStyle(activeTab === 'profile' && profileView === 'collection')}
          >
            <CollectionPage vocabulary={study.vocabulary} onBack={() => setProfileView('profile')} />
          </div>
        </div>

        <TabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          lockedTabs={[...(quizLocked ? ['quiz'] : []), ...(practiceLocked ? ['practice'] : [])]}
        />
      </div>

      {membershipGate.open ? (
        <MembershipGate
          mode="sheet"
          featureNameKey={membershipGate.feature === 'practice' ? 'tabs.practice' : 'tabs.quiz'}
          membership={membership}
          invite={invite}
          quota={membershipGate.feature === 'practice' ? freeQuota?.dialogue : freeQuota?.quiz}
          onAuthenticated={onAuthenticated}
          onClose={closeMembershipGate}
          onOpenProfile={() => {
            closeMembershipGate();
            setActiveTab('profile');
            setProfileView('profile');
          }}
        />
      ) : null}

      <style>{`
        .tab-stage {
          animation-duration: 260ms;
          animation-fill-mode: both;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
        }
        .tab-direction-forward .tab-stage.is-active {
          animation-name: tabSlideForward;
        }
        .tab-direction-backward .tab-stage.is-active {
          animation-name: tabSlideBackward;
        }
        @keyframes tabSlideForward {
          from { opacity: 0; transform: translate3d(18px, 0, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes tabSlideBackward {
          from { opacity: 0; transform: translate3d(-18px, 0, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </AppChrome>
  );
}

function AppBody() {
  const user = useUser();

  if (user.loading) {
    return <LoadingScreen />;
  }

  if (user.isAdmin) {
    return (
      <AppChrome>
        <AdminPage />
      </AppChrome>
    );
  }

  if (!user.user) {
    return (
      <AppChrome>
        <div className="auth-shell">
          <LoginPage onAuthenticated={user.onAuthenticated} />
        </div>
      </AppChrome>
    );
  }

  return <AuthenticatedApp />;
}

function AppProviders({ children }) {
  return (
    <PreferencesProvider>
      <UserProvider>
        <StudyProvider>
          <AppShellBridge>{children}</AppShellBridge>
        </StudyProvider>
      </UserProvider>
    </PreferencesProvider>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppBody />
    </AppProviders>
  );
}
