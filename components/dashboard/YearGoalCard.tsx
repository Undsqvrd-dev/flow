'use client';

import { useGoalsStore, mainYearGoal } from '@/stores/useGoalsStore';
import { GoalProgressCard } from './GoalProgressCard';

/** Jaardoel op het dashboard. */
export function YearGoalCard() {
  const goals = useGoalsStore((s) => s.goals);
  return (
    <GoalProgressCard
      goal={mainYearGoal(goals)}
      label="Jaardoel"
      emptyHint="Maak een jaardoel aan"
    />
  );
}
