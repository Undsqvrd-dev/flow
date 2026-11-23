/**
 * Eerste klik op Verwijderen vraagt bevestiging en laat het menu open.
 * De tweede klik verwijdert de kaart.
 */
export function deleteMenuStep(confirming: boolean): { confirming: boolean; remove: boolean } {
  if (confirming) return { confirming: false, remove: true };
  return { confirming: true, remove: false };
}
