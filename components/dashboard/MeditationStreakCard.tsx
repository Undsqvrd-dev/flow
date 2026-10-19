'use client';

import { useEffect, useState } from 'react';
import { meditationDate, meditationStreak } from '@/lib/meditation';
import { todayISO } from '@/lib/dates';
import { useBoardStore } from '@/stores/useBoardStore';

function useTodayISO(): string {
  const [today, setToday] = useState(() => todayISO());

  useEffect(() => {
    const refresh = (): void => setToday(todayISO());
    const arm = (): number => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 1, 0);
      return window.setTimeout(() => {
        refresh();
        timer = arm();
      }, Math.max(1000, next.getTime() - now.getTime()));
    };
    let timer = arm();
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return today;
}

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
