'use client';

import { useGoalsStore, mainMonthTarget } from '@/stores/useGoalsStore';
import { GoalProgressCard } from './GoalProgressCard';

/** Maandoel op het dashboard. */
export function WeekTargetCard() {
  const goals = useGoalsStore((s) => s.goals);
  return (
    <GoalProgressCard
      goal={mainMonthTarget(goals)}
      label="Maandoel"
      emptyHint="Maak een maanddoel aan"
    />
  );
}
