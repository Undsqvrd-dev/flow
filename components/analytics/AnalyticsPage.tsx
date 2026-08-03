'use client';

import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import { WeekMatrix } from './WeekMatrix';
import { GoalDistribution } from '@/components/goals/GoalDistribution';
import { useBoardStore } from '@/stores/useBoardStore';
import { usePomodoroStore } from '@/stores/usePomodoroStore';
import { useFocusStore } from '@/stores/useFocusStore';
import { useGoalsStore, goalById } from '@/stores/useGoalsStore';
import { lastWeeks, weekOf } from '@/lib/dates';
import { addDays } from 'date-fns';

const chartTooltipStyle = {
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 12, fontSize: 12, color: 'var(--txt)',
} as const;

function WeeklyBars({ title, data, color }: {
  title: string;
  data: { week: string; waarde: number }[];
  color: string;
}) {
  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-4">{title}</p>
      <div className="h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -24, right: 4, top: 4 }}>
            <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 10.5, fill: 'var(--muted)' }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
            <ChartTooltip cursor={{ fill: 'var(--surface-3)' }} contentStyle={chartTooltipStyle} />
            <Bar dataKey="waarde" fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function FocusHistory() {
  const allFocuses = useFocusStore((s) => s.focuses);
  const focuses = [...allFocuses].sort((a, b) => b.weekOf.localeCompare(a.weekOf));
  const goals = useGoalsStore((s) => s.goals);
  const tasks = useBoardStore((s) => s.tasks);

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
      <p className="panel-label mb-3">Historie van weekfocussen</p>
      {focuses.length === 0 ? (
        <p className="text-[13px] text-muted">Nog geen weekfocus gezet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {focuses.slice(0, 12).map((f) => {
            const goal = goalById(goals, f.goalId);
            const linked = tasks.filter((t) => t.goalId === f.goalId && t.weekOf === f.weekOf);
            const doneLinked = linked.filter((t) => t.done).length;
            return (
              <li key={f.id} className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 hover:bg-surface-2">
                <span className="w-24 shrink-0 text-[12px] text-muted">
                  wk {format(parseISO(f.weekOf), 'd MMM', { locale: nl })}
                </span>
                <span className="h-2 w-2 shrink-0 rounded-pill" style={{ backgroundColor: goal?.color ?? 'var(--muted-2)' }} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-txt">
                  {f.headline ?? goal?.title ?? '—'}
                </span>
                {f.goalId && (
                  <span className="text-[12px] tabular-nums text-muted">{doneLinked}/{linked.length} taken af</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const tasks = useBoardStore((s) => s.tasks);
  const sessions = usePomodoroStore((s) => s.sessions);
  const weeks = lastWeeks(12);

  const doneData = weeks.map((w) => {
    const end = format(addDays(parseISO(w), 7), 'yyyy-MM-dd');
    return {
      week: format(parseISO(w), 'd/M'),
      waarde: tasks.filter((t) => t.done && t.completedAt && t.completedAt.slice(0, 10) >= w && t.completedAt.slice(0, 10) < end).length,
    };
  });

  const focusData = weeks.map((w) => {
    const end = format(addDays(parseISO(w), 7), 'yyyy-MM-dd');
    return {
      week: format(parseISO(w), 'd/M'),
      waarde: sessions
        .filter((s) => s.mode === 'focus' && s.startedAt.slice(0, 10) >= w && s.startedAt.slice(0, 10) < end)
        .reduce((sum, s) => sum + s.actualMin, 0),
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <p className="mb-4 text-[13px] text-muted">Eén rustige pagina voor je weekreflectie.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyBars title="Afgeronde taken per week (12 weken)" data={doneData} color="var(--green)" />
        <WeeklyBars title="Focusminuten per week" data={focusData} color="var(--green-200)" />
      </div>
      <div className="mt-4">
        <WeekMatrix currentWeek={weekOf()} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-panel border border-line bg-surface p-5 shadow-soft-sm">
          <p className="panel-label mb-3">Verdeling over doelen, deze week</p>
          <GoalDistribution />
        </div>
        <FocusHistory />
      </div>
    </div>
  );
}
