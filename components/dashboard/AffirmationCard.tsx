'use client';

import { useSettingsStore } from '@/stores/useSettingsStore';

export function AffirmationCard() {
  const affirmation = useSettingsStore((s) => s.settings.affirmation);

  return (
    <div className="flex h-full flex-col rounded-panel border border-line bg-green-50 px-4 py-3 text-left shadow-soft-sm dark:bg-surface">
      <p className="text-[11px] font-semibold text-muted">Affirmaties</p>
      <p className="mt-1.5 whitespace-pre-line text-[15px] font-medium leading-snug text-txt">
        {affirmation}
      </p>
    </div>
  );
}
