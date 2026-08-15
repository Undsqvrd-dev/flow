'use client';

import { MoreHorizontal, Lock, LockOpen, ArrowRight, Eraser, Bell, Tag, Clock, Undo2 } from 'lucide-react';
import { parseISO } from 'date-fns';
import type { DayKey } from '@/lib/types';
import { PartSection } from './PartSection';
import { TaskCard } from './TaskCard';
import { QuickWinsBundlePrompt, QuickWinsCard } from './QuickWinsCard';
import { ThinScrollArea } from '@/components/ui/ThinScrollArea';
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { Textarea } from '@/components/ui/input';
import {
  useBoardStore,
  openTasksFor,
  openTasksForDate,
  doneTasksThisWeek,
  dayStateFor,
  quickWinsForDay,
  isQuickWinBundled,
  isQuickWin,
  quickWinBundleKey,
} from '@/stores/useBoardStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import {
  DAY_LABELS,
  dayKeyFromDate,
  isToday,
  shortDate,
  weekOf,
} from '@/lib/dates';
import { cn } from '@/lib/utils';

function ColumnMenu({ dayKey, closable, closed, dateISO, columnWeekOf }: {
  dayKey: DayKey;
  closable: boolean;
  closed: boolean;
  dateISO: string | null;
  columnWeekOf: string;
}) {
  const sortColumn = useBoardStore((s) => s.sortColumn);
  const clearColumnSort = useBoardStore((s) => s.clearColumnSort);
  const hasSortSnapshot = useBoardStore(
    (s) => Boolean(s.sortSnapshots[quickWinBundleKey(dayKey, columnWeekOf)]?.length),
  );
  const { moveAllToTomorrow, clearColumn, closeDay, reopenDay } = useBoardStore();
  return (
    <DropdownMenu>
      <DropdownTrigger className="invisible rounded-[6px] p-1 text-muted hover:bg-surface-3 group-hover/col:visible data-[state=open]:visible cursor-pointer">
        <MoreHorizontal size={15} strokeWidth={1.75} />
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem onSelect={() => sortColumn(dayKey, 'priority', columnWeekOf)}>
          <Bell size={14} strokeWidth={1.75} /> Sorteer op prioriteit
        </DropdownItem>
        <DropdownItem onSelect={() => sortColumn(dayKey, 'labels', columnWeekOf)}>
          <Tag size={14} strokeWidth={1.75} /> Sorteer op labels
        </DropdownItem>
        <DropdownItem onSelect={() => sortColumn(dayKey, 'estimate', columnWeekOf)}>
          <Clock size={14} strokeWidth={1.75} /> Sorteer op tijdsduur
        </DropdownItem>
        {hasSortSnapshot && (
          <DropdownItem onSelect={() => clearColumnSort(dayKey, columnWeekOf)}>
            <Undo2 size={14} strokeWidth={1.75} /> Sortering uit
          </DropdownItem>
        )}
        {closable && dateISO && (
          <DropdownItem onSelect={() => (closed ? reopenDay(dateISO) : closeDay(dateISO))}>
            {closed ? <LockOpen size={14} strokeWidth={1.75} /> : <Lock size={14} strokeWidth={1.75} />}
            {closed ? 'Dag heropenen' : 'Dag sluiten'}
          </DropdownItem>
        )}
        {dateISO && dayKey !== 'algemeen' && dayKey !== 'gedaan' && (
          <DropdownItem onSelect={() => moveAllToTomorrow(dateISO)}>
            <ArrowRight size={14} strokeWidth={1.75} /> Alles naar morgen
          </DropdownItem>
        )}
        <DropdownSeparator />
        <DropdownItem danger onSelect={() => clearColumn(dayKey, columnWeekOf)}>
          <Eraser size={14} strokeWidth={1.75} /> Kolom leegmaken
        </DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  );
}

