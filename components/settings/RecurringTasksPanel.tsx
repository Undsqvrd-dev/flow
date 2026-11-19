'use client';

import { useEffect, useState } from 'react';
import { Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { Switch } from '@/components/ui/switch';
import { DAYPART_LABELS, DAYPARTS } from '@/lib/dates';
import { ensureTodayRituals } from '@/lib/db/ensureMeditation';
import { deleteRecurringTask, ensureBuiltinRecurring, saveRecurringTask } from '@/lib/db/recurring';
import { syncEnabled } from '@/lib/db/enabled';
import { LABEL_PALETTE } from '@/lib/labels';
import {
  activeWeekdays,
  preferredPersonalLabelId,
  scheduleLabel,
  sortWeekdays,
  spreadWeekdays,
  WEEKDAYS,
  type RecurringSchedule,
  type RecurringTask,
} from '@/lib/recurring';
import { cn, nextRank, uid } from '@/lib/utils';
import { useRecurringStore } from '@/stores/useRecurringStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { BoardDayKey, ChecklistItem, Daypart } from '@/lib/types';

type Draft = {
  id: string;
  title: string;
  description: string;
  checklist: ChecklistItem[];
  labelIds: string[];
  daypart: Daypart | '';
  estimateMin: string;
  streak: boolean;
  schedule: RecurringSchedule;
  weekdays: BoardDayKey[];
  timesPerWeek: number;
  rank: number;
  ritualPrefix: string;
  paused: boolean;
  builtin: boolean;
};

function blankDraft(labelId: string | null, rank: number): Draft {
  return {
    id: uid(),
    title: '',
    description: '',
    checklist: [],
    labelIds: labelId ? [labelId] : [],
    daypart: '',
    estimateMin: '',
    streak: false,
    schedule: 'daily',
    weekdays: [...WEEKDAYS],
    timesPerWeek: 3,
    rank,
    ritualPrefix: uid(),
    paused: false,
    builtin: false,
  };
}

function draftFrom(task: RecurringTask): Draft {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    checklist: task.checklist.map((item) => ({ ...item })),
    labelIds: [...task.labelIds],
    daypart: task.daypart ?? '',
    estimateMin: task.estimateMin == null ? '' : String(task.estimateMin),
    streak: task.streak,
    schedule: task.schedule,
    weekdays: activeWeekdays(task),
    timesPerWeek: task.timesPerWeek ?? Math.max(1, task.weekdays.length || 3),
    rank: task.rank,
    ritualPrefix: task.ritualPrefix,
    paused: task.paused,
    builtin: task.builtin,
  };
}

function toTask(draft: Draft): RecurringTask {
  const estimate = Number.parseInt(draft.estimateMin, 10);
  return {
    id: draft.id,
    title: draft.title.trim(),
    description: draft.description,
    checklist: draft.checklist.map((item, index) => ({
      ...item,
      text: item.text.trim(),
      rank: (index + 1) * 1000,
    })).filter((item) => item.text.length > 0),
    labelIds: draft.labelIds,
    daypart: draft.daypart || null,
    estimateMin: Number.isFinite(estimate) && estimate > 0 ? estimate : null,
    streak: draft.streak,
    schedule: draft.schedule,
    weekdays: draft.schedule === 'daily' ? [...WEEKDAYS] : sortWeekdays(draft.weekdays),
    timesPerWeek: draft.schedule === 'times_per_week' ? sortWeekdays(draft.weekdays).length : null,
    rank: draft.rank,
    ritualPrefix: draft.ritualPrefix,
    paused: draft.paused,
    builtin: draft.builtin,
    updatedAt: '',
  };
}

