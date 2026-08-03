# FLOW — persoonlijk besturingssysteem

Persoonlijk werk- en levensbesturingssysteem voor één gebruiker (Steijn,
oprichter Facility Finder). Vervangt Trello als dagelijkse to-do-tool en voegt
de laag toe die Trello mist: **richting**.

**Kernzin:** *Trello laat me zien wat ik kán doen. FLOW zet me scherp op wat
vandaag telt.*

## Vastgezette keuzes

| Onderwerp | Besluit |
|---|---|
| Weekend | Aparte kolommen `za` en `zo` |
| Weekbord | Rollend: vandaag + volgende 6 dagen; eerdere dagen met open taken blijven tot leeg |
| Dagfocus | Precies één (taak of vrije zin), bovenaan de dagkolom als uitklapbare strip |
| Weekfocus | Altijd zichtbaar in de sticky focusbalk; in-/uitklapbaar |
| Dagafsluiten | Open taken blijven staan; geen auto-doorrollen |
| Weekfocus verplicht | Nee — optioneel; maandag vraagt vriendelijk via de balk |
| Datalaag (nu) | Lokaal: Zustand + `persist` (localStorage), sleutels `flow-*` |
| Datalaag (later) | Supabase; schema staat klaar in `supabase/migrations/001_init.sql` |

## Ontwerpprincipes

1. **Dashboard eerst.** De app opent op het dashboard: mantra, doelen, dagfocus, sportmeter.
2. **Trello-spiergeheugen respecteren.** Kolommen, kaarten, drag & drop, kaartdetail-modal.
3. **Clean en licht.** Wit, zacht grijs, groen als enige accent. Dark mode volwaardig.
4. **Beoordelen is optioneel, nooit verplicht.** Taak toevoegen = titel + dag, drie seconden.
   Kaarten zonder oordeel zien er volstrekt normaal uit.
5. **De focus staat boven de taken.** Eén balk boven het bord zet je scherp.
6. **Frictieloos invoeren, bewust plannen.** Idee dumpen kost 2 seconden (⌘D).
7. **Eén gebruiker.** Geen teams. Wel multi-device (web + mobiel responsive).

## Datamodel

De bron van waarheid is [`lib/types.ts`](lib/types.ts). Belangrijkste regels:

- `DayKey`: `algemeen | ma | di | wo | do | vr | za | zo | gedaan`.
- Taken slaan `dayKey` + `weekOf` van hun dag op; de kolom **Gedaan is afgeleid**
  (`done === true` en afronding in de huidige week via `completedAt`). Afvinken
  verplaatst de kaart visueel naar Gedaan zonder de oorspronkelijke dag te verliezen.
- Het bord toont **vandaag … vandaag+6**; eerdere dagen met open taken blijven
  sticky zichtbaar tot ze leeg zijn.
- `urgent`/`important` zijn `boolean | null` — `null` = niet beoordeeld.
- `weekOf` = maandag van de week (ISO `yyyy-MM-dd`), voor archivering en om
  dezelfde weekdag in verschillende weken te onderscheiden.
- `fromPreviousWeek` markeert taken die bij de weekrollover naar `algemeen` schoven
  (borddagen blijven sticky en worden niet doorgeschoven).
- Ranks in stappen van 1000; secties worden bij verplaatsing volledig herindexeerd.

## Prioritering (2×2)

Alle kwadrantlogica staat in [`lib/priority.ts`](lib/priority.ts) — nergens
dupliceren. Kwadranten: `nu` (urgent+belangrijk) · `plannen` (belangrijk) ·
`snel-weg` (urgent) · `schrappen` (geen van beide) · `null` (niet beoordeeld).
Sorteren op prioriteit laat onbeoordeelde kaarten onderaan in bestaande volgorde.
De matrix verplaatst niets, verbergt niets, adviseert niet ongevraagd.

## Focusbalk

- Sticky boven bord, dumpbak en doelenpagina. Ingeklapt 52px; uitklappen met
  chevron of sneltoets `F` (260ms spring).
- Toont weekfocus (doel + headline + voortgang), drie lenzen en spiegeltekst.
- Lenzen: **alleen focusdoel** (dimt niet-gekoppelde kaarten naar 35%),
  **alleen vandaag** (verbergt andere dagkolommen), **verberg afgerond**.
