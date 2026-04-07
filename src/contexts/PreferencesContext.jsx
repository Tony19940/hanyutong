import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { api, storage } from '../utils/api.js';
import { defaultPreferences, normalizePreferences, storageKeys } from '../preferences/defaults.js';
import { applyTheme } from '../theme/tokens.js';
import { useTelegram } from '../hooks/useTelegram.js';

const PreferencesContext = createContext(null);

function readInitialState() {
  return {
    ...normalizePreferences({
      language: localStorage.getItem(storageKeys.language) || defaultPreferences.language,
      theme: localStorage.getItem(storageKeys.theme) || defaultPreferences.theme,
      voiceType: localStorage.getItem(storageKeys.voiceType) || defaultPreferences.voiceType,
    }),
    availableVoices: [],
    defaultVoiceType: '',
    telegramCaps: {
      available: false,
      backButton: false,
      mainButton: false,
      haptics: false,
      colorScheme: 'dark',
      version: '',
    },
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'set-preferences':
      return {
        ...state,
        ...normalizePreferences(action.payload),
      };
    case 'hydrate-server':
      return {
        ...state,
        ...normalizePreferences({
          language: action.payload?.settings?.language ?? state.language,
          theme: action.payload?.settings?.theme ?? state.theme,
          voiceType: action.payload?.settings?.voiceType ?? state.voiceType,
        }),
        availableVoices: action.payload?.voiceSettings?.availableVoices || state.availableVoices,
        defaultVoiceType: action.payload?.voiceSettings?.defaultVoiceType || state.defaultVoiceType,
      };
    case 'set-telegram-caps':
      return {
        ...state,
        telegramCaps: action.payload,
      };
    default:
      return state;
  }
}

function hasStoredSession() {
  return Boolean(localStorage.getItem(storage.USER_TOKEN_KEY));
}

export function PreferencesProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, readInitialState);
  const telegram = useTelegram();

  useEffect(() => {
    telegram.init();
    dispatch({ type: 'set-telegram-caps', payload: telegram.caps });
  }, [telegram]);

  useEffect(() => {
    applyTheme(state.theme);
    localStorage.setItem(storageKeys.language, state.language);
    localStorage.setItem(storageKeys.theme, state.theme);
    localStorage.setItem(storageKeys.voiceType, state.voiceType || '');
  }, [state.language, state.theme, state.voiceType]);

  const updatePreferences = useCallback(async (patch) => {
    const next = normalizePreferences({ ...state, ...patch });
    dispatch({ type: 'set-preferences', payload: next });

    if (!hasStoredSession()) {
      return next;
    }

    try {
      const response = await api.updateUserSettings(patch);
      dispatch({
        type: 'hydrate-server',
        payload: response,
      });
      return normalizePreferences({ ...next, ...(response?.settings || {}) });
    } catch (error) {
      dispatch({ type: 'set-preferences', payload: state });
      throw error;
    }
  }, [state]);

  const hydrateFromServer = useCallback((settings, voiceSettings) => {
    dispatch({
      type: 'hydrate-server',
      payload: { settings, voiceSettings },
    });
  }, []);

  const value = useMemo(() => ({
    ...state,
    hydrateFromServer,
    setLanguage: (language) => updatePreferences({ language }),
    cycleLanguage: () => {
      const order = ['zh-CN', 'en', 'km'];
      const currentIndex = order.indexOf(state.language);
      const nextLanguage = order[(currentIndex + 1 + order.length) % order.length];
      return updatePreferences({ language: nextLanguage });
    },
    setTheme: (theme) => updatePreferences({ theme }),
    setVoiceType: (voiceType) => updatePreferences({ voiceType }),
  }), [hydrateFromServer, state, updatePreferences]);

  return React.createElement(PreferencesContext.Provider, { value }, children);
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return context;
}
