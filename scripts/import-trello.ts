/**
 * Trello JSON-export → FLOW-taken (JSON op stdout).
 *
 * Gebruik:  npx tsx scripts/import-trello.ts pad/naar/trello-export.json > taken.json
 *
 * In de app zelf kan de export ook direct worden geïmporteerd via
 * Instellingen → "Importeer Trello-export".
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { importTrello, type TrelloExport } from '../lib/importTrello';

const path = process.argv[2];
if (!path) {
  console.error('Gebruik: npx tsx scripts/import-trello.ts <trello-export.json>');
  process.exit(1);
}

const data = JSON.parse(readFileSync(path, 'utf8')) as TrelloExport;
const tasks = importTrello(data, () => randomUUID());
console.log(JSON.stringify(tasks, null, 2));
console.error(`✔ ${tasks.length} taken omgezet.`);
