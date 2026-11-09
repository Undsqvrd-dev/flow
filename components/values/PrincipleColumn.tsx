'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { Button } from '@/components/ui/button';

export interface RankedText {
  id: string;
  text: string;
  rank: number;
}

const FIELD_CLASS =
  'border-0 bg-transparent px-0 py-0 text-[15px] leading-snug text-txt focus:border-0 focus:bg-transparent';

function AddCard({
  label,
  placeholder,
  onAdd,
}: {
  label: string;
  placeholder: string;
  onAdd: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  function close() {
    setDraft('');
    setOpen(false);
  }

  function commit() {
    const text = draft.trim();
    if (!text) {
      close();
      return;
    }
    onAdd(text);
    setDraft('');
    ref.current?.focus();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-card border border-dashed border-line-2 bg-surface px-4 py-3 text-[13px] font-medium text-muted transition-colors duration-150 hover:border-green hover:text-green cursor-pointer"
      >
        <Plus size={15} strokeWidth={1.75} />
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-soft-sm">
      <AutoTextarea
        ref={ref}
        minRows={1}
        value={draft}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
        }}
        className={FIELD_CLASS}
      />
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={close}>Annuleren</Button>
        <Button type="button" variant="primary" size="sm" onClick={commit} disabled={!draft.trim()}>
          Toevoegen
        </Button>
      </div>
    </div>
  );
}

export function PrincipleColumn({
  title,
  hint,
  items,
  addLabel,
  placeholder,
  emptyLabel,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  hint: string;
  items: RankedText[];
  addLabel: string;
  placeholder: string;
  emptyLabel: string;
  onAdd: (text: string) => void;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const sorted = [...items].sort((a, b) => a.rank - b.rank);

  return (
    <section aria-label={title}>
      <div className="mb-3">
        <h2 className="text-[15px] font-bold text-txt">{title}</h2>
        <p className="mt-0.5 text-[12px] text-muted">{hint}</p>
      </div>
      <div className="flex flex-col gap-3">
        {sorted.length === 0 && (
          <div className="hatched rounded-card border border-line px-4 py-8 text-center text-[13px] text-muted">
            {emptyLabel}
          </div>
        )}
        {sorted.map((item) => (
          <article key={item.id} className="group rounded-card border border-line bg-surface p-4 shadow-soft-sm">
            <div className="flex items-start gap-2">
              <AutoTextarea
                minRows={1}
                value={item.text}
                aria-label={`${title} bewerken`}
                onChange={(e) => onUpdate(item.id, e.target.value)}
                className={FIELD_CLASS}
              />
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="mt-0.5 shrink-0 rounded-[8px] p-1 text-muted hover:bg-red/10 hover:text-red md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 cursor-pointer"
                aria-label="Verwijderen"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </div>
          </article>
        ))}
        <AddCard label={addLabel} placeholder={placeholder} onAdd={onAdd} />
      </div>
    </section>
  );
}
