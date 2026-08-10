'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goal, GoalHorizon, GoalScope, Value } from '@/lib/types';
import { nextRank, uid } from '@/lib/utils';
import {
  syncGoals,
  syncRemoveGoal,
  syncRemoveValue,
  syncValues,
} from '@/lib/db/storeSync';

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
        const prev = get().goals;
        set((s) => ({ goals: [...s.goals, goal] }));
        syncGoals([goal], () => set({ goals: prev }));
        return goal;
      },
      updateGoal: (id, patch) => {
        const prev = get().goals;
        const next = prev.map((g) => (g.id === id ? { ...g, ...patch } : g));
        set({ goals: next });
        const updated = next.find((g) => g.id === id);
        if (updated) syncGoals([updated], () => set({ goals: prev }));
      },
      removeGoal: (id) => {
        const prev = get().goals;
        set({ goals: prev.filter((g) => g.id !== id) });
        syncRemoveGoal(id, () => set({ goals: prev }));
      },
      incrementGoal: (id, delta) => {
        const prev = get().goals;
        const next = prev.map((g) =>
          g.id === id ? { ...g, currentValue: Math.max(0, g.currentValue + delta) } : g,
        );
        set({ goals: next });
        const updated = next.find((g) => g.id === id);
        if (updated) syncGoals([updated], () => set({ goals: prev }));
      },

      addValue: (text) => {
        const prev = get().values;
        const value: Value = {
          id: uid(),
          text,
          rank: nextRank(prev.map((v) => v.rank)),
        };
        set({ values: [...prev, value] });
        syncValues([value], () => set({ values: prev }));
      },
      updateValue: (id, text) => {
        const prev = get().values;
        const next = prev.map((v) => (v.id === id ? { ...v, text } : v));
        set({ values: next });
        const updated = next.find((v) => v.id === id);
        if (updated) syncValues([updated], () => set({ values: prev }));
      },
      removeValue: (id) => {
        const prev = get().values;
        set({ values: prev.filter((v) => v.id !== id) });
        syncRemoveValue(id, () => set({ values: prev }));
      },
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
    .map((g) => ({ ...g, horizon: g.horizon ?? ('jaar' as GoalHorizon) }))
    .filter((g) => g.active)
    .sort((a, b) => a.rank - b.rank);
}

/**
 * Hoofd-maandoel: eerste actieve maanddoel (op rank).
 * Heeft voorkeur voor een doel met targetwaarde; anders het eerste maanddoel.
 */
export function mainMonthTarget(goals: Goal[]): Goal | undefined {
  const month = activeGoals(goals).filter((g) => g.horizon === 'maand');
  return (
    month.find((g) => g.targetValue !== null && g.targetValue > 0) ?? month[0]
  );
}

/** Eerste actieve jaardoel (voorkeur met targetwaarde). */
export function mainYearGoal(goals: Goal[]): Goal | undefined {
  const year = activeGoals(goals).filter((g) => g.horizon === 'jaar');
  return (
    year.find((g) => g.targetValue !== null && g.targetValue > 0) ?? year[0]
  );
}
