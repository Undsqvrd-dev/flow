import {
  CHECKLIST_REPAIR_ATTEMPTS,
  checklistRepairsPending,
  claimChecklistRepairs,
  clearChecklistRepair,
} from '@/lib/checklist';
import { syncEnabled } from '@/lib/db/enabled';
import {
  createRowQueue,
  TEXT_SYNC_DEBOUNCE_MS,
  type RowQueue,
  type WriteResult,
} from '@/lib/db/rowQueue';
import { writeVersioned } from '@/lib/db/versionedWrite';
import {
  dayStateToRow,
  focusToRow,
  goalToRow,
  pomodoroToRow,
  sportToRow,
  taskFromRow,
  taskToRow,
  goalFromRow,
  valueFromRow,
  valueToRow,
  focusFromRow,
  sportFromRow,
  dayStateFromRow,
  pomodoroFromRow,
  type DayStateRow,
  type FocusRow,
  type GoalRow,
  type PomodoroRow,
  type SportRow,
  type TaskRow,
  type ValueRow,
} from '@/lib/supabase/mappers';
import type { DayState, Focus, Goal, PomodoroSession, SportSession, Task, Value } from '@/lib/types';

function asRow(value: object): Record<string, unknown> {
  return { ...(value as Record<string, unknown>) };
}

function replaceBy<T>(
  items: T[],
  id: string,
  server: T | null,
  getId: (item: T) => string,
): T[] {
  if (!server) return items.filter((item) => getId(item) !== id);
  let found = false;
  const next = items.map((item) => {
    if (getId(item) !== id) return item;
    found = true;
    return server;
  });
  return found ? next : [...next, server];
}

function bindQueue<T extends { updatedAt: string }>(options: {
  getId: (item: T) => string;
  getList: () => Promise<T[]>;
  setList: (items: T[]) => Promise<void>;
  write: (item: T, baseUpdatedAt: string | null) => Promise<WriteResult<T>>;
  afterSettle?: () => void;
}): RowQueue {
  return createRowQueue({
    debounceMs: TEXT_SYNC_DEBOUNCE_MS,
    getCurrent: async (id) => (await options.getList()).find((item) => options.getId(item) === id),
    write: options.write,
    onAck: async (id, sentUpdatedAt, server) => {
      const list = await options.getList();
      await options.setList(
        list.map((item) =>
          options.getId(item) === id && item.updatedAt === sentUpdatedAt
            ? { ...item, updatedAt: server.updatedAt }
            : item,
        ),
      );
      options.afterSettle?.();
    },
    onConflict: async (id, server) => {
      const list = await options.getList();
      await options.setList(replaceBy(list, id, server, options.getId));
      options.afterSettle?.();
    },
  });
}

function scheduleChecklistRepair(): void {
  setTimeout(() => persistChecklistRepairs(), 0);
}

const taskQueue = bindQueue<Task>({
  getId: (task) => task.id,
  getList: async () => (await import('@/stores/useBoardStore')).useBoardStore.getState().tasks,
  setList: async (tasks) => {
    (await import('@/stores/useBoardStore')).useBoardStore.setState({ tasks });
  },
  afterSettle: scheduleChecklistRepair,
  write: async (task, baseUpdatedAt) => {
    try {
      return await writeVersioned({
        table: 'tasks',
        key: 'id',
        id: task.id,
        row: asRow(taskToRow(task)),
        baseUpdatedAt,
        ifMissing: 'remove',
        parse: (row) => taskFromRow(row as unknown as TaskRow),
      });
    } catch (err) {
      scheduleChecklistRepair();
      throw err;
    }
  },
});

const goalQueue = bindQueue<Goal>({
  getId: (goal) => goal.id,
  getList: async () => (await import('@/stores/useGoalsStore')).useGoalsStore.getState().goals,
  setList: async (goals) => {
    (await import('@/stores/useGoalsStore')).useGoalsStore.setState({ goals });
  },
  write: (goal, baseUpdatedAt) =>
    writeVersioned({
      table: 'goals',
      key: 'id',
      id: goal.id,
      row: asRow(goalToRow(goal)),
      baseUpdatedAt,
      ifMissing: 'remove',
      parse: (row) => goalFromRow(row as unknown as GoalRow),
    }),
});

