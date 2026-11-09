import { useGoalsStore } from '@/stores/useGoalsStore';

const SEEDED_KEY = 'flow-personal-direction-seeded';

export const PERSONAL_VALUES = [
  'Zingeving',
  'Vrijheid',
  'Vriendschap / Verbinding',
  'Avontuur',
  'Groei & Leren',
  'Gezondheid',
  'Creativiteit',
  'Genieten',
  'Verwondering',
  'Geld',
];

export const PERSONAL_RULES = [
  'Ik ben vriendelijk en respectvol naar anderen.',
  'Ik leef vanuit vertrouwen en geloof dat wat je geeft uiteindelijk terugkomt.',
  'Mijn zingeving en vrijheid staan centraal in de keuzes die ik maak.',
  'Anderen zullen niet de macht hebben om mijn staat van zijn te beïnvloeden in een negatieve zin.',
  'Eén dag niet actief bezig zijn met sport, beweging of stretchen mag, maar twee dagen nooit.',
  'Ik ga elke dag naar buiten.',
  'Ik bepaal mijn eigen energie.',
  'Ik ben kritisch op hoe ik mijn tijd besteed en laat anderen geen controle hebben over mijn tijdsbesteding.',
  'Ik laat negatieve gedachten niet zomaar de overhand krijgen en wees mij bewust dat ik het resultaat ben van de manier waarop ik denk.',
  'Ik omarm feedback en luister naar de inhoud, niet de toon.',
];

/** Vult lege lijsten één keer, zonder bestaande waarden te overschrijven. */
export function seedPersonalDirectionIfEmpty(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(SEEDED_KEY) === '1') return;
  const state = useGoalsStore.getState();
  if (state.values.length === 0) {
    for (const text of PERSONAL_VALUES) useGoalsStore.getState().addValue(text);
  }
  if ((state.lifeRules ?? []).length === 0) {
    for (const text of PERSONAL_RULES) useGoalsStore.getState().addLifeRule(text);
  }
  localStorage.setItem(SEEDED_KEY, '1');
}
