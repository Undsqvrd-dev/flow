import { describe, expect, it } from 'vitest';
import { deleteMenuStep } from '@/lib/cardMenu';

describe('verwijderen in het kaartmenu', () => {
  it('vraagt eerst om bevestiging en verwijdert pas bij de tweede klik', () => {
    expect(deleteMenuStep(false)).toEqual({ confirming: true, remove: false });
    expect(deleteMenuStep(true)).toEqual({ confirming: false, remove: true });
  });
});
