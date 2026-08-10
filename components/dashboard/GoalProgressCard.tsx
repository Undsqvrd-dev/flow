'use client';

import { Minus, Target } from 'lucide-react';
import Link from 'next/link';
import type { Goal } from '@/lib/types';
import { ProgressBar } from '@/components/ui/progress';
import { useGoalsStore } from '@/stores/useGoalsStore';
import { cn } from '@/lib/utils';

export function GoalProgressCard({
  goal,
  label,
  emptyHint,
}: {
  goal: Goal | undefined;
  label: string;
  emptyHint: string;
}) {
  const incrementGoal = useGoalsStore((s) => s.incrementGoal);
  const hasTarget =
    goal?.targetValue !== null && goal?.targetValue !== undefined && goal.targetValue > 0;
  const pct =
    goal && hasTarget
      ? Math.min(100, Math.round((goal.currentValue / (goal.targetValue as number)) * 100))
      : null;

  return (
    <div className="flex h-full min-h-[200px] flex-col rounded-panel border border-line bg-surface p-5 shadow-soft-sm md:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Target size={16} strokeWidth={1.75} className="text-green" />
        <p className="panel-label !mb-0">{label}</p>
      </div>

      {!goal ? (
        <p className="text-[14px] text-muted">
          <Link href="/goals" className="font-medium text-green hover:underline">
            {emptyHint}
          </Link>
        </p>
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="mb-3 flex items-center gap-2.5">
            <span
              className="h-3 w-3 shrink-0 rounded-pill"
              style={{ backgroundColor: goal.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-txt">
              {goal.title}
            </span>
            {pct !== null && (
              <span className="text-[13px] font-semibold tabular-nums text-green">{pct}%</span>
            )}
          </div>

          {hasTarget ? (
            <>
              <div className="mb-3 flex items-baseline gap-2">
                <p className="text-[36px] font-bold leading-none tabular-nums tracking-tight text-txt">
                  {goal.currentValue}
                  <span className="text-[20px] font-semibold text-muted">/{goal.targetValue}</span>
                </p>
                {goal.unit && <span className="text-[13px] text-muted">{goal.unit}</span>}
              </div>
              <div className="mb-4">
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
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
