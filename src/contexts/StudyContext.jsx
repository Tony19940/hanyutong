import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { api } from '../utils/api.js';
import { useUser } from './UserContext.jsx';
import {
  enqueueOfflineAction,
  getCacheEntry,
  listOfflineActions,
  removeOfflineAction,
  setCacheEntry,
} from '../utils/offlineStore.js';

const StudyContext = createContext(null);

function initialState() {
  return {
    vocabulary: [],
    queue: {
      reviewWords: [],
      newWords: [],
      goalSummary: null,
      summary: {
        dueCount: 0,
        newCount: 0,
      },
    },
    syncState: {
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pending: 0,
      flushing: false,
      lastSyncedAt: null,
    },
    loading: false,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'set-loading':
      return {
        ...state,
        loading: action.payload,
      };
    case 'set-vocabulary':
      return {
        ...state,
        vocabulary: action.payload,
      };
    case 'set-queue':
      return {
        ...state,
        queue: action.payload,
        syncState: {
          ...state.syncState,
          lastSyncedAt: new Date().toISOString(),
        },
      };
    case 'set-sync':
      return {
        ...state,
        syncState: {
          ...state.syncState,
          ...action.payload,
        },
      };
    default:
      return state;
  }
}

function isOfflineError(error) {
  return !navigator.onLine || !error?.status;
}

