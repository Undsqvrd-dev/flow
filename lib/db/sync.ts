import { createClient } from '@/lib/supabase/client';
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
import { writeVersioned } from '@/lib/db/versionedWrite';
import {
  dayStateFromRow,
  dayStateToRow,
  focusFromRow,
  focusToRow,
  goalFromRow,
  goalToRow,
  pomodoroFromRow,
  pomodoroToRow,
  settingsFromRow,
  settingsToData,
  sportFromRow,
  sportToRow,
  taskFromRow,
  taskToRow,
  valueFromRow,
  valueToRow,
  type DayStateRow,
  type FocusRow,
  type GoalRow,
  type PomodoroRow,
  type SettingsRow,
  type SportRow,
  type TaskRow,
  type ValueRow,
} from '@/lib/supabase/mappers';

export type RemoteBundle = {
  tasks: Task[];
  goals: Goal[];
  values: Value[];
  focuses: Focus[];
  sportSessions: SportSession[];
  dayStates: DayState[];
  pomodoroSessions: PomodoroSession[];
  settings: Settings;
  quickWinBundles: string[];
};

function client() {
  return createClient();
}

export function isRemoteEmpty(data: RemoteBundle): boolean {
  return (
    data.tasks.length === 0 &&
    data.goals.length === 0 &&
    data.values.length === 0 &&
    data.focuses.length === 0 &&
    data.sportSessions.length === 0 &&
    data.dayStates.length === 0 &&
    data.pomodoroSessions.length === 0
  );
}

export async function loadAll(): Promise<RemoteBundle> {
  const supabase = client();

  const [
    tasksRes,
    goalsRes,
    valuesRes,
    focusRes,
    sportRes,
    dayRes,
    pomoRes,
    settingsRes,
  ] = await Promise.all([
    supabase.from('tasks').select('*'),
    supabase.from('goals').select('*'),
    supabase.from('flow_values').select('*'),
    supabase.from('focus').select('*'),
    supabase.from('sport_sessions').select('*'),
    supabase.from('day_states').select('*'),
    supabase.from('pomodoro_sessions').select('*'),
    supabase.from('settings').select('*').maybeSingle(),
  ]);

  const errors = [
    tasksRes.error,
    goalsRes.error,
    valuesRes.error,
    focusRes.error,
    sportRes.error,
    dayRes.error,
    pomoRes.error,
    settingsRes.error,
  ].filter(Boolean);

  if (errors.length) {
    throw new Error(errors[0]?.message ?? 'Laden uit Supabase mislukt');
  }

  const { settings, quickWinBundles } = settingsFromRow(
    (settingsRes.data as SettingsRow | null)?.data ?? null,
  );

  return {
    tasks: ((tasksRes.data ?? []) as TaskRow[]).map(taskFromRow),
    goals: ((goalsRes.data ?? []) as GoalRow[]).map(goalFromRow),
    values: ((valuesRes.data ?? []) as ValueRow[]).map(valueFromRow),
    focuses: ((focusRes.data ?? []) as FocusRow[]).map(focusFromRow),
    sportSessions: ((sportRes.data ?? []) as SportRow[]).map(sportFromRow),
    dayStates: ((dayRes.data ?? []) as DayStateRow[]).map(dayStateFromRow),
    pomodoroSessions: ((pomoRes.data ?? []) as PomodoroRow[]).map(pomodoroFromRow),
    settings,
    quickWinBundles,
  };
}

export interface ReconcileResult<T> {
  serverWins: T[];
  removedKeys: string[];
  written: T[];
}

function asRow(value: object): Record<string, unknown> {
  return { ...(value as Record<string, unknown>) };
}

const EMPTY_RECONCILE = { serverWins: [], removedKeys: [], written: [] };

async function reconcileRows<T>(
  items: readonly T[],
  spec: (item: T) => {
    table: 'tasks' | 'goals' | 'flow_values' | 'focus' | 'sport_sessions' | 'day_states' | 'pomodoro_sessions';
    key: 'id' | 'date';
    id: string;
    row: Record<string, unknown>;
    parse: (row: Record<string, unknown>) => T;
  },
): Promise<ReconcileResult<T>> {
  if (!items.length) return { serverWins: [], removedKeys: [], written: [] };
  const serverWins: T[] = [];
  const removedKeys: string[] = [];
  const written: T[] = [];
  for (const item of items) {
    const write = spec(item);
    const base = typeof write.row.updated_at === 'string' ? write.row.updated_at : null;
    const result = await writeVersioned({
      ...write,
      baseUpdatedAt: base,
      ifMissing: 'insert',
    });
    if (result.status === 'ok') written.push(result.server);
    else if (result.server) serverWins.push(result.server);
    else removedKeys.push(write.id);
  }
  return { serverWins, removedKeys, written };
}

