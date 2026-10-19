'use client';

import { meditationDate, meditationStreak } from '@/lib/meditation';
import { useTodayISO } from '@/lib/useTodayISO';
import { useBoardStore } from '@/stores/useBoardStore';

/** Lijn-lotus. Lucide heeft geen lotus; Flower/Flower2 zijn geen meditatie-icoon. */
function LotusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <ellipse cx="12" cy="11.2" rx="2.15" ry="7.4" />
      <ellipse cx="12" cy="12.2" rx="2.05" ry="6.5" transform="rotate(-28 12 19)" />
      <ellipse cx="12" cy="12.2" rx="2.05" ry="6.5" transform="rotate(28 12 19)" />
      <ellipse cx="12" cy="13.4" rx="1.85" ry="5.3" transform="rotate(-58 12 19.5)" />
      <ellipse cx="12" cy="13.4" rx="1.85" ry="5.3" transform="rotate(58 12 19.5)" />
    </svg>
  );
}

/** Huidige en langste reeks afgevinkte meditatiedagen. */
export function MeditationStreakCard() {
  const tasks = useBoardStore((s) => s.tasks);
  const today = useTodayISO();
  const { current, longest } = meditationStreak(tasks, today);
  const todayTask = tasks.find((task) => meditationDate(task) === today);
  const todayLabel = todayTask?.done ? 'Vandaag gedaan' : todayTask ? 'Vandaag nog open' : null;

  return (
    <div className="meditation-streak-tile relative flex h-full min-h-[200px] flex-col overflow-hidden rounded-panel p-5 md:p-6">
      <LotusIcon className="meditation-streak-watermark pointer-events-none absolute -right-4 -top-5 h-32 w-32" />
      <div className="relative mb-5 flex items-center gap-2">
        <LotusIcon className="meditation-streak-icon h-[18px] w-[18px] shrink-0" />
        <p className="meditation-streak-label">Meditatie streak</p>
      </div>
      <div className="relative flex flex-1 items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="meditation-streak-count tabular-nums">{current}</p>
          <p className="meditation-streak-caption mt-2">
            {current === 1 ? 'dag op rij' : 'dagen op rij'}
          </p>
        </div>
        <div className="pb-0.5 text-right">
          <p className="meditation-streak-longest tabular-nums">{longest}</p>
          <p className="meditation-streak-caption mt-1">langste</p>
        </div>
      </div>
      {todayLabel && <p className="meditation-streak-caption relative mt-4">{todayLabel}</p>}
    </div>
  );
}
