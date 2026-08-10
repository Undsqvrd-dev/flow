'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Thumb = { top: number; height: number; show: boolean };

/** Verbergt de systeembalk; toont een 2px-indicator bij hover. */
export function ThinScrollArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [thumb, setThumb] = useState<Thumb>({ top: 0, height: 0, show: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      const node = ref.current;
      if (!node) return;
      const { scrollTop, scrollHeight, clientHeight } = node;
      if (scrollHeight <= clientHeight + 1) {
        setThumb((t) => (t.show ? { ...t, show: false } : t));
        return;
      }
      const height = Math.max(20, (clientHeight / scrollHeight) * clientHeight);
      const maxTop = clientHeight - height;
      const top =
        maxTop <= 0
          ? 0
          : (scrollTop / (scrollHeight - clientHeight)) * maxTop;
      setThumb({ top, height, show: true });
    }

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    el.addEventListener('scroll', update, { passive: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, []);

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 flex-col"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div ref={ref} className={cn('thin-scroll min-h-0 flex-1 overflow-y-auto', className)}>
        {children}
      </div>
      {thumb.show && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 right-[3px] w-[2px] transition-opacity duration-150',
            hover ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div
            className="absolute inset-x-0 rounded-pill bg-muted-2/60"
            style={{ top: thumb.top, height: thumb.height }}
          />
        </div>
      )}
    </div>
  );
}
