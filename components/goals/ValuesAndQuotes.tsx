'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useGoalsStore } from '@/stores/useGoalsStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Input } from '@/components/ui/input';

export function MantraEditor() {
  const mantra = useSettingsStore((s) => s.settings.mantra);
  const update = useSettingsStore((s) => s.update);
  return (
    <div className="rounded-panel border border-line bg-surface p-4">
      <p className="panel-label mb-2">Mantra</p>
      <Input value={mantra} onChange={(e) => update({ mantra: e.target.value })} placeholder="Jouw mantra…" />
    </div>
  );
}

export function ValuesEditor() {
  const values = useGoalsStore((s) => s.values);
  const addValue = useGoalsStore((s) => s.addValue);
  const updateValue = useGoalsStore((s) => s.updateValue);
  const removeValue = useGoalsStore((s) => s.removeValue);
  const [draft, setDraft] = useState('');

  return (
    <div className="rounded-panel border border-line bg-surface p-4">
      <p className="panel-label mb-2">Kernwaarden</p>
      <ul className="flex flex-col gap-1">
        {[...values].sort((a, b) => a.rank - b.rank).map((v) => (
          <li key={v.id} className="group flex items-center gap-2">
            <input
              value={v.text}
              onChange={(e) => updateValue(v.id, e.target.value)}
              className="h-8 flex-1 rounded-[8px] bg-transparent px-2 text-sm text-txt-2 outline-none hover:bg-surface-2 focus:bg-surface-2"
            />
            <button type="button" onClick={() => removeValue(v.id)} className="invisible text-muted-2 hover:text-red group-hover:visible cursor-pointer" aria-label="Verwijderen">
              <X size={14} strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-center gap-2 px-2">
        <Plus size={14} strokeWidth={1.75} className="text-muted-2" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) { addValue(draft.trim()); setDraft(''); }
          }}
          placeholder="Waarde toevoegen…"
          className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-2"
        />
      </div>
    </div>
  );
}
