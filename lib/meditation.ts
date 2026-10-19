import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Task } from '@/lib/types';

export const MEDITATION_TITLE = 'Mediteren';
export const MEDITATION_RITUAL_PREFIX = 'mediteren:';

export function meditationRitualKey(dateISO: string): string {
  return `${MEDITATION_RITUAL_PREFIX}${dateISO}`;
}

export function shiftISO(dateISO: string, days: number): string {
  return format(addDays(parseISO(dateISO), days), 'yyyy-MM-dd');
}

/** Kalenderdag van een meditatietaak, of null als het geen ritueel is. */
export function meditationDate(task: Pick<Task, 'ritualKey'>): string | null {
  const key = task.ritualKey;
  if (!key?.startsWith(MEDITATION_RITUAL_PREFIX)) return null;
  const date = key.slice(MEDITATION_RITUAL_PREFIX.length);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

export interface MeditationStreak {
  current: number;
  longest: number;
}

/**
 * Huidige reeks aaneengesloten dagen waarop Mediteren is afgevinkt.
 * Vandaag telt mee zodra de taak af is. Is vandaag nog open, dan loopt de
 * reeks door tot en met gisteren.
 */
export function meditationStreak(
  tasks: readonly Pick<Task, 'ritualKey' | 'done'>[],
  today: string,
): MeditationStreak {
  const done = new Set<string>();
  for (const task of tasks) {
    const date = meditationDate(task);
    if (!date || !task.done || date > today) continue;
    done.add(date);
  }

  const start = done.has(today) ? today : shiftISO(today, -1);
  let current = 0;
  let cursor = start;
  while (done.has(cursor)) {
    current += 1;
    cursor = shiftISO(cursor, -1);
  }

  const sorted = [...done].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of sorted) {
    if (previous && differenceInCalendarDays(parseISO(date), parseISO(previous)) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    previous = date;
  }

  return { current, longest };
}
