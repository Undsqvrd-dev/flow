'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Comment } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { uid } from '@/lib/utils';

export function CommentList({ comments, onChange }: {
  comments: Comment[];
  onChange: (comments: Comment[]) => void;
}) {
  const [draft, setDraft] = useState('');

  function add() {
    const body = draft.trim();
    if (!body) return;
    onChange([...comments, { id: uid(), body, createdAt: new Date().toISOString() }]);
    setDraft('');
  }

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {comments.map((c) => (
          <li key={c.id} className="rounded-[10px] bg-surface-2 px-3 py-2">
            <p className="text-sm text-txt-2">{c.body}</p>
            <p className="mt-0.5 text-[11px] text-muted-2">
              {format(parseISO(c.createdAt), 'd MMM yyyy · HH:mm', { locale: nl })}
            </p>
          </li>
        ))}
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
