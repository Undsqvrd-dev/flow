'use client';

import { useGoalsStore, mainYearGoal } from '@/stores/useGoalsStore';
import { GoalProgressCard } from './GoalProgressCard';

/** Jaartarget op het dashboard. */
export function YearGoalCard() {
  const goals = useGoalsStore((s) => s.goals);
  return (
    <GoalProgressCard
      goal={mainYearGoal(goals)}
      label="Jaartarget"
      emptyHint="Maak een jaartarget aan"
    />
  );
}
