'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getISOWeek,
  getISOWeekYear,
  getISOWeeksInYear,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
  format,
} from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type WeekCell = {
  week: number;
  start: Date;
  status: 'past' | 'current' | 'future';
};

function buildWeeks(now: Date): { year: number; currentWeek: number; total: number; cells: WeekCell[] } {
  const year = getISOWeekYear(now);
  const currentWeek = getISOWeek(now);
  const total = getISOWeeksInYear(now);
  const cells: WeekCell[] = [];

  for (let week = 1; week <= total; week++) {
    const start = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(), year), week));
    const status: WeekCell['status'] =
      week < currentWeek ? 'past' : week === currentWeek ? 'current' : 'future';
    cells.push({ week, start, status });
  }

  return { year, currentWeek, total, cells };
}

/** Jaarvoortgang: kleine stipjes per ISO-week. */
export function YearWeeks() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const data = useMemo(() => (now ? buildWeeks(now) : null), [now]);

  if (!data) {
    return (
      <div className="rounded-panel border border-line bg-surface p-4">
        <p className="panel-label">Jaar in weken</p>
        <div className="mt-3 h-10 animate-pulse rounded-[10px] bg-surface-2" />
      </div>
    );
  }

  const { year, currentWeek, total, cells } = data;
  const pct = Math.round((currentWeek / total) * 100);

  return (
    <div className="rounded-panel border border-line bg-surface p-4 shadow-soft-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="panel-label">Jaar in weken</p>
          <p className="mt-1 text-[15px] font-bold text-txt">
            Week {currentWeek}
            <span className="font-medium text-muted"> · {year}</span>
          </p>
        </div>
        <p className="text-[12px] tabular-nums text-muted">
          {currentWeek} / {total} · {pct}%
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {cells.map((cell) => (
          <div
            key={cell.week}
            title={`Week ${cell.week} · ${format(cell.start, 'd MMM', { locale: nl })}`}
            className={cn(
              'h-4 w-4 rounded-[5px] sm:h-5 sm:w-5',
              cell.status === 'past' && 'bg-green',
              cell.status === 'current' && 'bg-green-900 ring-1 ring-green ring-offset-1 ring-offset-surface',
              cell.status === 'future' && 'bg-surface-3',
            )}
          />
        ))}
      </div>
    </div>
  );
}
