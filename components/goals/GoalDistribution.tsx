'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip as ChartTooltip } from 'recharts';
import { useBoardStore } from '@/stores/useBoardStore';
import { useGoalsStore, activeGoals } from '@/stores/useGoalsStore';
import { weekOf } from '@/lib/dates';

/** Staafdiagram: verdeling van je taken over doelen, deze week. */
export function GoalDistribution() {
  const tasks = useBoardStore((s) => s.tasks);
  const allGoals = useGoalsStore((s) => s.goals);
  const goals = activeGoals(allGoals);

  const thisWeek = tasks.filter((t) => t.weekOf === weekOf());
  const data = [
    ...goals.map((g) => ({
      name: g.title.length > 18 ? `${g.title.slice(0, 18)}…` : g.title,
      count: thisWeek.filter((t) => t.goalId === g.id).length,
      color: g.color,
    })),
    {
      name: 'Geen doel',
      count: thisWeek.filter((t) => t.goalId === null).length,
      color: 'var(--muted-2)',
    },
  ].filter((d) => d.count > 0);

  if (data.length === 0) {
    return <p className="py-8 text-center text-[13px] text-muted">Nog geen taken deze week.</p>;
  }

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <XAxis type="number" hide domain={[0, 'dataMax']} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--surface-3)' }}
            contentStyle={{
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 12, fontSize: 12, color: 'var(--txt)',
            }}
          />
          <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={16}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
