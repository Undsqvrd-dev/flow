'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, CheckSquare, Clock, AlignLeft } from 'lucide-react';
import type { Task } from '@/lib/types';
import { QuadrantPill } from '@/components/card/PriorityMatrix';
import { useBoardStore } from '@/stores/useBoardStore';
import { useGoalsStore, goalById } from '@/stores/useGoalsStore';
import { useSettingsStore, labelById } from '@/stores/useSettingsStore';
import { useFocusStore, currentFocus } from '@/stores/useFocusStore';
import { useUiStore } from '@/stores/useUiStore';
import { cn, formatMinutes } from '@/lib/utils';

function LabelDots({ labels }: { labels: { id: string; name: string; color: string }[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {labels.map((label) => (
        <span
          key={label.id}
          title={label.name || undefined}
          className="h-2 w-2 shrink-0 rounded-pill"
          style={{ backgroundColor: label.color }}
        />
      ))}
    </div>
  );
}

export function TaskCard({ task, sortable = true }: { task: Task; sortable?: boolean }) {
  const toggleDone = useBoardStore((s) => s.toggleDone);
  const moveRank = useBoardStore((s) => s.moveRank);
  const goal = useGoalsStore((s) => goalById(s.goals, task.goalId));
  const showBadges = useSettingsStore((s) => s.settings.showPriorityBadges);
  const labelDefs = useSettingsStore((s) => s.settings.labels ?? []);
  const focuses = useFocusStore((s) => s.focuses);
  const focusGoalId = currentFocus(focuses)?.goalId ?? null;
  const openTask = useUiStore((s) => s.openTask);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !sortable,
  });

  const linksToFocusGoal = focusGoalId !== null && task.goalId === focusGoalId;
  const checklistDone = task.checklist.filter((c) => c.done).length;
  const resolvedLabels = task.labels
    .map((id) => labelById(labelDefs, id) ?? (id.startsWith('#') ? { id, name: '', color: id } : null))
    .filter((l): l is { id: string; name: string; color: string } => l !== null);

  const hasMeta =
    Boolean(goal) ||
    task.estimateMin !== null ||
    Boolean(task.description?.trim()) ||
    task.checklist.length > 0 ||
    Boolean(task.fromPreviousWeek) ||
    (showBadges && task.urgent !== null);

  const showFooter = hasMeta || resolvedLabels.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => openTask(task.id)}
      className={cn(
        'group relative cursor-pointer rounded-card border border-line bg-surface p-3 shadow-soft-sm',
        'transition-[opacity,box-shadow] duration-150 hover:shadow-soft hover:border-line-2',
        isDragging && 'opacity-40',
        task.done && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.done}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleDone(task.id)}
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-(--green)',
            !task.done && 'invisible group-hover:visible',
          )}
          aria-label="Afvinken"
        />
        <p className={cn(
          'min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-txt transition-[margin] duration-150',
          !task.done && '-ml-6 group-hover:ml-0',
          task.done && 'text-muted line-through',
        )}>
          {linksToFocusGoal && (
            <span className="mb-0.5 mr-1.5 inline-block h-2 w-2 rounded-pill bg-green" title="Gekoppeld aan je weekfocus" />
          )}
          {task.title}
        </p>

        {sortable && !task.done && (
          <div className="invisible flex shrink-0 flex-col gap-0.5 group-hover:visible">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); moveRank(task.id, -1); }}
              className="rounded-[6px] p-0.5 text-muted hover:bg-surface-3 hover:text-green cursor-pointer"
              aria-label="Omhoog of naar vorig dagdeel"
              title="Omhoog / vorig dagdeel"
            >
              <ChevronUp size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); moveRank(task.id, 1); }}
              className="rounded-[6px] p-0.5 text-muted hover:bg-surface-3 hover:text-green cursor-pointer"
              aria-label="Omlaag of naar volgend dagdeel"
              title="Omlaag / volgend dagdeel"
            >
              <ChevronDown size={14} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {showFooter && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted">
          {goal && (
            <span className="inline-flex max-w-[130px] items-center gap-1">
              <span className="h-2 w-2 shrink-0 rounded-pill" style={{ backgroundColor: goal.color }} />
              <span className="truncate">{goal.title}</span>
            </span>
          )}
          {task.description?.trim() && (
            <span className="inline-flex items-center" title="Heeft omschrijving">
              <AlignLeft size={11} strokeWidth={1.75} />
            </span>
          )}
          {task.estimateMin !== null && (
            <span className="inline-flex items-center gap-1">
              <Clock size={11} strokeWidth={1.75} />{formatMinutes(task.estimateMin)}
            </span>
          )}
          {task.checklist.length > 0 && (
            <span className={cn('inline-flex items-center gap-1', checklistDone === task.checklist.length && 'text-green')}>
              <CheckSquare size={11} strokeWidth={1.75} />{checklistDone}/{task.checklist.length}
            </span>
          )}
          {task.fromPreviousWeek && (
            <span className="rounded-pill bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-muted">van vorige week</span>
          )}
          <LabelDots labels={resolvedLabels} />
          {showBadges && <span className="ml-auto"><QuadrantPill urgent={task.urgent} important={task.important} /></span>}
        </div>
      )}
    </div>
  );
}
