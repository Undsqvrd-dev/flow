'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useGoalsStore, activeGoals } from '@/stores/useGoalsStore';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

export function GoalsPanel() {
  const allGoals = useGoalsStore((s) => s.goals);
  const goals = activeGoals(allGoals);

  return (
    <div className="flex h-full flex-col rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="panel-label">Doelen</p>
        <Link href="/goals" className="inline-flex items-center gap-1 rounded-pill border border-line-2 px-2.5 py-1 text-[11px] font-medium text-txt-2 hover:bg-surface-2">
          <Plus size={12} strokeWidth={2} /> Nieuw
        </Link>
      </div>
      {goals.length === 0 ? (
        <p className="text-[13px] text-muted">Nog geen doelen. Zet je eerste doel op de doelenpagina.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {goals.slice(0, 6).map((g) => (
            <li key={g.id}>
              <Link href="/goals" className="flex items-center gap-2.5 rounded-[10px] px-1 py-0.5 hover:bg-surface-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-pill" style={{ backgroundColor: g.color }} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-txt">{g.title}</span>
                {g.deadline && (
                  <span className="text-[11px] text-muted">
                    {format(parseISO(g.deadline), 'd MMM', { locale: nl })}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
