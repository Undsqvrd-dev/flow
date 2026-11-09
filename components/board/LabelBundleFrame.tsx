'use client';

import { useDndContext, useDroppable } from '@dnd-kit/core';
import { ChevronDown } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import type { LabelDef, Task } from '@/lib/types';
import { bundleDropId, tint, type LabelBundle } from '@/lib/labelBundle';
import { cn } from '@/lib/utils';

function frameStyle(color: string | undefined): CSSProperties | undefined {
  if (!color?.startsWith('#')) return undefined;
  return {
    backgroundColor: tint(color, 0.16),
    borderColor: tint(color, 0.55),
  };
}

/** Kleurblok om een labelgroep, met een kop om in en uit te klappen. */
export function LabelBundleFrame({
  bundle,
  tasks,
  label,
  open,
  onToggle,
  children,
}: {
  bundle: LabelBundle;
  tasks: Task[];
  label: LabelDef | undefined;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const name = label?.name ?? 'Bundel';
  const done = tasks.filter((task) => task.done).length;
  const dropId = bundleDropId(bundle.id);
  const { setNodeRef } = useDroppable({ id: dropId });
  const { active, over } = useDndContext();
  const activeId = active ? String(active.id) : '';
  const overId = over ? String(over.id) : '';
  const hot =
    activeId.length > 0 &&
    !bundle.taskIds.includes(activeId) &&
    (overId === dropId || tasks.some((task) => task.id === overId));

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col gap-1.5 rounded-card border border-green-200 bg-green-50 p-1.5 dark:border-green-700/50"
      style={{
        ...frameStyle(label?.color),
        ...(hot && label?.color ? { outline: `2px solid ${label.color}`, outlineOffset: 2 } : {}),
      }}
      aria-label={label ? `Gebundeld op ${name}` : 'Gebundelde taken'}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? `${name} inklappen` : `${name} uitklappen`}
        className="flex w-full items-center gap-1.5 rounded-[8px] px-1 py-0.5 text-left cursor-pointer"
      >
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn('shrink-0 text-muted transition-transform duration-150', !open && '-rotate-90')}
        />
        {label && (
          <span className="h-2 w-2 shrink-0 rounded-pill" style={{ backgroundColor: label.color }} />
        )}
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-txt">{name}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-muted">
          {done}/{tasks.length}
        </span>
      </button>
      {open && <div className="flex flex-col gap-1.5">{children}</div>}
    </div>
  );
}
