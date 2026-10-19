import { timestampMs } from '@/lib/db/conflict';
import type {
  Task,
  Goal,
  Value,
  Focus,
  DayState,
  PomodoroSession,
} from '@/lib/types';

export interface MergeableStore {
  tasks: Task[];
  goals: Goal[];
  values: Value[];
  focuses: Focus[];
  dayStates: DayState[];
  pomodoroSessions: PomodoroSession[];
}

type WithUpdatedAt = { updatedAt: string };
type WithId = { id: string };

export interface RetainLocalIds {
  tasks?: ReadonlySet<string>;
  goals?: ReadonlySet<string>;
  values?: ReadonlySet<string>;
  focuses?: ReadonlySet<string>;
  dayStates?: ReadonlySet<string>;
  pomodoroSessions?: ReadonlySet<string>;
}

const EMPTY: ReadonlySet<string> = new Set();

/**
 * Serverlidmaatschap wint: een rij die alleen lokaal bestaat is geen serverrij
 * en wordt niet teruggezet (anders herleeft een delete). `retain` houdt rijen
 * vast die deze client net heeft aangemaakt en nog wegschrijft.
 * Bij een gedeelde id wint de nieuwste `updatedAt`. Serverrijen die lokaal
 * ontbreken blijven staan.
 */
function mergeById<T extends WithId & WithUpdatedAt>(
  local: T[],
  remote: T[],
  retain: ReadonlySet<string>,
): T[] {
  const result = new Map<string, T>();

  for (const item of remote) {
    result.set(item.id, item);
  }

  for (const item of local) {
    const existing = result.get(item.id);
    if (!existing) {
      if (retain.has(item.id)) result.set(item.id, item);
      continue;
    }

    if (timestampMs(item.updatedAt) > timestampMs(existing.updatedAt)) {
      result.set(item.id, item);
    }
  }

  return Array.from(result.values());
}

function mergeByKey<T extends WithUpdatedAt>(
  local: T[],
  remote: T[],
  getKey: (item: T) => string,
  retain: ReadonlySet<string>,
): T[] {
  const result = new Map<string, T>();

  for (const item of remote) {
    result.set(getKey(item), item);
  }

  for (const item of local) {
    const key = getKey(item);
    const existing = result.get(key);
    if (!existing) {
      if (retain.has(key)) result.set(key, item);
      continue;
    }

    if (timestampMs(item.updatedAt) > timestampMs(existing.updatedAt)) {
      result.set(key, item);
    }
  }

  return Array.from(result.values());
}

export function mergeRemoteData(
  local: MergeableStore,
  remote: MergeableStore,
  retain: RetainLocalIds = {},
): MergeableStore {
  return {
    tasks: mergeById(local.tasks, remote.tasks, retain.tasks ?? EMPTY),
    goals: mergeById(local.goals, remote.goals, retain.goals ?? EMPTY),
    values: mergeById(local.values, remote.values, retain.values ?? EMPTY),
    focuses: mergeById(local.focuses, remote.focuses, retain.focuses ?? EMPTY),
    dayStates: mergeByKey(local.dayStates, remote.dayStates, (d) => d.date, retain.dayStates ?? EMPTY),
    pomodoroSessions: mergeById(
      local.pomodoroSessions,
      remote.pomodoroSessions,
      retain.pomodoroSessions ?? EMPTY,
    ),
  };
}

export function itemsToPush<T extends WithId & WithUpdatedAt>(
  merged: T[],
  remote: T[],
): T[] {
  const remoteById = new Map(remote.map((item) => [item.id, item]));

  return merged.filter((item) => {
    const remoteItem = remoteById.get(item.id);
    // Alleen-lokale rijen niet opnieuw inserten: een server-delete moet blijven.
    if (!remoteItem) return false;
    return timestampMs(item.updatedAt) > timestampMs(remoteItem.updatedAt);
  });
}
