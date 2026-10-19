'use client';

import { getSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/client';
import { setQuickWinBundleCache } from '@/lib/db/bundleCache';
import { markSyncReady } from '@/lib/db/enabled';
import {
  isRemoteEmpty,
  loadAll,
  pushAll,
  upsertDayStates,
  upsertFocuses,
  upsertGoals,
  upsertPomodoroSessions,
  upsertTasks,
  upsertValues,
  type ReconcileResult,
  type RemoteBundle,
} from '@/lib/db/sync';
import { timestampMs } from '@/lib/db/conflict';
import { mergeRemoteData, itemsToPush, type MergeableStore } from '@/lib/db/merge';
import { repairTaskChecklists } from '@/lib/checklist';
import { ensureTodayRituals } from '@/lib/db/ensureMeditation';
import {
  persistChecklistRepairs,
  rememberDay,
  rememberFocus,
  rememberGoal,
  rememberPomodoro,
  rememberTask,
  rememberValue,
} from '@/lib/db/liveSync';
import { subscribeToRealtime } from '@/lib/db/realtime';
import { useBoardStore } from '@/stores/useBoardStore';
import { useFocusStore } from '@/stores/useFocusStore';
import { useGoalsStore } from '@/stores/useGoalsStore';
import { usePomodoroStore } from '@/stores/usePomodoroStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { DEFAULT_SETTINGS } from '@/lib/types';
import type { Task } from '@/lib/types';

export const MIGRATED_KEY = 'flow-migrated-to-supabase';

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

function hasLocalDomainData(): boolean {
  const board = useBoardStore.getState();
  const goals = useGoalsStore.getState();
  const focus = useFocusStore.getState();
  const pomo = usePomodoroStore.getState();
  return (
    board.tasks.length > 0 ||
    board.dayStates.length > 0 ||
    goals.goals.length > 0 ||
    goals.values.length > 0 ||
    focus.focuses.length > 0 ||
    pomo.sessions.length > 0
  );
}

function snapshotLocal(): RemoteBundle {
  return {
    tasks: useBoardStore.getState().tasks,
    goals: useGoalsStore.getState().goals,
    values: useGoalsStore.getState().values,
    focuses: useFocusStore.getState().focuses,
    dayStates: useBoardStore.getState().dayStates,
    pomodoroSessions: usePomodoroStore.getState().sessions,
    settings: useSettingsStore.getState().settings,
    quickWinBundles: useBoardStore.getState().quickWinBundles,
  };
}

/** Merge op id; bij conflict wint de nieuwste `updatedAt`. */
export function mergeTasks(local: Task[], remote: Task[]): Task[] {
  const merged = mergeRemoteData(
    { tasks: local, goals: [], values: [], focuses: [], dayStates: [], pomodoroSessions: [] },
    { tasks: remote, goals: [], values: [], focuses: [], dayStates: [], pomodoroSessions: [] },
  );
  return merged.tasks;
}

function hydrate(remote: RemoteBundle): void {
  useBoardStore.setState({
    tasks: repairTaskChecklists(remote.tasks).tasks,
    dayStates: remote.dayStates,
    quickWinBundles: remote.quickWinBundles,
  });
  setQuickWinBundleCache(remote.quickWinBundles);
  useGoalsStore.setState({
    goals: remote.goals,
    values: remote.values,
  });
  useFocusStore.setState({ focuses: remote.focuses });
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
  const local = snapshotLocal();
  const migrated = typeof window !== 'undefined' && localStorage.getItem(MIGRATED_KEY) === '1';

  // Eerste keer: lege remote ← lokale data pushen.
  if (isRemoteEmpty(remote) && hasLocalDomainData() && !migrated) {
    setQuickWinBundleCache(local.quickWinBundles);
    await pushAll(local);
    localStorage.setItem(MIGRATED_KEY, '1');
    markSyncReady(true);
    persistChecklistRepairs();
    subscribeToRealtime();
    await ensureTodayRituals();
    return;
  }

  // Altijd mergen i.p.v. remote blind over local te zetten (voorkomt dataverlies).
  const localStore: MergeableStore = {
    tasks: local.tasks,
    goals: local.goals,
    values: local.values,
    focuses: local.focuses,
    dayStates: local.dayStates,
    pomodoroSessions: local.pomodoroSessions,
  };
  const remoteStore: MergeableStore = {
    tasks: remote.tasks,
    goals: remote.goals,
    values: remote.values,
    focuses: remote.focuses,
    dayStates: remote.dayStates,
    pomodoroSessions: remote.pomodoroSessions,
  };

  const mergedStore = mergeRemoteData(localStore, remoteStore);

  const merged: RemoteBundle = {
    ...mergedStore,
    settings: remote.settings ?? local.settings,
    quickWinBundles: remote.quickWinBundles.length
      ? remote.quickWinBundles
      : local.quickWinBundles,
  };

  hydrate(merged);
  rememberHydrated(merged);

  await pushNewerThanServer(mergedStore, remoteStore);

  localStorage.setItem(MIGRATED_KEY, '1');
  markSyncReady(true);
  persistChecklistRepairs();

  subscribeToRealtime();
  await ensureTodayRituals();
}

function rememberHydrated(data: MergeableStore): void {
  for (const task of data.tasks) rememberTask(task.id, task.updatedAt);
  for (const goal of data.goals) rememberGoal(goal.id, goal.updatedAt);
  for (const value of data.values) rememberValue(value.id, value.updatedAt);
  for (const focus of data.focuses) rememberFocus(focus.id, focus.updatedAt);
  for (const day of data.dayStates) rememberDay(day.date, day.updatedAt);
  for (const session of data.pomodoroSessions) rememberPomodoro(session.id, session.updatedAt);
}

function applyWins<T>(
  current: T[],
  result: ReconcileResult<T>,
  getKey: (item: T) => string,
): T[] {
  if (!result.serverWins.length && !result.removedKeys.length && !result.written.length) return current;
  const preferred = new Map<string, T>();
  for (const item of result.written) preferred.set(getKey(item), item);
  for (const item of result.serverWins) preferred.set(getKey(item), item);
  const removed = new Set(result.removedKeys);
  return current
    .filter((item) => !removed.has(getKey(item)))
    .map((item) => preferred.get(getKey(item)) ?? item);
}

/** Alleen rijen die lokaal nieuwer zijn dan de server. Ontbrekende serverrijen blijven. */
async function pushNewerThanServer(local: MergeableStore, remote: MergeableStore): Promise<void> {
  const tasks = applyWins(
    useBoardStore.getState().tasks,
    await upsertTasks(itemsToPush(local.tasks, remote.tasks)),
    (task) => task.id,
  );
  const goals = applyWins(
    useGoalsStore.getState().goals,
    await upsertGoals(itemsToPush(local.goals, remote.goals)),
    (goal) => goal.id,
  );
  const values = applyWins(
    useGoalsStore.getState().values,
    await upsertValues(itemsToPush(local.values, remote.values)),
    (value) => value.id,
  );
  const focuses = applyWins(
    useFocusStore.getState().focuses,
    await upsertFocuses(itemsToPush(local.focuses, remote.focuses)),
    (focus) => focus.id,
  );
  const dayStates = applyWins(
    useBoardStore.getState().dayStates,
    await upsertDayStates(
      local.dayStates.filter((day) => {
        const server = remote.dayStates.find((item) => item.date === day.date);
        if (!server) return false;
        return timestampMs(day.updatedAt) > timestampMs(server.updatedAt);
      }),
    ),
    (day) => day.date,
  );
  const pomodoro = applyWins(
    usePomodoroStore.getState().sessions,
    await upsertPomodoroSessions(itemsToPush(local.pomodoroSessions, remote.pomodoroSessions)),
    (session) => session.id,
  );

  useBoardStore.setState({ tasks, dayStates });
  useGoalsStore.setState({ goals, values });
  useFocusStore.setState({ focuses });
  usePomodoroStore.setState({ sessions: pomodoro });
  rememberHydrated({
    tasks,
    goals,
    values,
    focuses,
    dayStates,
    pomodoroSessions: pomodoro,
  });
}

/** Eenmalig na login: remote laden, mergen met localStorage, ontbrekende taken terugzetten. */
export function bootstrapData(): Promise<void> {
  if (bootstrapped) return Promise.resolve();
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapOnce()
      .catch((err: unknown) => {
        console.error('[flow bootstrap]', err);
        // Bij fout: lokale cache behouden, sync níet aanzetten (voorkomt stille remote-wipe).
        markSyncReady(false);
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

/** Nood-sync: lokale rijen schrijven, maar een nieuwere serverrij niet overschrijven. */
export async function forcePushLocalToRemote(): Promise<{ taskCount: number }> {
  await waitForPersistHydration();
  const local = snapshotLocal();
  await pushAll(local);
  const remote = await loadAll();
  const merged = mergeRemoteData(local, {
    tasks: remote.tasks,
    goals: remote.goals,
    values: remote.values,
    focuses: remote.focuses,
    dayStates: remote.dayStates,
    pomodoroSessions: remote.pomodoroSessions,
  });
  hydrate({
    ...merged,
    settings: remote.settings,
    quickWinBundles: remote.quickWinBundles,
  });
  rememberHydrated(merged);
  markSyncReady(true);
  persistChecklistRepairs();
  subscribeToRealtime();
  await ensureTodayRituals();
  return { taskCount: merged.tasks.length };
}
