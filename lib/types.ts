export type DayKey =
  | 'algemeen' | 'ma' | 'di' | 'wo' | 'do' | 'vr' | 'za' | 'zo' | 'gedaan' | 'dump' | 'wachtruimte';

/** Kalenderdag-slots op het rollende bord (niet: algemeen/gedaan/dump/…). */
export type BoardDayKey = 'ma' | 'di' | 'wo' | 'do' | 'vr' | 'za' | 'zo';

export type Daypart = 'ochtend' | 'dag' | 'avond';
export type GoalScope = 'zakelijk' | 'prive';
export type GoalHorizon = 'jaar' | 'kwartaal' | 'maand';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dayKey: DayKey;
  daypart: Daypart | null;      // null = nog niet ingedeeld
  rank: number;                 // volgorde binnen dayKey + daypart

  // — alles hieronder is optioneel. Een taak werkt prima zonder. —
  goalId: string | null;
  urgent: boolean | null;       // null = niet beoordeeld
  important: boolean | null;    // null = niet beoordeeld
  estimateMin: number | null;   // voedt de Quick Wins-batch

  labels: string[];             // label-ids uit Settings.labels
  done: boolean;
  completedAt: string | null;
  dueDate: string | null;
  checklist: ChecklistItem[];
  comments: Comment[];
  weekOf: string;               // maandag van de week, ISO — voor archivering
  createdAt: string;
  updatedAt: string;
  fromPreviousWeek?: boolean;   // badge "van vorige week" na weekrollover
}

export interface ChecklistItem { id: string; text: string; done: boolean; rank: number }
export interface Comment { id: string; body: string; createdAt: string }

export interface Focus {
  id: string;
  weekOf: string;               // maandag ISO
  goalId: string | null;        // weekfocus: één doel
  headline: string | null;      // vrij geformuleerd: "Founding partners binnenhalen"
  dayFocusTaskId: string | null;// legacy — niet meer gebruikt (dagfocus is tekst)
  dayFocusNote: string | null;  // vrije zin: wat vandaag het belangrijkste is
  dayFocusDate: string | null;  // voor welke dag de dagfocus geldt
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  scope: GoalScope;
  horizon: GoalHorizon;         // dit jaar / kwartaal / maand
  color: string;                // hex, ook gebruikt als kaartstip
  targetValue: number | null;
  currentValue: number;
  unit: string | null;          // 'klanten', 'sessies', '€'
  deadline: string | null;
  active: boolean;
  rank: number;
}

export interface LabelDef {
  id: string;
  name: string;
  color: string;
}

export interface MoodboardImage {
  id: string;
  path: string;
  url: string;
}

/** @deprecated Dumpbak gebruikt nu echte Task-kaarten (dayKey dump/wachtruimte). */
export interface Idea {
  id: string;
  body: string;
  scope: GoalScope;
  status: 'dumpbak' | 'wachtruimte' | 'omgezet';
  taskId: string | null;
  createdAt: string;
}

export interface Value  { id: string; text: string; rank: number }

export interface SportSession {
  id: string; date: string; type: string;
  durationMin: number; intensity: 1|2|3|4|5; note: string | null;
}

export interface DayState {
  date: string; closed: boolean; closedAt: string | null; reflection: string | null;
}

export interface PomodoroSession {
  id: string; taskId: string | null; mode: 'focus' | 'pauze';
  plannedMin: number; actualMin: number; startedAt: string; completed: boolean;
}

export interface Settings {
  mantra: string;
  theme: 'light' | 'dark' | 'system';
  pomodoroFocusMin: number;      // 25
  pomodoroBreakMin: number;      // 5
  pomodoroLongBreakMin: number;  // 15
  pomodoroUntilLongBreak: number;// 4
  quickWinThresholdMin: number;  // 5
  sportWeeklyTarget: number;     // 4
  alarmSound: 'bel' | 'gong' | 'piep';
  showPriorityBadges: boolean;   // kwadrantlabels op kaarten aan/uit — default aan
  askDayFocusOnOpen: boolean;    // ochtendvraag — default aan
  labels: LabelDef[];            // zelf gedefinieerde labels met kleur
  moodboardImages: MoodboardImage[];
}

export const DEFAULT_LABELS: LabelDef[] = [
  { id: 'lbl-werk', name: 'Werk', color: '#1F9254' },
  { id: 'lbl-prive', name: 'Privé', color: '#0E7490' },
  { id: 'lbl-urgent', name: 'Urgent', color: '#D24A4A' },
];

export const DEFAULT_SETTINGS: Settings = {
  mantra: 'Bouw iets dat er vandaag toe doet.',
  theme: 'system',
  pomodoroFocusMin: 25,
  pomodoroBreakMin: 5,
  pomodoroLongBreakMin: 15,
  pomodoroUntilLongBreak: 4,
  quickWinThresholdMin: 5,
  sportWeeklyTarget: 4,
  alarmSound: 'bel',
  showPriorityBadges: true,
  askDayFocusOnOpen: true,
  labels: DEFAULT_LABELS,
  moodboardImages: [],
};

/** Statische fallbacklabels; UI gebruikt `horizonLabel()` uit dates.ts voor de actuele periode. */
export const GOAL_HORIZON_LABELS: Record<GoalHorizon, string> = {
  jaar: 'Dit jaar',
  kwartaal: 'Dit kwartaal',
  maand: 'Deze maand',
};
