'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { X } from 'lucide-react';
import type { Comment } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { uid, cn } from '@/lib/utils';

export function CommentList({ comments, onChange }: {
  comments: Comment[];
  onChange: (comments: Comment[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  function add() {
    const body = draft.trim();
    if (!body) return;
    onChange([...comments, { id: uid(), body, createdAt: new Date().toISOString() }]);
    setDraft('');
  }

  function remove(id: string) {
    onChange(comments.filter((c) => c.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditText('');
    }
  }

  function commitEdit() {
    if (!editingId) return;
    const body = editText.trim();
    if (!body) remove(editingId);
    else onChange(comments.map((c) => (c.id === editingId ? { ...c, body } : c)));
    setEditingId(null);
    setEditText('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {comments.map((c) => {
          const editing = editingId === c.id;
          return (
            <li
              key={c.id}
              className="group relative rounded-[10px] bg-surface-2 px-3 py-2"
            >
              {editing ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitEdit();
                    }
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className={cn(
                    'h-7 w-full rounded-[6px] border border-green bg-surface px-2',
                    'text-sm text-txt outline-none',
                  )}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(c.id);
                    setEditText(c.body);
                  }}
                  className="w-full rounded-[6px] px-0.5 text-left text-sm text-txt-2 hover:text-txt cursor-pointer"
                >
                  {c.body}
                </button>
              )}
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-2">
                  {format(parseISO(c.createdAt), 'd MMM yyyy · HH:mm', { locale: nl })}
                </p>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="invisible text-muted-2 hover:text-red group-hover:visible cursor-pointer"
                    aria-label="Comment verwijderen"
                  >
                    <X size={14} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder="Comment toevoegen…"
        className="mt-2"
      />
    </div>
  );
}
