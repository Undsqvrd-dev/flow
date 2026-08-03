import { describe, expect, it } from 'vitest';
import { quadrant, sortByQuadrant, QUADRANT_META } from './priority';

describe('quadrant', () => {
  it('geeft null bij een onbeoordeelde taak', () => {
    expect(quadrant({ urgent: null, important: null })).toBeNull();
    expect(quadrant({ urgent: true, important: null })).toBeNull();
    expect(quadrant({ urgent: null, important: true })).toBeNull();
  });

  it('mapt urgentie × belang naar het juiste kwadrant', () => {
    expect(quadrant({ urgent: true, important: true })).toBe('nu');
    expect(quadrant({ urgent: false, important: true })).toBe('plannen');
    expect(quadrant({ urgent: true, important: false })).toBe('snel-weg');
    expect(quadrant({ urgent: false, important: false })).toBe('schrappen');
  });

  it('heeft metadata voor elk kwadrant', () => {
    expect(QUADRANT_META['nu'].label).toBe('Nu doen');
    expect(QUADRANT_META['plannen'].hint).toContain('groei');
  });
});

describe('sortByQuadrant', () => {
  const t = (urgent: boolean | null, important: boolean | null, rank: number) => ({ urgent, important, rank });

  it('sorteert nu → plannen → snel-weg → schrappen', () => {
    const input = [
      t(false, false, 1), // schrappen
      t(true, false, 2),  // snel-weg
      t(false, true, 3),  // plannen
      t(true, true, 4),   // nu
    ];
    const result = sortByQuadrant(input);
    expect(result.map((x) => quadrant(x))).toEqual(['nu', 'plannen', 'snel-weg', 'schrappen']);
  });

  it('laat onbeoordeelde taken onderaan in hun bestaande volgorde', () => {
    const input = [
      t(null, null, 2),
      t(true, true, 5),
      t(null, null, 1),
      t(false, true, 3),
    ];
    const result = sortByQuadrant(input);
    expect(result.map((x) => x.rank)).toEqual([5, 3, 1, 2]);
  });

  it('sorteert binnen een kwadrant op rank', () => {
    const input = [t(true, true, 9), t(true, true, 1)];
    expect(sortByQuadrant(input).map((x) => x.rank)).toEqual([1, 9]);
  });
});
