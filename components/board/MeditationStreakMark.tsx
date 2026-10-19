'use client';

import { Zap } from 'lucide-react';
import { meditationDate, meditationStreak } from '@/lib/meditation';
import { useTodayISO } from '@/lib/useTodayISO';
import { useBoardStore } from '@/stores/useBoardStore';

/**
 * Bliksem + huidige meditatie-streak.
 * Alleen voor ritual_key `mediteren:…`, dezelfde berekening als de dashboardtegel.
 */
export function MeditationStreakMark({ ritualKey }: { ritualKey?: string | null }) {
  const today = useTodayISO();
  const current = useBoardStore((s) => meditationStreak(s.tasks, today).current);
  if (!meditationDate({ ritualKey })) return null;

  const label = `Meditatie streak: ${current} ${current === 1 ? 'dag' : 'dagen'}`;

  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5 rounded-pill bg-green-50 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none text-green"
      title="Meditatie streak"
      aria-label={label}
    >
      <Zap size={11} strokeWidth={2.25} aria-hidden />
      {current}
    </span>
  );
}
