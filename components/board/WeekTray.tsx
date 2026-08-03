'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PartSection } from './PartSection';
import { useBoardStore, openTasksFor } from '@/stores/useBoardStore';
import { useUiStore } from '@/stores/useUiStore';
import { cn } from '@/lib/utils';

/**
 * Verticaal langwerpig zijpaneel "Deze week".
 * Ook in focusmodus te openen om weektaken te slepen/vullen.
 */
export function WeekTray() {
  const tasks = useBoardStore((s) => s.tasks);
  const open = useUiStore((s) => s.weekTrayOpen);
  const setOpen = useUiStore((s) => s.setWeekTrayOpen);
  const weekTasks = openTasksFor(tasks, 'algemeen', null);
  const count = weekTasks.length;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group my-4 ml-4 flex h-[calc(100%-2rem)] w-11 shrink-0 flex-col items-center gap-3',
          'rounded-panel border border-line bg-surface-2/80 py-3',
          'transition-colors hover:bg-surface hover:shadow-soft dark:bg-surface-2/50 dark:hover:bg-surface',
          'cursor-pointer',
        )}
        aria-label="Deze week openen"
        title="Deze week"
      >
        <ChevronRight size={15} strokeWidth={1.75} className="shrink-0 text-muted group-hover:text-green" />
        <span
          className="text-[12px] font-bold tracking-[0.04em] text-txt"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Deze week
        </span>
        <span className="mt-auto rounded-pill bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
          {count}
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'my-4 ml-4 flex h-[calc(100%-2rem)] w-[272px] shrink-0 flex-col',
        'rounded-panel border border-line bg-surface shadow-soft dark:bg-surface',
      )}
    >
      <div className="flex items-center gap-2 px-3 pb-1 pt-3">
        <span className="text-[13px] font-bold text-txt">Deze week</span>
        <span className="text-[11px] text-muted">sleep naar een dag</span>
        <span className="ml-auto rounded-pill bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
          {count}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-[6px] p-1 text-muted hover:bg-surface-3 hover:text-txt cursor-pointer"
          aria-label="Deze week inklappen"
        >
          <ChevronLeft size={15} strokeWidth={1.75} />
        </button>
      </div>

      <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2.5 pb-2.5 pt-1">
        <PartSection
          dayKey="algemeen"
          daypart={null}
          tasks={weekTasks}
          showHeader={false}
        />
      </div>
    </div>
  );
}
