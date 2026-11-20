'use client';

import { Zap } from 'lucide-react';
import { ritualStreak } from '@/lib/meditation';
import { ritualPrefixFromKey } from '@/lib/recurring';
import { useTodayISO } from '@/lib/useTodayISO';
import { cn } from '@/lib/utils';
import { useBoardStore } from '@/stores/useBoardStore';
import { useRecurringStore } from '@/stores/useRecurringStore';

/**
 * Bliksem + huidige streak.
 * Mediteren houdt de bestaande berekening. Andere routines tonen hem alleen
 * als streak aan staat. Zolang de routinelijst nog niet geladen is, blijft
 * het bliksem voor Mediteren zichtbaar.
 */
export function MeditationStreakMark({
  ritualKey,
  className,
}: {
  ritualKey?: string | null;
  className?: string;
}) {
  const today = useTodayISO();
  const prefix = ritualPrefixFromKey(ritualKey);
  const status = useRecurringStore((s) => s.status);
  const routine = useRecurringStore((s) =>
    prefix ? s.items.find((item) => item.ritualPrefix === prefix) : undefined,
  );
  const enabled = prefix != null && (routine ? routine.streak : status !== 'ready' && prefix === 'mediteren');
  const current = useBoardStore((s) => (prefix ? ritualStreak(s.tasks, prefix, today).current : 0));
  if (!enabled || !prefix) return null;

  const name = prefix === 'mediteren' ? 'Meditatie streak' : 'Streak';
  const label = `${name}: ${current} ${current === 1 ? 'dag' : 'dagen'}`;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-pill bg-green-50 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none text-green',
        className,
      )}
      title={name}
      aria-label={label}
    >
      <Zap size={11} strokeWidth={2.25} aria-hidden />
      {current}
    </span>
  );
}