const valueQueue = bindQueue<Value>({
  getId: (value) => value.id,
  getList: async () => (await import('@/stores/useGoalsStore')).useGoalsStore.getState().values,
  setList: async (values) => {
    (await import('@/stores/useGoalsStore')).useGoalsStore.setState({ values });
  },
  write: (value, baseUpdatedAt) =>
    writeVersioned({
      table: 'flow_values',
      key: 'id',
      id: value.id,
      row: asRow(valueToRow(value)),
      baseUpdatedAt,
      ifMissing: 'remove',
      parse: (row) => valueFromRow(row as unknown as ValueRow),
    }),
});

const focusQueue = bindQueue<Focus>({
  getId: (focus) => focus.id,
  getList: async () => (await import('@/stores/useFocusStore')).useFocusStore.getState().focuses,
  setList: async (focuses) => {
    (await import('@/stores/useFocusStore')).useFocusStore.setState({ focuses });
  },
  write: (focus, baseUpdatedAt) =>
    writeVersioned({
      table: 'focus',
      key: 'id',
      id: focus.id,
      row: asRow(focusToRow(focus)),
      baseUpdatedAt,
      ifMissing: 'remove',
      parse: (row) => focusFromRow(row as unknown as FocusRow),
    }),
});

const sportQueue = bindQueue<SportSession>({
  getId: (session) => session.id,
  getList: async () => (await import('@/stores/useSportStore')).useSportStore.getState().sessions,
  setList: async (sessions) => {
    (await import('@/stores/useSportStore')).useSportStore.setState({ sessions });
  },
  write: (session, baseUpdatedAt) =>
    writeVersioned({
      table: 'sport_sessions',
      key: 'id',
      id: session.id,
      row: asRow(sportToRow(session)),
      baseUpdatedAt,
      ifMissing: 'remove',
      parse: (row) => sportFromRow(row as unknown as SportRow),
    }),
});

const dayQueue = bindQueue<DayState>({
  getId: (state) => state.date,
  getList: async () => (await import('@/stores/useBoardStore')).useBoardStore.getState().dayStates,
  setList: async (dayStates) => {
    (await import('@/stores/useBoardStore')).useBoardStore.setState({ dayStates });
  },
  write: (state, baseUpdatedAt) =>
    writeVersioned({
      table: 'day_states',
      key: 'date',
      id: state.date,
      row: asRow(dayStateToRow(state)),
      baseUpdatedAt,
      ifMissing: 'remove',
      parse: (row) => dayStateFromRow(row as unknown as DayStateRow),
    }),
});

const pomodoroQueue = bindQueue<PomodoroSession>({
  getId: (session) => session.id,
  getList: async () => (await import('@/stores/usePomodoroStore')).usePomodoroStore.getState().sessions,
  setList: async (sessions) => {
    (await import('@/stores/usePomodoroStore')).usePomodoroStore.setState({ sessions });
  },
  write: (session, baseUpdatedAt) =>
    writeVersioned({
      table: 'pomodoro_sessions',
      key: 'id',
      id: session.id,
      row: asRow(pomodoroToRow(session)),
      baseUpdatedAt,
      ifMissing: 'remove',
      parse: (row) => pomodoroFromRow(row as unknown as PomodoroRow),
    }),
});

function enqueue<T extends { updatedAt: string }>(
  queue: RowQueue,
  items: readonly T[],
  previous: readonly T[],
  getId: (item: T) => string,
  rollback: () => void,
): void {
  if (!syncEnabled()) return;
  const bases = new Map(previous.map((item) => [getId(item), item.updatedAt]));
  for (const item of items) {
    const id = getId(item);
    queue.kick(id, bases.get(id) ?? null, rollback);
  }
}

export function enqueueTasks(tasks: readonly Task[], previous: readonly Task[], rollback: () => void): void {
  enqueue(taskQueue, tasks, previous, (task) => task.id, rollback);
}

let checklistRepairQueued = false;

/**
 * Schrijft checklist-id's die we lokaal hebben aangevuld.
 * De base blijft de `updatedAt` die de client al kende, zodat een nieuwere
 * serverrij deze reparatie nog steeds weigert.
 */
export function persistChecklistRepairs(): void {
  if (!syncEnabled()) return;
  if (checklistRepairsPending().size === 0 || checklistRepairQueued) return;
  checklistRepairQueued = true;
  void (async () => {
    try {
      const { useBoardStore } = await import('@/stores/useBoardStore');
      const ids = claimChecklistRepairs(taskQueue.dirtyIds(), CHECKLIST_REPAIR_ATTEMPTS);
      if (!ids.length) return;
      const tasks = useBoardStore.getState().tasks;
      const byId = new Map(tasks.map((task) => [task.id, task]));
      const todo: Task[] = [];
      for (const id of ids) {
        const task = byId.get(id);
        if (!task) {
          clearChecklistRepair(id);
          continue;
        }
        todo.push(task);
      }
      if (!todo.length) return;
      enqueueTasks(todo, tasks, () => {});
    } finally {
      checklistRepairQueued = false;
    }
  })();
}

