'use client';

import { useSettingsStore } from '@/stores/useSettingsStore';
import { useGoalsStore } from '@/stores/useGoalsStore';
import { cn } from '@/lib/utils';

/** Mantra groot, kernwaarden als pills. */
export function MantraCard({ fill = false }: { fill?: boolean }) {
  const mantra = useSettingsStore((s) => s.settings.mantra);
  const allValues = useGoalsStore((s) => s.values);
  const values = [...allValues].sort((a, b) => a.rank - b.rank);

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center rounded-panel border border-line bg-surface p-6 text-center shadow-soft-sm md:p-8',
        fill ? 'h-full min-h-[180px]' : 'min-h-[180px]',
      )}
    >
      <p className="text-[20px] font-bold leading-snug tracking-tight text-txt md:text-[26px]">
        “{mantra}”
      </p>
      {values.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {values.map((v) => (
            <span
              key={v.id}
              className="rounded-pill bg-green-50 px-3 py-1 text-[12px] font-medium text-green-700 dark:text-green"
            >
              {v.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
