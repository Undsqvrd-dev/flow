'use client';

import { useEffect, useState } from 'react';
import { hexToHue, hslToHex, normalizeHex } from '@/lib/color';
import { LABEL_PALETTE } from '@/lib/labels';
import { cn } from '@/lib/utils';

const SPECTRUM =
  'linear-gradient(to right, #ef4444 0%, #f97316 14%, #eab308 28%, #22c55e 42%, #14b8a6 57%, #3b82f6 71%, #8b5cf6 85%, #ec4899 100%)';

type Props = {
  value: string;
  onChange: (hex: string) => void;
  showPresets?: boolean;
  offsetClass?: string;
};

/** Spectrumbalk + vrije kleurkeuze (elk hex) + snelle presets. */
export function ColorPicker({
  value,
  onChange,
  showPresets = true,
  offsetClass = 'ring-offset-surface',
}: Props) {
  const hex = normalizeHex(value);
  const [hexDraft, setHexDraft] = useState(hex);
  const hue = hexToHue(hex);

  useEffect(() => {
    setHexDraft(hex);
  }, [hex]);

  function setFromHue(h: number) {
    const next = hslToHex(h, 0.72, 0.42);
    setHexDraft(next);
    onChange(next);
  }

  function setHex(raw: string) {
    const next = normalizeHex(raw);
    setHexDraft(next);
    if (/^#[0-9A-F]{6}$/.test(next)) onChange(next);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative h-8 w-full">
        <div
          className="absolute inset-0 rounded-pill border border-line"
          style={{ background: SPECTRUM }}
        />
        <input
          type="range"
          min={0}
          max={360}
          value={hue}
          onChange={(e) => setFromHue(Number(e.target.value))}
          aria-label="Kleur spectrum"
          className={cn(
            'absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none bg-transparent',
            '[&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent',
            '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-pill',
            '[&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-transparent',
            '[&::-moz-range-track]:h-full [&::-moz-range-track]:bg-transparent',
            '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-pill',
            '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent',
          )}
        />
        <div
          className="pointer-events-none absolute top-1/2 z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-white shadow-soft"
          style={{
            left: `${(hue / 360) * 100}%`,
            backgroundColor: hex,
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <label
          className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-pill border border-line shadow-soft-sm"
          title="Kies elke kleur"
        >
          <span className="absolute inset-0" style={{ backgroundColor: hex }} />
          <input
            type="color"
            value={/^#[0-9A-F]{6}$/.test(hex) ? hex : '#1F9254'}
            onChange={(e) => setHex(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Kleurkiezer"
          />
        </label>
        <input
          value={hexDraft}
          onChange={(e) => setHexDraft(e.target.value)}
          onBlur={() => setHex(hexDraft)}
          onKeyDown={(e) => e.key === 'Enter' && setHex(hexDraft)}
          spellCheck={false}
          className="h-9 min-w-0 flex-1 rounded-[10px] border border-line bg-surface px-3 font-mono text-[12px] text-txt outline-none focus:border-green"
          aria-label="Hex kleurcode"
        />
      </div>

      {showPresets && (
        <div className="flex flex-wrap gap-1.5">
          {LABEL_PALETTE.map((c) => {
            const selected = hex.toUpperCase() === c.toUpperCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => setHex(c)}
                className={cn(
                  'h-5 w-5 rounded-pill border border-line/40 cursor-pointer transition-transform',
                  selected && `scale-110 ring-2 ring-offset-2 ${offsetClass}`,
                )}
                style={{
                  backgroundColor: c,
                  ...(selected ? { ['--tw-ring-color' as string]: c === '#FFFFFF' ? '#171C19' : c } : {}),
                }}
                aria-label={`Preset ${c}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
