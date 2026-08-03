'use client';

import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ProgressRing } from '@/components/ui/progress';
import { useSportStore, sessionsInWeek, weekStreak } from '@/stores/useSportStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { lastWeeks, todayISO, weekDates, weekOf } from '@/lib/dates';
import { cn } from '@/lib/utils';

export function SportRing({ size = 96 }: { size?: number }) {
  const sessions = useSportStore((s) => s.sessions);
  const target = useSettingsStore((s) => s.settings.sportWeeklyTarget);
  const count = sessionsInWeek(sessions).length;
  return (
    <ProgressRing value={(count / target) * 100} size={size} stroke={9}>
      <span className="text-center leading-tight">
        <span className="block text-[18px] font-bold tabular-nums text-txt">{count}/{target}</span>
        <span className="block text-[10px] text-muted">sessies</span>
      </span>
    </ProgressRing>
  );
}

/** Zeven dagstaafjes: gevuld = getraind, gestreept = rustdag, leeg = nog niet. */
export function SportDayBars() {
  const sessions = useSportStore((s) => s.sessions);
  const today = todayISO();
  const days = weekDates(weekOf());

  return (
    <div className="flex items-end gap-1.5">
      {days.map((d) => {
        const iso = todayISO(d);
        const trained = sessions.some((s) => s.date === iso);
        const isFuture = iso > today;
        return (
          <div key={iso} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'h-9 w-5 rounded-[6px] border',
                trained ? 'border-transparent bg-green' : isFuture ? 'border-line bg-surface-2' : 'hatched border-line',
              )}
              title={format(d, 'EEEE', { locale: nl })}
            />
            <span className="text-[9.5px] font-medium text-muted-2">{format(d, 'EEEEEE', { locale: nl })}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SportStreak() {
  const sessions = useSportStore((s) => s.sessions);
  const target = useSettingsStore((s) => s.settings.sportWeeklyTarget);
  const streak = weekStreak(sessions, target, lastWeeks(52));
  return (
    <div className="text-center">
      <p className="text-[28px] font-bold tabular-nums leading-none text-txt">{streak}</p>
      <p className="mt-1 text-[11px] text-muted">weken streak</p>
    </div>
  );
}

export function SportPanel() {
  return (
    <div className="flex h-full flex-col rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-4">Sport</p>
      <div className="flex flex-wrap items-center justify-around gap-4">
        <SportRing />
        <SportDayBars />
        <SportStreak />
      </div>
    </div>
  );
}
