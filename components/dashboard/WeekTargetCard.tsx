'use client';

import { Minus, Target } from 'lucide-react';
import Link from 'next/link';
import { useGoalsStore, mainMonthTarget } from '@/stores/useGoalsStore';
import { ProgressBar } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/** Hoofdtarget = actief maanddoel met targetwaarde. Geen keuze nodig. */
export function WeekTargetCard() {
  const goals = useGoalsStore((s) => s.goals);
  const incrementGoal = useGoalsStore((s) => s.incrementGoal);
  const goal = mainMonthTarget(goals);

  const pct =
    goal?.targetValue && goal.targetValue > 0
      ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
      : null;

  return (
    <div className="flex h-full min-h-[220px] flex-col rounded-panel border border-line bg-surface p-6 shadow-soft-sm md:p-7">
      <div className="mb-4 flex items-center gap-2">
        <Target size={16} strokeWidth={1.75} className="text-green" />
        <p className="panel-label !mb-0">Maandtarget</p>
      </div>

      {!goal ? (
        <p className="text-[14px] text-muted">
          Zet een target bij een{' '}
          <Link href="/goals" className="font-medium text-green hover:underline">
            maanddoel
          </Link>
          {' '}— dat wordt automatisch je hoofdtarget.
        </p>
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="mb-4 flex items-center gap-2.5">
            <span
              className="h-3 w-3 shrink-0 rounded-pill"
              style={{ backgroundColor: goal.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-txt">
              {goal.title}
            </span>
            {pct !== null && (
              <span className="text-[14px] font-semibold tabular-nums text-green">{pct}%</span>
            )}
          </div>

          <div className="mb-4 flex items-baseline gap-3">
            <p className="text-[48px] font-bold leading-none tabular-nums tracking-tight text-txt">
              {goal.currentValue}
              <span className="text-[24px] font-semibold text-muted">
                /{goal.targetValue}
              </span>
            </p>
            {goal.unit && (
              <span className="text-[14px] text-muted">{goal.unit}</span>
            )}
          </div>
          <div className="mb-5">
            <ProgressBar value={pct ?? 0} />
          </div>
          <div className="mt-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => incrementGoal(goal.id, -1)}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-pill border border-line bg-surface',
                'text-[13px] font-medium text-txt-2 hover:bg-surface-2 cursor-pointer',
              )}
              aria-label="Target verlagen"
            >
              <Minus size={12} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => incrementGoal(goal.id, 1)}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-pill border border-line bg-surface',
                'text-[14px] leading-none hover:bg-surface-2 cursor-pointer',
              )}
              aria-label="Target verhogen"
            >
              🎉
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
