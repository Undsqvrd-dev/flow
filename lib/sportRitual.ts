import { differenceInCalendarDays, parseISO } from 'date-fns';
import { shiftISO } from '@/lib/meditation';
import type { Task } from '@/lib/types';

export const SPORT_TITLE = 'Sport';
export const SPORT_RITUAL_PREFIX = 'sport:';
export const SPORT_RITUAL_NOTE = 'ritueel';
/** Direct na Mediteren (rank 0), bovenaan de dag. */
export const SPORT_RITUAL_RANK = 1;

export function sportRitualKey(dateISO: string): string {
  return `${SPORT_RITUAL_PREFIX}${dateISO}`;
}

export function sportDate(task: Pick<Task, 'ritualKey'>): string | null {
  const key = task.ritualKey;
  if (!key?.startsWith(SPORT_RITUAL_PREFIX)) return null;
  const date = key.slice(SPORT_RITUAL_PREFIX.length);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

/** Aaneengesloten dagen met een sessie. Vandaag telt mee zodra er een sessie is. */
export function sportDayStreak(dates: readonly string[], today: string): { current: number; longest: number } {
  const done = new Set(dates.filter((date) => date <= today));
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

export function planSportSessionSync(
  tasks: readonly Pick<Task, 'ritualKey' | 'done'>[],
  sessions: readonly { id: string; date: string; note: string | null }[],
): { addDates: string[]; removeIds: string[] } {
  const doneDates = new Set<string>();
  for (const task of tasks) {
    const date = sportDate(task);
    if (date && task.done) doneDates.add(date);
  }

  const addDates = [...doneDates].filter(
    (date) => !sessions.some((session) => session.note === SPORT_RITUAL_NOTE && session.date === date),
  );
  const removeIds = sessions
    .filter((session) => session.note === SPORT_RITUAL_NOTE && !doneDates.has(session.date))
    .map((session) => session.id);

  return { addDates, removeIds };
}
