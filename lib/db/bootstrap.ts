'use client';

import { getSupabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/client';
import { setQuickWinBundleCache } from '@/lib/db/bundleCache';
import { markSyncReady } from '@/lib/db/enabled';
import { isRemoteEmpty, loadAll, pushAll, upsertTasks, type RemoteBundle } from '@/lib/db/sync';
import { useBoardStore } from '@/stores/useBoardStore';
import { useFocusStore } from '@/stores/useFocusStore';
import { useGoalsStore } from '@/stores/useGoalsStore';
import { usePomodoroStore } from '@/stores/usePomodoroStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSportStore } from '@/stores/useSportStore';
import { DEFAULT_SETTINGS } from '@/lib/types';
import type { Task } from '@/lib/types';

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

/** Merge op id; bij conflict wint de nieuwste `updatedAt`. */
export function mergeTasks(local: Task[], remote: Task[]): Task[] {
  const map = new Map<string, Task>();
  for (const t of remote) map.set(t.id, t);
  for (const t of local) {
    const cur = map.get(t.id);
    if (!cur) {
      map.set(t.id, t);
      continue;
    }
    const localTs = Date.parse(t.updatedAt) || 0;
    const remoteTs = Date.parse(cur.updatedAt) || 0;
    if (localTs >= remoteTs) map.set(t.id, t);
  }
  return [...map.values()];
}

function tasksToPush(merged: Task[], remote: Task[]): Task[] {
  const remoteById = new Map(remote.map((t) => [t.id, t]));
  return merged.filter((t) => {
    const r = remoteById.get(t.id);
    if (!r) return true;
    return (Date.parse(t.updatedAt) || 0) > (Date.parse(r.updatedAt) || 0);
  });
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
  const local = snapshotLocal();
  const migrated = typeof window !== 'undefined' && localStorage.getItem(MIGRATED_KEY) === '1';

  // Eerste keer: lege remote ← lokale data pushen.
  if (isRemoteEmpty(remote) && hasLocalDomainData() && !migrated) {
    setQuickWinBundleCache(local.quickWinBundles);
    await pushAll(local);
    localStorage.setItem(MIGRATED_KEY, '1');
    markSyncReady(true);
    return;
  }

  // Altijd mergen i.p.v. remote blind over local te zetten (voorkomt dataverlies).
  const mergedTasks = mergeTasks(local.tasks, remote.tasks);
  const merged: RemoteBundle = {
    ...remote,
    tasks: mergedTasks,
    // Overige domeinen: remote als basis, vul aan met lokale items die remote mist.
    goals: remote.goals.length ? remote.goals : local.goals,
    values: remote.values.length ? remote.values : local.values,
    focuses: remote.focuses.length ? remote.focuses : local.focuses,
    sportSessions: remote.sportSessions.length ? remote.sportSessions : local.sportSessions,
    dayStates: remote.dayStates.length ? remote.dayStates : local.dayStates,
    pomodoroSessions: remote.pomodoroSessions.length
      ? remote.pomodoroSessions
      : local.pomodoroSessions,
    settings: remote.settings ?? local.settings,
    quickWinBundles: remote.quickWinBundles.length
      ? remote.quickWinBundles
      : local.quickWinBundles,
  };

  hydrate(merged);

  const pending = tasksToPush(mergedTasks, remote.tasks);
  if (pending.length) {
    await upsertTasks(pending);
  }

  localStorage.setItem(MIGRATED_KEY, '1');
  markSyncReady(true);
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

/** Nood-sync: huidige lokale state volledig naar Supabase (bijv. na herstel). */
export async function forcePushLocalToRemote(): Promise<{ taskCount: number }> {
  await waitForPersistHydration();
  const local = snapshotLocal();
  await pushAll(local);
  markSyncReady(true);
  return { taskCount: local.tasks.length };
}
