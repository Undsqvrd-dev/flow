'use client';

import { useRef, useState } from 'react';
import { Plus, Trash2, Upload, Volume2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';
import { useBoardStore } from '@/stores/useBoardStore';
import { useAlarm } from '@/lib/useAlarm';
import { importTrello, type TrelloExport } from '@/lib/importTrello';
import { GOAL_COLOR_PALETTE } from '@/lib/labels';
import { uid, cn } from '@/lib/utils';
import type { Settings } from '@/lib/types';

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-4">{title}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function NumberField({ label, value, onChange, min = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-[13px] font-medium text-txt-2">{label}</span>
      <Input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
        className="w-24 text-center tabular-nums"
      />
    </label>
  );
}

function ToggleField({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-[13px] font-medium text-txt-2">{label}</span>
        {hint && <span className="block text-[11.5px] text-muted">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function LabelsEditor() {
  const labels = useSettingsStore((s) => s.settings.labels);
  const addLabel = useSettingsStore((s) => s.addLabel);
  const updateLabel = useSettingsStore((s) => s.updateLabel);
  const removeLabel = useSettingsStore((s) => s.removeLabel);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(GOAL_COLOR_PALETTE[0]);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    addLabel(trimmed, color);
    setName('');
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1.5">
        {labels.map((label) => (
          <li key={label.id} className="flex items-center gap-2 rounded-[10px] bg-surface-2 px-2.5 py-2">
            <div className="flex gap-1">
              {GOAL_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updateLabel(label.id, { color: c })}
                  className={cn(
                    'h-4 w-4 rounded-pill cursor-pointer',
                    label.color === c && 'ring-2 ring-offset-1 ring-offset-surface-2 scale-110',
                  )}
                  style={{ backgroundColor: c, ...(label.color === c ? { ['--tw-ring-color' as string]: c } : {}) }}
                  aria-label={c}
                />
              ))}
            </div>
            <input
              value={label.name}
              onChange={(e) => updateLabel(label.id, { name: e.target.value })}
              className="h-8 min-w-0 flex-1 rounded-[8px] bg-transparent px-2 text-sm text-txt outline-none"
            />
            <button
              type="button"
              onClick={() => removeLabel(label.id)}
              className="rounded-[6px] p-1 text-muted hover:bg-red/10 hover:text-red cursor-pointer"
              aria-label="Label verwijderen"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Nieuw label…"
          className="min-w-[140px] flex-1"
        />
        <div className="flex gap-1">
          {GOAL_COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn('h-5 w-5 rounded-pill cursor-pointer', color === c && 'ring-2 ring-offset-1 ring-offset-surface scale-110')}
              style={{ backgroundColor: c, ...(color === c ? { ['--tw-ring-color' as string]: c } : {}) }}
            />
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={submit} disabled={!name.trim()}>
          <Plus size={14} strokeWidth={2} /> Toevoegen
        </Button>
      </div>
    </div>
  );
}

function TrelloImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<string | null>(null);

  async function onFile(file: File) {
    try {
      const data = JSON.parse(await file.text()) as TrelloExport;
      const tasks = importTrello(data, uid);
      useBoardStore.setState((s) => ({ tasks: [...s.tasks, ...tasks] }));
      setResult(`${tasks.length} taken geïmporteerd. Bekijk ze op het weekbord.`);
    } catch {
      setResult('Import mislukt — is dit een geldige Trello JSON-export?');
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
        <Upload size={15} strokeWidth={1.75} /> Importeer Trello-export (JSON)
      </Button>
      {result && <p className="mt-2 text-[12px] text-muted">{result}</p>}
      <p className="mt-2 text-[11.5px] text-muted-2">
        Trello → bordmenu → Print &amp; export → Exporteer als JSON. Lijsten worden dagen, kaarten worden taken,
        checklists en comments gaan mee.
      </p>
    </div>
  );
}

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const focusMode = useUiStore((s) => s.focusMode);
  const setFocusMode = useUiStore((s) => s.setFocusMode);
  const { play } = useAlarm();

  const sounds: Settings['alarmSound'][] = ['bel', 'gong', 'piep'];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <div className="flex flex-col gap-4">
        <Panel title="Mantra">
          <Input value={settings.mantra} onChange={(e) => update({ mantra: e.target.value })} />
        </Panel>

        <Panel title="Pomodoro">
          <NumberField label="Focusblok (min)" value={settings.pomodoroFocusMin} onChange={(v) => update({ pomodoroFocusMin: v })} />
          <NumberField label="Korte pauze (min)" value={settings.pomodoroBreakMin} onChange={(v) => update({ pomodoroBreakMin: v })} />
          <NumberField label="Lange pauze (min)" value={settings.pomodoroLongBreakMin} onChange={(v) => update({ pomodoroLongBreakMin: v })} />
          <NumberField label="Rondes tot lange pauze" value={settings.pomodoroUntilLongBreak} onChange={(v) => update({ pomodoroUntilLongBreak: v })} />
          <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] font-medium text-txt-2">Alarmgeluid</span>
            <div className="flex gap-1.5">
              {sounds.map((sound) => (
                <button
                  key={sound}
                  type="button"
                  onClick={() => { update({ alarmSound: sound }); play(sound); }}
                  className={cn(
                    'rounded-pill border px-3 py-1.5 text-[12px] font-medium capitalize transition-colors duration-150 cursor-pointer',
                    settings.alarmSound === sound
                      ? 'border-green bg-green-50 text-green'
                      : 'border-line text-txt-2 hover:border-line-2',
                  )}
                >
                  {sound}
                </button>
              ))}
              <Button variant="ghost" size="icon" onClick={() => play(settings.alarmSound)} aria-label="Test alarm">
                <Volume2 size={15} strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        </Panel>

        <Panel title="Bord & focus">
          <NumberField label="Quick win-drempel (min)" value={settings.quickWinThresholdMin} onChange={(v) => update({ quickWinThresholdMin: v })} />
          <ToggleField
            label="Kwadrantlabels op kaarten"
            hint="Toon het prioriteitspilletje op beoordeelde kaarten"
            checked={settings.showPriorityBadges}
            onChange={(v) => update({ showPriorityBadges: v })}
          />
          <ToggleField
            label="Ochtendvraag"
            hint="Vraag bij het eerste bezoek van de dag om een dagfocus"
            checked={settings.askDayFocusOnOpen}
            onChange={(v) => update({ askDayFocusOnOpen: v })}
          />
          <ToggleField
            label="Focusmodus"
            hint="Alleen vandaag + Gedaan, uitvergroot (⌘F · Esc om terug)"
            checked={focusMode}
            onChange={setFocusMode}
          />
        </Panel>

        <Panel title="Labels">
          <LabelsEditor />
        </Panel>

        <Panel title="Sport">
          <NumberField label="Weekdoel (sessies)" value={settings.sportWeeklyTarget} onChange={(v) => update({ sportWeeklyTarget: v })} />
        </Panel>

        <Panel title="Migratie">
          <TrelloImport />
        </Panel>
      </div>
    </div>
  );
}
