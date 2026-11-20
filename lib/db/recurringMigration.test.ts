import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/013_recurring_tasks.sql', 'utf8');

describe('migratie 013', () => {
  it('voegt routines toe zonder de bestaande rituelen te laten vallen', () => {
    expect(sql).toContain('create table if not exists recurring_tasks');
    expect(sql).toContain('create policy "eigen data" on recurring_tasks');
    expect(sql).toContain("'mediteren'");
    expect(sql).toContain("'sport'");
    expect(sql).toContain("'dagafsluiting'");
    expect(sql).toContain("'ochtend'");
    expect(sql).toContain('2000000000');
    expect(sql).toContain('dagafsluiting-q1');
    expect(sql).toContain('Hoe ging de dag?');
    expect(sql).toContain('Hoe voelde ik me vandaag en hoe voel ik me nu?');
    expect(sql).toContain('Waar ben je dankbaar voor?');
    expect(sql).toContain('ensure_daily_meditation(p_date)');
    expect(sql).not.toMatch(/drop function ensure_daily_meditation/i);
    expect(sql).not.toMatch(/drop function ensure_daily_rituals/i);
    expect(sql).toContain('drop_stale_recurring_cards');
    expect(sql).toContain('t.done = false');
    expect(sql).toContain('ritual_is_skipped');
    expect(sql).toContain('tasks_ritual_default_label');
    expect(sql).toContain('NEW.labels := coalesce(chosen');
  });
});
