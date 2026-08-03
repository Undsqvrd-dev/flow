'use client';

import { quadrant, QUADRANT_META, type Quadrant } from '@/lib/priority';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const CELLS: { q: NonNullable<Quadrant>; urgent: boolean; important: boolean }[] = [
  { q: 'plannen', urgent: false, important: true },
  { q: 'nu', urgent: true, important: true },
  { q: 'schrappen', urgent: false, important: false },
  { q: 'snel-weg', urgent: true, important: false },
];

const CELL_STYLE: Record<NonNullable<Quadrant>, string> = {
  'nu': 'data-[active=true]:bg-green-700 data-[active=true]:text-white',
  'plannen': 'data-[active=true]:bg-green data-[active=true]:text-white',
  'snel-weg': 'data-[active=true]:bg-green-200 data-[active=true]:text-green-900',
  'schrappen': 'data-[active=true]:bg-line-2 data-[active=true]:text-txt',
};

/**
 * De 2×2-matrix: urgentie × belang. Eén klik zet beide waarden;
 * klik op het gekozen vak maakt het oordeel weer leeg.
 */
export function PriorityMatrix({ urgent, important, onChange }: {
  urgent: boolean | null;
  important: boolean | null;
  onChange: (urgent: boolean | null, important: boolean | null) => void;
}) {
  const current = quadrant({ urgent, important });
  return (
    <div>
      <div className="mb-1 flex justify-between pl-4 text-[10px] font-medium text-muted-2">
        <span>niet urgent</span><span>urgent</span>
      </div>
      <div className="flex gap-1.5">
        <div className="flex w-3 flex-col justify-between py-1 text-[10px] font-medium text-muted-2 [writing-mode:vertical-lr] rotate-180">
          <span>niet belangrijk</span><span>belangrijk</span>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          {CELLS.map(({ q, urgent: u, important: i }) => {
            const active = current === q;
            return (
              <Tooltip key={q} content={QUADRANT_META[q].hint}>
                <button
                  type="button"
                  data-active={active}
                  onClick={() => (active ? onChange(null, null) : onChange(u, i))}
                  className={cn(
                    'flex h-14 items-center justify-center rounded-[10px] border border-line bg-surface-2 text-[12px] font-medium text-muted',
                    'transition-colors duration-150 hover:border-line-2 cursor-pointer',
                    CELL_STYLE[q],
                    active && 'border-transparent',
                  )}
                >
                  {QUADRANT_META[q].label}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Klein gekleurd pilletje op de kaart — alleen als de taak beoordeeld is. */
export function QuadrantPill({ urgent, important }: {
  urgent: boolean | null;
  important: boolean | null;
}) {
  const q = quadrant({ urgent, important });
  if (!q) return null;
  const style: Record<NonNullable<Quadrant>, string> = {
    'nu': 'bg-green-700 text-white',
    'plannen': 'bg-green-50 text-green-700 dark:text-green',
    'snel-weg': 'bg-surface-3 text-txt-2',
    'schrappen': 'bg-surface-3 text-muted',
  };
  return (
    <span className={cn('rounded-pill px-2 py-0.5 text-[10px] font-semibold', style[q])}>
      {QUADRANT_META[q].label}
    </span>
  );
}
