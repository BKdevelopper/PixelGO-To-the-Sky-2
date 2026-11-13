#!/usr/bin/env node
/* Brings the `count` of item tasks already in the book in line with content.mjs.
 * generate.mjs never rewrites a quest that exists, so a changed amount needs this.
 *   node tools/pixelgo-quests/sync-counts.mjs [--dry] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUESTS } from './content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRY = process.argv.includes('--dry');
let changed = 0;
for (const [file, qs] of Object.entries(QUESTS)) {
  const p = path.join(ROOT, 'config', 'ftbquests', 'quests', 'chapters', file);
  let s = fs.readFileSync(p, 'utf8');
  const before = changed;
  for (const q of qs) {
    if (!(q.task.count > 1)) continue;
    const re = new RegExp(String.raw`(\t\t\t\tcount: )(\d+)(L\r?\n\t\t\t\tid: "` + q.task.id + '")');
    s = s.replace(re, (m, a, n, b) => { if (Number(n) !== q.task.count) changed++; return a + q.task.count + b; });
  }
  if (changed > before && !DRY) fs.writeFileSync(p, s);
  if (changed > before) console.log(`${file}: ${changed - before} count(s)`);
}
console.log(DRY ? `--dry: ${changed} would change` : `${changed} changed`);
