'use client';

import { useRouter } from 'next/navigation';
import { useBoardStore, openTasksForDate, doneTasksThisWeek } from '@/stores/useBoardStore';
import { useUiStore } from '@/stores/useUiStore';
import { todayISO, weekOf, WEEKDAY_KEYS } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { DayKey } from '@/lib/types';

const WEEK_BOARD_KEYS: DayKey[] = ['algemeen', ...WEEKDAY_KEYS];

function StatCard({ label, value, sub, accent, onClick }: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    'rounded-panel p-5 text-left',
    accent ? 'bg-green-900 text-white shadow-soft' : 'border border-line bg-surface shadow-soft-sm',
    onClick && 'transition-[transform,box-shadow] duration-150 hover:shadow-soft cursor-pointer',
    onClick && !accent && 'hover:border-line-2',
    onClick && accent && 'hover:brightness-110',
  );

  const body = (
    <>
      <p className={cn('panel-label', accent && 'text-green-200 dark:text-green-400')}>{label}</p>
      <p className={cn('mt-2 text-[40px] font-bold leading-none tabular-nums tracking-tight', accent ? 'text-white' : 'text-txt')}>
        {value}
      </p>
      {sub && <p className={cn('mt-2 truncate text-[12px]', accent ? 'text-green-200 dark:text-green-400' : 'text-muted')}>{sub}</p>}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

export function StatRow() {
  const router = useRouter();
  const tasks = useBoardStore((s) => s.tasks);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const currentWeek = weekOf();

  const todayCount = openTasksForDate(tasks, todayISO()).length;
  const doneWeek = doneTasksThisWeek(tasks, currentWeek).length;
  const openThisWeek = tasks.filter(
    (t) => !t.done && t.weekOf === currentWeek && WEEK_BOARD_KEYS.includes(t.dayKey),
  ).length;
  const dumpCount = tasks.filter((t) => !t.done && t.dayKey === 'dump').length;
  const waitingCount = tasks.filter((t) => !t.done && t.dayKey === 'wachtruimte').length;

  function goFocusMode() {
    setFocusMode(true);
    router.push('/board');
  }

  function goWeekMode() {
    setFocusMode(false);
    router.push('/board');
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Taken vandaag"
        value={String(todayCount)}
        sub="open op je bord"
        accent
        onClick={goFocusMode}
      />
      <StatCard
        label="Open deze week"
        value={String(openThisWeek)}
        sub="op het weekbord"
        onClick={goWeekMode}
      />
      <StatCard
        label="Afgerond deze week"
        value={String(doneWeek)}
        sub="kaarten in Gedaan"
        onClick={goWeekMode}
      />
      <StatCard
        label="Inspiratie"
        value={String(dumpCount)}
        sub="nog te structureren"
        onClick={() => router.push('/dump')}
      />
      <StatCard
        label="Wachtruimte"
        value={String(waitingCount)}
        sub="ligt te wachten"
        onClick={() => router.push('/dump')}
      />
    </div>
  );
}
