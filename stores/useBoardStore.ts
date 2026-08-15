'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { parseISO } from 'date-fns';
import type { DayKey, DayState, Daypart, Task } from '@/lib/types';
import {
  dayKeyFromDate,
  isBoardDayKey,
  nextCalendarDay,
  todayISO,
  weekOf,
} from '@/lib/dates';
import { nextRank, prevRank, rankBetween, RANK_STEP, uid } from '@/lib/utils';
import { QUADRANT_ORDER, quadrant } from '@/lib/priority';
import { setQuickWinBundleCache } from '@/lib/db/bundleCache';
import {
  syncDayStates,
  syncRemoveTask,
  syncRemoveTasks,
  syncSettingsData,
  syncTasks,
} from '@/lib/db/storeSync';
import { useSettingsStore } from '@/stores/useSettingsStore';

export type ColumnSortBy = 'priority' | 'labels' | 'estimate';

type SortSnapshotEntry = { id: string; rank: number; daypart: Daypart | null };

export interface NewTaskInput {
  title: string;
  dayKey?: DayKey;
  daypart?: Daypart | null;
  weekOf?: string;
  description?: string | null;
  goalId?: string | null;
  estimateMin?: number | null;
  labels?: string[];
  dueDate?: string | null;
  /** 'start' = bovenaan de sectie. Default: onderaan. */
  position?: 'start' | 'end';
  /** Voeg in vóór deze taak (heeft voorrang op position). */
  insertBeforeId?: string;
}

interface BoardState {
  tasks: Task[];
  dayStates: DayState[];
  /** Bundelsleutels `weekOf:dayKey` — korte taken van die dag zitten in QuickWin's. */
  quickWinBundles: string[];
  /** Oorspronkelijke volgorde per kolom vóór sorteren (`weekOf:dayKey`). */
  sortSnapshots: Record<string, SortSnapshotEntry[]>;

  addTask: (input: NewTaskInput) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  duplicateTask: (id: string) => void;
  toggleDone: (id: string) => void;
  /** Verplaats naar kolom/dagdeel; `targetWeekOf` voor kalenderdagen (default: huidige week). */
  moveTask: (
    id: string,
    dayKey: DayKey,
    daypart: Daypart | null,
    index: number,
    targetWeekOf?: string,
  ) => void;
  /** Verplaats alle QuickWin-taken van een dagbundel naar een andere dag. */
  moveQuickWinBundle: (
    fromDayKey: DayKey,
    fromWeekOf: string,
    toDayKey: DayKey,
    toWeekOf: string,
  ) => void;
  moveRank: (id: string, direction: -1 | 1) => void;
  /** Sorteer open taken in een kolom. */
  sortColumn: (dayKey: DayKey, by: ColumnSortBy, columnWeekOf?: string) => void;
  /** Herstel volgorde van vóór sorteren. */
  clearColumnSort: (dayKey: DayKey, columnWeekOf?: string) => void;
  sortColumnByPriority: (dayKey: DayKey, columnWeekOf?: string) => void;
  /** Verplaats alle open taken van deze kalenderdatum naar morgen. */
  moveAllToTomorrow: (dateISO: string) => void;
  clearColumn: (dayKey: DayKey, columnWeekOf?: string) => void;

  closeDay: (date: string, reflection?: string | null) => void;
  reopenDay: (date: string) => void;

  enableQuickWinBundle: (dayKey: DayKey, columnWeekOf?: string) => void;
  disableQuickWinBundle: (dayKey: DayKey, columnWeekOf?: string) => void;

  /** Weekrollover: sticky borddagen blijven; overige open taken vorige weken → algemeen. */
  rollover: () => void;
}

export function quickWinBundleKey(dayKey: DayKey, week: string = weekOf()): string {
  return `${week}:${dayKey}`;
}

function sameSection(
  t: Task,
  dayKey: DayKey,
  daypart: Daypart | null,
  columnWeekOf?: string,
): boolean {
  if (t.dayKey !== dayKey || t.daypart !== daypart) return false;
  if (isBoardDayKey(dayKey) && columnWeekOf) return t.weekOf === columnWeekOf;
  return true;
}

