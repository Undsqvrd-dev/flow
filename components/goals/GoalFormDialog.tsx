'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { useGoalsStore } from '@/stores/useGoalsStore';
import { GOAL_COLOR_PALETTE } from '@/lib/labels';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { horizonLabel } from '@/lib/dates';
import type { Goal, GoalHorizon, GoalScope } from '@/lib/types';

const HORIZONS: GoalHorizon[] = ['maand', 'kwartaal', 'jaar'];

export function GoalFormDialog({ open, onOpenChange, goal, defaultHorizon }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goal?: Goal;
  defaultHorizon?: GoalHorizon;
}) {
  const addGoal = useGoalsStore((s) => s.addGoal);
  const updateGoal = useGoalsStore((s) => s.updateGoal);

  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<GoalScope>('zakelijk');
  const [horizon, setHorizon] = useState<GoalHorizon>('maand');
  const [color, setColor] = useState<string>(GOAL_COLOR_PALETTE[0]);
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? '');
    setScope(goal?.scope ?? 'zakelijk');
    setHorizon(goal?.horizon ?? defaultHorizon ?? 'maand');
    setColor(goal?.color ?? GOAL_COLOR_PALETTE[0]);
    setTarget(goal?.targetValue?.toString() ?? '');
    setCurrent(goal?.currentValue?.toString() ?? '0');
    setUnit(goal?.unit ?? '');
    setDeadline(goal?.deadline ?? '');
  }, [open, goal, defaultHorizon]);

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const currentValue = current ? Math.max(0, Number(current)) : 0;
    const targetValue = target ? Number(target) : null;
    const payload = {
      title: trimmed,
      scope,
      horizon,
      color,
      targetValue,
      unit: unit.trim() || null,
      deadline: deadline || null,
    };

    if (goal) {
      updateGoal(goal.id, { ...payload, currentValue });
    } else {
      const created = addGoal(payload);
      if (currentValue > 0) updateGoal(created.id, { currentValue });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={goal ? 'Doel bewerken' : 'Nieuw doel'}>
        <div className="flex flex-col gap-4 p-5">
          <p className="panel-label">{goal ? 'Doel bewerken' : 'Nieuw doel'}</p>
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel, bv. '35 klanten'" />

          <div>
            <p className="panel-label mb-1.5">Horizon</p>
            <Segmented<GoalHorizon>
              options={HORIZONS.map((h) => ({
                value: h,
                label: horizonLabel(h),
              }))}
              value={horizon}
              onChange={(v) => v && setHorizon(v)}
              className="w-full [&>button]:flex-1"
            />
          </div>

          <div>
            <p className="panel-label mb-1.5">Scope</p>
            <Segmented<GoalScope>
              options={[{ value: 'zakelijk', label: 'Zakelijk' }, { value: 'prive', label: 'Privé' }]}
              value={scope}
              onChange={(v) => v && setScope(v)}
            />
          </div>
          <div>
            <p className="panel-label mb-1.5">Kleur</p>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="panel-label mb-1.5">Nu</p>
              <Input type="number" min={0} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0" />
            </div>
            <div>
              <p className="panel-label mb-1.5">Target</p>
              <Input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="35" />
            </div>
            <div>
              <p className="panel-label mb-1.5">Eenheid</p>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="klanten" />
            </div>
          </div>
          <div>
            <p className="panel-label mb-1.5">Deadline</p>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button variant="primary" onClick={submit} disabled={!title.trim()}>
              {goal ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
