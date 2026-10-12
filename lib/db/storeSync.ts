import { syncEnabled } from '@/lib/db/enabled';
import {
  enqueueDayStates,
  enqueueFocuses,
  enqueueGoals,
  enqueuePomodoro,
  enqueueSport,
  enqueueTasks,
  enqueueValues,
  forgetGoal,
  forgetSport,
  forgetTask,
  forgetValue,
} from '@/lib/db/liveSync';
import {
  deleteGoal,
  deleteSportSession,
  deleteTask,
  deleteTasks,
  deleteValue,
  runSync,
  upsertSettings,
} from '@/lib/db/sync';
import type { DayState, Focus, Goal, PomodoroSession, Settings, SportSession, Task, Value } from '@/lib/types';

export function syncTasks(tasks: Task[], previous: readonly Task[], rollback: () => void): void {
  if (!syncEnabled()) {
    console.warn('[flow sync] taken niet naar Supabase — sync nog niet klaar');
    return;
  }
  enqueueTasks(tasks, previous, rollback);
}

export function syncRemoveTask(id: string, rollback: () => void): void {
  if (!syncEnabled()) return;
  forgetTask(id);
  runSync(() => deleteTask(id), rollback);
}

export function syncRemoveTasks(ids: string[], rollback: () => void): void {
  if (!syncEnabled()) return;
  for (const id of ids) forgetTask(id);
  runSync(() => deleteTasks(ids), rollback);
}

export function syncGoals(goals: Goal[], previous: readonly Goal[], rollback: () => void): void {
  if (!syncEnabled()) return;
  enqueueGoals(goals, previous, rollback);
}

export function syncRemoveGoal(id: string, rollback: () => void): void {
  if (!syncEnabled()) return;
  forgetGoal(id);
  runSync(() => deleteGoal(id), rollback);
}

export function syncValues(values: Value[], previous: readonly Value[], rollback: () => void): void {
  if (!syncEnabled()) return;
  enqueueValues(values, previous, rollback);
}

export function syncRemoveValue(id: string, rollback: () => void): void {
  if (!syncEnabled()) return;
  forgetValue(id);
  runSync(() => deleteValue(id), rollback);
}

export function syncFocuses(focuses: Focus[], previous: readonly Focus[], rollback: () => void): void {
  if (!syncEnabled()) return;
  enqueueFocuses(focuses, previous, rollback);
}

export function syncSport(
  sessions: SportSession[],
  previous: readonly SportSession[],
  rollback: () => void,
): void {
  if (!syncEnabled()) return;
  enqueueSport(sessions, previous, rollback);
}

export function syncRemoveSport(id: string, rollback: () => void): void {
  if (!syncEnabled()) return;
  forgetSport(id);
  runSync(() => deleteSportSession(id), rollback);
}

export function syncDayStates(
  states: DayState[],
  previous: readonly DayState[],
  rollback: () => void,
): void {
  if (!syncEnabled()) return;
  enqueueDayStates(states, previous, rollback);
}

export function syncPomodoro(
  sessions: PomodoroSession[],
  previous: readonly PomodoroSession[],
  rollback: () => void,
): void {
  if (!syncEnabled()) return;
  enqueuePomodoro(sessions, previous, rollback);
}

export function syncSettingsData(
  settings: Settings,
  quickWinBundles: string[],
  rollback: () => void,
): void {
  if (!syncEnabled()) return;
  runSync(() => upsertSettings(settings, quickWinBundles), rollback);
}