function migrateTasks(tasks: Task[]): Task[] {
  return tasks.map((t) =>
    (t.dayKey as string) === 'weekend' ? { ...t, dayKey: 'za' as DayKey } : t,
  );
}

/** Oude sleutels `week:dayKey:daypart` → `week:dayKey`; weekend → za. */
function migrateBundles(bundles: string[]): string[] {
  const next = new Set<string>();
  for (const raw of bundles) {
    const key = raw.replace(':weekend:', ':za:');
    const parts = key.split(':');
    // week:dayKey of week:dayKey:daypart
    if (parts.length >= 2) next.add(`${parts[0]}:${parts[1]}`);
  }
  return [...next];
}

function resolveRank(
  input: NewTaskInput,
  siblings: Task[],
): number {
  const sorted = [...siblings].sort((a, b) => a.rank - b.rank);
  if (input.insertBeforeId) {
    const idx = sorted.findIndex((t) => t.id === input.insertBeforeId);
    if (idx >= 0) {
      const before = idx > 0 ? sorted[idx - 1].rank : null;
      const after = sorted[idx].rank;
      return rankBetween(before, after);
    }
  }
  const ranks = sorted.map((t) => t.rank);
  return input.position === 'start' ? prevRank(ranks) : nextRank(ranks);
}

function makeTask(input: NewTaskInput, siblings: Task[]): Task {
  const now = new Date().toISOString();
  const dayKey = input.dayKey ?? 'algemeen';
  return {
    id: uid(),
    title: input.title,
    description: input.description ?? null,
    dayKey,
    daypart: input.daypart ?? null,
    rank: resolveRank(input, siblings),
    goalId: input.goalId ?? null,
    urgent: null,
    important: null,
    estimateMin: input.estimateMin ?? null,
    labels: input.labels ?? [],
    done: false,
    completedAt: null,
    dueDate: input.dueDate ?? null,
    checklist: [],
    comments: [],
    weekOf: input.weekOf ?? weekOf(),
    createdAt: now,
    updatedAt: now,
  };
}

