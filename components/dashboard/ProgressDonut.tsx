'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useBoardStore } from '@/stores/useBoardStore';
import { weekOf } from '@/lib/dates';

/** Halve donut: % afgerond deze week, met legenda afgerond / bezig / open. */
export function ProgressDonut() {
  const tasks = useBoardStore((s) => s.tasks);
  const thisWeek = tasks.filter((t) => t.weekOf === weekOf() && t.dayKey !== 'algemeen');

  const done = thisWeek.filter((t) => t.done).length;
  const busy = thisWeek.filter((t) => !t.done && t.checklist.some((c) => c.done)).length;
  const open = thisWeek.length - done - busy;
  const pct = thisWeek.length > 0 ? Math.round((done / thisWeek.length) * 100) : 0;

  const data = [
    { name: 'Afgerond', value: done, color: 'var(--green)' },
    { name: 'Bezig', value: busy, color: 'var(--green-200)' },
    { name: 'Open', value: Math.max(open, thisWeek.length === 0 ? 1 : 0), color: 'var(--surface-3)' },
  ];

  return (
    <div className="flex h-full flex-col rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label">Voortgang</p>
      <p className="mt-0.5 text-[12px] text-muted">Deze week</p>
      <div className="relative mx-auto -mb-6 h-[140px] w-full max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              startAngle={180}
              endAngle={0}
              innerRadius="62%"
              outerRadius="100%"
              dataKey="value"
              cy="75%"
              stroke="none"
              isAnimationActive
            >
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-6 text-center">
          <span className="text-[28px] font-bold tabular-nums tracking-tight text-txt">{pct}%</span>
        </div>
      </div>
      <div className="mt-auto flex justify-center gap-4 pt-2">
        {[
          { label: 'Afgerond', color: 'var(--green)', n: done },
          { label: 'Bezig', color: 'var(--green-200)', n: busy },
          { label: 'Open', color: 'var(--surface-3)', n: open },
        ].map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-2 w-2 rounded-pill" style={{ backgroundColor: l.color }} />
            {l.label} · {l.n}
          </span>
        ))}
      </div>
    </div>
  );
}
