import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLOSING_NOTES, CLOSING_RANK, closingRitualKey, compareDayTasks } from '@/lib/closing';
import { meditationRitualKey, meditationStreak } from '@/lib/meditation';
import { isQuickWin } from '@/stores/useBoardStore';
import type { Task } from '@/lib/types';

const TODAY = '2026-10-19';

function task(partial: Pick<Task, 'rank' | 'ritualKey'> & Partial<Pick<Task, 'done' | 'estimateMin'>>): Task {
  return {
    id: partial.ritualKey ?? `r-${partial.rank}`,
    title: 'Taak',
    description: null,
    dayKey: 'ma',
    daypart: null,
    rank: partial.rank,
    goalId: null,
    urgent: null,
    important: null,
    estimateMin: partial.estimateMin ?? null,
    labels: [],
    done: partial.done ?? false,
    completedAt: null,
    dueDate: null,
    checklist: [],
    comments: [],
    weekOf: TODAY,
    createdAt: `${TODAY}T06:00:00.000Z`,
    updatedAt: `${TODAY}T06:00:00.000Z`,
    ritualKey: partial.ritualKey,
  };
}

describe('dagafsluiting', () => {
  it('zet de afsluiting achter andere taken, ook als die een hogere rank hebben', () => {
    const meditation = task({ rank: 0, ritualKey: meditationRitualKey(TODAY) });
    const later = task({ rank: CLOSING_RANK + 1000, ritualKey: null });
    const closing = task({ rank: 50, ritualKey: closingRitualKey(TODAY) });
    const ordered = [later, closing, meditation].sort(compareDayTasks);
    expect(ordered.map((item) => item.ritualKey ?? item.id)).toEqual([
      meditationRitualKey(TODAY),
      later.id,
      closingRitualKey(TODAY),
    ]);
  });

  it('laat de volgorde van gewone taken ongemoeid', () => {
    const low = task({ rank: 1000, ritualKey: null });
    const high = task({ rank: 3000, ritualKey: null });
    expect([high, low].sort(compareDayTasks).map((item) => item.rank)).toEqual([1000, 3000]);
  });

  it('bundelt een afsluiting van 5 minuten niet als quick win', () => {
    const closing = task({
      rank: CLOSING_RANK,
      ritualKey: closingRitualKey(TODAY),
      estimateMin: 5,
    });
    const short = task({ rank: 1000, ritualKey: null, estimateMin: 5 });
    expect(isQuickWin(closing, 5)).toBe(false);
    expect(isQuickWin(short, 5)).toBe(true);
  });

  it('telt niet mee in de meditatie-streak', () => {
    const stats = meditationStreak(
      [
        { ritualKey: meditationRitualKey('2026-10-18'), done: true },
        { ritualKey: closingRitualKey('2026-10-18'), done: true },
        { ritualKey: closingRitualKey(TODAY), done: true },
      ],
      TODAY,
    );
    expect(stats).toEqual({ current: 1, longest: 1 });
  });

  it('staat in migratie 007 met de drie vragen, 5 minuten en de bestaande meditatie-rpc', () => {
    const sql = readFileSync('supabase/migrations/007_daily_dagafsluiting.sql', 'utf8');
    expect(sql).toContain(CLOSING_NOTES);
    expect(sql).toContain('dagafsluiting:');
    expect(sql).toContain('estimate_min');
    expect(sql).toContain('5');
    expect(sql).toContain('ensure_daily_meditation(p_date)');
    expect(sql).toContain('ensure_daily_rituals');
    expect(sql).not.toContain('drop function ensure_daily_meditation');
  });
});
