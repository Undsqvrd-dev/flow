'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goal, GoalHorizon, GoalScope, Value } from '@/lib/types';
import { nextRank, uid } from '@/lib/utils';

export interface NewGoalInput {
  title: string;
  scope: GoalScope;
  horizon: GoalHorizon;
  color?: string;
  targetValue?: number | null;
  unit?: string | null;
  deadline?: string | null;
}

interface GoalsState {
  goals: Goal[];
  values: Value[];

  addGoal: (input: NewGoalInput) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  incrementGoal: (id: string, delta: number) => void;

  addValue: (text: string) => void;
  updateValue: (id: string, text: string) => void;
  removeValue: (id: string) => void;
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      goals: [],
      values: [],

      addGoal: (input) => {
        const goal: Goal = {
          id: uid(),
          title: input.title,
          scope: input.scope,
          horizon: input.horizon,
          color: input.color ?? '#1F9254',
          targetValue: input.targetValue ?? null,
          currentValue: 0,
          unit: input.unit ?? null,
          deadline: input.deadline ?? null,
          active: true,
          rank: nextRank(get().goals.map((g) => g.rank)),
        };
        set((s) => ({ goals: [...s.goals, goal] }));
        return goal;
      },
      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      incrementGoal: (id, delta) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, currentValue: Math.max(0, g.currentValue + delta) } : g,
          ),
        })),

      addValue: (text) =>
        set((s) => ({
          values: [...s.values, { id: uid(), text, rank: nextRank(s.values.map((v) => v.rank)) }],
        })),
      updateValue: (id, text) =>
        set((s) => ({ values: s.values.map((v) => (v.id === id ? { ...v, text } : v)) })),
      removeValue: (id) => set((s) => ({ values: s.values.filter((v) => v.id !== id) })),
    }),
    {
      name: 'flow-goals',
      migrate: (persisted) => {
        const state = persisted as GoalsState;
        return {
          ...state,
          quotes: undefined,
          goals: (state.goals ?? []).map((g) => ({
            ...g,
            horizon: g.horizon ?? 'jaar',
          })),
        };
      },
      version: 1,
    },
  ),
);

export function goalById(goals: Goal[], id: string | null | undefined): Goal | undefined {
  return id ? goals.find((g) => g.id === id) : undefined;
}

export function activeGoals(goals: Goal[]): Goal[] {
  return goals
    .map((g) => ({ ...g, horizon: g.horizon ?? 'jaar' as GoalHorizon }))
    .filter((g) => g.active)
    .sort((a, b) => a.rank - b.rank);
}

/**
 * Hoofdtarget: eerste actieve maanddoel met een targetwaarde (op rank).
 * Wordt getoond op dashboard en weekbord.
 */
export function mainMonthTarget(goals: Goal[]): Goal | undefined {
  return activeGoals(goals).find(
    (g) => g.horizon === 'maand' && g.targetValue !== null && g.targetValue > 0,
  );
}