export function RecurringTasksPanel() {
  const items = useRecurringStore((s) => s.items);
  const status = useRecurringStore((s) => s.status);
  const labels = useSettingsStore((s) => s.settings.labels);
  const addLabel = useSettingsStore((s) => s.addLabel);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirming, setConfirming] = useState<RecurringTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState<string>(LABEL_PALETTE[0]);
  const [creatingLabel, setCreatingLabel] = useState(false);

  useEffect(() => {
    void ensureBuiltinRecurring();
  }, []);

  function openNew() {
    const rank = nextRank(items.filter((item) => item.rank < 2000000000).map((item) => item.rank));
    setDraft(blankDraft(preferredPersonalLabelId(labels), rank || 1000));
    setError(null);
  }

  async function persist(task: RecurringTask) {
    setBusy(true);
    setError(null);
    try {
      await saveRecurringTask(task);
      await ensureTodayRituals();
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(task: RecurringTask) {
    setBusy(true);
    setError(null);
    try {
      await deleteRecurringTask(task);
      setConfirming(null);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt.');
    } finally {
      setBusy(false);
    }
  }

  const syncOn = syncEnabled();

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="panel-label">Dagelijkse taken</p>
        {status === 'ready' && !draft && (
          <Button size="sm" variant="primary" onClick={openNew}>
            <Plus size={14} /> Nieuwe taak
          </Button>
        )}
      </div>

      {!syncOn || status === 'unavailable' ? (
        <p className="text-[13px] leading-relaxed text-muted">
          {syncOn
            ? 'De tabel voor terugkerende taken ontbreekt nog. Draai migratie 013. Tot die tijd blijven Mediteren, Sport en Dagafsluiting werken zoals nu.'
            : 'Cloud-sync staat uit. Routines beheer je zodra sync aan staat. Mediteren, Sport en Dagafsluiting blijven werken zoals nu.'}
        </p>
      ) : status === 'idle' ? (
        <p className="text-[13px] text-muted">Laden…</p>
      ) : draft ? (
        <RoutineForm
          draft={draft}
          labels={labels}
          busy={busy}
          error={error}
          creatingLabel={creatingLabel}
          labelName={labelName}
          labelColor={labelColor}
          onChange={setDraft}
          onCancel={() => { setDraft(null); setError(null); }}
          onSave={() => void persist(toTask(draft))}
          showDelete={items.some((item) => item.id === draft.id)}
          onDelete={() => {
            const existing = items.find((item) => item.id === draft.id);
            if (existing) setConfirming(existing);
          }}
          onCreateLabel={() => {
            const name = labelName.trim();
            if (!name) return;
            const id = addLabel(name, labelColor);
            setDraft({ ...draft, labelIds: [...draft.labelIds, id] });
            setLabelName('');
            setCreatingLabel(false);
          }}
          onLabelName={setLabelName}
          onLabelColor={setLabelColor}
          onToggleCreate={() => setCreatingLabel((open) => !open)}
        />
      ) : items.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted">
          Nog geen terugkerende taken. Maak er een om hem automatisch op de juiste dagen te zetten.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-panel border border-line px-3 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-txt">{item.title}</p>
                    <span className={cn(
                      'rounded-pill px-2 py-0.5 text-[11px] font-medium',
                      item.paused ? 'bg-surface-3 text-muted' : 'bg-green-50 text-green',
                    )}>
                      {item.paused ? 'Gepauzeerd' : 'Actief'}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-txt-2">{scheduleLabel(item)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.labelIds.length === 0 ? (
                      <span className="text-[12px] text-muted">Geen label</span>
                    ) : item.labelIds.map((id) => {
                      const label = labels.find((entry) => entry.id === id);
                      if (!label) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-[11px] font-medium"
                          style={{ backgroundColor: `${label.color}22`, color: label.color }}
                        >
                          <span className="h-1.5 w-1.5 rounded-pill" style={{ backgroundColor: label.color }} />
                          {label.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setDraft(draftFrom(item)); setError(null); }}>
                    <Pencil size={14} /> Bewerken
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void persist({ ...item, paused: !item.paused })}
                  >
                    {item.paused ? <Play size={14} /> : <Pause size={14} />}
                    {item.paused ? 'Hervatten' : 'Pauzeren'}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirming(item)}>
                    <Trash2 size={14} /> Verwijderen
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && !draft && <p className="mt-3 text-[12.5px] text-red">{error}</p>}

      <Dialog open={confirming != null} onOpenChange={(open) => { if (!open) setConfirming(null); }}>
        <DialogContent title="Routine verwijderen" className="max-w-md p-5">
          <h2 className="text-[16px] font-semibold text-txt">Routine verwijderen</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-txt-2">
            Verwijder “{confirming?.title}”? Afgevinkte kaarten blijven staan. Openstaande kaarten
            van vandaag en later verdwijnen en komen niet terug.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(null)} disabled={busy}>Annuleren</Button>
            <Button variant="danger" disabled={busy || !confirming} onClick={() => confirming && void remove(confirming)}>
              Verwijderen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoutineForm({
  draft, labels, busy, error, creatingLabel, labelName, labelColor,
  onChange, onCancel, onSave, onDelete, showDelete, onCreateLabel, onLabelName, onLabelColor, onToggleCreate,
}: {
  draft: Draft;
  labels: { id: string; name: string; color: string }[];
  busy: boolean;
  error: string | null;
  showDelete: boolean;
  creatingLabel: boolean;
  labelName: string;
  labelColor: string;
  onChange: (draft: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  onCreateLabel: () => void;
  onLabelName: (value: string) => void;
  onLabelColor: (value: string) => void;
  onToggleCreate: () => void;
}) {
  const daysMissing = draft.schedule !== 'daily' && draft.weekdays.length === 0;
  const canSave = draft.title.trim().length > 0 && !daysMissing && !busy;

  function setSchedule(schedule: RecurringSchedule) {
    if (schedule === 'times_per_week') {
      const days = spreadWeekdays(draft.timesPerWeek || 3);
      onChange({ ...draft, schedule, weekdays: days, timesPerWeek: days.length });
      return;
    }
    if (schedule === 'weekdays' && draft.weekdays.length === 0) {
      onChange({ ...draft, schedule, weekdays: [...WEEKDAYS] });
      return;
    }
    onChange({ ...draft, schedule });
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onCancel} className="self-start text-[12.5px] text-muted hover:text-txt cursor-pointer">
        Terug naar overzicht
      </button>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-txt-2">Titel</span>
        <Input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-txt-2">Beschrijving</span>
        <AutoTextarea
          value={draft.description}
          onChange={(event) => onChange({ ...draft, description: event.target.value })}
          rows={2}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-[13px] font-medium text-txt-2">Schema</legend>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['daily', 'Elke dag'],
            ['weekdays', 'Bepaalde dagen'],
            ['times_per_week', 'Keer per week'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSchedule(value)}
              className={cn(
                'rounded-pill px-3 py-1.5 text-[12.5px] cursor-pointer',
                draft.schedule === value ? 'bg-green text-white' : 'bg-surface-3 text-txt-2',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {draft.schedule === 'times_per_week' && (
          <label className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-txt-2">Aantal dagen</span>
            <Input
              type="number"
              min={1}
              max={7}
              value={draft.timesPerWeek}
              className="w-20"
              onChange={(event) => {
                const times = Math.min(7, Math.max(1, Number.parseInt(event.target.value, 10) || 1));
                onChange({ ...draft, timesPerWeek: times, weekdays: spreadWeekdays(times) });
              }}
            />
          </label>
        )}
        {draft.schedule !== 'daily' && (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const on = draft.weekdays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const weekdays = sortWeekdays(on
                      ? draft.weekdays.filter((item) => item !== day)
                      : [...draft.weekdays, day]);
                    onChange({
                      ...draft,
                      weekdays,
                      timesPerWeek: draft.schedule === 'times_per_week' ? Math.max(1, weekdays.length) : draft.timesPerWeek,
                    });
                  }}
                  className={cn(
                    'rounded-pill px-2.5 py-1 text-[12px] uppercase cursor-pointer',
                    on ? 'bg-green text-white' : 'bg-surface-3 text-txt-2',
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[12px] text-muted">
          {scheduleLabel({
            schedule: draft.schedule,
            weekdays: draft.weekdays,
            timesPerWeek: draft.schedule === 'times_per_week' ? draft.weekdays.length : null,
          })}
          . Kaarten komen op die dagen. “Keer per week” vult een vaste spreiding in, bijvoorbeeld ma, wo, vr bij 3.
        </p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-txt-2">Labels</span>
        {labels.length === 0 ? (
          <p className="text-[12px] text-muted">Nog geen labels.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {labels.map((label) => {
              const active = draft.labelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => onChange({
                    ...draft,
                    labelIds: active
                      ? draft.labelIds.filter((id) => id !== label.id)
                      : [...draft.labelIds, label.id],
                  })}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-medium cursor-pointer',
                    active ? 'ring-1' : 'opacity-70 hover:opacity-100',
                  )}
                  style={{
                    backgroundColor: `${label.color}22`,
                    color: label.color,
                    ...(active ? { ['--tw-ring-color' as string]: label.color } : {}),
                  }}
                >
                  <span className="h-2 w-2 rounded-pill" style={{ backgroundColor: label.color }} />
                  {label.name}
                </button>
              );
            })}
          </div>
        )}
        <button type="button" onClick={onToggleCreate} className="self-start text-[12.5px] text-green cursor-pointer">
          {creatingLabel ? 'Annuleer nieuw label' : 'Nieuw label'}
        </button>
        {creatingLabel && (
          <div className="flex flex-col gap-2 rounded-panel border border-line p-3">
            <Input value={labelName} placeholder="Naam" onChange={(event) => onLabelName(event.target.value)} />
            <ColorPicker value={labelColor} onChange={onLabelColor} />
            <Button size="sm" variant="secondary" onClick={onCreateLabel} disabled={!labelName.trim()}>
              Label toevoegen
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-txt-2">Checklist</span>
        {draft.checklist.map((item) => (
          <div key={item.id} className="flex gap-2">
            <Input
              value={item.text}
              onChange={(event) => onChange({
                ...draft,
                checklist: draft.checklist.map((entry) => entry.id === item.id ? { ...entry, text: event.target.value } : entry),
              })}
            />
            <Button
              size="icon"
              variant="ghost"
              aria-label="Punt weghalen"
              onClick={() => onChange({ ...draft, checklist: draft.checklist.filter((entry) => entry.id !== item.id) })}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onClick={() => onChange({
            ...draft,
            checklist: [...draft.checklist, { id: uid(), text: '', done: false, rank: (draft.checklist.length + 1) * 1000 }],
          })}
        >
          <Plus size={14} /> Punt toevoegen
        </Button>
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-txt-2">Dagdeel</span>
        <select
          value={draft.daypart}
          onChange={(event) => onChange({ ...draft, daypart: event.target.value as Daypart | '' })}
          className="h-9 rounded-pill border border-line-2 bg-surface px-3 text-[13px] text-txt"
        >
          <option value="">Geen</option>
          {DAYPARTS.map((part) => <option key={part} value={part}>{DAYPART_LABELS[part]}</option>)}
        </select>
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-txt-2">Schatting (min)</span>
        <Input
          type="number"
          min={1}
          value={draft.estimateMin}
          className="w-24"
          onChange={(event) => onChange({ ...draft, estimateMin: event.target.value })}
        />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-txt-2">Streak</span>
        <Switch checked={draft.streak} onCheckedChange={(streak) => onChange({ ...draft, streak })} />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-txt-2">Gepauzeerd</span>
        <Switch checked={draft.paused} onCheckedChange={(paused) => onChange({ ...draft, paused })} />
      </label>

      <p className="text-[12px] leading-relaxed text-muted">
        Afgevinkte kaarten blijven staan als je het schema wijzigt of de routine verwijdert.
        Open kaarten van vandaag en later die niet meer kloppen, verdwijnen.
      </p>
      {error && <p className="text-[12.5px] text-red">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={!canSave} onClick={onSave}>Opslaan</Button>
        <Button variant="secondary" onClick={onCancel}>Annuleren</Button>
        {showDelete && <Button variant="danger" onClick={onDelete}>Verwijderen</Button>}
      </div>
    </div>
  );
}
