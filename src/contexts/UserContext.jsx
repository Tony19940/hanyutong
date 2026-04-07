import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { api, storage } from '../utils/api.js';
import { getTelegramUser } from '../utils/telegram.js';
import { pickFallbackAvatarId, buildAvatarSeed } from '../utils/avatar.js';
import { usePreferences } from './PreferencesContext.jsx';

const UserContext = createContext(null);

function defaultMembership() {
  return {
    status: 'free',
    planType: 'free',
    accessLevel: 'free',
    expiresAt: null,
    startedAt: null,
    isPremium: false,
  };
}

function defaultQuota() {
  return {
    date: null,
    quiz: { limit: 2, used: 0, remaining: 2 },
    dialogue: { limit: 1, used: 0, remaining: 1 },
  };
}

function initialState() {
  return {
    user: null,
    membership: defaultMembership(),
    invite: null,
    socialProof: null,
    studySummary: null,
    freeQuota: defaultQuota(),
    loading: true,
    isAdmin: false,
    profileRefreshKey: 0,
    membershipGate: {
      open: false,
      feature: null,
    },
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'set-loading':
      return {
        ...state,
        loading: action.payload,
      };
    case 'set-admin':
      return {
        ...state,
        isAdmin: action.payload,
        loading: false,
      };
    case 'hydrate-auth':
      return {
        ...state,
        user: action.payload.user,
        membership: action.payload.membership || defaultMembership(),
        invite: action.payload.invite || null,
        socialProof: action.payload.socialProof || null,
        studySummary: action.payload.studySummary || state.studySummary,
        freeQuota: action.payload.freeQuota || state.freeQuota,
        profileRefreshKey: state.profileRefreshKey + 1,
        loading: false,
      };
    case 'merge-user':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : state.user,
      };
    case 'clear-auth':
      return {
        ...initialState(),
        loading: false,
      };
    case 'set-membership-gate':
      return {
        ...state,
        membershipGate: {
          open: action.payload.open,
          feature: action.payload.feature || null,
        },
      };
    case 'set-profile-refresh':
      return {
        ...state,
        profileRefreshKey: state.profileRefreshKey + 1,
      };
    case 'set-free-quota':
      return {
        ...state,
        freeQuota: action.payload || state.freeQuota,
      };
    case 'set-study-summary':
      return {
        ...state,
        studySummary: action.payload || state.studySummary,
      };
    default:
      return state;
  }
}

