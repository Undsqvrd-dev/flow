'use client';

import { useEffect, useCallback, useRef } from 'react';
import { loadAll } from './sync';
import { syncEnabled } from './enabled';
import { mergeRemoteData, type MergeableStore } from './merge';
import { useBoardStore } from '@/stores/useBoardStore';
import { useGoalsStore } from '@/stores/useGoalsStore';
import { useFocusStore } from '@/stores/useFocusStore';
import { useSportStore } from '@/stores/useSportStore';
import { usePomodoroStore } from '@/stores/usePomodoroStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { setQuickWinBundleCache } from './bundleCache';
import { DEFAULT_SETTINGS } from '@/lib/types';

const REFETCH_DEBOUNCE_MS = 2000;

export function useVisibilitySync(): void {
  const lastRefetch = useRef<number>(0);
  const isFetching = useRef<boolean>(false);

  const refetchAndMerge = useCallback(async () => {
    if (!syncEnabled()) return;
    if (isFetching.current) return;

    const now = Date.now();
    if (now - lastRefetch.current < REFETCH_DEBOUNCE_MS) return;

    lastRefetch.current = now;
    isFetching.current = true;

    try {
      const remote = await loadAll();

      const boardState = useBoardStore.getState();
      const goalsState = useGoalsStore.getState();
      const focusState = useFocusStore.getState();
      const sportState = useSportStore.getState();
      const pomodoroState = usePomodoroStore.getState();

      const local: MergeableStore = {
        tasks: boardState.tasks,
        goals: goalsState.goals,
        values: goalsState.values,
        focuses: focusState.focuses,
        sportSessions: sportState.sessions,
        dayStates: boardState.dayStates,
        pomodoroSessions: pomodoroState.sessions,
      };

      const merged = mergeRemoteData(local, {
        tasks: remote.tasks,
        goals: remote.goals,
        values: remote.values,
        focuses: remote.focuses,
        sportSessions: remote.sportSessions,
        dayStates: remote.dayStates,
        pomodoroSessions: remote.pomodoroSessions,
      });

      useBoardStore.setState({
        tasks: merged.tasks,
        dayStates: merged.dayStates,
        quickWinBundles: remote.quickWinBundles,
      });
      setQuickWinBundleCache(remote.quickWinBundles);

      useGoalsStore.setState({
        goals: merged.goals,
        values: merged.values,
      });

      useFocusStore.setState({ focuses: merged.focuses });
      useSportStore.setState({ sessions: merged.sportSessions });
      usePomodoroStore.setState({ sessions: merged.pomodoroSessions });

      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, ...remote.settings },
      });

      console.log('[flow sync] visibility refetch complete');
    } catch (err) {
      console.error('[flow sync] visibility refetch failed', err);
    } finally {
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        void refetchAndMerge();
      }
    };

    const handleFocus = (): void => {
      void refetchAndMerge();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetchAndMerge]);
}
