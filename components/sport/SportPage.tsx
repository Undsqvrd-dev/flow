'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import { Trash2 } from 'lucide-react';
import { SportRing, SportDayBars, SportStreak } from './SportWidgets';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { useSportStore, sessionsInWeek } from '@/stores/useSportStore';
import { lastWeeks, todayISO } from '@/lib/dates';
import { cn } from '@/lib/utils';

const TYPES = ['kracht', 'cardio', 'wandelen', 'vrij'] as const;

function LogForm() {
  const logSession = useSportStore((s) => s.logSession);
  const [type, setType] = useState<string>('kracht');
  const [date, setDate] = useState(todayISO());
  const [duration, setDuration] = useState('45');
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [note, setNote] = useState('');

  function submit() {
    const min = Number(duration);
    if (!min || min <= 0) return;
    logSession({ date, type, durationMin: min, intensity, note: note.trim() || null });
    setNote('');
  }

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-3">Sessie loggen</p>
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              'rounded-pill border px-3.5 py-1.5 text-[12.5px] font-medium capitalize transition-colors duration-150 cursor-pointer',
              type === t ? 'border-green bg-green-50 text-green' : 'border-line text-txt-2 hover:border-line-2',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duur (min)" />
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-[12px] text-muted">Intensiteit</p>
        <div className="flex gap-1.5">
          {([1, 2, 3, 4, 5] as const).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIntensity(i)}
              className={cn(
                'h-8 w-8 rounded-pill border text-[12.5px] font-semibold tabular-nums transition-colors duration-150 cursor-pointer',
                intensity >= i ? 'border-transparent bg-green text-white' : 'border-line text-muted hover:border-line-2',
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </div>
      <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notitie (optioneel)" className="mt-3" />
      <Button variant="primary" className="mt-3 w-full justify-center" onClick={submit}>Loggen</Button>
    </div>
  );
}

function TrendChart() {
  const sessions = useSportStore((s) => s.sessions);
  const data = lastWeeks(12).map((week) => ({
    week: format(parseISO(week), 'd MMM', { locale: nl }),
    sessies: sessionsInWeek(sessions, week).length,
  }));

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-4">Trend — laatste 12 weken</p>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -24, right: 8, top: 4 }}>
            <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
            <ChartTooltip
              contentStyle={{
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 12, fontSize: 12, color: 'var(--txt)',
              }}
            />
            <Line type="monotone" dataKey="sessies" stroke="var(--green)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--green)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SessionList() {
  const allSessions = useSportStore((s) => s.sessions);
  const sessions = [...allSessions].sort((a, b) => b.date.localeCompare(a.date));
  const removeSession = useSportStore((s) => s.removeSession);

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-3">Recente sessies</p>
      {sessions.length === 0 ? (
        <p className="text-[13px] text-muted">Nog geen sessies gelogd.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sessions.slice(0, 10).map((s) => (
            <li key={s.id} className="group flex items-center gap-3 rounded-[10px] px-2 py-1.5 hover:bg-surface-2">
              <span className="w-20 shrink-0 text-[12px] text-muted first-letter:uppercase">
                {format(parseISO(s.date), 'EEEEEE d MMM', { locale: nl })}
              </span>
              <span className="flex-1 text-[13px] font-medium capitalize text-txt">{s.type}</span>
              <span className="text-[12px] tabular-nums text-muted">{s.durationMin} min · int. {s.intensity}</span>
              <button
                type="button"
                onClick={() => removeSession(s.id)}
                className="invisible text-muted-2 hover:text-red group-hover:visible cursor-pointer"
                aria-label="Verwijderen"
              >
                <Trash2 size={13} strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SportPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm lg:col-span-2">
          <p className="panel-label mb-4">Deze week</p>
          <div className="flex flex-wrap items-center justify-around gap-6">
            <SportRing size={120} />
            <SportDayBars />
            <SportStreak />
          </div>
        </div>
        <LogForm />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TrendChart />
        <SessionList />
      </div>
    </div>
  );
}
