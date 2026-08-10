'use client';

import { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown } from 'lucide-react';
import type { DayKey, Daypart, Task } from '@/lib/types';
import { TaskCard } from './TaskCard';
import { AddTaskInline } from './AddTaskInline';
import { InsertTaskGap } from './InsertTaskGap';
import { DAYPART_LABELS, weekOf } from '@/lib/dates';
import { cn, formatMinutes } from '@/lib/utils';

/** Drop-zone id: `sec:dayKey:weekOf:daypart`. */
export function sectionId(
  dayKey: DayKey,
  daypart: Daypart | null,
  columnWeekOf: string = weekOf(),
): string {
  return `sec:${dayKey}:${columnWeekOf}:${daypart ?? 'none'}`;
}

export function parseSectionId(
  id: string,
): { dayKey: DayKey; daypart: Daypart | null; weekOf: string } | null {
  const m = id.match(/^sec:([^:]+):(\d{4}-\d{2}-\d{2}):([^:]+)$/);
  if (!m) return null;
  return {
    dayKey: m[1] as DayKey,
    weekOf: m[2],
    daypart: m[3] === 'none' ? null : (m[3] as Daypart),
  };
}

/**
 * Eén dagdeel-sectie: drop-zone + sorteerbare lijst.
 * Dagdelen zijn inklapbaar via de kop.
 */
export function PartSection({
  dayKey,
  daypart,
  tasks,
  weekOf: columnWeekOf,
  showHeader = true,
  showAdd = true,
  children,
}: {
  dayKey: DayKey;
  daypart: Daypart | null;
  tasks: Task[];
  weekOf?: string;
  showHeader?: boolean;
  showAdd?: boolean;
  children?: React.ReactNode;
}) {
  const columnWeek = columnWeekOf ?? weekOf();
  const id = sectionId(dayKey, daypart, columnWeek);
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalMin = tasks.reduce((sum, t) => sum + (t.estimateMin ?? 0), 0);
  const collapsible = showHeader && daypart !== null;
  // Lege dagdelen starten ingeklapt; met taken open.
  const [expanded, setExpanded] = useState(() => tasks.length > 0 || Boolean(children));

  // Bij drop/toevoegen van eerste taak: automatisch uitklappen.
  useEffect(() => {
    if (tasks.length > 0) setExpanded(true);
  }, [tasks.length]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-card p-0.5 transition-colors duration-150',
        isOver && 'hatched outline-2 outline-dashed outline-line-2',
      )}
    >
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mb-1.5 flex w-full items-center gap-1.5 rounded-[6px] px-1 py-0.5 text-left hover:bg-surface-3/60 cursor-pointer"
        >
          <ChevronDown
            size={13}
            strokeWidth={2}
            className={cn('shrink-0 text-muted-2 transition-transform duration-150', !expanded && '-rotate-90')}
          />
          <span className="panel-label !mb-0">{DAYPART_LABELS[daypart]}</span>
          <span className="ml-auto flex items-center gap-1.5">
            {totalMin > 0 && (
              <span className="text-[10px] tabular-nums text-muted-2">ca. {formatMinutes(totalMin)}</span>
            )}
            <span className="rounded-pill bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
              {tasks.length}
            </span>
          </span>
        </button>
      )}

      {(!collapsible || expanded) && (
        <div
          className={cn(
            'flex flex-col gap-1.5',
            tasks.length === 0 && !children && 'min-h-[36px]',
          )}
        >
          {children}
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task, i) => (
              <div key={task.id} className="relative">
                {i === 0 && (
                  <InsertTaskGap
                    dayKey={dayKey}
                    daypart={daypart}
                    weekOf={columnWeek}
                    insertBeforeId={task.id}
                    edge="before"
                  />
                )}
                <TaskCard task={task} />
                {i < tasks.length - 1 && (
                  <InsertTaskGap
                    dayKey={dayKey}
                    daypart={daypart}
                    weekOf={columnWeek}
                    insertBeforeId={tasks[i + 1].id}
                    edge="after"
                  />
                )}
              </div>
            ))}
          </SortableContext>
          {showAdd && (
            <AddTaskInline dayKey={dayKey} daypart={daypart} weekOf={columnWeek} />
          )}
        </div>
      )}
    </div>
  );
}
