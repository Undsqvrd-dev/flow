'use client';

import { useSettingsStore } from '@/stores/useSettingsStore';

/** Kleine mantra, met een titel erboven. */
export function MantraCard() {
  const mantra = useSettingsStore((s) => s.settings.mantra);

  return (
    <div className="flex h-full flex-col rounded-panel border border-line bg-surface px-4 py-3 text-left shadow-soft-sm">
      <p className="text-[11px] font-semibold text-muted">Mantra</p>
      <p className="mt-1.5 text-[15px] font-medium leading-snug text-txt">“{mantra}”</p>
    </div>
  );
}
