'use client';

import { getSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/client';
import { setQuickWinBundleCache } from '@/lib/db/bundleCache';
import { markSyncReady } from '@/lib/db/enabled';
import { isRemoteEmpty, loadAll, pushAll, type RemoteBundle } from '@/lib/db/sync';
import { useBoardStore } from '@/stores/useBoardStore';
import { useFocusStore } from '@/stores/useFocusStore';
import { useGoalsStore } from '@/stores/useGoalsStore';
import { usePomodoroStore } from '@/stores/usePomodoroStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSportStore } from '@/stores/useSportStore';
import { DEFAULT_SETTINGS } from '@/lib/types';

export const MIGRATED_KEY = 'flow-migrated-to-supabase';

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

function hasLocalDomainData(): boolean {
  const board = useBoardStore.getState();
  const goals = useGoalsStore.getState();
  const focus = useFocusStore.getState();
  const sport = useSportStore.getState();
  const pomo = usePomodoroStore.getState();
  return (
    board.tasks.length > 0 ||
    board.dayStates.length > 0 ||
    goals.goals.length > 0 ||
    goals.values.length > 0 ||
    focus.focuses.length > 0 ||
    sport.sessions.length > 0 ||
    pomo.sessions.length > 0
  );
}

function snapshotLocal(): RemoteBundle {
  return {
    tasks: useBoardStore.getState().tasks,
    goals: useGoalsStore.getState().goals,
    values: useGoalsStore.getState().values,
    focuses: useFocusStore.getState().focuses,
    sportSessions: useSportStore.getState().sessions,
    dayStates: useBoardStore.getState().dayStates,
    pomodoroSessions: usePomodoroStore.getState().sessions,
    settings: useSettingsStore.getState().settings,
    quickWinBundles: useBoardStore.getState().quickWinBundles,
  };
}

function hydrate(remote: RemoteBundle): void {
  useBoardStore.setState({
    tasks: remote.tasks,
    dayStates: remote.dayStates,
    quickWinBundles: remote.quickWinBundles,
  });
  setQuickWinBundleCache(remote.quickWinBundles);
  useGoalsStore.setState({
    goals: remote.goals,
    values: remote.values,
  });
  useFocusStore.setState({ focuses: remote.focuses });
  useSportStore.setState({ sessions: remote.sportSessions });
  usePomodoroStore.setState({ sessions: remote.pomodoroSessions });
  useSettingsStore.setState({
    settings: { ...DEFAULT_SETTINGS, ...remote.settings },
  });
}

async function waitForPersistHydration(): Promise<void> {
  const stores = [
    useBoardStore,
    useGoalsStore,
    useFocusStore,
    useSettingsStore,
    useSportStore,
    usePomodoroStore,
  ] as const;

  await Promise.all(
    stores.map(
      (store) =>
        new Promise<void>((resolve) => {
          if (store.persist.hasHydrated()) {
            resolve();
            return;
          }
          const unsub = store.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        }),
    ),
  );
}

async function bootstrapOnce(): Promise<void> {
  if (!getSupabaseEnv()) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await waitForPersistHydration();

  const remote = await loadAll();
  const migrated = typeof window !== 'undefined' && localStorage.getItem(MIGRATED_KEY) === '1';

  if (isRemoteEmpty(remote) && hasLocalDomainData() && !migrated) {
    const local = snapshotLocal();
    setQuickWinBundleCache(local.quickWinBundles);
    await pushAll(local);
    localStorage.setItem(MIGRATED_KEY, '1');
    markSyncReady(true);
    return;
  }

  hydrate(remote);
  localStorage.setItem(MIGRATED_KEY, '1');
  markSyncReady(true);
}

/** Eenmalig na login: remote laden of localStorage migreren. */
export function bootstrapData(): Promise<void> {
  if (bootstrapped) return Promise.resolve();
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapOnce()
      .catch((err: unknown) => {
        console.error('[flow bootstrap]', err);
      })
      .finally(() => {
        bootstrapped = true;
      });
  }
  return bootstrapPromise;
}

export function resetBootstrapFlag(): void {
  bootstrapped = false;
  bootstrapPromise = null;
  markSyncReady(false);
}
