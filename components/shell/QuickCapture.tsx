'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useBoardStore } from '@/stores/useBoardStore';
import { useUiStore } from '@/stores/useUiStore';

/** ⌘I — overal inspiratie dumpen. Enter = taak in inspiratie + modal open. */
export function QuickCapture() {
  const open = useUiStore((s) => s.quickCaptureOpen);
  const setOpen = useUiStore((s) => s.setQuickCaptureOpen);
  const openTask = useUiStore((s) => s.openTask);
  const addTask = useBoardStore((s) => s.addTask);
  const [body, setBody] = useState('');

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    const task = addTask({ title: trimmed, dayKey: 'dump' });
    setBody('');
    setOpen(false);
    openTask(task.id);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title="Inspiratie" hideClose>
        <div className="p-4">
          <p className="panel-label mb-2.5">Inspiratie</p>
          <Input
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder="Idee vastleggen — Enter opent de kaart…"
            className="h-11 text-[15px]"
          />
          <p className="mt-2 text-[12px] text-muted">
            Enter om aan te maken · Esc om te sluiten · ⌘I
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
