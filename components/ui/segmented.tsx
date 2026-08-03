'use client';

import { cn } from '@/lib/utils';

export function Segmented<T extends string>({ options, value, onChange, className }: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex rounded-pill border border-line bg-surface-2 p-0.5', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className={cn(
            'rounded-pill px-3 py-1 text-[12px] font-medium transition-colors duration-150 cursor-pointer',
            value === opt.value ? 'bg-surface text-green shadow-soft-sm' : 'text-muted hover:text-txt-2',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
