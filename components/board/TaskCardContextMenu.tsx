'use client';

import {
  Archive,
  Bell,
  Calendar,
  Copy,
  PanelRight,
  Tag,
  Trash2,
} from 'lucide-react';
import type { Task } from '@/lib/types';
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSurface,
} from '@/components/ui/context-menu';
import { useBoardStore } from '@/stores/useBoardStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';
import { DAY_LABELS, WEEKDAY_KEYS, weekOfNearestDayKey } from '@/lib/dates';
import type { BoardDayKey, DayKey } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Snelmenu à la Trello bij rechtermuisklik op een kaart. */
export function TaskCardContextMenu({
  task,
  x,
  y,
  onClose,
}: {
  task: Task;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const openTask = useUiStore((s) => s.openTask);
  const updateTask = useBoardStore((s) => s.updateTask);
  const duplicateTask = useBoardStore((s) => s.duplicateTask);
  const removeTask = useBoardStore((s) => s.removeTask);
  const labelDefs = useSettingsStore((s) => s.settings.labels ?? []);

  function run(action: () => void) {
    action();
    onClose();
  }

  function moveTo(dayKey: DayKey) {
    const patch: Partial<Task> = { dayKey, daypart: null };
    if (WEEKDAY_KEYS.includes(dayKey as BoardDayKey)) {
      patch.weekOf = weekOfNearestDayKey(dayKey as BoardDayKey);
    }
    updateTask(task.id, patch);
  }

  return (
    <ContextMenuSurface x={x} y={y} onClose={onClose}>
      <ContextMenuItem onSelect={() => run(() => openTask(task.id))}>
        <PanelRight size={14} strokeWidth={1.75} /> Kaart openen
      </ContextMenuItem>
      <ContextMenuItem
        active={Boolean(task.urgent)}
        onSelect={() =>
          run(() =>
            updateTask(task.id, {
              urgent: task.urgent ? null : true,
              important: task.urgent ? null : true,
            }),
          )
        }
      >
        <Bell size={14} strokeWidth={1.75} className={cn(task.urgent && 'fill-red text-red')} />
        {task.urgent ? 'Prioriteit uit' : 'Prioriteit aan'}
      </ContextMenuItem>

      {labelDefs.length > 0 && (
        <>
          <ContextMenuSeparator />
          <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Labels
          </p>
          {labelDefs.map((label) => {
            const active = task.labels.includes(label.id);
            return (
              <ContextMenuItem
                key={label.id}
                active={active}
                onSelect={() =>
                  run(() =>
                    updateTask(task.id, {
                      labels: active
                        ? task.labels.filter((id) => id !== label.id)
                        : [...task.labels, label.id],
                    }),
                  )
                }
              >
                <Tag size={14} strokeWidth={1.75} style={{ color: label.color }} />
                <span className="min-w-0 flex-1 truncate">{label.name || 'Label'}</span>
                <span
                  className="h-2 w-2 shrink-0 rounded-pill"
                  style={{ backgroundColor: label.color }}
                />
              </ContextMenuItem>
            );
          })}
        </>
      )}

      <ContextMenuSeparator />
      <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Verplaats naar
      </p>
      <ContextMenuItem
        active={task.dayKey === 'algemeen'}
        onSelect={() => run(() => moveTo('algemeen'))}
      >
        <Calendar size={14} strokeWidth={1.75} /> {DAY_LABELS.algemeen}
      </ContextMenuItem>
      {WEEKDAY_KEYS.map((day) => (
        <ContextMenuItem
          key={day}
          active={task.dayKey === day}
          onSelect={() => run(() => moveTo(day))}
        >
          <Calendar size={14} strokeWidth={1.75} /> {DAY_LABELS[day]}
        </ContextMenuItem>
      ))}

      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => run(() => duplicateTask(task.id))}>
        <Copy size={14} strokeWidth={1.75} /> Dupliceer
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={() => run(() => updateTask(task.id, { dayKey: 'wachtruimte', daypart: null }))}
      >
        <Archive size={14} strokeWidth={1.75} /> Naar wachtruimte
      </ContextMenuItem>
      <ContextMenuItem danger onSelect={() => run(() => removeTask(task.id))}>
        <Trash2 size={14} strokeWidth={1.75} /> Verwijderen
      </ContextMenuItem>
    </ContextMenuSurface>
  );
}