export function enqueueGoals(goals: readonly Goal[], previous: readonly Goal[], rollback: () => void): void {
  enqueue(goalQueue, goals, previous, (goal) => goal.id, rollback);
}

export function enqueueValues(values: readonly Value[], previous: readonly Value[], rollback: () => void): void {
  enqueue(valueQueue, values, previous, (value) => value.id, rollback);
}

export function enqueueFocuses(
  focuses: readonly Focus[],
  previous: readonly Focus[],
  rollback: () => void,
): void {
  enqueue(focusQueue, focuses, previous, (focus) => focus.id, rollback);
}

export function enqueueSport(
  sessions: readonly SportSession[],
  previous: readonly SportSession[],
  rollback: () => void,
): void {
  enqueue(sportQueue, sessions, previous, (session) => session.id, rollback);
}

export function enqueueDayStates(
  states: readonly DayState[],
  previous: readonly DayState[],
  rollback: () => void,
): void {
  enqueue(dayQueue, states, previous, (state) => state.date, rollback);
}

export function enqueuePomodoro(
  sessions: readonly PomodoroSession[],
  previous: readonly PomodoroSession[],
  rollback: () => void,
): void {
  enqueue(pomodoroQueue, sessions, previous, (session) => session.id, rollback);
}

export function forgetTask(id: string): void {
  taskQueue.forget(id);
}

export function forgetGoal(id: string): void {
  goalQueue.forget(id);
}

export function forgetValue(id: string): void {
  valueQueue.forget(id);
}

export function forgetSport(id: string): void {
  sportQueue.forget(id);
}

export function taskDirtyIds(): ReadonlySet<string> {
  return taskQueue.dirtyIds();
}

export function goalDirtyIds(): ReadonlySet<string> {
  return goalQueue.dirtyIds();
}

export function valueDirtyIds(): ReadonlySet<string> {
  return valueQueue.dirtyIds();
}

export function focusDirtyIds(): ReadonlySet<string> {
  return focusQueue.dirtyIds();
}

export function sportDirtyIds(): ReadonlySet<string> {
  return sportQueue.dirtyIds();
}

export function dayDirtyIds(): ReadonlySet<string> {
  return dayQueue.dirtyIds();
}

export function pomodoroDirtyIds(): ReadonlySet<string> {
  return pomodoroQueue.dirtyIds();
}

export function rememberTask(id: string, updatedAt: string): void {
  taskQueue.remember(id, updatedAt);
}

export function rememberGoal(id: string, updatedAt: string): void {
  goalQueue.remember(id, updatedAt);
}

export function rememberValue(id: string, updatedAt: string): void {
  valueQueue.remember(id, updatedAt);
}

export function rememberFocus(id: string, updatedAt: string): void {
  focusQueue.remember(id, updatedAt);
}

export function rememberSport(id: string, updatedAt: string): void {
  sportQueue.remember(id, updatedAt);
}

export function rememberDay(date: string, updatedAt: string): void {
  dayQueue.remember(date, updatedAt);
}

export function rememberPomodoro(id: string, updatedAt: string): void {
  pomodoroQueue.remember(id, updatedAt);
}

export function flushPendingSync(): void {
  taskQueue.flush();
  goalQueue.flush();
  valueQueue.flush();
  focusQueue.flush();
  sportQueue.flush();
  dayQueue.flush();
  pomodoroQueue.flush();
}

export function dirtyRetain(): {
  tasks: ReadonlySet<string>;
  goals: ReadonlySet<string>;
  values: ReadonlySet<string>;
  focuses: ReadonlySet<string>;
  sportSessions: ReadonlySet<string>;
  dayStates: ReadonlySet<string>;
  pomodoroSessions: ReadonlySet<string>;
} {
  return {
    tasks: taskQueue.dirtyIds(),
    goals: goalQueue.dirtyIds(),
    values: valueQueue.dirtyIds(),
    focuses: focusQueue.dirtyIds(),
    sportSessions: sportQueue.dirtyIds(),
    dayStates: dayQueue.dirtyIds(),
    pomodoroSessions: pomodoroQueue.dirtyIds(),
  };
}
