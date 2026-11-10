import type { DayKey, Daypart } from '@/lib/types';

/** Drop-zone id: `sec:dayKey:weekOf:daypart`. */
export function sectionId(
  dayKey: DayKey,
  daypart: Daypart | null,
  columnWeekOf: string,
): string {
  return `sec:${dayKey}:${columnWeekOf}:${daypart ?? 'none'}`;
}

export function parseSectionId(
  id: string,
): { dayKey: DayKey; daypart: Daypart | null; weekOf: string } | null {
  const match = id.match(/^sec:([^:]+):(\d{4}-\d{2}-\d{2}):([^:]+)$/);
  if (!match) return null;
  return {
    dayKey: match[1] as DayKey,
    weekOf: match[2],
    daypart: match[3] === 'none' ? null : (match[3] as Daypart),
  };
}
