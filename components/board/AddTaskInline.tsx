'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { DayKey, Daypart } from '@/lib/types';
import { useBoardStore } from '@/stores/useBoardStore';
import { cn } from '@/lib/utils';

/** Taak toevoegen kost drie seconden: titel, Enter, klaar. */
export function AddTaskInline({
  dayKey,
  daypart,
  weekOf: columnWeekOf,
  position = 'end',
  insertBeforeId,
  autoEdit = false,
  onClose,
}: {
  dayKey: DayKey;
  daypart: Daypart | null;
  weekOf?: string;
  position?: 'start' | 'end';
  insertBeforeId?: string;
  autoEdit?: boolean;
  onClose?: () => void;
}) {
  const addTask = useBoardStore((s) => s.addTask);
  const [editing, setEditing] = useState(autoEdit);
  const [title, setTitle] = useState('');

  function close() {
    setTitle('');
    setEditing(false);
    onClose?.();
  }

  function submit() {
    const trimmed = title.trim();
    if (trimmed) {
      addTask({
        title: trimmed,
        dayKey,
        daypart,
        weekOf: columnWeekOf,
        ...(insertBeforeId ? { insertBeforeId } : { position }),
      });
    }
    close();
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-[10px] px-2 py-1.5',
          'text-[12px] font-medium text-muted-2 transition-colors duration-150',
          'hover:bg-surface-3 hover:text-txt-2 cursor-pointer',
        )}
      >
        <Plus size={13} strokeWidth={2} /> Taak
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') close();
      }}
      onBlur={() => submit()}
      placeholder="Titel + Enter"
      className="h-9 w-full rounded-card border border-green bg-surface px-3 text-[13px] text-txt outline-none placeholder:text-muted-2"
    />
  );
}
