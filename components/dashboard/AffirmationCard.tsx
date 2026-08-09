'use client';

import { useSettingsStore } from '@/stores/useSettingsStore';
import { cn } from '@/lib/utils';

export function AffirmationCard({ fill = false }: { fill?: boolean }) {
  const affirmation = useSettingsStore((s) => s.settings.affirmation);

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center rounded-panel border border-line bg-green-50 p-5 shadow-soft-sm dark:bg-surface md:p-6',
        fill ? 'h-full min-h-[180px]' : 'min-h-[180px]',
      )}
    >
      <p className="w-full max-w-[16rem] whitespace-pre-line text-left text-[15px] font-semibold leading-snug tracking-tight text-txt md:text-[17px]">
        {affirmation}
      </p>
    </div>
  );
}
