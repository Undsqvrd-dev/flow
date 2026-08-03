'use client';

import { useBoardStore } from '@/stores/useBoardStore';
import { useUiStore } from '@/stores/useUiStore';
import { quadrant, QUADRANT_META, type Quadrant } from '@/lib/priority';
import { cn } from '@/lib/utils';

const ORDER: NonNullable<Quadrant>[] = ['nu', 'plannen', 'snel-weg', 'schrappen'];

const BOX_STYLE: Record<NonNullable<Quadrant>, string> = {
  'nu': 'border-green-700/40',
  'plannen': 'border-green/40',
  'snel-weg': 'border-line-2',
  'schrappen': 'border-line',
};

/** Matrixweergave van de week: vier vakken met de beoordeelde kaarten erin. Puur als spiegel. */
export function WeekMatrix({ currentWeek }: { currentWeek: string }) {
  const allTasks = useBoardStore((s) => s.tasks);
  const tasks = allTasks.filter((t) => t.weekOf === currentWeek);
  const openTask = useUiStore((s) => s.openTask);

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-1">Prioriteitsmatrix van deze week</p>
      <p className="mb-4 text-[12px] text-muted">Alleen beoordeelde kaarten. Eén keer per week bekijken is genoeg.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ORDER.map((q) => {
          const items = tasks.filter((t) => quadrant(t) === q);
          return (
            <div key={q} className={cn('rounded-card border bg-surface-2 p-3', BOX_STYLE[q])}>
              <p className="mb-2 text-[12px] font-bold text-txt">{QUADRANT_META[q].label}
                <span className="ml-1.5 font-medium text-muted-2">· {items.length}</span>
              </p>
              {items.length === 0 ? (
                <p className="text-[12px] text-muted-2">—</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {items.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => openTask(t.id)}
                        className={cn(
                          'w-full truncate rounded-[8px] bg-surface px-2.5 py-1.5 text-left text-[12.5px] text-txt-2 shadow-soft-sm hover:text-txt cursor-pointer',
                          t.done && 'text-muted line-through',
                        )}
                      >
                        {t.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
