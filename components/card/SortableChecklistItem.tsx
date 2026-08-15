'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import type { ChecklistItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export function SortableChecklistItem({
  item,
  editing,
  editText,
  onToggle,
  onRemove,
  onStartEdit,
  onEditText,
  onCommitEdit,
  onCancelEdit,
}: {
  item: ChecklistItem;
  editing: boolean;
  editText: string;
  onToggle: () => void;
  onRemove: () => void;
  onStartEdit: () => void;
  onEditText: (v: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: editing,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'group flex items-center gap-2 rounded-[8px] px-1 py-1 hover:bg-surface-2',
        !editing && 'cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'z-10 cursor-grabbing bg-surface shadow-soft opacity-95',
      )}
      {...attributes}
      {...(editing ? {} : listeners)}
    >
      <input
        type="checkbox"
        checked={item.done}
        onChange={onToggle}
        onPointerDown={(e) => e.stopPropagation()}
        className="h-4 w-4 shrink-0 cursor-pointer accent-(--green)"
      />
      {editing ? (
        <input
          autoFocus
          value={editText}
          onChange={(e) => onEditText(e.target.value)}
          onBlur={onCommitEdit}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommitEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
          className="h-7 min-w-0 flex-1 cursor-text rounded-[6px] border border-green bg-surface px-2 text-sm text-txt outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          className={cn(
            'min-w-0 flex-1 rounded-[6px] px-1 py-0.5 text-left text-sm',
            item.done ? 'text-muted line-through' : 'text-txt-2',
          )}
        >
          {item.text}
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        onPointerDown={(e) => e.stopPropagation()}
        className="invisible text-muted-2 hover:text-red group-hover:visible cursor-pointer"
        aria-label="Verwijder stap"
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </li>
  );
}
