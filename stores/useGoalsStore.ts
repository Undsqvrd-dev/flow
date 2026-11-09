'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goal, GoalHorizon, GoalScope, LifeRule, Value } from '@/lib/types';
import { nextRank, uid } from '@/lib/utils';
import { UNKNOWN_UPDATED_AT } from '@/lib/db/conflict';
import {
  syncGoals,
  syncRemoveGoal,
  syncLifeRules,
  syncRemoveLifeRule,
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
  lifeRules: LifeRule[];

  addGoal: (input: NewGoalInput) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  incrementGoal: (id: string, delta: number) => void;

  addValue: (text: string) => void;
  updateValue: (id: string, text: string) => void;
  removeValue: (id: string) => void;

  addLifeRule: (text: string) => void;
  updateLifeRule: (id: string, text: string) => void;
  removeLifeRule: (id: string) => void;
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      goals: [],
      values: [],
      lifeRules: [],

      addGoal: (input) => {
        const now = new Date().toISOString();
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
          updatedAt: now,
        };
        const prev = get().goals;
        set((s) => ({ goals: [...s.goals, goal] }));
        syncGoals([goal], prev, () => set({ goals: prev }));
        return goal;
      },
      updateGoal: (id, patch) => {
        const prev = get().goals;
        const now = new Date().toISOString();
        const next = prev.map((g) =>
          g.id === id ? { ...g, ...patch, updatedAt: now } : g,
        );
        set({ goals: next });
        const updated = next.find((g) => g.id === id);
        if (updated) syncGoals([updated], prev, () => set({ goals: prev }));
      },
      removeGoal: (id) => {
        const prev = get().goals;
        set({ goals: prev.filter((g) => g.id !== id) });
        syncRemoveGoal(id, () => set({ goals: prev }));
      },
      incrementGoal: (id, delta) => {
        const prev = get().goals;
        const now = new Date().toISOString();
        const next = prev.map((g) =>
          g.id === id
            ? { ...g, currentValue: Math.max(0, g.currentValue + delta), updatedAt: now }
            : g,
        );
        set({ goals: next });
        const updated = next.find((g) => g.id === id);
        if (updated) syncGoals([updated], prev, () => set({ goals: prev }));
      },

      addValue: (text) => {
        const prev = get().values;
        const now = new Date().toISOString();
        const value: Value = {
          id: uid(),
          text,
          rank: nextRank(prev.map((v) => v.rank)),
          updatedAt: now,
        };
        set({ values: [...prev, value] });
        syncValues([value], prev, () => set({ values: prev }));
      },
      updateValue: (id, text) => {
        const prev = get().values;
        const now = new Date().toISOString();
        const next = prev.map((v) =>
          v.id === id ? { ...v, text, updatedAt: now } : v,
        );
        set({ values: next });
        const updated = next.find((v) => v.id === id);
        if (updated) syncValues([updated], prev, () => set({ values: prev }));
      },
      removeValue: (id) => {
        const prev = get().values;
        set({ values: prev.filter((v) => v.id !== id) });
        syncRemoveValue(id, () => set({ values: prev }));
      },

      addLifeRule: (text) => {
        const prev = get().lifeRules ?? [];
        const now = new Date().toISOString();
        const rule: LifeRule = {
          id: uid(),
          text,
          rank: nextRank(prev.map((rule) => rule.rank)),
          updatedAt: now,
        };
        set({ lifeRules: [...prev, rule] });
        syncLifeRules([rule], prev, () => set({ lifeRules: prev }));
      },
      updateLifeRule: (id, text) => {
        const prev = get().lifeRules ?? [];
        const now = new Date().toISOString();
        const next = prev.map((rule) => (rule.id === id ? { ...rule, text, updatedAt: now } : rule));
        set({ lifeRules: next });
        const updated = next.find((rule) => rule.id === id);
        if (updated) syncLifeRules([updated], prev, () => set({ lifeRules: prev }));
      },
      removeLifeRule: (id) => {
        const prev = get().lifeRules ?? [];
        set({ lifeRules: prev.filter((rule) => rule.id !== id) });
        syncRemoveLifeRule(id, () => set({ lifeRules: prev }));
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
            updatedAt: g.updatedAt ?? UNKNOWN_UPDATED_AT,
          })),
          values: (state.values ?? []).map((v) => ({
            ...v,
            updatedAt: v.updatedAt ?? UNKNOWN_UPDATED_AT,
          })),
          lifeRules: (state.lifeRules ?? []).map((rule) => ({
            ...rule,
            updatedAt: rule.updatedAt ?? UNKNOWN_UPDATED_AT,
          })),
        };
      },
      version: 3,
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