const touch = (t: Task): Task => ({ ...t, updatedAt: new Date().toISOString() });

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      tasks: [],
      dayStates: [],
      quickWinBundles: [],
      sortSnapshots: {},

      addTask: (input) => {
        const dayKey = input.dayKey ?? 'algemeen';
        const daypart = input.daypart ?? null;
        const columnWeek = input.weekOf ?? weekOf();
        const prev = get().tasks;
        const siblings = prev.filter((t) =>
          sameSection(t, dayKey, daypart, isBoardDayKey(dayKey) ? columnWeek : undefined),
        );
        const task = makeTask(input, siblings);
        set({ tasks: [...prev, task] });
        syncTasks([task], () => set({ tasks: prev }));
        return task;
      },

      updateTask: (id, patch) => {
        const prev = get().tasks;
        const next = prev.map((t) => (t.id === id ? touch({ ...t, ...patch }) : t));
        set({ tasks: next });
        const updated = next.find((t) => t.id === id);
        if (updated) syncTasks([updated], () => set({ tasks: prev }));
      },

      removeTask: (id) => {
        const prev = get().tasks;
        set({ tasks: prev.filter((t) => t.id !== id) });
        syncRemoveTask(id, () => set({ tasks: prev }));
      },

      duplicateTask: (id) => {
        const src = get().tasks.find((t) => t.id === id);
        if (!src) return;
        const prev = get().tasks;
        const now = new Date().toISOString();
        const copy: Task = {
          ...src,
          id: uid(),
          title: `${src.title} (kopie)`,
          done: false,
          completedAt: null,
          rank: src.rank + RANK_STEP / 2,
          checklist: src.checklist.map((c) => ({ ...c, id: uid(), done: false })),
          comments: [],
          createdAt: now,
          updatedAt: now,
        };
        set({ tasks: [...prev, copy] });
        syncTasks([copy], () => set({ tasks: prev }));
      },

      toggleDone: (id) => {
        const prev = get().tasks;
        const next = prev.map((t) =>
          t.id === id
            ? touch({
                ...t,
                done: !t.done,
                completedAt: !t.done ? new Date().toISOString() : null,
              })
            : t,
        );
        set({ tasks: next });
        const updated = next.find((t) => t.id === id);
        if (updated) syncTasks([updated], () => set({ tasks: prev }));
      },

      moveTask: (id, dayKey, daypart, index, targetWeekOf) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return;
        const prev = state.tasks;
        const week = targetWeekOf ?? weekOf();
        const flatBoardDay = isBoardDayKey(dayKey);
        const siblings = state.tasks
          .filter((t) => {
            if (t.id === id || t.done || t.dayKey !== dayKey) return false;
            if (flatBoardDay) return t.weekOf === week;
            return t.daypart === daypart;
          })
          .sort((a, b) => a.rank - b.rank);
        const ordered = [...siblings];
        const clamped = Math.max(0, Math.min(index, ordered.length));
        ordered.splice(clamped, 0, task);
        const targetPart = flatBoardDay ? null : daypart;
        const patches = new Map<string, Partial<Task>>();
        ordered.forEach((t, i) => {
          patches.set(t.id, {
            rank: (i + 1) * RANK_STEP,
            daypart: targetPart,
            ...(t.id === id
              ? {
                  dayKey,
                  weekOf: flatBoardDay ? week : weekOf(),
                }
              : {}),
          });
        });
        const next = prev.map((t) =>
          patches.has(t.id) ? touch({ ...t, ...patches.get(t.id) }) : t,
        );
        set({ tasks: next });
        const changed = next.filter((t) => patches.has(t.id));
        syncTasks(changed, () => set({ tasks: prev }));
      },

      moveQuickWinBundle: (fromDayKey, fromWeekOf, toDayKey, toWeekOf) => {
        if (toDayKey === 'gedaan' || toDayKey === 'dump') return;
        if (fromDayKey === toDayKey && fromWeekOf === toWeekOf) return;

        const threshold = useSettingsStore.getState().settings.quickWinThresholdMin;
        const state = get();
        const moving = quickWinsForDay(state.tasks, fromDayKey, threshold, fromWeekOf);
        if (moving.length === 0) return;

        const prevTasks = state.tasks;
        const prevBundles = state.quickWinBundles;
        const moveIds = new Set(moving.map((t) => t.id));
        const targetWeek = isBoardDayKey(toDayKey) ? toWeekOf : weekOf();

        const existingOnTarget = prevTasks
          .filter(
            (t) =>
              !t.done &&
              !moveIds.has(t.id) &&
              sameSection(t, toDayKey, null, isBoardDayKey(toDayKey) ? targetWeek : undefined),
          )
          .sort((a, b) => a.rank - b.rank);

        let rank = existingOnTarget.length
          ? Math.max(...existingOnTarget.map((t) => t.rank))
          : 0;

        const nextTasks = prevTasks.map((t) => {
          if (!moveIds.has(t.id)) return t;
          rank += RANK_STEP;
          return touch({
            ...t,
            dayKey: toDayKey,
            daypart: null,
            weekOf: targetWeek,
            rank,
          });
        });

        const fromKey = quickWinBundleKey(fromDayKey, fromWeekOf);
        const toKey = quickWinBundleKey(toDayKey, targetWeek);
        let nextBundles = prevBundles.filter((k) => k !== fromKey);
        if (!nextBundles.includes(toKey)) nextBundles = [...nextBundles, toKey];

        set({ tasks: nextTasks, quickWinBundles: nextBundles });
        setQuickWinBundleCache(nextBundles);

        const changed = nextTasks.filter((t) => moveIds.has(t.id));
        syncTasks(changed, () => {
          set({ tasks: prevTasks, quickWinBundles: prevBundles });
          setQuickWinBundleCache(prevBundles);
        });
        syncSettingsData(useSettingsStore.getState().settings, nextBundles, () => {
          set({ quickWinBundles: prevBundles });
          setQuickWinBundleCache(prevBundles);
        });
      },

      moveRank: (id, direction) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === id);
        if (!task || task.done) return;

        const section = state.tasks
          .filter((t) => {
            if (t.done || t.dayKey !== task.dayKey) return false;
            if (isBoardDayKey(task.dayKey)) return t.weekOf === task.weekOf;
            return true;
          })
          .sort((a, b) => a.rank - b.rank);
        const i = section.findIndex((t) => t.id === id);
        const j = i + direction;

        if (j < 0 || j >= section.length) return;

        const other = section[j];
        const prev = state.tasks;
        const next = prev.map((t) => {
          if (t.id === task.id) return touch({ ...t, rank: other.rank, daypart: null });
          if (t.id === other.id) return touch({ ...t, rank: task.rank, daypart: null });
          return t;
        });
        set({ tasks: next });
        syncTasks(
          next.filter((t) => t.id === task.id || t.id === other.id),
          () => set({ tasks: prev }),
        );
      },

      sortColumn: (dayKey, by, columnWeekOf) => {
        const state = get();
        const week = columnWeekOf ?? weekOf();
        const snapKey = quickWinBundleKey(dayKey, week);
        const section = state.tasks
          .filter((t) => {
            if (t.done || t.dayKey !== dayKey) return false;
            if (isBoardDayKey(dayKey)) return t.weekOf === week;
            return true;
          })
          .sort((a, b) => a.rank - b.rank);

        const labelDefs = useSettingsStore.getState().settings.labels ?? [];
        const labelName = (id: string) =>
          labelDefs.find((l) => l.id === id)?.name?.toLowerCase() ?? id.toLowerCase();

        const ordered = [...section].sort((a, b) => {
          if (by === 'priority') {
            const au = a.urgent ? 0 : 1;
            const bu = b.urgent ? 0 : 1;
            if (au !== bu) return au - bu;
            const qa = quadrant(a);
            const qb = quadrant(b);
            if (qa === null && qb === null) return a.rank - b.rank;
            if (qa === null) return 1;
            if (qb === null) return -1;
            const oa = QUADRANT_ORDER[qa];
            const ob = QUADRANT_ORDER[qb];
            return oa !== ob ? oa - ob : a.rank - b.rank;
          }

          if (by === 'labels') {
            const aHas = a.labels.length > 0 ? 0 : 1;
            const bHas = b.labels.length > 0 ? 0 : 1;
            if (aHas !== bHas) return aHas - bHas;
            const aKey = [...a.labels].map(labelName).sort()[0] ?? '';
            const bKey = [...b.labels].map(labelName).sort()[0] ?? '';
            const cmp = aKey.localeCompare(bKey, 'nl');
            return cmp !== 0 ? cmp : a.rank - b.rank;
          }

          // estimate — kortste eerst; zonder schatting onderaan
          const ae = a.estimateMin;
          const be = b.estimateMin;
          if (ae === null && be === null) return a.rank - b.rank;
          if (ae === null) return 1;
          if (be === null) return -1;
          return ae !== be ? ae - be : a.rank - b.rank;
        });

        const patches = new Map<string, { rank: number; daypart: null }>();
        ordered.forEach((t, i) => patches.set(t.id, { rank: (i + 1) * RANK_STEP, daypart: null }));

        const prev = state.tasks;
        const next = prev.map((t) =>
          patches.has(t.id) ? touch({ ...t, ...patches.get(t.id) }) : t,
        );

        const sortSnapshots = { ...state.sortSnapshots };
        if (!sortSnapshots[snapKey]) {
          sortSnapshots[snapKey] = section.map((t) => ({
            id: t.id,
            rank: t.rank,
            daypart: t.daypart,
          }));
        }

        set({ tasks: next, sortSnapshots });
        syncTasks(
          next.filter((t) => patches.has(t.id)),
          () => set({ tasks: prev, sortSnapshots: state.sortSnapshots }),
        );
      },

      clearColumnSort: (dayKey, columnWeekOf) => {
        const state = get();
        const week = columnWeekOf ?? weekOf();
        const snapKey = quickWinBundleKey(dayKey, week);
        const snap = state.sortSnapshots[snapKey];
        if (!snap?.length) return;

        const byId = new Map(snap.map((e) => [e.id, e]));
        const prev = state.tasks;
        const next = prev.map((t) => {
          const entry = byId.get(t.id);
          if (!entry) return t;
          return touch({ ...t, rank: entry.rank, daypart: entry.daypart });
        });
        const nextSnapshots = { ...state.sortSnapshots };
        delete nextSnapshots[snapKey];
        set({ tasks: next, sortSnapshots: nextSnapshots });
        syncTasks(
          next.filter((t, i) => t !== prev[i]),
          () => set({ tasks: prev, sortSnapshots: state.sortSnapshots }),
        );
      },

      sortColumnByPriority: (dayKey, columnWeekOf) => {
        get().sortColumn(dayKey, 'priority', columnWeekOf);
      },

      moveAllToTomorrow: (dateISO) => {
        const d = parseISO(dateISO);
        const fromKey = dayKeyFromDate(d);
        const fromWeek = weekOf(d);
        const nextDay = nextCalendarDay(dateISO);
        const prev = get().tasks;
        const next = prev.map((t) =>
          !t.done && t.dayKey === fromKey && t.weekOf === fromWeek
            ? touch({ ...t, dayKey: nextDay.dayKey, weekOf: nextDay.weekOf })
            : t,
        );
        set({ tasks: next });
        syncTasks(
          next.filter((t, i) => t !== prev[i]),
          () => set({ tasks: prev }),
        );
      },

      clearColumn: (dayKey, columnWeekOf) => {
        const prev = get().tasks;
        const removed = prev.filter((t) => {
          if (t.done || t.dayKey !== dayKey) return false;
          if (isBoardDayKey(dayKey) && columnWeekOf) return t.weekOf === columnWeekOf;
          return true;
        });
        const next = prev.filter((t) => !removed.includes(t));
        set({ tasks: next });
        syncRemoveTasks(
          removed.map((t) => t.id),
          () => set({ tasks: prev }),
        );
      },

      closeDay: (date, reflection = null) => {
        const prev = get().dayStates;
        const state = {
          date,
          closed: true,
          closedAt: new Date().toISOString(),
          reflection,
        };
        set({ dayStates: [...prev.filter((d) => d.date !== date), state] });
        syncDayStates([state], () => set({ dayStates: prev }));
      },

      reopenDay: (date) => {
        const prev = get().dayStates;
        const next = prev.map((d) =>
          d.date === date ? { ...d, closed: false, closedAt: null } : d,
        );
        set({ dayStates: next });
        const updated = next.find((d) => d.date === date);
        if (updated) syncDayStates([updated], () => set({ dayStates: prev }));
      },

      enableQuickWinBundle: (dayKey, columnWeekOf) => {
        const key = quickWinBundleKey(dayKey, columnWeekOf ?? weekOf());
        const prev = get().quickWinBundles;
        if (prev.includes(key)) return;
        const next = [...prev, key];
        set({ quickWinBundles: next });
        setQuickWinBundleCache(next);
        syncSettingsData(useSettingsStore.getState().settings, next, () => {
          set({ quickWinBundles: prev });
          setQuickWinBundleCache(prev);
        });
      },

      disableQuickWinBundle: (dayKey, columnWeekOf) => {
        const key = quickWinBundleKey(dayKey, columnWeekOf ?? weekOf());
        const prev = get().quickWinBundles;
        const next = prev.filter((k) => k !== key);
        set({ quickWinBundles: next });
        setQuickWinBundleCache(next);
        syncSettingsData(useSettingsStore.getState().settings, next, () => {
          set({ quickWinBundles: prev });
          setQuickWinBundleCache(prev);
        });
      },

      rollover: () => {
        const current = weekOf();
        const prev = get().tasks;
        const next = prev.map((t) => {
          if (t.weekOf >= current) return t;
          if (t.done) return t;
          // Borddagen blijven sticky zichtbaar tot leeg.
          if (isBoardDayKey(t.dayKey)) return t;
          if (t.dayKey === 'algemeen') return { ...t, weekOf: current };
          return touch({
            ...t,
            dayKey: 'algemeen',
            daypart: null,
            weekOf: current,
            fromPreviousWeek: true,
          });
        });
        set({ tasks: next });
        const changed = next.filter((t, i) => t !== prev[i]);
        if (changed.length) syncTasks(changed, () => set({ tasks: prev }));
      },
    }),
    {
      name: 'flow-board',
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BoardState>;
        return {
          ...current,
          ...p,
          tasks: migrateTasks(p.tasks ?? current.tasks),
          dayStates: p.dayStates ?? current.dayStates,
          quickWinBundles: migrateBundles(p.quickWinBundles ?? []),
          sortSnapshots: p.sortSnapshots ?? {},
        };
      },
      partialize: (state) => ({
        tasks: state.tasks,
        dayStates: state.dayStates,
        quickWinBundles: state.quickWinBundles,
        sortSnapshots: state.sortSnapshots,
      }),
    },
  ),
);

