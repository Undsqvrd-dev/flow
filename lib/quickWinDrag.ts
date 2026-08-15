import type { DayKey } from '@/lib/types';

/** Drag-id voor een QuickWin-bundel: `qw:dayKey:weekOf`. */
export function quickWinDragId(dayKey: DayKey, week: string): string {
  return `qw:${dayKey}:${week}`;
}

export function parseQuickWinDragId(
  id: string,
): { dayKey: DayKey; weekOf: string } | null {
  const m = id.match(/^qw:([^:]+):(\d{4}-\d{2}-\d{2})$/);
  if (!m) return null;
  return { dayKey: m[1] as DayKey, weekOf: m[2] };
}
