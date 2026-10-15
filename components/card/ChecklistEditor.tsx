'use client';

import { useEffect, useMemo, useState } from 'react';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CheckSquare, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { checklistItemIsEditing, repairChecklist, reorderChecklist } from '@/lib/checklist';
import type { ChecklistItem } from '@/lib/types';
import { ProgressBar } from '@/components/ui/progress';
import { SortableChecklistItem } from './SortableChecklistItem';
import { nextRank, uid, cn } from '@/lib/utils';

/** Checklist met voortgangsbalk, slepen en inline bewerken. */
export function ChecklistEditor({
  taskId,
  items,
  onChange,
}: {
  taskId: string;
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const repaired = useMemo(
    () => repairChecklist(items, { taskId, track: false }),
    [items, taskId],
  );
  const checklist = repaired.items;

  useEffect(() => {
    if (!repaired.changed) return;
    onChange(checklist);
  }, [repaired, checklist, onChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const sorted = [...checklist].sort((a, b) => a.rank - b.rank);
  const done = checklist.filter((i) => i.done).length;
  const visible = hideDone ? sorted.filter((i) => !i.done) : sorted;
  const pct = checklist.length === 0 ? 0 : (done / checklist.length) * 100;

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([
      ...checklist,
      { id: uid(), text, done: false, rank: nextRank(checklist.map((i) => i.rank)) },
    ]);
    setDraft('');
  }

  function toggle(id: string) {
    if (!id) return;
    onChange(checklist.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  function remove(id: string) {
    if (!id) return;
    onChange(checklist.filter((i) => i.id !== id));
  }

  function clearAll() {
    if (checklist.length === 0) return;
    if (!window.confirm('Hele checklist verwijderen?')) return;
    onChange([]);
    setHideDone(false);
  }

  function commitEdit() {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) remove(editingId);
    else onChange(checklist.map((i) => (i.id === editingId ? { ...i, text } : i)));
    setEditingId(null);
    setEditText('');
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const next = reorderChecklist(checklist, String(active.id), String(over.id), hideDone);
    if (next) onChange(next);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="panel-label !mb-0 inline-flex items-center gap-1.5">
          <CheckSquare size={13} strokeWidth={1.75} className="text-muted" />
          Checklist
        </span>
        {checklist.length > 0 && (
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

      {checklist.length > 0 && (
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
                editing={checklistItemIsEditing(item.id, editingId)}
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
