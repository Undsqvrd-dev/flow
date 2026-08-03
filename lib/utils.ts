import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  return crypto.randomUUID();
}

/** Ranks in stappen van 1000; nieuwe items achteraan. */
export const RANK_STEP = 1000;

export function nextRank(ranks: number[]): number {
  return (ranks.length ? Math.max(...ranks) : 0) + RANK_STEP;
}

/** Rank tussen twee buren; herindexeren gebeurt in de store als de ruimte op is. */
export function rankBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return RANK_STEP;
  if (before === null) return (after as number) / 2;
  if (after === null) return before + RANK_STEP;
  return (before + after) / 2;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} u` : `${h} u ${m} min`;
}
