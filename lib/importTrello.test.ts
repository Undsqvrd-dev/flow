import { describe, expect, it } from 'vitest';
import { importTrello, type TrelloExport } from './importTrello';

let n = 0;
const id = () => `id-${++n}`;

const sample: TrelloExport = {
  lists: [
    { id: 'l1', name: 'Algemeen', closed: false },
    { id: 'l2', name: 'Maandag', closed: false },
    { id: 'l3', name: 'Zaterdag of zondag', closed: false },
    { id: 'l4', name: 'Gedaan', closed: false },
    { id: 'l5', name: 'Archief', closed: true },
  ],
  cards: [
    {
      id: 'c1',
      name: 'Founding partners bellen',
      desc: 'Lijst van 10',
      idList: 'l2',
      closed: false,
      due: '2026-08-05T10:00:00Z',
      pos: 1,
      labels: [{ name: 'werk', color: 'green' }],
    },
    {
      id: 'c2',
      name: 'Gesloten kaart',
      desc: '',
      idList: 'l1',
      closed: true,
      due: null,
      pos: 2,
      labels: [],
    },
    {
      id: 'c3',
      name: 'Boodschappen',
      desc: '',
      idList: 'l3',
      closed: false,
      due: null,
      pos: 1,
      labels: [],
    },
    {
      id: 'c4',
      name: 'Pitch afgerond',
      desc: '',
      idList: 'l4',
      closed: false,
      due: null,
      pos: 1,
      labels: [],
      dateLastActivity: '2026-07-30T12:00:00Z',
    },
  ],
  checklists: [
    {
      id: 'ch1',
      idCard: 'c1',
      checkItems: [
        { name: 'Lijst maken', state: 'complete', pos: 1 },
        { name: 'Bellen', state: 'incomplete', pos: 2 },
      ],
    },
  ],
  actions: [
    {
      type: 'commentCard',
      date: '2026-07-29T09:00:00Z',
      data: { card: { id: 'c1' }, text: 'Eerst warme leads' },
    },
  ],
};

describe('importTrello', () => {
  it('mapt lijsten naar dagen en slaat gesloten kaarten over', () => {
    n = 0;
    const tasks = importTrello(sample, id);
    expect(tasks).toHaveLength(3);
    expect(tasks.map((t) => t.dayKey)).toEqual(['ma', 'za', 'gedaan']);
  });

  it('neemt checklists, comments, labels en due dates mee', () => {
    n = 0;
    const tasks = importTrello(sample, id);
    const first = tasks.find((t) => t.title === 'Founding partners bellen');
    expect(first).toBeDefined();
    expect(first!.checklist).toHaveLength(2);
    expect(first!.checklist[0].done).toBe(true);
    expect(first!.comments).toHaveLength(1);
    expect(first!.comments[0].body).toBe('Eerst warme leads');
    expect(first!.labels).toEqual(['#1F9254']);
    expect(first!.dueDate).toBe('2026-08-05');
    expect(first!.description).toBe('Lijst van 10');
  });

  it('markeert Gedaan-kaarten als done', () => {
    n = 0;
    const tasks = importTrello(sample, id);
    const done = tasks.find((t) => t.title === 'Pitch afgerond');
    expect(done!.done).toBe(true);
    expect(done!.completedAt).toBe('2026-07-30T12:00:00Z');
  });
});
