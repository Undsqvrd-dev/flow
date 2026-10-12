import type {
  Task,
  Goal,
  Value,
  Focus,
  SportSession,
  DayState,
  PomodoroSession,
} from '@/lib/types';

export interface MergeableStore {
  tasks: Task[];
  goals: Goal[];
  values: Value[];
  focuses: Focus[];
  sportSessions: SportSession[];
  dayStates: DayState[];
  pomodoroSessions: PomodoroSession[];
}

type WithUpdatedAt = { updatedAt: string };
type WithId = { id: string };

function mergeById<T extends WithId & WithUpdatedAt>(
  local: T[],
  remote: T[],
): T[] {
  const result = new Map<string, T>();

  for (const item of remote) {
    result.set(item.id, item);
  }

  for (const item of local) {
    const existing = result.get(item.id);
    if (!existing) {
      result.set(item.id, item);
      continue;
    }

    const localTs = Date.parse(item.updatedAt) || 0;
    const remoteTs = Date.parse(existing.updatedAt) || 0;

    if (localTs > remoteTs) {
      result.set(item.id, item);
    }
  }

  return Array.from(result.values());
}

function mergeByKey<T extends WithUpdatedAt>(
  local: T[],
  remote: T[],
  getKey: (item: T) => string,
): T[] {
  const result = new Map<string, T>();

  for (const item of remote) {
    result.set(getKey(item), item);
  }

  for (const item of local) {
    const key = getKey(item);
    const existing = result.get(key);
    if (!existing) {
      result.set(key, item);
      continue;
    }

    const localTs = Date.parse(item.updatedAt) || 0;
    const remoteTs = Date.parse(existing.updatedAt) || 0;

    if (localTs > remoteTs) {
      result.set(key, item);
    }
  }

  return Array.from(result.values());
}

export function mergeRemoteData(
  local: MergeableStore,
  remote: MergeableStore,
): MergeableStore {
  return {
    tasks: mergeById(local.tasks, remote.tasks),
    goals: mergeById(local.goals, remote.goals),
    values: mergeById(local.values, remote.values),
    focuses: mergeById(local.focuses, remote.focuses),
    sportSessions: mergeById(local.sportSessions, remote.sportSessions),
    dayStates: mergeByKey(local.dayStates, remote.dayStates, (d) => d.date),
    pomodoroSessions: mergeById(local.pomodoroSessions, remote.pomodoroSessions),
  };
}

export function itemsToPush<T extends WithId & WithUpdatedAt>(
  merged: T[],
  remote: T[],
): T[] {
  const remoteById = new Map(remote.map((item) => [item.id, item]));

  return merged.filter((item) => {
    const remoteItem = remoteById.get(item.id);
    if (!remoteItem) return true;
    const localTs = Date.parse(item.updatedAt) || 0;
    const remoteTs = Date.parse(remoteItem.updatedAt) || 0;
    return localTs > remoteTs;
  });
}
