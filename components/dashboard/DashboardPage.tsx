'use client';

import Link from 'next/link';
import { Plus, Columns3 } from 'lucide-react';
import { StatRow } from './StatRow';
import { WeekTargetCard } from './WeekTargetCard';
import { YearGoalCard } from './YearGoalCard';
import { TimerCard } from './TimerCard';
import { MoodQuoteRow } from './MoodQuoteRow';
import { SportPanel } from '@/components/sport/SportWidgets';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/useUiStore';

export function DashboardPage() {
  const setNewTaskOpen = useUiStore((s) => s.setNewTaskOpen);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-txt">Goedendag, Steijn</h1>
          <p className="text-[13px] text-muted">Dit is waar vandaag om draait.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setNewTaskOpen(true)}>
            <Plus size={15} strokeWidth={2} /> Nieuwe taak
          </Button>
          <Link href="/board">
            <Button variant="primary">
              <Columns3 size={15} strokeWidth={2} /> Weekbord openen
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatRow />
        <TimerCard />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <WeekTargetCard />
        <YearGoalCard />
        <SportPanel />
      </div>

      <div className="mt-4">
        <MoodQuoteRow />
      </div>
    </div>
  );
}
