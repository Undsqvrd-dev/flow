'use client';

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  taskFromRow,
  goalFromRow,
  valueFromRow,
  focusFromRow,
  sportFromRow,
  dayStateFromRow,
  pomodoroFromRow,
  type TaskRow,
  type GoalRow,
  type ValueRow,
  type FocusRow,
  type SportRow,
  type DayStateRow,
  type PomodoroRow,
} from '@/lib/supabase/mappers';
import { useBoardStore } from '@/stores/useBoardStore';
import { useGoalsStore } from '@/stores/useGoalsStore';
import { useFocusStore } from '@/stores/useFocusStore';
import { useSportStore } from '@/stores/useSportStore';
import { usePomodoroStore } from '@/stores/usePomodoroStore';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

let channel: RealtimeChannel | null = null;
let isSubscribed = false;

function mergeItem<T extends { id?: string; updatedAt: string }>(
  items: T[],
  incoming: T,
  getId: (item: T) => string,
): T[] {
  const id = getId(incoming);
  const existing = items.find((item) => getId(item) === id);

  if (!existing) {
    return [...items, incoming];
  }

  const existingTs = Date.parse(existing.updatedAt) || 0;
  const incomingTs = Date.parse(incoming.updatedAt) || 0;

  if (incomingTs > existingTs) {
    return items.map((item) => (getId(item) === id ? incoming : item));
  }

  return items;
}

function removeItem<T>(items: T[], id: string, getId: (item: T) => string): T[] {
  return items.filter((item) => getId(item) !== id);
}

function handleTaskChange(payload: RealtimePayload): void {
  const state = useBoardStore.getState();

  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const task = taskFromRow(payload.new as TaskRow);
    const merged = mergeItem(state.tasks, task, (t) => t.id);
    if (merged !== state.tasks) {
      useBoardStore.setState({ tasks: merged });
    }
  } else if (payload.eventType === 'DELETE') {
    const oldRow = payload.old as { id?: string };
    if (oldRow.id) {
      useBoardStore.setState({
        tasks: removeItem(state.tasks, oldRow.id, (t) => t.id),
      });
    }
  }
}

function handleGoalChange(payload: RealtimePayload): void {
  const state = useGoalsStore.getState();

  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const goal = goalFromRow(payload.new as GoalRow);
    const merged = mergeItem(state.goals, goal, (g) => g.id);
    if (merged !== state.goals) {
      useGoalsStore.setState({ goals: merged });
    }
  } else if (payload.eventType === 'DELETE') {
    const oldRow = payload.old as { id?: string };
    if (oldRow.id) {
      useGoalsStore.setState({
        goals: removeItem(state.goals, oldRow.id, (g) => g.id),
      });
    }
  }
}

function handleValueChange(payload: RealtimePayload): void {
  const state = useGoalsStore.getState();

  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const value = valueFromRow(payload.new as ValueRow);
    const merged = mergeItem(state.values, value, (v) => v.id);
    if (merged !== state.values) {
      useGoalsStore.setState({ values: merged });
    }
  } else if (payload.eventType === 'DELETE') {
    const oldRow = payload.old as { id?: string };
    if (oldRow.id) {
      useGoalsStore.setState({
        values: removeItem(state.values, oldRow.id, (v) => v.id),
      });
    }
  }
}

function handleFocusChange(payload: RealtimePayload): void {
  const state = useFocusStore.getState();

  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const focus = focusFromRow(payload.new as FocusRow);
    const merged = mergeItem(state.focuses, focus, (f) => f.id);
    if (merged !== state.focuses) {
      useFocusStore.setState({ focuses: merged });
    }
  } else if (payload.eventType === 'DELETE') {
    const oldRow = payload.old as { id?: string };
    if (oldRow.id) {
      useFocusStore.setState({
        focuses: removeItem(state.focuses, oldRow.id, (f) => f.id),
      });
    }
  }
}

function handleSportChange(payload: RealtimePayload): void {
  const state = useSportStore.getState();

  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const session = sportFromRow(payload.new as SportRow);
    const merged = mergeItem(state.sessions, session, (s) => s.id);
    if (merged !== state.sessions) {
      useSportStore.setState({ sessions: merged });
    }
  } else if (payload.eventType === 'DELETE') {
    const oldRow = payload.old as { id?: string };
    if (oldRow.id) {
      useSportStore.setState({
        sessions: removeItem(state.sessions, oldRow.id, (s) => s.id),
      });
    }
  }
}

function handleDayStateChange(payload: RealtimePayload): void {
  const state = useBoardStore.getState();

  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const dayState = dayStateFromRow(payload.new as DayStateRow);
    const merged = mergeItem(state.dayStates, dayState, (d) => d.date);
    if (merged !== state.dayStates) {
      useBoardStore.setState({ dayStates: merged });
    }
  } else if (payload.eventType === 'DELETE') {
    const oldRow = payload.old as { date?: string };
    if (oldRow.date) {
      useBoardStore.setState({
        dayStates: removeItem(state.dayStates, oldRow.date, (d) => d.date),
      });
    }
  }
}

function handlePomodoroChange(payload: RealtimePayload): void {
  const state = usePomodoroStore.getState();

  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const session = pomodoroFromRow(payload.new as PomodoroRow);
    const merged = mergeItem(state.sessions, session, (s) => s.id);
    if (merged !== state.sessions) {
      usePomodoroStore.setState({ sessions: merged });
    }
  } else if (payload.eventType === 'DELETE') {
    const oldRow = payload.old as { id?: string };
    if (oldRow.id) {
      usePomodoroStore.setState({
        sessions: removeItem(state.sessions, oldRow.id, (s) => s.id),
      });
    }
  }
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
      { event: '*', schema: 'public', table: 'sport_sessions' },
      handleSportChange,
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
