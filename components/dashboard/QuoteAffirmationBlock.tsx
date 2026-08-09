'use client';

import { AffirmationCard } from './AffirmationCard';
import { MantraCard } from './MantraCard';
import { cn } from '@/lib/utils';

/** Quote 2/3 + affirmatie 1/3 — altijd even hoog. */
export function QuoteAffirmationBlock({ fill = false }: { fill?: boolean }) {
  return (
    <div
      className={cn(
        'grid items-stretch gap-4 sm:grid-cols-3',
        fill ? 'h-full min-h-[180px]' : 'min-h-[180px]',
      )}
    >
      <div className="flex h-full min-h-[180px] sm:col-span-2">
        <MantraCard fill />
      </div>
      <div className="flex h-full min-h-[180px]">
        <AffirmationCard fill />
      </div>
    </div>
  );
}
