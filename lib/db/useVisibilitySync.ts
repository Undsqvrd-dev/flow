'use client';

import { useEffect, useCallback, useRef } from 'react';
import { loadAll } from './sync';
import { syncEnabled } from './enabled';
import { repairTaskChecklists } from '@/lib/checklist';
import { dirtyRetain, flushPendingSync, persistChecklistRepairs, rememberDay, rememberFocus, rememberGoal, rememberPomodoro, rememberSport, rememberTask, rememberValue } from './liveSync';
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

      const merged = mergeRemoteData(
        local,
        {
          tasks: remote.tasks,
          goals: remote.goals,
          values: remote.values,
          focuses: remote.focuses,
          sportSessions: remote.sportSessions,
          dayStates: remote.dayStates,
          pomodoroSessions: remote.pomodoroSessions,
        },
        dirtyRetain(),
      );

      const tasks = repairTaskChecklists(merged.tasks).tasks;
      useBoardStore.setState({
        tasks,
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

      const dirty = dirtyRetain();
      for (const task of tasks) {
        if (!dirty.tasks.has(task.id)) rememberTask(task.id, task.updatedAt);
      }
      for (const goal of merged.goals) {
        if (!dirty.goals.has(goal.id)) rememberGoal(goal.id, goal.updatedAt);
      }
      for (const value of merged.values) {
        if (!dirty.values.has(value.id)) rememberValue(value.id, value.updatedAt);
      }
      for (const focus of merged.focuses) {
        if (!dirty.focuses.has(focus.id)) rememberFocus(focus.id, focus.updatedAt);
      }
      for (const session of merged.sportSessions) {
        if (!dirty.sportSessions.has(session.id)) rememberSport(session.id, session.updatedAt);
      }
      for (const day of merged.dayStates) {
        if (!dirty.dayStates.has(day.date)) rememberDay(day.date, day.updatedAt);
      }
      for (const session of merged.pomodoroSessions) {
        if (!dirty.pomodoroSessions.has(session.id)) rememberPomodoro(session.id, session.updatedAt);
      }
      persistChecklistRepairs();

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
      if (document.visibilityState === 'hidden') {
        flushPendingSync();
        return;
      }
      void refetchAndMerge();
    };

    const handleFocus = (): void => {
      void refetchAndMerge();
    };

    const handlePageHide = (): void => {
      flushPendingSync();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [refetchAndMerge]);
}
