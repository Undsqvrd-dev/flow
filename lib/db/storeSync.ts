import { syncEnabled } from '@/lib/db/enabled';
import {
  deleteGoal,
  deleteSportSession,
  deleteTask,
  deleteTasks,
  deleteValue,
  runSync,
  upsertDayStates,
  upsertFocuses,
  upsertGoals,
  upsertPomodoroSessions,
  upsertSettings,
  upsertSportSessions,
  upsertTasks,
  upsertValues,
} from '@/lib/db/sync';
import type {
  DayState,
  Focus,
  Goal,
  PomodoroSession,
  Settings,
  SportSession,
  Task,
  Value,
} from '@/lib/types';

export function syncTasks(tasks: Task[], rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => upsertTasks(tasks), rollback);
}

export function syncRemoveTask(id: string, rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => deleteTask(id), rollback);
}

export function syncRemoveTasks(ids: string[], rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => deleteTasks(ids), rollback);
}

export function syncGoals(goals: Goal[], rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => upsertGoals(goals), rollback);
}

export function syncRemoveGoal(id: string, rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => deleteGoal(id), rollback);
}

export function syncValues(values: Value[], rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => upsertValues(values), rollback);
}

export function syncRemoveValue(id: string, rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => deleteValue(id), rollback);
}

export function syncFocuses(focuses: Focus[], rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => upsertFocuses(focuses), rollback);
}

export function syncSport(sessions: SportSession[], rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => upsertSportSessions(sessions), rollback);
}

export function syncRemoveSport(id: string, rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => deleteSportSession(id), rollback);
}

export function syncDayStates(states: DayState[], rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => upsertDayStates(states), rollback);
}

export function syncPomodoro(sessions: PomodoroSession[], rollback: () => void): void {
  if (!syncEnabled()) return;
  runSync(() => upsertPomodoroSessions(sessions), rollback);
}

export function syncSettingsData(
  settings: Settings,
  quickWinBundles: string[],
  rollback: () => void,
): void {
  if (!syncEnabled()) return;
  runSync(() => upsertSettings(settings, quickWinBundles), rollback);
}
