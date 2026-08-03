'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/stores/useBoardStore';
import { useUiStore } from '@/stores/useUiStore';
import { DAY_LABELS, todayKey } from '@/lib/dates';

/**
 * Snel aanmaken: titel + Enter.
 * Komt altijd op vandaag, dagdeel "dag".
 */
export function NewTaskDialog() {
  const open = useUiStore((s) => s.newTaskOpen);
  const setOpen = useUiStore((s) => s.setNewTaskOpen);
  const addTask = useBoardStore((s) => s.addTask);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (open) setTitle('');
  }, [open]);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    addTask({ title: trimmed, dayKey: todayKey(), daypart: 'dag' });
    setTitle('');
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
      <DialogContent title="Nieuwe taak">
        <div className="p-5">
          <p className="panel-label mb-3">Nieuwe taak</p>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Wat moet er gebeuren?"
            className="h-11 text-[15px]"
          />
          <p className="mt-2 text-[12px] text-muted">
            Komt op <span className="font-medium text-txt-2">{DAY_LABELS[todayKey()]}</span>
            {' · '}
            <span className="font-medium text-txt-2">Dag</span>
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuleren</Button>
            <Button variant="primary" onClick={submit} disabled={!title.trim()}>Toevoegen</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
