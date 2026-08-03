import {
  startOfWeek, addDays, format, isSameDay, parseISO, differenceInCalendarDays,
  subWeeks, getQuarter,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import type { BoardDayKey, DayKey, Daypart, GoalHorizon, Task } from './types';

/** Maandag van de week waarin `d` valt, als 'yyyy-MM-dd'. */
export function weekOf(d: Date = new Date()): string {
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function todayISO(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}

/** Dagkolommen op het bord — "Deze week" zit in het zijpaneel, niet als kolom. */
export const DAY_COLUMNS: DayKey[] = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo', 'gedaan'];
export const WEEKDAY_KEYS: BoardDayKey[] = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

const BOARD_DAY_SET = new Set<string>(WEEKDAY_KEYS);

export function isBoardDayKey(key: DayKey | string): key is BoardDayKey {
  return BOARD_DAY_SET.has(key);
}

export const DAY_LABELS: Record<DayKey, string> = {
  algemeen: 'Deze week',
  ma: 'Maandag',
  di: 'Dinsdag',
  wo: 'Woensdag',
  do: 'Donderdag',
  vr: 'Vrijdag',
  za: 'Zaterdag',
  zo: 'Zondag',
  gedaan: 'Gedaan',
  dump: 'Inspiratie',
  wachtruimte: 'Wachtruimte',
};

export const DAYPARTS: Daypart[] = ['ochtend', 'dag', 'avond'];
export const DAYPART_LABELS: Record<Daypart, string> = {
  ochtend: 'Ochtend',
  dag: 'Dag',
  avond: 'Avond',
};

/** Dynamische horizonlabels: "maart 2026", "Q1 2026", "2026". */
export function horizonLabel(horizon: GoalHorizon, d: Date = new Date()): string {
  if (horizon === 'maand') {
    return format(d, 'MMMM yyyy', { locale: nl });
  }
  if (horizon === 'kwartaal') {
    return `Q${getQuarter(d)} ${format(d, 'yyyy')}`;
  }
  return format(d, 'yyyy');
}

/** DayKey van een kalenderdatum: ma–zo. */
export function dayKeyFromDate(d: Date = new Date()): BoardDayKey {
  // getDay(): zo=0, ma=1 … za=6
  const keys: BoardDayKey[] = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  return keys[d.getDay()];
}

/** DayKey van vandaag. */
export function todayKey(d: Date = new Date()): BoardDayKey {
  return dayKeyFromDate(d);
}

/** Datum die bij een dagkolom hoort, binnen de week van `weekMonday`. */
export function dateForDayKey(key: DayKey, weekMonday: string): Date | null {
  if (!isBoardDayKey(key)) return null;
  const monday = parseISO(weekMonday);
  const offsets: Record<BoardDayKey, number> = {
    ma: 0, di: 1, wo: 2, do: 3, vr: 4, za: 5, zo: 6,
  };
  return addDays(monday, offsets[key]);
}

/** ISO-datum van een taak op een borddag (`dayKey` + `weekOf`). */
export function taskDateISO(task: Pick<Task, 'dayKey' | 'weekOf'>): string | null {
  const d = dateForDayKey(task.dayKey, task.weekOf);
  return d ? todayISO(d) : null;
}

/**
 * Rollend bord: eerdere datums met open taken (links, chronologisch),
 * daarna vandaag … vandaag+6.
 */
export function rollingBoardDates(
  tasks: Pick<Task, 'dayKey' | 'weekOf' | 'done'>[],
  from: Date = new Date(),
): string[] {
  const today = todayISO(from);
  const window: string[] = [];
  for (let i = 0; i < 7; i++) {
    window.push(todayISO(addDays(from, i)));
  }
  const windowSet = new Set(window);

  const past = new Set<string>();
  for (const t of tasks) {
    if (t.done || !isBoardDayKey(t.dayKey)) continue;
    const iso = taskDateISO(t);
    if (iso && iso < today && !windowSet.has(iso)) past.add(iso);
  }

  return [...[...past].sort(), ...window];
}

/** Volgende kalenderdag met dayKey + weekOf. */
export function nextCalendarDay(dateISO: string): {
  dayKey: BoardDayKey;
  weekOf: string;
  dateISO: string;
} {
  const next = addDays(parseISO(dateISO), 1);
  return {
    dayKey: dayKeyFromDate(next),
    weekOf: weekOf(next),
    dateISO: todayISO(next),
  };
}

/** WeekOf van de eerstkomende kalenderdag met deze DayKey (vanaf vandaag, max 7 dagen). */
export function weekOfNearestDayKey(key: BoardDayKey, from: Date = new Date()): string {
  for (let i = 0; i < 7; i++) {
    const d = addDays(from, i);
    if (dayKeyFromDate(d) === key) return weekOf(d);
  }
  return weekOf(from);
}

/** @deprecated Gebruik nextCalendarDay; houdt weekgrenzen niet correct bij. */
export function nextDayKey(key: DayKey): DayKey {
  const order: BoardDayKey[] = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
  const i = order.indexOf(key as BoardDayKey);
  if (i === -1) return 'algemeen';
  if (i === order.length - 1) return 'ma';
  return order[i + 1];
}

/** Korte datumaanduiding voor kolomkoppen: 'ma 3 aug'. */
export function shortDate(d: Date): string {
  return format(d, 'EEEEEE d MMM', { locale: nl });
}

export function longDate(d: Date): string {
  return format(d, 'EEEE d MMMM', { locale: nl });
}

export function formatTime(d: Date): string {
  return format(d, 'HH:mm');
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export function daysUntil(dateISO: string, from: Date = new Date()): number {
  return differenceInCalendarDays(parseISO(dateISO), from);
}

/** Maandagen van de laatste `n` weken, oudste eerst, inclusief de huidige week. */
export function lastWeeks(n: number, from: Date = new Date()): string[] {
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    result.push(weekOf(subWeeks(from, i)));
  }
  return result;
}

/** Alle zeven datums (ma–zo) van de week die begint op `weekMonday`. */
export function weekDates(weekMonday: string): Date[] {
  const monday = parseISO(weekMonday);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
