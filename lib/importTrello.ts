import type { ChecklistItem, Comment, DayKey, Task } from './types';
import { weekOf } from './dates';

/* Minimale vorm van een Trello JSON-export (bord-export). */
export interface TrelloExport {
  lists: { id: string; name: string; closed: boolean }[];
  cards: {
    id: string; name: string; desc: string; idList: string; closed: boolean;
    due: string | null; pos: number;
    labels: { name: string; color: string | null }[];
    dateLastActivity?: string;
  }[];
  checklists?: {
    id: string; idCard: string;
    checkItems: { name: string; state: 'complete' | 'incomplete'; pos: number }[];
  }[];
  actions?: {
    type: string; date: string;
    data: { card?: { id: string }; text?: string };
  }[];
}

const LIST_MAP: Record<string, DayKey> = {
  'algemeen': 'algemeen',
  'maandag': 'ma',
  'dinsdag': 'di',
  'woensdag': 'wo',
  'donderdag': 'do',
  'vrijdag': 'vr',
  'zaterdag of zondag': 'za',
  'zaterdag': 'za',
  'zondag': 'zo',
  'weekend': 'za',
  'gedaan': 'gedaan',
};

const TRELLO_COLOR_MAP: Record<string, string> = {
  green: '#1F9254',
  yellow: '#D98B14',
  orange: '#D98B14',
  red: '#D24A4A',
  purple: '#7C3AED',
  blue: '#2563EB',
  sky: '#0E7490',
  lime: '#1F9254',
  pink: '#DB2777',
  black: '#57534E',
};

function mapList(name: string): DayKey {
  return LIST_MAP[name.trim().toLowerCase()] ?? 'algemeen';
}

/** Zet een Trello-bordexport om naar FLOW-taken. Gesloten (gearchiveerde) kaarten en lijsten worden overgeslagen. */
export function importTrello(data: TrelloExport, idFactory: () => string): Task[] {
  const openLists = new Map(data.lists.filter((l) => !l.closed).map((l) => [l.id, mapList(l.name)]));
  const checklistsByCard = new Map<string, ChecklistItem[]>();
  for (const cl of data.checklists ?? []) {
    const items: ChecklistItem[] = [...cl.checkItems]
      .sort((a, b) => a.pos - b.pos)
      .map((item, i) => ({
        id: idFactory(),
        text: item.name,
        done: item.state === 'complete',
        rank: (i + 1) * 1000,
      }));
    checklistsByCard.set(cl.idCard, [...(checklistsByCard.get(cl.idCard) ?? []), ...items]);
  }

  const commentsByCard = new Map<string, Comment[]>();
  for (const action of data.actions ?? []) {
    if (action.type !== 'commentCard' || !action.data.card || !action.data.text) continue;
    const list = commentsByCard.get(action.data.card.id) ?? [];
    list.push({ id: idFactory(), body: action.data.text, createdAt: action.date });
    commentsByCard.set(action.data.card.id, list);
  }

  const now = new Date().toISOString();
  const tasks: Task[] = [];
  const sorted = [...data.cards].sort((a, b) => a.pos - b.pos);
  const rankPerList = new Map<string, number>();

  for (const card of sorted) {
    if (card.closed) continue;
    const dayKey = openLists.get(card.idList);
    if (dayKey === undefined) continue;
    const isDone = dayKey === 'gedaan';
    const rank = (rankPerList.get(card.idList) ?? 0) + 1000;
    rankPerList.set(card.idList, rank);

    tasks.push({
      id: idFactory(),
      title: card.name,
      description: card.desc || null,
      dayKey: isDone ? 'gedaan' : dayKey,
      daypart: null,
      rank,
      goalId: null,
      urgent: null,
      important: null,
      estimateMin: null,
      labels: card.labels
        .map((l) => (l.color ? TRELLO_COLOR_MAP[l.color] : null))
        .filter((c): c is string => c !== null),
      done: isDone,
      completedAt: isDone ? (card.dateLastActivity ?? now) : null,
      dueDate: card.due ? card.due.slice(0, 10) : null,
      checklist: (checklistsByCard.get(card.id) ?? []).sort((a, b) => a.rank - b.rank),
      comments: (commentsByCard.get(card.id) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      weekOf: weekOf(),
      createdAt: now,
      updatedAt: now,
    });
  }
  return tasks;
}
