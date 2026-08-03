'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LABELS, DEFAULT_SETTINGS, type LabelDef, type Settings } from '@/lib/types';
import { uid } from '@/lib/utils';

interface SettingsState {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  addLabel: (name: string, color: string) => void;
  updateLabel: (id: string, patch: Partial<Pick<LabelDef, 'name' | 'color'>>) => void;
  removeLabel: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      addLabel: (name, color) =>
        set((s) => ({
          settings: {
            ...s.settings,
            labels: [...s.settings.labels, { id: uid(), name, color }],
          },
        })),
      updateLabel: (id, patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            labels: s.settings.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)),
          },
        })),
      removeLabel: (id) =>
        set((s) => ({
          settings: {
            ...s.settings,
            labels: s.settings.labels.filter((l) => l.id !== id),
          },
        })),
    }),
    {
      name: 'flow-settings',
      version: 1,
      migrate: (persisted) => {
        const state = persisted as { settings: Settings };
        return {
          settings: {
            ...DEFAULT_SETTINGS,
            ...state.settings,
            labels: state.settings?.labels?.length ? state.settings.labels : DEFAULT_LABELS,
          },
        };
      },
    },
  ),
);

export function labelById(labels: LabelDef[], id: string): LabelDef | undefined {
  return labels.find((l) => l.id === id);
}
