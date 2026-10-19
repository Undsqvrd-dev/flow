'use client';

import { meditationDate, meditationStreak } from '@/lib/meditation';
import { useTodayISO } from '@/lib/useTodayISO';
import { useBoardStore } from '@/stores/useBoardStore';

/** Huidige en langste reeks afgevinkte meditatiedagen. */
export function MeditationStreakCard() {
  const tasks = useBoardStore((s) => s.tasks);
  const today = useTodayISO();
  const { current, longest } = meditationStreak(tasks, today);
  const todayTask = tasks.find((task) => meditationDate(task) === today);
  const todayLabel = todayTask?.done ? 'Vandaag gedaan' : todayTask ? 'Vandaag nog open' : null;

  return (
    <div className="flex h-full flex-col rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-4">Meditatie streak</p>
      <div className="flex flex-1 items-end justify-between gap-4">
        <div>
          <p className="text-[40px] font-bold tabular-nums leading-none text-txt">{current}</p>
          <p className="mt-1 text-[12px] text-muted">{current === 1 ? 'dag op rij' : 'dagen op rij'}</p>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-bold tabular-nums leading-none text-txt">{longest}</p>
          <p className="mt-1 text-[12px] text-muted">langste</p>
        </div>
      </div>
      {todayLabel && <p className="mt-3 text-[11px] text-muted">{todayLabel}</p>}
    </div>
  );
}
