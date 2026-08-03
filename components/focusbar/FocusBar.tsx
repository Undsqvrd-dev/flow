'use client';

import { Columns3, Crosshair, Focus as FocusIcon } from 'lucide-react';
import Link from 'next/link';
import { WeekFocusPanel } from './WeekFocusPanel';
import { DayFocusPanel } from './DayFocusPanel';
import { ActiveTimerStrip } from './ActiveTimerStrip';
import { useGoalsStore, mainMonthTarget } from '@/stores/useGoalsStore';
import { useUiStore } from '@/stores/useUiStore';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const btnClass = cn(
  'ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-2.5 py-1.5',
  'text-[11px] font-medium transition-colors cursor-pointer',
);

/** Compacte maandtarget-chip links van weekfocus. */
function MonthTargetChip() {
  const goals = useGoalsStore((s) => s.goals);
  const goal = mainMonthTarget(goals);
  if (!goal || goal.targetValue === null) return null;

  return (
    <Link
      href="/goals"
      className="hidden min-w-0 max-w-[200px] shrink items-center gap-2 rounded-pill border border-line bg-surface-2 px-2.5 py-1 transition-colors hover:border-green hover:bg-green-50 sm:flex"
      title={`${goal.title}: ${goal.currentValue}/${goal.targetValue}${goal.unit ? ` ${goal.unit}` : ''} — naar doelen`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-pill"
        style={{ backgroundColor: goal.color }}
      />
      <span className="min-w-0 truncate text-[11px] font-semibold text-txt-2">
        {goal.title}
      </span>
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-txt">
        {goal.currentValue}/{goal.targetValue}
      </span>
    </Link>
  );
}

/**
 * Sticky focusbalk.
 * Weekoverzicht: maandtarget + weekfocus + knop Focusmodus.
 * Focusmodus: dagfocus + knop Weekbord.
 */
export function FocusBar() {
  const focusMode = useUiStore((s) => s.focusMode);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const router = useRouter();

  function enterFocusMode() {
    setFocusMode(true);
    router.push('/board');
  }

  function exitFocusMode() {
    setFocusMode(false);
    router.push('/board');
  }

  if (focusMode) {
    return (
      <div className="sticky top-0 z-30 min-w-0 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex h-[52px] w-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">
          <Crosshair size={15} strokeWidth={2} className="shrink-0 text-green" />
          <span className="panel-label hidden shrink-0 sm:block">Dagfocus</span>
          <DayFocusPanel
            className="min-w-0 w-0 flex-1 border-0 bg-transparent px-0 text-[13.5px] font-semibold text-txt outline-none placeholder:font-normal placeholder:text-muted focus:border-0"
          />
          <button
            type="button"
            onClick={exitFocusMode}
            className={cn(
              btnClass,
              'border-line text-muted hover:border-line-2 hover:bg-surface-2 hover:text-txt',
            )}
            aria-label="Weekbord"
            title="Terug naar weekoverzicht (Esc)"
          >
            <Columns3 size={13} strokeWidth={1.75} />
            <span className="hidden sm:inline">Weekbord</span>
          </button>
        </div>
        <ActiveTimerStrip />
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-30 min-w-0 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex h-[52px] w-full min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">
        <MonthTargetChip />
        <span className="h-2.5 w-2.5 shrink-0 rounded-pill bg-green" />
        <span className="panel-label hidden shrink-0 sm:block">Weekfocus</span>
        <WeekFocusPanel
          className="min-w-0 w-0 flex-1 border-0 bg-transparent px-0 text-[13.5px] font-semibold text-txt outline-none placeholder:font-normal placeholder:text-muted-2/70 focus:border-0"
        />
        <button
          type="button"
          onClick={enterFocusMode}
          className={cn(
            btnClass,
            'border-line text-muted hover:border-green hover:bg-green-50 hover:text-green',
          )}
          aria-label="Focusmodus"
          title="Focusmodus (⌘F)"
        >
          <FocusIcon size={13} strokeWidth={1.75} />
          <span className="hidden sm:inline">Focusmodus</span>
        </button>
      </div>
      <ActiveTimerStrip />
    </div>
  );
}