/* ——— selectors (pure functies, geen hooks) ——— */

export function openTasksFor(
  tasks: Task[],
  dayKey: DayKey,
  daypart: Daypart | null,
  columnWeekOf?: string,
): Task[] {
  return tasks
    .filter(
      (t) =>
        !t.done &&
        sameSection(t, dayKey, daypart, isBoardDayKey(dayKey) ? columnWeekOf : undefined),
    )
    .sort((a, b) => a.rank - b.rank);
}

export function openTasksForDay(
  tasks: Task[],
  dayKey: DayKey,
  columnWeekOf?: string,
): Task[] {
  return tasks
    .filter((t) => {
      if (t.done || t.dayKey !== dayKey) return false;
      if (isBoardDayKey(dayKey) && columnWeekOf) return t.weekOf === columnWeekOf;
      return true;
    })
    .sort((a, b) => a.rank - b.rank);
}

/** Open taken voor een kalenderdatum (dayKey + weekOf van die datum). */
export function openTasksForDate(
  tasks: Task[],
  dateISO: string,
  daypart?: Daypart | null,
): Task[] {
  const d = parseISO(dateISO);
  const key = dayKeyFromDate(d);
  const w = weekOf(d);
  return tasks
    .filter((t) => {
      if (t.done || t.dayKey !== key || t.weekOf !== w) return false;
      if (daypart !== undefined) return t.daypart === daypart;
      return true;
    })
    .sort((a, b) => a.rank - b.rank);
}

