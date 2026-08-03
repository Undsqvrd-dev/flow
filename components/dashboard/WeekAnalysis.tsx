'use client';

import { useBoardStore, openTasksForDate, tasksDoneOnDate } from '@/stores/useBoardStore';
import { isToday, todayISO, weekDates, weekOf } from '@/lib/dates';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * Staafdiagram ma–zo: afgeronde taken per dag. Toekomstige dagen krijgen
 * een gestreepte staaf (hatching), vandaag de volle donkergroene.
 */
export function WeekAnalysis() {
  const tasks = useBoardStore((s) => s.tasks);
  const days = weekDates(weekOf());
  const today = todayISO();

  const data = days.map((d) => {
    const iso = todayISO(d);
    return {
      iso,
      label: format(d, 'EEEEEE', { locale: nl }),
      count: tasksDoneOnDate(tasks, iso).length,
      isToday: isToday(d),
      isFuture: iso > today,
    };
  });

  const max = Math.max(4, ...data.map((d) => d.count));
  const doneToday = tasksDoneOnDate(tasks, today).length;
  const openToday = openTasksForDate(tasks, today).length;
  const pct = doneToday + openToday > 0 ? Math.round((doneToday / (doneToday + openToday)) * 100) : null;

  return (
    <div className="flex h-full flex-col rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label">Weekanalyse</p>
      <p className="mb-4 mt-0.5 text-[12px] text-muted">Afgeronde taken per dag</p>
      <div className="flex flex-1 items-end gap-2.5" style={{ minHeight: 140 }}>
        {data.map((d) => (
          <div key={d.iso} className="flex flex-1 flex-col items-center gap-1.5">
            {d.isToday && pct !== null && (
              <span className="text-[10px] font-bold tabular-nums text-green">{pct}%</span>
            )}
            <div className="flex w-full items-end justify-center" style={{ height: 120 }}>
              <div
                className={cn(
                  'w-full max-w-[36px] rounded-t-[8px] transition-[height] duration-500',
                  d.isFuture ? 'hatched border border-line' : d.isToday ? 'bg-green-900 dark:bg-green' : 'bg-green-200',
                )}
                style={{
                  height: d.isFuture ? '55%' : `${Math.max(d.count / max, 0.06) * 100}%`,
                  transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
                }}
                title={`${d.count} afgerond`}
              />
            </div>
            <span className={cn('text-[11px] font-medium', d.isToday ? 'text-green font-bold' : 'text-muted')}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
