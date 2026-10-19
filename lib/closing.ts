import type { Task } from '@/lib/types';

export const CLOSING_TITLE = 'Dagafsluiting';
export const CLOSING_RITUAL_PREFIX = 'dagafsluiting:';

/** Hoog genoeg om onder gewone rangen te staan, laag genoeg voor int4 + een volgende rank. */
export const CLOSING_RANK = 2_000_000_000;

export const CLOSING_NOTES = [
  '±20:00 · max 5 min',
  '',
  '1. Hoe ging de dag?',
  '2. Hoe voelde ik me vandaag en hoe voel ik me nu?',
  '3. Waar ben je dankbaar voor?',
].join('\n');

export function closingRitualKey(dateISO: string): string {
  return `${CLOSING_RITUAL_PREFIX}${dateISO}`;
}

export function isClosingRitual(task: Pick<Task, 'ritualKey'>): boolean {
  return Boolean(task.ritualKey?.startsWith(CLOSING_RITUAL_PREFIX));
}

/** Gewone rangen blijven op volgorde. Dagafsluiting staat altijd achteraan. */
export function compareDayTasks(
  a: Pick<Task, 'rank' | 'ritualKey'>,
  b: Pick<Task, 'rank' | 'ritualKey'>,
): number {
  const endA = isClosingRitual(a) ? 1 : 0;
  const endB = isClosingRitual(b) ? 1 : 0;
  if (endA !== endB) return endA - endB;
  return a.rank - b.rank;
}
