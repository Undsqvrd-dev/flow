'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ChecklistItem } from '@/lib/types';
import { ProgressBar } from '@/components/ui/progress';
import { nextRank, uid, cn } from '@/lib/utils';

/** Checklist met voortgangsbalk; Enter maakt direct het volgende item. */
export function ChecklistEditor({ items, onChange }: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  const done = items.filter((i) => i.done).length;

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: uid(), text, done: false, rank: nextRank(items.map((i) => i.rank)) }]);
    setDraft('');
  }

  function toggle(id: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-semibold tabular-nums text-muted">{done}/{items.length}</span>
          <ProgressBar value={(done / items.length) * 100} />
        </div>
      )}
      <ul className="flex flex-col gap-0.5">
        {sorted.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 rounded-[8px] px-1 py-1 hover:bg-surface-2">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggle(item.id)}
              className="h-4 w-4 shrink-0 cursor-pointer accent-(--green)"
            />
            <span className={cn('flex-1 text-sm', item.done ? 'text-muted line-through' : 'text-txt-2')}>
              {item.text}
            </span>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="invisible text-muted-2 hover:text-red group-hover:visible cursor-pointer"
              aria-label="Verwijder stap"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex items-center gap-2">
        <Plus size={15} strokeWidth={1.75} className="shrink-0 text-muted-2" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Stap toevoegen…"
          className="h-8 flex-1 bg-transparent text-sm text-txt outline-none placeholder:text-muted-2"
        />
      </div>
    </div>
  );
}