/** De kolom 'Gedaan': deze week afgeronde taken (op `completedAt`), nieuwste eerst. */
export function doneTasksThisWeek(tasks: Task[], currentWeek: string = weekOf()): Task[] {
  return tasks
    .filter((t) => {
      if (!t.done) return false;
      // Afrondingsweek telt: sticky/vorige of volgende week-kolommen blijven zo zichtbaar.
      if (t.completedAt) return weekOf(new Date(t.completedAt)) === currentWeek;
      return t.weekOf === currentWeek;
    })
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

export function dayStateFor(dayStates: DayState[], date: string): DayState | undefined {
  return dayStates.find((d) => d.date === date);
}

export function tasksDoneOnDate(tasks: Task[], dateISO: string): Task[] {
  return tasks.filter((t) => t.done && t.completedAt?.slice(0, 10) === dateISO);
}

export function todayOpenCount(tasks: Task[], key: DayKey = 'algemeen'): number {
  return tasks.filter((t) => !t.done && t.dayKey === key).length;
}

export function isQuickWin(t: Task, thresholdMin: number): boolean {
  return !t.done && t.estimateMin !== null && t.estimateMin <= thresholdMin;
}

/** Alle open korte taken van een dag (alle dagdelen), voor het QuickWin-blok. */
export function quickWinsForDay(
  tasks: Task[],
  dayKey: DayKey,
  thresholdMin: number,
  columnWeekOf?: string,
): Task[] {
  const week = columnWeekOf ?? weekOf();
  return tasks
    .filter(
      (t) =>
        t.dayKey === dayKey &&
        (!isBoardDayKey(dayKey) || t.weekOf === week) &&
        isQuickWin(t, thresholdMin),
    )
    .sort((a, b) => a.rank - b.rank);
}

export function isQuickWinBundled(
  bundles: string[],
  dayKey: DayKey,
  columnWeekOf?: string,
): boolean {
  return bundles.includes(quickWinBundleKey(dayKey, columnWeekOf ?? weekOf()));
}

export { todayISO };
