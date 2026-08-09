'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LABELS, DEFAULT_SETTINGS, type LabelDef, type Settings } from '@/lib/types';
import { uid } from '@/lib/utils';
import { getQuickWinBundleCache } from '@/lib/db/bundleCache';
import { syncSettingsData } from '@/lib/db/storeSync';

interface SettingsState {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  addLabel: (name: string, color: string) => void;
  updateLabel: (id: string, patch: Partial<Pick<LabelDef, 'name' | 'color'>>) => void;
  removeLabel: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      update: (patch) => {
        const prev = get().settings;
        set({ settings: { ...prev, ...patch } });
        syncSettingsData(get().settings, getQuickWinBundleCache(), () =>
          set({ settings: prev }),
        );
      },
      addLabel: (name, color) => {
        const prev = get().settings;
        set({
          settings: {
            ...prev,
            labels: [...prev.labels, { id: uid(), name, color }],
          },
        });
        syncSettingsData(get().settings, getQuickWinBundleCache(), () =>
          set({ settings: prev }),
        );
      },
      updateLabel: (id, patch) => {
        const prev = get().settings;
        set({
          settings: {
            ...prev,
            labels: prev.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)),
          },
        });
        syncSettingsData(get().settings, getQuickWinBundleCache(), () =>
          set({ settings: prev }),
        );
      },
      removeLabel: (id) => {
        const prev = get().settings;
        set({
          settings: {
            ...prev,
            labels: prev.labels.filter((l) => l.id !== id),
          },
        });
        syncSettingsData(get().settings, getQuickWinBundleCache(), () =>
          set({ settings: prev }),
        );
      },
    }),
    {
      name: 'flow-settings',
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { settings: Settings };
        return {
          settings: {
            ...DEFAULT_SETTINGS,
            ...state.settings,
            labels: state.settings?.labels?.length ? state.settings.labels : DEFAULT_LABELS,
            moodboardImages: state.settings?.moodboardImages ?? [],
          },
        };
      },
    },
  ),
);

export function labelById(labels: LabelDef[], id: string): LabelDef | undefined {
  return labels.find((l) => l.id === id);
}
