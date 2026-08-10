'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ChecklistItem } from '@/lib/types';
import { ProgressBar } from '@/components/ui/progress';
import { nextRank, uid, cn } from '@/lib/utils';

/** Checklist met voortgangsbalk; items zijn inline bewerkbaar. */
export function ChecklistEditor({ items, onChange }: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
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

  function startEdit(item: ChecklistItem) {
    setEditingId(item.id);
    setEditText(item.text);
  }

  function commitEdit() {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) {
      remove(editingId);
    } else {
      onChange(items.map((i) => (i.id === editingId ? { ...i, text } : i)));
    }
    setEditingId(null);
    setEditText('');
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
            {editingId === item.id ? (
              <input
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') {
                    setEditingId(null);
                    setEditText('');
                  }
                }}
                className="h-7 min-w-0 flex-1 rounded-[6px] border border-green bg-surface px-2 text-sm text-txt outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => startEdit(item)}
                className={cn(
                  'min-w-0 flex-1 cursor-text rounded-[6px] px-1 py-0.5 text-left text-sm',
                  item.done ? 'text-muted line-through' : 'text-txt-2',
                )}
              >
                {item.text}
              </button>
            )}
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