- **Dagfocus** leeft als uitklapbare strip **bovenaan de dagkolom van vandaag**.
- Ochtendritueel: eerste bezoek van de dag (en `askDayFocusOnOpen` aan) →
  dagfocus-prompt opent automatisch.

## Schermen

- **Dashboard** (startscherm): statrij (Taken vandaag = accentkaart), weekanalyse
  met hatching, dagfocuskaart, doelen, sportring, voortgangsdonut, timerkaart,
  mantra + quote + waarden.
- **Weekbord**: rollende kolommen `vandaag … +6 dagen` (+ sticky eerdere dagen
  met open taken) · `Gedaan`. Zijpaneel “Deze week” (`algemeen`).
  Dagdelen ochtend/dag/avond als drop-zones. Quick Wins-batchkaart (virtueel)
  bovenaan sectie Dag bij ≥ 2 taken ≤ `quickWinThresholdMin`. Dag sluiten,
  focusmodus, weekrollover (niet-bord open taken vorige week → Algemeen met badge;
  borddagen blijven sticky tot leeg).
- **Kaartmodal**: links structureren (titel, omschrijving, checklist, comments),
  rechts beoordelen (2×2-matrix, doel, dagdeel, schatting, labels, deadline, acties).
- **Focus/Pomodoro**: ring, presets 25/5 · 50/10 · 15/3 · vrij, taakkoppeling
  (default dagfocus), Web Audio-alarm (bel/gong/piep), pomodoro-dots,
  `Date`-gebaseerde timer die een refresh overleeft.
- **Dumpbak & wachtruimte**: invoerveld altijd gefocust, Enter = opgeslagen.
  Wachtruimte toont ligtijd; > 30 dagen → zachte prompt.
- **Doelen & waarden**: twee kolommen zakelijk/privé, ster = weekfocus,
  doelkleur = kaartstip. Waarden, mantra, quotes.
- **Sport**: weekring t.o.v. `sportWeeklyTarget`, zeven dagstaafjes, streak,
  sessies loggen; privédoel met `unit: 'sessies'` telt automatisch mee.
- **Analytics**: afgeronde taken per dag (12 weken), prioriteitsmatrix van de
  week, verdeling over doelen, focusminuten, historie van weekfocussen.
- **Instellingen**: alle `Settings`-velden + Trello-import.

## Designsysteem

Tokens in [`styles/tokens.css`](styles/tokens.css) — **elke kleur komt daaruit,
geen losse hexcodes in componenten** (uitzondering: door de gebruiker gekozen
doelkleuren). Donkergroene kaarten (`--green-900`) maximaal twee per scherm.
Hatching = handtekening voor "nog niet gebeurd / leeg". Panelen 20px radius,
kaarten 14px, knoppen pill. Lucide-iconen 18px stroke 1.75. Animaties: 140ms
hover, 260ms spring focusbalk, 500ms `cubic-bezier(.2,.8,.2,1)` ringen.

## Sneltoetsen

| Toets | Actie |
|---|---|
| `⌘/Ctrl + D` | Quick capture → dumpbak |
| `⌘/Ctrl + F` | Focusmodus aan + spring naar lijst van vandaag |
| `F` | Focusbalk uit/inklappen |
| `N` | Nieuwe taak |
| `P` | Pomodoro starten/pauzeren |
| `1–7` | Spring naar kolom |
| `Esc` / `⌘+Enter` | Sluiten / opslaan |

## Regels voor de agent

Zie [`.cursor/rules/flow.mdc`](.cursor/rules/flow.mdc). Kern: TypeScript strict,
geen `any`; prioriteitslogica alleen in `lib/priority.ts`; datums alleen via
`lib/dates.ts` (locale `nl`, week start maandag); kleuren alleen uit tokens;
light én dark tegelijk; componenten < 200 regels; geen verplichte velden bij
taak aanmaken behalve titel.

## Bewust níét in v1

Teams en delen · terugkerende taken · agenda-integratie · e-mail naar taak ·
AI-suggesties · native app (PWA volstaat).
