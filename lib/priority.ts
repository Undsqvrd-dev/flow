export type Quadrant = 'nu' | 'plannen' | 'snel-weg' | 'schrappen' | null;

export function quadrant(t: { urgent: boolean | null; important: boolean | null }): Quadrant {
  if (t.urgent === null || t.important === null) return null;   // niet beoordeeld
  if (t.important && t.urgent) return 'nu';
  if (t.important && !t.urgent) return 'plannen';
  if (!t.important && t.urgent) return 'snel-weg';
  return 'schrappen';
}

export const QUADRANT_META = {
  'nu':        { label: 'Nu doen',   color: 'green-700', hint: 'Vandaag, eerste dagdeel.' },
  'plannen':   { label: 'Plannen',   color: 'green-500', hint: 'Hier zit je groei. Blokkeer er tijd voor.' },
  'snel-weg':  { label: 'Snel weg',  color: 'grey-500',  hint: 'Batchen of delegeren.' },
  'schrappen': { label: 'Schrappen', color: 'grey-400',  hint: 'Overweeg om dit te laten vallen.' },
} as const;

export const QUADRANT_ORDER: Record<NonNullable<Quadrant>, number> = {
  'nu': 0,
  'plannen': 1,
  'snel-weg': 2,
  'schrappen': 3,
};

/**
 * Sorteert taken op kwadrant (nu → plannen → snel-weg → schrappen).
 * Onbeoordeelde taken blijven onderaan staan in hun bestaande volgorde.
 */
export function sortByQuadrant<T extends { urgent: boolean | null; important: boolean | null; rank: number }>(
  tasks: T[],
): T[] {
  const rated = tasks.filter((t) => quadrant(t) !== null);
  const unrated = tasks.filter((t) => quadrant(t) === null);
  rated.sort((a, b) => {
    const qa = QUADRANT_ORDER[quadrant(a) as NonNullable<Quadrant>];
    const qb = QUADRANT_ORDER[quadrant(b) as NonNullable<Quadrant>];
    return qa !== qb ? qa - qb : a.rank - b.rank;
  });
  unrated.sort((a, b) => a.rank - b.rank);
  return [...rated, ...unrated];
}
