import { parseISO } from 'date-fns';
import { dayKeyFromDate, DAY_LABELS, WEEKDAY_KEYS } from '@/lib/dates';
import type { ChecklistItem, Daypart, LabelDef } from '@/lib/types';
import type { BoardDayKey } from '@/lib/types';

export const WEEKDAYS: BoardDayKey[] = [...WEEKDAY_KEYS];

export const PERSONAL_LABEL_ID = '5a7bacc1-875c-43f3-b2ec-a95748dcce18';

export const CLOSING_TIME_NOTE = '±20:00 · max 5 min';

export const CLOSING_CHECKLIST: ChecklistItem[] = [
  { id: 'dagafsluiting-q1', text: 'Hoe ging de dag?', done: false, rank: 1000 },
  { id: 'dagafsluiting-q2', text: 'Hoe voelde ik me vandaag en hoe voel ik me nu?', done: false, rank: 2000 },
  { id: 'dagafsluiting-q3', text: 'Waar ben je dankbaar voor?', done: false, rank: 3000 },
];

export const BUILTIN_PREFIXES = ['mediteren', 'sport', 'dagafsluiting'] as const;

export type RecurringSchedule = 'daily' | 'weekdays' | 'times_per_week';

export interface RecurringTask {
  id: string;
  title: string;
  description: string;
  checklist: ChecklistItem[];
  labelIds: string[];
  daypart: Daypart | null;
  estimateMin: number | null;
  streak: boolean;
  schedule: RecurringSchedule;
  weekdays: BoardDayKey[];
  timesPerWeek: number | null;
  rank: number;
  ritualPrefix: string;
  paused: boolean;
  builtin: boolean;
  updatedAt: string;
}

const SPREAD: BoardDayKey[][] = [
  ['wo'],
  ['ma', 'do'],
  ['ma', 'wo', 'vr'],
  ['ma', 'di', 'do', 'vr'],
  ['ma', 'di', 'wo', 'do', 'vr'],
  ['ma', 'di', 'wo', 'do', 'vr', 'za'],
  ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'],
];

const WEEKDAY_SET = new Set<string>(WEEKDAYS);

export function isWeekday(value: string): value is BoardDayKey {
  return WEEKDAY_SET.has(value);
}

/** Concrete dagen voor "N keer per week", verspreid over de week. */
export function spreadWeekdays(times: number): BoardDayKey[] {
  const n = Math.min(7, Math.max(1, Math.round(times)));
  return [...SPREAD[n - 1]];
}

export function sortWeekdays(days: readonly string[]): BoardDayKey[] {
  const picked = new Set(days.filter(isWeekday));
  return WEEKDAYS.filter((day) => picked.has(day));
}

export function activeWeekdays(task: {
  schedule: RecurringSchedule;
  weekdays: readonly BoardDayKey[];
}): BoardDayKey[] {
  if (task.schedule === 'daily') return [...WEEKDAYS];
  return sortWeekdays(task.weekdays);
}

export function routineRunsOn(
  task: { schedule: RecurringSchedule; weekdays: readonly BoardDayKey[]; paused?: boolean },
  dateISO: string,
): boolean {
  if (task.paused) return false;
  return activeWeekdays(task).includes(dayKeyFromDate(parseISO(dateISO)));
}

export function scheduleLabel(task: {
  schedule: RecurringSchedule;
  weekdays: readonly BoardDayKey[];
  timesPerWeek: number | null;
}): string {
  if (task.schedule === 'daily') return 'Elke dag';
  const days = activeWeekdays(task);
  if (task.schedule === 'times_per_week') {
    const count = task.timesPerWeek ?? days.length;
    const short = days.join(', ');
    return short ? `${count}x per week (${short})` : `${count}x per week`;
  }
  if (days.length === 0) return 'Geen dagen';
  if (days.length === 1) return `Elke ${DAY_LABELS[days[0]].toLowerCase()}`;
  const names = days.map((day) => DAY_LABELS[day].toLowerCase());
  return `Elke ${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`;
}

/** `mediteren:2026-11-19` → prefix + datum. Anders null. */
export function parseRitualKey(key: string | null | undefined): { prefix: string; date: string } | null {
  if (!key) return null;
  const match = /^(.+):(\d{4}-\d{2}-\d{2})$/.exec(key);
  if (!match) return null;
  return { prefix: match[1], date: match[2] };
}

export function ritualPrefixFromKey(key: string | null | undefined): string | null {
  return parseRitualKey(key)?.prefix ?? null;
}

/**
 * Open kaarten van `fromDate` of later die niet meer op het schema vallen.
 * Afgevinkte kaarten en oudere open kaarten blijven buiten de lijst.
 */
export function openCardsOutsideSchedule(
  tasks: readonly { id: string; done: boolean; ritualKey?: string | null }[],
  prefix: string,
  weekdays: readonly BoardDayKey[],
  fromDate: string,
): string[] {
  const allowed = new Set(weekdays);
  const ids: string[] = [];
  for (const task of tasks) {
    if (task.done) continue;
    const parsed = parseRitualKey(task.ritualKey);
    if (!parsed || parsed.prefix !== prefix || parsed.date < fromDate) continue;
    if (!allowed.has(dayKeyFromDate(parseISO(parsed.date)))) ids.push(task.id);
  }
  return ids;
}

export function preferredPersonalLabelId(labels: readonly LabelDef[]): string | null {
  const byId = labels.find((label) => label.id === PERSONAL_LABEL_ID);
  if (byId) return byId.id;
  const byName = labels.find((label) => label.name.trim().toLowerCase() === 'persoonlijk');
  return byName?.id ?? null;
}

export function shouldEnsureLocalSport(
  status: 'idle' | 'ready' | 'unavailable',
  items: readonly { ritualPrefix: string; paused: boolean; schedule: RecurringSchedule; weekdays: readonly BoardDayKey[] }[],
  date: string,
): boolean {
  if (status !== 'ready') return true;
  const sport = items.find((item) => item.ritualPrefix === 'sport');
  if (!sport) return false;
  return routineRunsOn(sport, date);
}

export function isDaypart(value: string | null | undefined): value is Daypart {
  return value === 'ochtend' || value === 'dag' || value === 'avond';
}

const SEEDED_KEY = 'flow-recurring-seeded';

export function recurringSeedSeen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SEEDED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markRecurringSeeded(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SEEDED_KEY, '1');
  } catch {
    // De lijst blijft werken; een leeg account kan de drie routines nog een keer krijgen.
  }
}
