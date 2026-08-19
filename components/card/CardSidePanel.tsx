'use client';

import type { Task } from '@/lib/types';
import { Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useBoardStore } from '@/stores/useBoardStore';
import { useGoalsStore, activeGoals } from '@/stores/useGoalsStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { DAY_LABELS, WEEKDAY_KEYS, isBoardDayKey, weekOfNearestDayKey } from '@/lib/dates';
import type { BoardDayKey, DayKey } from '@/lib/types';
import { cn } from '@/lib/utils';

const DAY_OPTIONS: DayKey[] = ['dump', 'wachtruimte', 'algemeen', ...WEEKDAY_KEYS];

const ESTIMATES = [1, 3, 5, 15, 30, 60, 120];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="panel-label mb-2">{label}</p>
      {children}
    </div>
  );
}

/** Rechterpaneel van de kaartmodal: metadata — alles optioneel. */
export function CardSidePanel({ task }: { task: Task }) {
  const updateTask = useBoardStore((s) => s.updateTask);
  const goals = useGoalsStore((s) => s.goals);
  const labelDefs = useSettingsStore((s) => s.settings.labels ?? []);

  const zakelijk = activeGoals(goals).filter((g) => g.scope === 'zakelijk');
  const prive = activeGoals(goals).filter((g) => g.scope === 'prive');

  return (
    <div className="flex w-full shrink-0 flex-col gap-5 rounded-r-panel bg-surface-2 px-4 pb-4 pt-10 md:w-[240px] md:pt-12">
      <Section label="Doel">
        <select
          value={task.goalId ?? ''}
          onChange={(e) => updateTask(task.id, { goalId: e.target.value || null })}
          className="h-9 w-full cursor-pointer rounded-[10px] border border-line bg-surface px-2.5 text-sm text-txt outline-none focus:border-green"
        >
          <option value="">Geen doel</option>
          {zakelijk.length > 0 && (
            <optgroup label="Zakelijk">
              {zakelijk.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </optgroup>
          )}
          {prive.length > 0 && (
            <optgroup label="Privé">
              {prive.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </optgroup>
          )}
        </select>
      </Section>

      <Section label="Dag">
        <select
          value={task.dayKey}
          onChange={(e) => {
            const dayKey = e.target.value as DayKey;
            const patch: Partial<Task> = {
              dayKey,
              daypart: null,
            };
            if (isBoardDayKey(dayKey)) {
              patch.weekOf = weekOfNearestDayKey(dayKey as BoardDayKey);
            }
            updateTask(task.id, patch);
          }}
          className="h-9 w-full cursor-pointer rounded-[10px] border border-line bg-surface px-2.5 text-sm text-txt outline-none focus:border-green"
        >
          {DAY_OPTIONS.map((key) => (
            <option key={key} value={key}>{DAY_LABELS[key]}</option>
          ))}
        </select>
      </Section>

      <Section label="Prioriteit">
        <button
          type="button"
          onClick={() =>
            updateTask(task.id, {
              urgent: task.urgent ? null : true,
              important: task.urgent ? null : true,
            })
          }
          className={cn(
            'inline-flex w-full items-center justify-center gap-1.5 rounded-[10px] border px-3 py-2',
            'text-[13px] font-medium transition-colors duration-150 cursor-pointer',
            task.urgent
              ? 'border-red/40 bg-red/10 text-red'
              : 'border-line bg-surface text-txt-2 hover:border-line-2',
          )}
        >
          <Bell size={15} strokeWidth={1.75} className={cn(task.urgent && 'fill-red')} />
          {task.urgent ? 'Prioriteit aan' : 'Prioriteit'}
        </button>
      </Section>

      <Section label="Tijdsschatting">
        <div className="flex flex-wrap gap-1.5">
          {ESTIMATES.map((min) => (
            <button
              key={min}
              type="button"
              onClick={() => updateTask(task.id, { estimateMin: task.estimateMin === min ? null : min })}
              className={cn(
                'rounded-pill border px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 cursor-pointer',
                task.estimateMin === min
                  ? 'border-green bg-green-50 text-green'
                  : 'border-line text-txt-2 hover:border-line-2',
              )}
            >
              {min}m
            </button>
          ))}
        </div>
      </Section>

      <Section label="Labels">
        {labelDefs.length === 0 ? (
          <p className="text-[12px] text-muted">Nog geen labels. Maak ze aan bij Instellingen.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {labelDefs.map((label) => {
              const active = task.labels.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() =>
                    updateTask(task.id, {
                      labels: active
                        ? task.labels.filter((l) => l !== label.id)
                        : [...task.labels, label.id],
                    })
                  }
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 cursor-pointer',
                    active ? 'ring-1' : 'opacity-70 hover:opacity-100',
                  )}
                  style={{
                    backgroundColor: `${label.color}22`,
                    color: label.color,
                    ...(active ? { ['--tw-ring-color' as string]: label.color } : {}),
                  }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-pill" style={{ backgroundColor: label.color }} />
                  {label.name}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section label="Deadline">
        <Input
          type="date"
          value={task.dueDate ?? ''}
          onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })}
          className="h-8"
        />
      </Section>
    </div>
  );
}
