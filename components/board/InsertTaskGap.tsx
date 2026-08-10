'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { DayKey, Daypart } from '@/lib/types';
import { AddTaskInline } from './AddTaskInline';
import { cn } from '@/lib/utils';

type Props = {
  dayKey: DayKey;
  daypart: Daypart | null;
  weekOf?: string;
  insertBeforeId?: string;
  /** 'before' = boven de kaart, 'after' = onder de kaart (tussenruimte). */
  edge?: 'before' | 'after';
};

/** Subtiele hover-hint; absoluut gepositioneerd zodat kaartruimte klein blijft. */
export function InsertTaskGap({
  dayKey,
  daypart,
  weekOf: columnWeekOf,
  insertBeforeId,
  edge = 'after',
}: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div
        className={cn(
          'relative z-20 py-0.5',
          edge === 'before' ? '-mb-1' : '-mt-1',
        )}
      >
        <AddTaskInline
          dayKey={dayKey}
          daypart={daypart}
          weekOf={columnWeekOf}
          insertBeforeId={insertBeforeId}
          position={insertBeforeId ? undefined : 'start'}
          autoEdit
          onClose={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group/insert absolute inset-x-0 z-10 flex h-3 items-center justify-center',
        edge === 'before' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2',
      )}
    >
      <div
        className={cn(
          'absolute inset-x-1 flex items-center justify-center',
          'pointer-events-none opacity-0 transition-opacity duration-150',
          'group-hover/insert:pointer-events-auto group-hover/insert:opacity-100',
        )}
      >
        <div className="absolute inset-x-0 border-t border-dashed border-line-2" />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            'relative z-10 flex h-3.5 w-3.5 items-center justify-center',
            'rounded-[5px] border border-line bg-surface text-muted shadow-soft-sm',
            'hover:border-green hover:text-green cursor-pointer',
          )}
          aria-label="Taak hier toevoegen"
        >
          <Plus size={10} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
