'use client';

import { cn } from '@/lib/utils';

/** Dun voortgangsbalkje; 500ms ease voor ringen en balken. */
export function ProgressBar({ value, className, trackClassName }: {
  value: number; // 0–100
  className?: string;
  trackClassName?: string;
}) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-pill bg-surface-3', trackClassName)}>
      <div
        className={cn('h-full rounded-pill bg-green transition-[width] duration-500', className)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)' }}
      />
    </div>
  );
}

/** Voortgangsring (SVG), gebruikt voor sportmeter, timer en doelvoortgang. */
export function ProgressRing({ value, size = 64, stroke = 6, className, children, color }: {
  value: number; // 0–100
  size?: number;
  stroke?: number;
  className?: string;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color ?? 'var(--green)'} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          style={{ transition: 'stroke-dasharray 500ms cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
