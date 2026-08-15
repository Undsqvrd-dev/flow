'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ThinScrollArea } from '@/components/ui/ThinScrollArea';
import { cn } from '@/lib/utils';

export function ContextMenuSurface({
  x,
  y,
  onClose,
  children,
}: {
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
    if (top + rect.height > window.innerHeight - pad) top = window.innerHeight - rect.height - pad;
    if (left < pad) left = pad;
    if (top < pad) top = pad;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [x, y]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ left: x, top: y }}
      className={cn(
        'fixed z-[80] flex h-auto max-h-[min(420px,calc(100vh-16px))] min-w-[200px] flex-col',
        'overflow-hidden rounded-card border border-line bg-surface shadow-soft-lg',
      )}
    >
      <ThinScrollArea className="flex max-h-[min(420px,calc(100vh-16px))] flex-col gap-0.5 p-1.5">
        {children}
      </ThinScrollArea>
    </div>,
    document.body,
  );
}

export function ContextMenuItem({
  children,
  onSelect,
  danger,
  active,
}: {
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px]',
        danger
          ? 'text-red hover:bg-red/10'
          : active
            ? 'bg-green-50 text-green'
            : 'text-txt-2 hover:bg-surface-3 hover:text-txt',
      )}
    >
      {children}
    </button>
  );
}

export function ContextMenuSeparator() {
  return <div className="my-1 h-px bg-line" role="separator" />;
}
