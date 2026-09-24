'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { onConfetti } from '@/lib/confetti';

type Piece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  drift: number;
  spin: number;
  rect: boolean;
};

const COLORS = [
  'var(--green)',
  'var(--green-400)',
  'var(--green-700)',
  'var(--amber)',
  'var(--green-200)',
];

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 280,
    duration: 1400 + Math.random() * 900,
    color: COLORS[i % COLORS.length],
    size: 5 + Math.random() * 5,
    drift: (Math.random() - 0.5) * 120,
    spin: (Math.random() - 0.5) * 720,
    rect: Math.random() > 0.45,
  }));
}

function Burst({ burstId, onDone }: { burstId: number; onDone: () => void }) {
  const pieces = useMemo(() => makePieces(42), [burstId]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t = window.setTimeout(() => onDoneRef.current(), 2300);
    return () => window.clearTimeout(t);
  }, [burstId]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={`${burstId}-${p.id}`}
          className="confetti-piece absolute top-[-12px]"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.rect ? p.size * 1.7 : p.size,
              backgroundColor: p.color,
              borderRadius: p.rect ? 2 : 999,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
              '--confetti-drift': `${p.drift}px`,
              '--confetti-spin': `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Vast in de shell; luistert naar `fireConfetti()`. */
export function ConfettiOverlay() {
  const [bursts, setBursts] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return onConfetti((id) => setBursts((prev) => [...prev, id]));
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {bursts.map((id) => (
        <Burst
          key={id}
          burstId={id}
          onDone={() => setBursts((prev) => prev.filter((b) => b !== id))}
        />
      ))}
    </>,
    document.body,
  );
}
