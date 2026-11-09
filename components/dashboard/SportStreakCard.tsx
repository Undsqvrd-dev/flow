'use client';

import { Dumbbell } from 'lucide-react';
import { sportDate, sportDayStreak } from '@/lib/sportRitual';
import { useTodayISO } from '@/lib/useTodayISO';
import { useBoardStore } from '@/stores/useBoardStore';
import { useSportStore } from '@/stores/useSportStore';

/** Compacte sportreeks. Een dag telt als er een sessie is. */
export function SportStreakCard() {
  const sessions = useSportStore((s) => s.sessions);
  const tasks = useBoardStore((s) => s.tasks);
  const today = useTodayISO();
  const { current, longest } = sportDayStreak(sessions.map((session) => session.date), today);
  const todayTask = tasks.find((task) => sportDate(task) === today);
  const trainedToday = sessions.some((session) => session.date === today);
  const todayLabel = trainedToday
    ? 'Vandaag gedaan'
    : todayTask
      ? 'Vandaag nog open'
      : null;

  return (
    <div className="flex h-full min-h-[120px] flex-col justify-between rounded-panel border border-line bg-surface p-4 text-left shadow-soft-sm md:p-5">
      <p className="panel-label !mb-0 inline-flex items-center gap-1.5">
        <Dumbbell size={13} strokeWidth={1.75} className="text-green" />
        Sport streak
      </p>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[40px] font-bold leading-none tabular-nums tracking-tight text-txt">{current}</p>
          <p className="mt-1 text-[12px] text-muted">
            {current === 1 ? 'dag op rij' : 'dagen op rij'}
          </p>
        </div>
        <div className="pb-0.5 text-right">
          <p className="text-[22px] font-bold tabular-nums leading-none text-txt">{longest}</p>
          <p className="mt-1 text-[11px] text-muted">langste</p>
        </div>
      </div>
      {todayLabel && <p className="text-[12px] text-muted">{todayLabel}</p>}
    </div>
  );
}
