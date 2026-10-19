'use client';

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  taskFromRow,
  goalFromRow,
  valueFromRow,
  focusFromRow,
  dayStateFromRow,
  pomodoroFromRow,
  type TaskRow,
  type GoalRow,
  type ValueRow,
  type FocusRow,
  type DayStateRow,
  type PomodoroRow,
} from '@/lib/supabase/mappers';
import { repairTaskChecklists } from '@/lib/checklist';
import { applyDelete, applyUpsert } from '@/lib/db/applyRemote';
import {
  dayDirtyIds,
  focusDirtyIds,
  goalDirtyIds,
  pomodoroDirtyIds,
  rememberDay,
  rememberFocus,
  rememberGoal,
  rememberPomodoro,
  persistChecklistRepairs,
  rememberTask,
  rememberValue,
  taskDirtyIds,
  valueDirtyIds,
} from '@/lib/db/liveSync';
import { useBoardStore } from '@/stores/useBoardStore';
import { useGoalsStore } from '@/stores/useGoalsStore';
import { useFocusStore } from '@/stores/useFocusStore';
import { usePomodoroStore } from '@/stores/usePomodoroStore';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

let channel: RealtimeChannel | null = null;
let isSubscribed = false;

function textField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === 'string' ? value : '';
}

function handleTaskChange(payload: RealtimePayload): void {
  const state = useBoardStore.getState();
  if (payload.eventType === 'DELETE') {
    useBoardStore.setState({
      tasks: applyDelete(state.tasks, textField(payload.old, 'id'), (task) => task.id),
    });
    return;
  }
  const task = taskFromRow(payload.new as unknown as TaskRow);
  const applied = applyUpsert(state.tasks, task, (item) => item.id, taskDirtyIds());
  const repaired = repairTaskChecklists(applied);
  if (repaired.changed || applied !== state.tasks) {
    useBoardStore.setState({ tasks: repaired.tasks });
  }
  if (applied !== state.tasks) rememberTask(task.id, task.updatedAt);
  persistChecklistRepairs();
}

function handleGoalChange(payload: RealtimePayload): void {
  const state = useGoalsStore.getState();
  if (payload.eventType === 'DELETE') {
    useGoalsStore.setState({
      goals: applyDelete(state.goals, textField(payload.old, 'id'), (goal) => goal.id),
    });
    return;
  }
  const goal = goalFromRow(payload.new as unknown as GoalRow);
  const next = applyUpsert(state.goals, goal, (item) => item.id, goalDirtyIds());
  if (next === state.goals) return;
  useGoalsStore.setState({ goals: next });
  rememberGoal(goal.id, goal.updatedAt);
}

function handleValueChange(payload: RealtimePayload): void {
  const state = useGoalsStore.getState();
  if (payload.eventType === 'DELETE') {
    useGoalsStore.setState({
      values: applyDelete(state.values, textField(payload.old, 'id'), (value) => value.id),
    });
    return;
  }
  const value = valueFromRow(payload.new as unknown as ValueRow);
  const next = applyUpsert(state.values, value, (item) => item.id, valueDirtyIds());
  if (next === state.values) return;
  useGoalsStore.setState({ values: next });
  rememberValue(value.id, value.updatedAt);
}

function handleFocusChange(payload: RealtimePayload): void {
  const state = useFocusStore.getState();
  if (payload.eventType === 'DELETE') {
    useFocusStore.setState({
      focuses: applyDelete(state.focuses, textField(payload.old, 'id'), (focus) => focus.id),
    });
    return;
  }
  const focus = focusFromRow(payload.new as unknown as FocusRow);
  const next = applyUpsert(state.focuses, focus, (item) => item.id, focusDirtyIds());
  if (next === state.focuses) return;
  useFocusStore.setState({ focuses: next });
  rememberFocus(focus.id, focus.updatedAt);
}

function handleDayStateChange(payload: RealtimePayload): void {
  const state = useBoardStore.getState();
  if (payload.eventType === 'DELETE') {
    useBoardStore.setState({
      dayStates: applyDelete(state.dayStates, textField(payload.old, 'date'), (day) => day.date),
    });
    return;
  }
  const dayState = dayStateFromRow(payload.new as unknown as DayStateRow);
  const next = applyUpsert(state.dayStates, dayState, (item) => item.date, dayDirtyIds());
  if (next === state.dayStates) return;
  useBoardStore.setState({ dayStates: next });
  rememberDay(dayState.date, dayState.updatedAt);
}

function handlePomodoroChange(payload: RealtimePayload): void {
  const state = usePomodoroStore.getState();
  if (payload.eventType === 'DELETE') {
    usePomodoroStore.setState({
      sessions: applyDelete(state.sessions, textField(payload.old, 'id'), (session) => session.id),
    });
    return;
  }
  const session = pomodoroFromRow(payload.new as unknown as PomodoroRow);
  const next = applyUpsert(state.sessions, session, (item) => item.id, pomodoroDirtyIds());
  if (next === state.sessions) return;
  usePomodoroStore.setState({ sessions: next });
  rememberPomodoro(session.id, session.updatedAt);
}

export function subscribeToRealtime(): void {
  if (isSubscribed || typeof window === 'undefined') return;

  const supabase = createClient();

  channel = supabase
    .channel('flow-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      handleTaskChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'goals' },
      handleGoalChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'flow_values' },
      handleValueChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'focus' },
      handleFocusChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'day_states' },
      handleDayStateChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pomodoro_sessions' },
      handlePomodoroChange,
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribed = true;
        console.log('[flow realtime] subscribed');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[flow realtime] channel error');
        isSubscribed = false;
      }
    });
}

export function unsubscribeFromRealtime(): void {
  if (channel) {
    const supabase = createClient();
    void supabase.removeChannel(channel);
    channel = null;
    isSubscribed = false;
  }
}

export function isRealtimeSubscribed(): boolean {
  return isSubscribed;
}