function mergeTelegramUser(incomingUser) {
  const tgUser = getTelegramUser();
  if (!incomingUser) return incomingUser;
  const merged = {
    ...incomingUser,
    username: tgUser?.username || incomingUser.username || incomingUser.account_username || '',
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
}

export function UserProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const preferences = usePreferences();

  const applyAuthResponse = useCallback((authData, { persistUser = true } = {}) => {
    const mergedUser = mergeTelegramUser(authData?.user);
    if (persistUser && mergedUser) {
      localStorage.setItem(storage.USER_STORAGE_KEY, JSON.stringify(mergedUser));
    }
    dispatch({
      type: 'hydrate-auth',
      payload: {
        user: mergedUser,
        membership: authData?.membership,
        invite: authData?.invite,
        socialProof: authData?.socialProof,
        studySummary: authData?.studySummary,
        freeQuota: authData?.freeQuota,
      },
    });
  }, []);

  useEffect(() => {
    if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
      dispatch({ type: 'set-admin', payload: true });
      return;
    }

    if (window.location.hash === '#preview') {
      applyAuthResponse({
        user: {
          id: 'preview-user',
          name: 'User',
          username: 'preview',
          avatar_url: null,
          hskLevel: 1,
        },
        membership: {
          status: 'premium_active',
          planType: 'month_card',
          accessLevel: 'premium',
          expiresAt: null,
          startedAt: null,
          isPremium: true,
        },
        freeQuota: defaultQuota(),
        socialProof: {
          learnerCount: 5000,
          inviteLeaderboard: [],
          rewardDaysPerConversion: 3,
        },
      }, { persistUser: false });
      return;
    }

    const token = localStorage.getItem(storage.USER_TOKEN_KEY);
    const savedUser = localStorage.getItem(storage.USER_STORAGE_KEY);
    if (!token) {
      dispatch({ type: 'set-loading', payload: false });
      return;
    }

    if (savedUser) {
      try {
        dispatch({
          type: 'hydrate-auth',
          payload: {
            user: mergeTelegramUser(JSON.parse(savedUser)),
            membership: defaultMembership(),
            invite: null,
            freeQuota: defaultQuota(),
          },
        });
      } catch {
        localStorage.removeItem(storage.USER_STORAGE_KEY);
      }
    }

    api.verify()
      .then((data) => {
        applyAuthResponse(data);
      })
      .catch(() => {
        localStorage.removeItem(storage.USER_TOKEN_KEY);
        localStorage.removeItem(storage.USER_STORAGE_KEY);
        dispatch({ type: 'clear-auth' });
      })
      .finally(() => {
        dispatch({ type: 'set-loading', payload: false });
      });
  }, [applyAuthResponse]);

  useEffect(() => {
    if (!state.user || state.isAdmin) return;
    api.getUserSettings()
      .then((data) => {
        preferences.hydrateFromServer(data?.settings, data?.voiceSettings);
        if (data?.settings?.fallbackAvatarId && data.settings.fallbackAvatarId !== state.user?.fallbackAvatarId) {
          dispatch({
            type: 'merge-user',
            payload: {
              fallbackAvatarId: data.settings.fallbackAvatarId,
              fallback_avatar_id: data.settings.fallbackAvatarId,
            },
          });
        }
      })
      .catch(() => {});
  }, [preferences.hydrateFromServer, state.isAdmin, state.user]);

  useEffect(() => {
    if (!state.user || state.isAdmin) return;
    api.trackEvent('app_open').catch(() => {});
  }, [state.isAdmin, state.user]);

  useEffect(() => {
    if (!state.user || state.isAdmin) return;
    localStorage.setItem(storage.USER_STORAGE_KEY, JSON.stringify(state.user));
  }, [state.isAdmin, state.user]);

  const onAuthenticated = useCallback((authData) => {
    if (authData?.token) {
      localStorage.setItem(storage.USER_TOKEN_KEY, authData.token);
    }
    applyAuthResponse(authData);
  }, [applyAuthResponse]);

  const refreshQuota = useCallback(async () => {
    if (!state.user) return state.freeQuota;
    const quota = await api.getQuota();
    dispatch({ type: 'set-free-quota', payload: quota });
    return quota;
  }, [state.freeQuota, state.user]);

  const consumeQuota = useCallback(async (feature, amount = 1) => {
    if (!state.user || state.membership?.accessLevel === 'premium') {
      return state.freeQuota;
    }

    try {
      const result = await api.consumeQuota(feature, amount);
      dispatch({ type: 'set-free-quota', payload: result.quota });
      return result.quota;
    } catch (error) {
      if (error?.data?.quota) {
        dispatch({ type: 'set-free-quota', payload: error.data.quota });
      }
      throw error;
    }
  }, [state.freeQuota, state.membership?.accessLevel, state.user]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    localStorage.removeItem(storage.USER_TOKEN_KEY);
    localStorage.removeItem(storage.USER_STORAGE_KEY);
    dispatch({ type: 'clear-auth' });
  }, []);

  const refreshProfile = useCallback(() => {
    dispatch({ type: 'set-profile-refresh' });
  }, []);

  const setStudySummary = useCallback((summary) => {
    dispatch({ type: 'set-study-summary', payload: summary });
  }, []);

  const openMembershipGate = useCallback((feature) => {
    dispatch({ type: 'set-membership-gate', payload: { open: true, feature } });
  }, []);

  const closeMembershipGate = useCallback(() => {
    dispatch({ type: 'set-membership-gate', payload: { open: false, feature: null } });
  }, []);

  const value = useMemo(() => ({
    ...state,
    defaultMembership,
    onAuthenticated,
    logout,
    refreshQuota,
    consumeQuota,
    refreshProfile,
    setStudySummary,
    openMembershipGate,
    closeMembershipGate,
  }), [closeMembershipGate, consumeQuota, onAuthenticated, openMembershipGate, refreshProfile, refreshQuota, setStudySummary, state]);

  return React.createElement(UserContext.Provider, { value }, children);
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used inside UserProvider');
  }
  return context;
}

export function useOptionalUser() {
  return useContext(UserContext);
}
