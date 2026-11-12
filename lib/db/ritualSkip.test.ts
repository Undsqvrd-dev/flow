import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ensureTodayRituals } from '@/lib/db/ensureMeditation';
import { closingRitualKey } from '@/lib/closing';
import { meditationRitualKey } from '@/lib/meditation';
import { isRitualSkipped, setRitualSkips } from '@/lib/ritualSkip';
import { sportRitualKey } from '@/lib/sportRitual';
import type { Task } from '@/lib/types';
import { useBoardStore } from '@/stores/useBoardStore';

const DAY = '2026-11-12';
const NEXT = '2026-11-13';

function sportTask(date: string): Task {
  const key = sportRitualKey(date);
  return {
    id: 'sport',
    title: 'Sport',
    description: null,
    dayKey: 'do',
    daypart: 'ochtend',
    rank: 1,
    goalId: null,
    urgent: null,
    important: null,
    estimateMin: null,
    labels: [],
    done: false,
    completedAt: null,
    dueDate: null,
    checklist: [],
    comments: [],
    weekOf: '2026-11-09',
    createdAt: '2026-11-12T08:00:00.000Z',
    updatedAt: '2026-11-12T08:00:00.000Z',
    ritualKey: key,
  };
}

describe('ritueel overslaan', () => {
  beforeEach(() => {
    setRitualSkips([]);
    useBoardStore.setState({ tasks: [], labelBundles: [], quickWinBundles: [] });
  });

  it('maakt een verwijderde Sport-taak die dag niet opnieuw aan', async () => {
    useBoardStore.setState({ tasks: [sportTask(DAY)] });
    useBoardStore.getState().removeTask('sport');
    await ensureTodayRituals(DAY);
    expect(isRitualSkipped(sportRitualKey(DAY))).toBe(true);
    expect(useBoardStore.getState().tasks.map((task) => task.ritualKey)).not.toContain(sportRitualKey(DAY));
  });

  it('zet het ritueel de volgende dag wel terug', async () => {
    setRitualSkips([
      sportRitualKey(DAY),
      meditationRitualKey(DAY),
      closingRitualKey(DAY),
    ]);
    await ensureTodayRituals(NEXT);
    const keys = useBoardStore.getState().tasks.map((task) => task.ritualKey);
    expect(keys).toContain(sportRitualKey(NEXT));
    expect(keys).not.toContain(sportRitualKey(DAY));
  });

  it('legt de skip vast in migratie 012 voor elk dagsritueel', () => {
    const sql = readFileSync('supabase/migrations/012_ritual_skips.sql', 'utf8');
    expect(sql).toContain('create table if not exists ritual_skips');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('auth.uid()');
    expect(sql).toContain('tasks_remember_ritual_skip');
    expect(sql).toContain('ritual_is_skipped');
    expect(sql).toContain('sport:');
    expect(sql).toContain('mediteren:');
    expect(sql).toContain('dagafsluiting:');
    expect(sql).toContain('ensure_daily_meditation');
    expect(sql).toContain('ensure_daily_rituals');
    expect(sql).not.toContain('drop function ensure_daily_meditation');
    expect(sql).not.toContain('drop function ensure_daily_rituals');
  });
});
