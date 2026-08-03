'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { DayKey, Daypart } from '@/lib/types';
import { useBoardStore } from '@/stores/useBoardStore';

/** Taak toevoegen kost drie seconden: titel, Enter, klaar. */
export function AddTaskInline({
  dayKey,
  daypart,
  weekOf: columnWeekOf,
}: {
  dayKey: DayKey;
  daypart: Daypart | null;
  weekOf?: string;
}) {
  const addTask = useBoardStore((s) => s.addTask);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');

  function submit() {
    const trimmed = title.trim();
    if (trimmed) addTask({ title: trimmed, dayKey, daypart, weekOf: columnWeekOf });
    setTitle('');
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[12px] font-medium text-muted-2 transition-colors duration-150 hover:bg-surface-3 hover:text-txt-2 cursor-pointer"
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
        if (e.key === 'Escape') { setTitle(''); setEditing(false); }
      }}
      onBlur={() => { submit(); setEditing(false); }}
      placeholder="Titel + Enter"
      className="h-9 w-full rounded-card border border-green bg-surface px-3 text-[13px] text-txt outline-none placeholder:text-muted-2"
    />
  );
}
