/** Lichtgewicht pub/sub voor schermbrede confetti-bursts. */

type ConfettiListener = (burstId: number) => void;

const listeners = new Set<ConfettiListener>();
let seq = 0;

export function fireConfetti(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const id = ++seq;
  listeners.forEach((l) => l(id));
}

export function onConfetti(listener: ConfettiListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
