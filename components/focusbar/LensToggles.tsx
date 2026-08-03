'use client';

import { Switch } from '@/components/ui/switch';
import { useFocusStore, currentFocus } from '@/stores/useFocusStore';
import { useBoardStore, openTasksForDate } from '@/stores/useBoardStore';
import { todayISO, weekOf } from '@/lib/dates';

function mirrorText(): string {
  const { focuses } = useFocusStore.getState();
  const { tasks } = useBoardStore.getState();
  const focus = currentFocus(focuses);
  const todays = openTasksForDate(tasks, todayISO());

  if (!focus?.goalId && !focus?.headline) return 'Kies een weekfocus — dat is waar richting en uitvoering elkaar raken.';
  if (focus.goalId) {
    const linked = tasks.filter((t) => t.goalId === focus.goalId && t.weekOf === weekOf());
    if (linked.length === 0) return 'Je hebt deze week nog geen enkele taak aan je focusdoel gekoppeld.';
    const todayLinked = todays.filter((t) => t.goalId === focus.goalId).length;
    if (todays.length > 0) {
      return `Van de ${todays.length} taken vandaag ${todayLinked === 1 ? 'hangt er 1' : `hangen er ${todayLinked}`} aan je weekfocus.`;
    }
    return `${linked.length} taken deze week gekoppeld aan je weekfocus.`;
  }
  return todays.length > 0 ? `${todays.length} taken staan er vandaag voor je klaar.` : 'Vandaag is nog leeg. Plan bewust.';
}

const LENSES = [
  { key: 'focusGoal', label: 'Alleen focusdoel', hint: 'Dimt kaarten die niet aan je focusdoel hangen' },
  { key: 'today', label: 'Alleen vandaag', hint: 'Verbergt andere dagkolommen' },
  { key: 'hideDone', label: 'Verberg afgerond', hint: 'Haalt afgevinkte kaarten weg' },
] as const;

export function LensToggles({ onReviewDay }: { onReviewDay: () => void }) {
  const lensFocusGoal = useFocusStore((s) => s.lensFocusGoal);
  const lensToday = useFocusStore((s) => s.lensToday);
  const lensHideDone = useFocusStore((s) => s.lensHideDone);
  const setLens = useFocusStore((s) => s.setLens);
  // Abonneer op de data zodat de spiegeltekst live blijft.
  useBoardStore((s) => s.tasks.length);
  useFocusStore((s) => s.focuses);

  const values = { focusGoal: lensFocusGoal, today: lensToday, hideDone: lensHideDone };

  return (
    <div className="flex h-full flex-col">
      <p className="panel-label mb-2">Scherpstellen</p>
      <div className="flex flex-col gap-2">
        {LENSES.map(({ key, label, hint }) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-3" title={hint}>
            <span className="text-[13px] font-medium text-txt-2">{label}</span>
            <Switch checked={values[key]} onCheckedChange={(v) => setLens(key, v)} />
          </label>
        ))}
      </div>
      <p className="mt-3 text-[12px] italic leading-snug text-muted">“{mirrorText()}”</p>
      <button
        type="button"
        onClick={onReviewDay}
        className="mt-auto self-start rounded-pill border border-line-2 px-3 py-1.5 text-[12px] font-medium text-txt-2 transition-colors duration-150 hover:bg-surface-2 cursor-pointer"
      >
        Herzie mijn dag
      </button>
    </div>
  );
}
