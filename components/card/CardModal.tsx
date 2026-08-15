'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Play, Trash2, Archive } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { Button } from '@/components/ui/button';
import { ChecklistEditor } from './ChecklistEditor';
import { CommentList } from './CommentList';
import { CardSidePanel } from './CardSidePanel';
import { useBoardStore } from '@/stores/useBoardStore';
import { useSettingsStore, labelById } from '@/stores/useSettingsStore';
import { usePomodoroStore } from '@/stores/usePomodoroStore';
import { useUiStore } from '@/stores/useUiStore';
import { DAY_LABELS } from '@/lib/dates';
import { cn, formatMinutes } from '@/lib/utils';

function CardLabels({ taskLabels }: { taskLabels: string[] }) {
  const defs = useSettingsStore((s) => s.settings.labels ?? []);
  const resolved = taskLabels
    .map((id) => labelById(defs, id) ?? (id.startsWith('#') ? { id, name: '', color: id } : null))
    .filter((l): l is { id: string; name: string; color: string } => l !== null);
  if (resolved.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {resolved.map((label) => (
        <span
          key={label.id}
          className="inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[11px] font-medium text-txt-2"
          style={{ backgroundColor: `${label.color}22` }}
        >
          <span className="h-1.5 w-1.5 rounded-pill" style={{ backgroundColor: label.color }} />
          {label.name || 'Label'}
        </span>
      ))}
    </div>
  );
}

/**
 * Kaartdetail: links structureren, rechts metadata (alles optioneel).
 * Sneltoetsen: Esc sluiten · D klaar · ⌘Enter opslaan/sluiten.
 */
export function CardModal() {
  const router = useRouter();
  const openTaskId = useUiStore((s) => s.openTaskId);
  const openTask = useUiStore((s) => s.openTask);
  const task = useBoardStore((s) => s.tasks.find((t) => t.id === openTaskId));
  const updateTask = useBoardStore((s) => s.updateTask);
  const toggleDone = useBoardStore((s) => s.toggleDone);
  const removeTask = useBoardStore((s) => s.removeTask);
  const duplicateTask = useBoardStore((s) => s.duplicateTask);
  const startPomodoro = usePomodoroStore((s) => s.start);
  const focusMin = useSettingsStore((s) => s.settings.pomodoroFocusMin);

  useEffect(() => {
    if (!task) return;
    function onKey(e: KeyboardEvent) {
      if (!task) return;
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { openTask(null); return; }
      if (!typing && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleDone(task.id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, openTask, toggleDone]);

  if (!task) return null;
  const t = task;

  const location = [
    DAY_LABELS[t.dayKey],
    t.estimateMin ? `ca. ${formatMinutes(t.estimateMin)}` : null,
  ].filter(Boolean).join(' · ');

  function toWaitingRoom() {
    updateTask(t.id, { dayKey: 'wachtruimte', daypart: null });
    openTask(null);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && openTask(null)}>
      <DialogContent title={t.title} className="max-w-3xl p-0">
        <div className="flex flex-col md:flex-row">
          <div className="min-w-0 flex-1 p-5 md:p-6">
            <CardLabels taskLabels={t.labels} />
            <div className="flex items-start gap-3 pr-8">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleDone(t.id)}
                className="mt-1.5 h-4.5 w-4.5 shrink-0 cursor-pointer accent-(--green)"
                aria-label="Taak afvinken"
              />
              <input
                value={t.title}
                onChange={(e) => updateTask(t.id, { title: e.target.value })}
                className={cn(
                  'w-full bg-transparent text-[20px] font-bold text-txt outline-none',
                  t.done && 'text-muted line-through',
                )}
              />
            </div>
            <p className="mb-5 mt-1 pl-7 text-[12px] text-muted">{location}</p>

            <div className="flex flex-col gap-6">
              <section>
                <p className="panel-label mb-2">Omschrijving</p>
                <AutoTextarea
                  minRows={3}
                  value={t.description ?? ''}
                  onChange={(e) => updateTask(t.id, { description: e.target.value || null })}
                  placeholder="Waar gaat dit over?"
                />
              </section>

              <section>
                <ChecklistEditor
                  items={t.checklist}
                  onChange={(checklist) => updateTask(t.id, { checklist })}
                />
              </section>

              <section>
                <p className="panel-label mb-2">Comments</p>
                <CommentList
                  comments={t.comments}
                  onChange={(comments) => updateTask(t.id, { comments })}
                />
              </section>

              <section>
                <p className="panel-label mb-2">Acties</p>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      startPomodoro({ mode: 'focus', minutes: t.estimateMin ?? focusMin, taskId: t.id });
                      openTask(null);
                      router.push('/focus');
                    }}
                  >
                    <Play size={15} strokeWidth={1.75} /> Start pomodoro
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start" onClick={() => { duplicateTask(t.id); }}>
                    <Copy size={15} strokeWidth={1.75} /> Dupliceer
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start" onClick={toWaitingRoom}>
                    <Archive size={15} strokeWidth={1.75} /> Naar wachtruimte
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="justify-start"
                    onClick={() => { removeTask(t.id); openTask(null); }}
                  >
                    <Trash2 size={15} strokeWidth={1.75} /> Verwijderen
                  </Button>
                </div>
              </section>
            </div>
          </div>
          <CardSidePanel task={t} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
