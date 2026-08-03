'use client';

import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { Goal } from '@/lib/types';
import { GoalFormDialog } from './GoalFormDialog';
import { ProgressBar } from '@/components/ui/progress';
import { useBoardStore } from '@/stores/useBoardStore';
import { useGoalsStore } from '@/stores/useGoalsStore';
import { daysUntil, weekOf } from '@/lib/dates';

export function GoalCard({ goal }: { goal: Goal }) {
  const tasks = useBoardStore((s) => s.tasks);
  const removeGoal = useGoalsStore((s) => s.removeGoal);
  const incrementGoal = useGoalsStore((s) => s.incrementGoal);
  const [editOpen, setEditOpen] = useState(false);

  const linked = tasks.filter((t) => t.goalId === goal.id && t.weekOf === weekOf());
  const openCount = linked.filter((t) => !t.done).length;
  const doneCount = linked.filter((t) => t.done).length;
  const pct = goal.targetValue
    ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="group w-full rounded-panel border border-line bg-surface p-4 text-left shadow-soft-sm transition-shadow duration-150 hover:shadow-soft cursor-pointer"
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-pill" style={{ backgroundColor: goal.color }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[14.5px] font-bold text-txt">{goal.title}</p>
              <span className="shrink-0 rounded-pill bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-muted">
                {goal.scope === 'zakelijk' ? 'Zakelijk' : 'Privé'}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted">
              {goal.targetValue !== null
                ? `${goal.currentValue} / ${goal.targetValue} ${goal.unit ?? ''}`.trim()
                : goal.currentValue > 0
                  ? `${goal.currentValue} ${goal.unit ?? ''}`.trim()
                  : 'Nog geen voortgang'}
              {goal.deadline && ` · nog ${daysUntil(goal.deadline)} dagen`}
            </p>
          </div>
        </div>

        {pct !== null && (
          <div className="mt-3 flex items-center gap-2">
            <ProgressBar value={pct} trackClassName="flex-1" />
            <span className="text-[11px] font-semibold tabular-nums text-muted">{pct}%</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted">
            {openCount} open · {doneCount} afgerond deze week
          </p>
          <div className="flex items-center gap-0.5">
            {/* Snelle voortgang ±1 zonder de modal te openen */}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); incrementGoal(goal.id, -1); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  incrementGoal(goal.id, -1);
                }
              }}
              className="rounded-[6px] p-1 text-muted hover:bg-surface-3 hover:text-txt cursor-pointer"
              aria-label="Voortgang -1"
            >
              <Minus size={14} strokeWidth={2} />
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); incrementGoal(goal.id, 1); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  incrementGoal(goal.id, 1);
                }
              }}
              className="rounded-[6px] p-1 text-muted hover:bg-surface-3 hover:text-green cursor-pointer"
              aria-label="Voortgang +1"
            >
              <Plus size={14} strokeWidth={2} />
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); removeGoal(goal.id); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  removeGoal(goal.id);
                }
              }}
              className="invisible rounded-[6px] p-1 text-muted hover:bg-red/10 hover:text-red group-hover:visible cursor-pointer"
              aria-label="Verwijderen"
            >
              <Trash2 size={13} strokeWidth={1.75} />
            </span>
          </div>
        </div>
      </button>

      <GoalFormDialog open={editOpen} onOpenChange={setEditOpen} goal={goal} />
    </>
  );
}
