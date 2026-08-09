import type {
  DayState,
  Focus,
  Goal,
  GoalHorizon,
  GoalScope,
  PomodoroSession,
  Settings,
  SportSession,
  Task,
  Value,
} from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  day_key: string;
  daypart: string | null;
  rank: number;
  goal_id: string | null;
  urgent: boolean | null;
  important: boolean | null;
  estimate_min: number | null;
  labels: string[];
  done: boolean;
  completed_at: string | null;
  due_date: string | null;
  checklist: Task['checklist'];
  comments: Task['comments'];
  from_previous_week: boolean;
  week_of: string;
  created_at: string;
  updated_at: string;
};

export type GoalRow = {
  id: string;
  title: string;
  scope: string;
  horizon: string;
  color: string;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  deadline: string | null;
  active: boolean;
  rank: number;
};

export type ValueRow = {
  id: string;
  text: string;
  rank: number;
};

export type FocusRow = {
  id: string;
  week_of: string;
  goal_id: string | null;
  headline: string | null;
  day_focus_task_id: string | null;
  day_focus_note: string | null;
  day_focus_date: string | null;
  updated_at: string;
};

export type SportRow = {
  id: string;
  date: string;
  type: string;
  duration_min: number;
  intensity: number;
  note: string | null;
};

export type DayStateRow = {
  date: string;
  closed: boolean;
  closed_at: string | null;
  reflection: string | null;
};

export type PomodoroRow = {
  id: string;
  task_id: string | null;
  mode: string;
  planned_min: number;
  actual_min: number;
  started_at: string;
  completed: boolean;
};

export type SettingsRow = {
  user_id: string;
  data: Record<string, unknown>;
};

export type SettingsPayload = Settings & { quickWinBundles?: string[] };

export function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dayKey: row.day_key as Task['dayKey'],
    daypart: row.daypart as Task['daypart'],
    rank: row.rank,
    goalId: row.goal_id,
    urgent: row.urgent,
    important: row.important,
    estimateMin: row.estimate_min,
    labels: row.labels ?? [],
    done: row.done,
    completedAt: row.completed_at,
    dueDate: row.due_date,
    checklist: row.checklist ?? [],
    comments: row.comments ?? [],
    fromPreviousWeek: row.from_previous_week,
    weekOf: row.week_of,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function taskToRow(task: Task): Omit<TaskRow, never> {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    day_key: task.dayKey,
    daypart: task.daypart,
    rank: task.rank,
    goal_id: task.goalId,
    urgent: task.urgent,
    important: task.important,
    estimate_min: task.estimateMin,
    labels: task.labels,
    done: task.done,
    completed_at: task.completedAt,
    due_date: task.dueDate,
    checklist: task.checklist,
    comments: task.comments,
    from_previous_week: Boolean(task.fromPreviousWeek),
    week_of: task.weekOf,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

export function goalFromRow(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    scope: row.scope as GoalScope,
    horizon: (row.horizon ?? 'jaar') as GoalHorizon,
    color: row.color,
    targetValue: row.target_value === null ? null : Number(row.target_value),
    currentValue: Number(row.current_value),
    unit: row.unit,
    deadline: row.deadline,
    active: row.active,
    rank: row.rank,
  };
}

export function goalToRow(goal: Goal) {
  return {
    id: goal.id,
    title: goal.title,
    scope: goal.scope,
    horizon: goal.horizon,
    color: goal.color,
    target_value: goal.targetValue,
    current_value: goal.currentValue,
    unit: goal.unit,
    deadline: goal.deadline,
    active: goal.active,
    rank: goal.rank,
  };
}

export function valueFromRow(row: ValueRow): Value {
  return { id: row.id, text: row.text, rank: row.rank };
}

export function valueToRow(value: Value) {
  return { id: value.id, text: value.text, rank: value.rank };
}

export function focusFromRow(row: FocusRow): Focus {
  return {
    id: row.id,
    weekOf: row.week_of,
    goalId: row.goal_id,
    headline: row.headline,
    dayFocusTaskId: row.day_focus_task_id,
    dayFocusNote: row.day_focus_note,
    dayFocusDate: row.day_focus_date,
    updatedAt: row.updated_at,
  };
}

export function focusToRow(focus: Focus) {
  return {
    id: focus.id,
    week_of: focus.weekOf,
    goal_id: focus.goalId,
    headline: focus.headline,
    day_focus_task_id: focus.dayFocusTaskId,
    day_focus_note: focus.dayFocusNote,
    day_focus_date: focus.dayFocusDate,
    updated_at: focus.updatedAt,
  };
}

export function sportFromRow(row: SportRow): SportSession {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    durationMin: row.duration_min,
    intensity: row.intensity as SportSession['intensity'],
    note: row.note,
  };
}

export function sportToRow(session: SportSession) {
  return {
    id: session.id,
    date: session.date,
    type: session.type,
    duration_min: session.durationMin,
    intensity: session.intensity,
    note: session.note,
  };
}

export function dayStateFromRow(row: DayStateRow): DayState {
  return {
    date: row.date,
    closed: row.closed,
    closedAt: row.closed_at,
    reflection: row.reflection,
  };
}

export function dayStateToRow(state: DayState) {
  return {
    date: state.date,
    closed: state.closed,
    closed_at: state.closedAt,
    reflection: state.reflection,
  };
}

export function pomodoroFromRow(row: PomodoroRow): PomodoroSession {
  return {
    id: row.id,
    taskId: row.task_id,
    mode: row.mode as PomodoroSession['mode'],
    plannedMin: row.planned_min,
    actualMin: row.actual_min,
    startedAt: row.started_at,
    completed: row.completed,
  };
}

export function pomodoroToRow(session: PomodoroSession) {
  return {
    id: session.id,
    task_id: session.taskId,
    mode: session.mode,
    planned_min: session.plannedMin,
    actual_min: session.actualMin,
    started_at: session.startedAt,
    completed: session.completed,
  };
}

export function settingsFromRow(data: Record<string, unknown> | null): {
  settings: Settings;
  quickWinBundles: string[];
} {
  const raw = (data ?? {}) as Partial<SettingsPayload>;
  const { quickWinBundles, ...rest } = raw;
  return {
    settings: { ...DEFAULT_SETTINGS, ...rest },
    quickWinBundles: Array.isArray(quickWinBundles) ? quickWinBundles : [],
  };
}

export function settingsToData(settings: Settings, quickWinBundles: string[]): SettingsPayload {
  return { ...settings, quickWinBundles };
}