export function StudyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const { user: currentUser, setStudySummary } = useUser();

  const loadVocabulary = useCallback(async () => {
    if (!currentUser) return [];
    try {
      const words = await api.getAllWords();
      dispatch({ type: 'set-vocabulary', payload: words });
      setCacheEntry('vocabulary', words).catch(() => {});
      return words;
    } catch (error) {
      const cached = await getCacheEntry('vocabulary').catch(() => null);
      const words = cached?.value || [];
      dispatch({ type: 'set-vocabulary', payload: words });
      return words;
    }
  }, [currentUser]);

  const loadQueue = useCallback(async () => {
    if (!currentUser) {
      dispatch({ type: 'set-queue', payload: initialState().queue });
      return initialState().queue;
    }

    dispatch({ type: 'set-loading', payload: true });
    try {
      const queue = await api.getProgressQueue();
      dispatch({ type: 'set-queue', payload: queue });
      setCacheEntry('study_queue', queue).catch(() => {});
      if (queue?.goalSummary) {
        setStudySummary(queue.goalSummary);
      }
      return queue;
    } catch (error) {
      const cached = await getCacheEntry('study_queue').catch(() => null);
      if (cached?.value) {
        dispatch({ type: 'set-queue', payload: cached.value });
        return cached.value;
      }
      throw error;
    } finally {
      dispatch({ type: 'set-loading', payload: false });
    }
  }, [currentUser, setStudySummary]);

  useEffect(() => {
    if (!currentUser) {
      dispatch({ type: 'set-vocabulary', payload: [] });
      dispatch({ type: 'set-queue', payload: initialState().queue });
      return;
    }
    loadVocabulary().catch(() => {});
    loadQueue().catch(() => {});
  }, [currentUser, loadQueue, loadVocabulary]);

  useEffect(() => {
    const handleOnline = () => dispatch({ type: 'set-sync', payload: { online: true } });
    const handleOffline = () => dispatch({ type: 'set-sync', payload: { online: false } });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const flushOfflineQueue = useCallback(async () => {
    if (!currentUser || !navigator.onLine) return;
    dispatch({ type: 'set-sync', payload: { flushing: true } });
    try {
      const actions = await listOfflineActions().catch(() => []);
      dispatch({ type: 'set-sync', payload: { pending: actions.length } });
      for (const action of actions) {
        if (action.type === 'recordAction') {
          await api.recordAction(action.wordId, action.action);
        }
        if (action.type === 'reviewWord') {
          await api.reviewWord(action.wordId, action.quality);
        }
        await removeOfflineAction(action.id).catch(() => {});
      }
      dispatch({ type: 'set-sync', payload: { pending: 0, flushing: false, lastSyncedAt: new Date().toISOString() } });
    } catch {
      dispatch({ type: 'set-sync', payload: { flushing: false } });
    }
  }, [currentUser]);

  useEffect(() => {
    flushOfflineQueue().catch(() => {});
  }, [flushOfflineQueue, state.syncState.online]);

  const updateQueueAfterMutation = useCallback((wordId, updater) => {
    dispatch({
      type: 'set-queue',
      payload: updater(state.queue, wordId),
    });
  }, [state.queue]);

  const markLearned = useCallback(async (wordId) => {
    let result;
    try {
      result = await api.recordAction(wordId, 'learned');
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      await enqueueOfflineAction({ type: 'recordAction', wordId, action: 'learned' }).catch(() => {});
      const actions = await listOfflineActions().catch(() => []);
      dispatch({ type: 'set-sync', payload: { pending: actions.length, online: false } });
      result = { countedAsLearned: true };
    }
    const nextGoalSummary = state.queue.goalSummary
      ? {
          ...state.queue.goalSummary,
          learnedWords: state.queue.goalSummary.learnedWords + (result.countedAsLearned ? 1 : 0),
          studiedWords: state.queue.goalSummary.studiedWords + (result.countedAsLearned ? 1 : 0),
          completed: state.queue.goalSummary.studiedWords + (result.countedAsLearned ? 1 : 0) >= state.queue.goalSummary.target,
        }
      : state.queue.goalSummary;
    updateQueueAfterMutation(wordId, (queue) => ({
      ...queue,
      newWords: queue.newWords.filter((word) => word.id !== wordId),
      goalSummary: nextGoalSummary,
    }));
    if (result.countedAsLearned && nextGoalSummary) {
      setStudySummary(nextGoalSummary);
    }
    return result;
  }, [setStudySummary, state.queue.goalSummary, updateQueueAfterMutation]);

  const bookmarkWord = useCallback(async (wordId) => {
    let result;
    try {
      result = await api.recordAction(wordId, 'bookmarked');
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      await enqueueOfflineAction({ type: 'recordAction', wordId, action: 'bookmarked' }).catch(() => {});
      const actions = await listOfflineActions().catch(() => []);
      dispatch({ type: 'set-sync', payload: { pending: actions.length, online: false } });
      result = { success: true };
    }
    updateQueueAfterMutation(wordId, (queue) => ({
      ...queue,
      newWords: queue.newWords.filter((word) => word.id !== wordId),
    }));
    return result;
  }, [updateQueueAfterMutation]);

  const reviewWord = useCallback(async (wordId, quality) => {
    let result;
    try {
      result = await api.reviewWord(wordId, quality);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      await enqueueOfflineAction({ type: 'reviewWord', wordId, quality }).catch(() => {});
      const actions = await listOfflineActions().catch(() => []);
      dispatch({ type: 'set-sync', payload: { pending: actions.length, online: false } });
      result = {
        goalSummary: state.queue.goalSummary
          ? {
              ...state.queue.goalSummary,
              reviewWords: state.queue.goalSummary.reviewWords + 1,
              studiedWords: state.queue.goalSummary.studiedWords + 1,
              completed: state.queue.goalSummary.studiedWords + 1 >= state.queue.goalSummary.target,
            }
          : null,
      };
    }
    updateQueueAfterMutation(wordId, (queue) => ({
      ...queue,
      reviewWords: queue.reviewWords.filter((word) => word.id !== wordId),
      goalSummary: result.goalSummary || queue.goalSummary,
    }));
    setStudySummary(result.goalSummary);
    return result;
  }, [setStudySummary, state.queue.goalSummary, updateQueueAfterMutation]);

  const value = useMemo(() => ({
    ...state,
    reloadQueue: loadQueue,
    reloadVocabulary: loadVocabulary,
    flushOfflineQueue,
    markLearned,
    bookmarkWord,
    reviewWord,
  }), [bookmarkWord, flushOfflineQueue, loadQueue, loadVocabulary, markLearned, reviewWord, state]);

  return React.createElement(StudyContext.Provider, { value }, children);
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudy must be used inside StudyProvider');
  }
  return context;
}
