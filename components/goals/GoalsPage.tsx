'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { GoalCard } from './GoalCard';
import { GoalFormDialog } from './GoalFormDialog';
import { MantraEditor, ValuesEditor } from './ValuesAndQuotes';
import { YearWeeks } from './YearWeeks';
import { Button } from '@/components/ui/button';
import { useGoalsStore, activeGoals } from '@/stores/useGoalsStore';
import { horizonLabel } from '@/lib/dates';
import type { GoalHorizon } from '@/lib/types';

/** Maand bovenaan, dan kwartaal, dan jaar. */
const HORIZONS: GoalHorizon[] = ['maand', 'kwartaal', 'jaar'];

function GoalHorizonSection({ horizon }: { horizon: GoalHorizon }) {
  const allGoals = useGoalsStore((s) => s.goals);
  const goals = activeGoals(allGoals).filter((g) => (g.horizon ?? 'jaar') === horizon);
  const [formOpen, setFormOpen] = useState(false);
  const title = horizonLabel(horizon);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold capitalize text-txt">{title}</h2>
        <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
          <Plus size={14} strokeWidth={2} /> Nieuw
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {goals.length === 0 && (
          <div className="hatched rounded-panel border border-line p-6 text-center text-[13px] text-muted">
            Nog geen doelen voor {title}.
          </div>
        )}
        {goals.map((g) => <GoalCard key={g.id} goal={g} />)}
      </div>
      <GoalFormDialog open={formOpen} onOpenChange={setFormOpen} defaultHorizon={horizon} />
    </section>
  );
}

export function GoalsPage() {
  return (
    <div>
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <div className="flex flex-col gap-8">
          {HORIZONS.map((h) => (
            <GoalHorizonSection key={h} horizon={h} />
          ))}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <MantraEditor />
          <ValuesEditor />
        </div>

        <div className="mt-8">
          <YearWeeks />
        </div>
      </div>
    </div>
  );
}
