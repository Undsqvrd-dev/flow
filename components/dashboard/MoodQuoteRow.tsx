'use client';

import Link from 'next/link';
import { MantraCard } from './MantraCard';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { MoodboardImage } from '@/lib/types';
import { cn } from '@/lib/utils';

function PhotoTile({ img }: { img: MoodboardImage }) {
  return (
    <Link
      href="/settings"
      className="block h-full min-h-[180px] overflow-hidden rounded-panel border border-line shadow-soft-sm"
      aria-label="Moodboard bewerken"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.url} alt="" className="h-full w-full object-cover" />
    </Link>
  );
}

/**
 * Max 3 fototegels.
 * 0–1 foto: quote vult de rest van de rij.
 * 2–3 foto’s: alleen fototegels op de rij, quote eronder.
 */
export function MoodQuoteRow() {
  const images = useSettingsStore((s) => s.settings.moodboardImages).slice(0, 3);
  const count = images.length;
  const quoteBeside = count < 2;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          'grid gap-4',
          count === 0 && 'grid-cols-1',
          count === 1 && 'sm:grid-cols-3',
          count === 2 && 'sm:grid-cols-2',
          count >= 3 && 'sm:grid-cols-3',
        )}
      >
        {images.map((img) => (
          <PhotoTile key={img.id} img={img} />
        ))}

        {quoteBeside && (
          <div className={cn('min-h-[180px]', count === 1 && 'sm:col-span-2')}>
            <div className="h-full">
              <MantraCard fill />
            </div>
          </div>
        )}
      </div>

      {!quoteBeside && <MantraCard />}
    </div>
  );
}
