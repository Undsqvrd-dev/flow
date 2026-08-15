'use client';

import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useBoardStore, openTasksForDate } from '@/stores/useBoardStore';
import { nextCalendarDay, todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';

/**
 * "Herzie mijn dag": compacte lijst van vandaag — snel herschikken
 * en dingen naar morgen schuiven.
 */
export function ReviewDayDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tasks = useBoardStore((s) => s.tasks);
  const updateTask = useBoardStore((s) => s.updateTask);
  const moveRank = useBoardStore((s) => s.moveRank);
  const todays = openTasksForDate(tasks, todayISO());
  const tomorrow = nextCalendarDay(todayISO());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Herzie mijn dag" className="max-w-xl">
        <div className="p-5">
          <p className="panel-label mb-1">Herzie mijn dag</p>
          <p className="mb-4 text-[13px] text-muted">
            {todays.length === 0 ? 'Vandaag is leeg.' : `${todays.length} open taken vandaag.`}
          </p>
          <ul className="flex flex-col gap-1.5">
            {todays.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-card border border-line bg-surface-2 px-3 py-2">
                <div className="flex flex-col">
                  <button type="button" onClick={() => moveRank(t.id, -1)} className="text-muted-2 hover:text-green cursor-pointer" aria-label="Omhoog">
                    <ChevronUp size={13} strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => moveRank(t.id, 1)} className="text-muted-2 hover:text-green cursor-pointer" aria-label="Omlaag">
                    <ChevronDown size={13} strokeWidth={2} />
                  </button>
                </div>
                <span className={cn('min-w-0 flex-1 truncate text-[13px] font-medium text-txt')}>{t.title}</span>
                <button
                  type="button"
                  onClick={() => updateTask(t.id, {
                    dayKey: tomorrow.dayKey,
                    weekOf: tomorrow.weekOf,
                    daypart: null,
                  })}
                  className="inline-flex items-center gap-1 rounded-pill border border-line-2 px-2 py-1 text-[11px] font-medium text-txt-2 hover:bg-surface-3 cursor-pointer"
                  title="Naar morgen"
                >
                  morgen <ArrowRight size={11} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
