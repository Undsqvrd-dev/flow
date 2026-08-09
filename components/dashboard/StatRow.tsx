'use client';

import { useRouter } from 'next/navigation';
import { useBoardStore, openTasksForDate } from '@/stores/useBoardStore';
import { useUiStore } from '@/stores/useUiStore';
import { todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';

export function StatRow() {
  const router = useRouter();
  const tasks = useBoardStore((s) => s.tasks);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const todayCount = openTasksForDate(tasks, todayISO()).length;

  function goFocusMode() {
    setFocusMode(true);
    router.push('/board');
  }

  return (
    <button
      type="button"
      onClick={goFocusMode}
      className={cn(
        'flex h-full min-h-[120px] w-full flex-col justify-between rounded-panel bg-green-900 p-4 text-left text-white shadow-soft sm:p-5',
        'transition-[transform,box-shadow] duration-150 hover:brightness-110 cursor-pointer',
      )}
    >
      <p className="panel-label !mb-0 text-green-200 dark:text-green-400">Taken vandaag</p>
      <div>
        <p className="text-[40px] font-bold leading-none tabular-nums tracking-tight text-white">
          {todayCount}
        </p>
        <p className="mt-1 truncate text-[12px] text-green-200 dark:text-green-400">
          open op je bord
        </p>
      </div>
    </button>
  );
}
