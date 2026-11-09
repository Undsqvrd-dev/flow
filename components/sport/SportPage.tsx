'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import { Trash2 } from 'lucide-react';
import { SportRing, SportDayBars, SportStreak } from './SportWidgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSportStore, sessionsInWeek } from '@/stores/useSportStore';
import { lastWeeks, todayISO } from '@/lib/dates';

function LogForm() {
  const sessions = useSportStore((s) => s.sessions);
  const logSession = useSportStore((s) => s.logSession);
  const [date, setDate] = useState(todayISO());
  const done = sessions.some((session) => session.date === date);

  function submit() {
    if (done) return;
    logSession({ date, type: 'sport', durationMin: 0, intensity: 3, note: null });
  }

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-3">Gedaan</p>
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Button variant="primary" className="mt-3 w-full justify-center" onClick={submit} disabled={done}>
        {done ? 'Gedaan' : 'Markeer als gedaan'}
      </Button>
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
  const removeSession = useSportStore((s) => s.removeSession);
  const dates = [...new Set(allSessions.map((session) => session.date))].sort((a, b) => b.localeCompare(a));

  function clearDate(date: string) {
    for (const session of allSessions.filter((item) => item.date === date)) removeSession(session.id);
  }

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-3">Recente sessies</p>
      {dates.length === 0 ? (
        <p className="text-[13px] text-muted">Nog niets gedaan.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {dates.slice(0, 10).map((date) => (
            <li key={date} className="group flex items-center gap-3 rounded-[10px] px-2 py-1.5 hover:bg-surface-2">
              <span className="min-w-0 flex-1 text-[13px] text-txt first-letter:uppercase">
                {format(parseISO(date), 'EEEE d MMMM', { locale: nl })}
              </span>
              <button
                type="button"
                onClick={() => clearDate(date)}
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