export function Column({
  dayKey,
  index,
  dateISO: dateISOProp,
  featured = false,
}: {
  dayKey: DayKey;
  index: number;
  /** Kalenderdatum van deze kolom (verplicht voor borddagen). */
  dateISO?: string;
  featured?: boolean;
}) {
  const tasks = useBoardStore((s) => s.tasks);
  const dayStates = useBoardStore((s) => s.dayStates);
  const quickWinBundles = useBoardStore((s) => s.quickWinBundles);
  const closeDayFn = useBoardStore((s) => s.closeDay);
  const threshold = useSettingsStore((s) => s.settings.quickWinThresholdMin);

  const isDayColumn = dayKey !== 'algemeen' && dayKey !== 'gedaan' && dayKey !== 'dump' && dayKey !== 'wachtruimte';
  const date = dateISOProp ? parseISO(dateISOProp) : null;
  const dateISO = dateISOProp ?? null;
  const columnWeekOf = date ? weekOf(date) : weekOf();
  const resolvedDayKey = date ? dayKeyFromDate(date) : dayKey;
  const today = date ? isToday(date) : false;
  const dayState = dateISO ? dayStateFor(dayStates, dateISO) : undefined;
  const closed = dayState?.closed ?? false;

  const openCount = dateISO
    ? openTasksForDate(tasks, dateISO).length
    : tasks.filter((t) => !t.done && t.dayKey === dayKey).length;
  const doneCount = tasks.filter(
    (t) => t.done && t.dayKey === resolvedDayKey && t.weekOf === columnWeekOf,
  ).length;
  const doneTasks = doneTasksThisWeek(tasks);
  const count = dayKey === 'gedaan' ? doneTasks.length : openCount;
  const width = featured
    ? 'w-full min-w-0 max-w-[820px] flex-1'
    : 'w-[272px] shrink-0';

  const quickWins = dateISO
    ? quickWinsForDay(tasks, resolvedDayKey, threshold, columnWeekOf)
    : [];
  const quickWinsBundled = dateISO
    ? isQuickWinBundled(quickWinBundles, resolvedDayKey, columnWeekOf)
    : false;

  const dayTasks = dateISO
    ? (() => {
        const section = openTasksForDate(tasks, dateISO);
        return quickWinsBundled ? section.filter((t) => !isQuickWin(t, threshold)) : section;
      })()
    : [];

  if (closed && dateISO) {
    return (
      <div
        className={cn('rounded-panel border border-line bg-surface-2 p-3', 'w-[180px] shrink-0')}
        data-column-index={index}
        data-day-key={resolvedDayKey}
        data-date={dateISO}
      >
        <div className="flex items-center gap-1.5 text-muted">
          <Lock size={13} strokeWidth={1.75} />
          <span className="text-[12px] font-semibold">{DAY_LABELS[resolvedDayKey]}</span>
        </div>
        <p className="mt-1 text-[12px] text-muted">Gesloten · {doneCount}/{doneCount + openCount} af</p>
        <Textarea
          rows={2}
          defaultValue={dayState?.reflection ?? ''}
          onBlur={(e) => closeDayFn(dateISO, e.target.value || null)}
          placeholder="Eén regel reflectie…"
          className="mt-2 text-[12px]"
        />
        <button
          type="button"
          onClick={() => useBoardStore.getState().reopenDay(dateISO)}
          className="mt-2 text-[11px] font-medium text-green hover:underline cursor-pointer"
        >
          Heropenen
        </button>
      </div>
    );
  }

  return (
    <div
      data-column-index={index}
      data-day-key={resolvedDayKey}
      data-date={dateISO ?? undefined}
      className={cn(
        width,
        'flex max-h-full snap-center flex-col rounded-panel border border-line md:snap-align-none',
        today || featured
          ? 'bg-surface shadow-soft'
          : 'bg-surface-2/80 dark:bg-surface-2/50',
        featured && 'shadow-soft-lg',
      )}
    >
      <div className="group/col flex items-center gap-2 px-3 pb-1 pt-3">
        <span className="text-[13px] font-bold text-txt">{DAY_LABELS[resolvedDayKey]}</span>
        {date && <span className="text-[11px] text-muted">{shortDate(date)}</span>}
        <span className="ml-auto rounded-pill bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
          {count}
        </span>
        <ColumnMenu
          dayKey={resolvedDayKey}
          closable={isDayColumn}
          closed={closed}
          dateISO={dateISO}
          columnWeekOf={columnWeekOf}
        />
      </div>

      <ThinScrollArea className="flex flex-col gap-3 px-2.5 pb-2.5 pt-1">
        {dayKey === 'gedaan' ? (
          <PartSection dayKey="gedaan" daypart={null} tasks={doneTasks} showHeader={false} showAdd={false} />
        ) : dayKey === 'algemeen' ? (
          <PartSection
            dayKey="algemeen"
            daypart={null}
            tasks={openTasksFor(tasks, 'algemeen', null)}
            showHeader={false}
          />
        ) : dateISO ? (
          <>
            {quickWinsBundled && quickWins.length > 0 && (
              <QuickWinsCard
                tasks={quickWins}
                dayKey={resolvedDayKey}
                weekOf={columnWeekOf}
              />
            )}
            {!quickWinsBundled && quickWins.length >= 2 && (
              <QuickWinsBundlePrompt
                count={quickWins.length}
                dayKey={resolvedDayKey}
                weekOf={columnWeekOf}
              />
            )}
            <PartSection
              dayKey={resolvedDayKey}
              daypart={null}
              weekOf={columnWeekOf}
              tasks={dayTasks}
              showHeader={false}
              showAdd
            />
          </>
        ) : null}
      </ThinScrollArea>
    </div>
  );
}

/** Gedaan-kaarten zijn niet sorteerbaar; los exportje voor hergebruik. */
export { TaskCard };
