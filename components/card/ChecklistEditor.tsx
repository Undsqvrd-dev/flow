'use client';

import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CheckSquare, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import type { ChecklistItem } from '@/lib/types';
import { ProgressBar } from '@/components/ui/progress';
import { SortableChecklistItem } from './SortableChecklistItem';
import { RANK_STEP, nextRank, uid, cn } from '@/lib/utils';

/** Checklist met voortgangsbalk, slepen en inline bewerken. */
export function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [hideDone, setHideDone] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  const done = items.filter((i) => i.done).length;
  const visible = hideDone ? sorted.filter((i) => !i.done) : sorted;
  const pct = items.length === 0 ? 0 : (done / items.length) * 100;

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([
      ...items,
      { id: uid(), text, done: false, rank: nextRank(items.map((i) => i.rank)) },
    ]);
    setDraft('');
  }

  function toggle(id: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function clearAll() {
    if (items.length === 0) return;
    if (!window.confirm('Hele checklist verwijderen?')) return;
    onChange([]);
    setHideDone(false);
  }

  function commitEdit() {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) remove(editingId);
    else onChange(items.map((i) => (i.id === editingId ? { ...i, text } : i)));
    setEditingId(null);
    setEditText('');
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = visible.findIndex((i) => i.id === active.id);
    const newIndex = visible.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const moved = arrayMove(visible, oldIndex, newIndex);
    let next: ChecklistItem[];
    if (!hideDone) {
      next = moved;
    } else {
      let vi = 0;
      next = sorted.map((item) => (item.done ? item : moved[vi++]));
    }
    onChange(next.map((item, i) => ({ ...item, rank: (i + 1) * RANK_STEP })));
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="panel-label !mb-0 inline-flex items-center gap-1.5">
          <CheckSquare size={13} strokeWidth={1.75} className="text-muted" />
          Checklist
        </span>
        {items.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setHideDone((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1 rounded-[8px] border border-line bg-surface-2 px-2 py-1',
                'text-[11px] font-medium text-txt-2 transition-colors hover:border-line-2 cursor-pointer',
                hideDone && 'border-green/40 bg-green-50 text-green',
              )}
            >
              {hideDone ? <Eye size={12} strokeWidth={1.75} /> : <EyeOff size={12} strokeWidth={1.75} />}
              {hideDone ? 'Aangevinkte tonen' : 'Aangevinkte verbergen'}
            </button>
            <button
              type="button"
              onClick={clearAll}
              className={cn(
                'inline-flex items-center gap-1 rounded-[8px] border border-line bg-surface-2 px-2 py-1',
                'text-[11px] font-medium text-txt-2 transition-colors',
                'hover:border-red/40 hover:bg-red/5 hover:text-red cursor-pointer',
              )}
            >
              <Trash2 size={12} strokeWidth={1.75} />
              Verwijderen
            </button>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <span className="w-8 shrink-0 text-[11px] font-semibold tabular-nums text-muted">
            {Math.round(pct)}%
          </span>
          <ProgressBar value={pct} />
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visible.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-0.5">
            {visible.map((item) => (
              <SortableChecklistItem
                key={item.id}
                item={item}
                editing={editingId === item.id}
                editText={editText}
                onToggle={() => toggle(item.id)}
                onRemove={() => remove(item.id)}
                onStartEdit={() => {
                  setEditingId(item.id);
                  setEditText(item.text);
                }}
                onEditText={setEditText}
                onCommitEdit={commitEdit}
                onCancelEdit={() => {
                  setEditingId(null);
                  setEditText('');
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {hideDone && done > 0 && (
        <p className="mt-1 px-1 text-[11px] text-muted">
          {done} aangevinkte {done === 1 ? 'item' : 'items'} verborgen
        </p>
      )}

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