/** Last-write-wins: een oudere lokale rij overschrijft de server niet. */
export async function upsertTasks(tasks: Task[]): Promise<ReconcileResult<Task>> {
  if (!tasks.length) return EMPTY_RECONCILE;
  return reconcileRows(tasks, (task) => ({
    table: 'tasks',
    key: 'id',
    id: task.id,
    row: asRow(taskToRow(task)),
    parse: (row) => taskFromRow(row as unknown as TaskRow),
  }));
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await client().from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteTasks(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await client().from('tasks').delete().in('id', ids);
  if (error) throw error;
}

export async function upsertGoals(goals: Goal[]): Promise<ReconcileResult<Goal>> {
  return reconcileRows(goals, (goal) => ({
    table: 'goals',
    key: 'id',
    id: goal.id,
    row: asRow(goalToRow(goal)),
    parse: (row) => goalFromRow(row as unknown as GoalRow),
  }));
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await client().from('goals').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertValues(values: Value[]): Promise<ReconcileResult<Value>> {
  return reconcileRows(values, (value) => ({
    table: 'flow_values',
    key: 'id',
    id: value.id,
    row: asRow(valueToRow(value)),
    parse: (row) => valueFromRow(row as unknown as ValueRow),
  }));
}

export async function deleteValue(id: string): Promise<void> {
  const { error } = await client().from('flow_values').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertFocuses(focuses: Focus[]): Promise<ReconcileResult<Focus>> {
  return reconcileRows(focuses, (focus) => ({
    table: 'focus',
    key: 'id',
    id: focus.id,
    row: asRow(focusToRow(focus)),
    parse: (row) => focusFromRow(row as unknown as FocusRow),
  }));
}

export async function upsertSportSessions(
  sessions: SportSession[],
): Promise<ReconcileResult<SportSession>> {
  return reconcileRows(sessions, (session) => ({
    table: 'sport_sessions',
    key: 'id',
    id: session.id,
    row: asRow(sportToRow(session)),
    parse: (row) => sportFromRow(row as unknown as SportRow),
  }));
}

export async function deleteSportSession(id: string): Promise<void> {
  const { error } = await client().from('sport_sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertDayStates(states: DayState[]): Promise<ReconcileResult<DayState>> {
  return reconcileRows(states, (state) => ({
    table: 'day_states',
    key: 'date',
    id: state.date,
    row: asRow(dayStateToRow(state)),
    parse: (row) => dayStateFromRow(row as unknown as DayStateRow),
  }));
}

export async function upsertPomodoroSessions(
  sessions: PomodoroSession[],
): Promise<ReconcileResult<PomodoroSession>> {
  return reconcileRows(sessions, (session) => ({
    table: 'pomodoro_sessions',
    key: 'id',
    id: session.id,
    row: asRow(pomodoroToRow(session)),
    parse: (row) => pomodoroFromRow(row as unknown as PomodoroRow),
  }));
}

export async function upsertSettings(
  settings: Settings,
  quickWinBundles: string[],
): Promise<void> {
  const supabase = client();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Niet ingelogd');

  const { error } = await supabase.from('settings').upsert({
    user_id: user.id,
    data: settingsToData(settings, quickWinBundles),
  });
  if (error) throw error;
}

export async function pushAll(data: RemoteBundle): Promise<void> {
  await upsertGoals(data.goals);
  await upsertValues(data.values);
  await upsertTasks(data.tasks);
  await upsertFocuses(data.focuses);
  await upsertSportSessions(data.sportSessions);
  await upsertDayStates(data.dayStates);
  await upsertPomodoroSessions(data.pomodoroSessions);
  await upsertSettings(data.settings, data.quickWinBundles);
}

/** Fire-and-forget met rollback bij fout. */
export function runSync(write: () => Promise<void>, rollback: () => void): void {
  void write().catch((err: unknown) => {
    console.error('[flow sync]', err);
    rollback();
  });
}
