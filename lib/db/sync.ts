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

export async function upsertTasks(tasks: Task[]): Promise<void> {
  if (!tasks.length) return;
  const { error } = await client().from('tasks').upsert(tasks.map(taskToRow));
  if (error) throw error;
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

export async function upsertGoals(goals: Goal[]): Promise<void> {
  if (!goals.length) return;
  const { error } = await client().from('goals').upsert(goals.map(goalToRow));
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await client().from('goals').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertValues(values: Value[]): Promise<void> {
  if (!values.length) return;
  const { error } = await client().from('flow_values').upsert(values.map(valueToRow));
  if (error) throw error;
}

export async function deleteValue(id: string): Promise<void> {
  const { error } = await client().from('flow_values').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertFocuses(focuses: Focus[]): Promise<void> {
  if (!focuses.length) return;
  const { error } = await client().from('focus').upsert(focuses.map(focusToRow));
  if (error) throw error;
}

export async function upsertSportSessions(sessions: SportSession[]): Promise<void> {
  if (!sessions.length) return;
  const { error } = await client().from('sport_sessions').upsert(sessions.map(sportToRow));
  if (error) throw error;
}

export async function deleteSportSession(id: string): Promise<void> {
  const { error } = await client().from('sport_sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertDayStates(states: DayState[]): Promise<void> {
  if (!states.length) return;
  const { error } = await client().from('day_states').upsert(states.map(dayStateToRow));
  if (error) throw error;
}

export async function upsertPomodoroSessions(sessions: PomodoroSession[]): Promise<void> {
  if (!sessions.length) return;
  const { error } = await client().from('pomodoro_sessions').upsert(sessions.map(pomodoroToRow));
  if (error) throw error;
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
