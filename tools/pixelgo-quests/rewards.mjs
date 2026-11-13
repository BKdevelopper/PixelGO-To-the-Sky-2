#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — item rewards on quests that already exist
 * =============================================================================
 *  generate.mjs only adds quests; it never touches a quest that is already in
 *  the book. This pass adds the item rewards listed in content.mjs
 *  (EXTRA_REWARDS) to existing quests — on 2026-11-08, the PixelGO Items that
 *  were taken out of every loot table.
 *
 *  Idempotent: a reward whose id is already in the quest is left alone, so a
 *  second run changes nothing. The quest keeps every reward it had. A
 *  `rewards: [{ … }]` single-entry array is rewritten in the multi-line form
 *  FTB Quests uses for two or more rewards; a quest with no rewards gets the
 *  key, in FTB's alphabetical key order.
 *
 *  Nothing is written if a chapter, a quest or an item id is missing.
 *
 *    node tools/pixelgo-quests/rewards.mjs --dry
 *    node tools/pixelgo-quests/rewards.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXTRA_REWARDS } from './content.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');
const CH = path.join(ROOT, 'config', 'ftbquests', 'quests', 'chapters');
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

// every PixelGO Items id the mod registers (its item models + block items)
const PGI_JAR = fs.readdirSync(path.join(ROOT, 'mods')).find((f) => /^pixelgoitems-.*\.jar$/.test(f));
const KNOWN = new Set();
{
  const buf = fs.readFileSync(path.join(ROOT, 'mods', PGI_JAR)).toString('latin1');
  for (const m of buf.matchAll(/assets\/pixelgoitems\/models\/item\/([a-z0-9_]+)\.json/g)) KNOWN.add(`pixelgoitems:${m[1]}`);
}

const problems = [];
const pending = new Map();
let added = 0, present = 0;

const itemReward = (id, item, count) => [
  '\t\t\t\t{',
  ...(count > 1 ? [`\t\t\t\t\tcount: ${count}`] : []),
  `\t\t\t\t\tid: "${id}"`,
  '\t\t\t\t\titem: {', '\t\t\t\t\t\tcount: 1', `\t\t\t\t\t\tid: "${item}"`, '\t\t\t\t\t}',
  '\t\t\t\t\ttype: "item"',
  '\t\t\t\t}',
];

const byFile = new Map();
for (const r of EXTRA_REWARDS) {
  if (!byFile.has(r.file)) byFile.set(r.file, []);
  byFile.get(r.file).push(r);
}

for (const [file, list] of byFile) {
  const p = path.join(CH, file);
  if (!fs.existsSync(p)) { problems.push(`chapter not found: ${file}`); continue; }
  const lines = read(p).split('\n');
  let fileAdded = 0;

  for (const r of list) {
    for (const [item] of r.items) if (!KNOWN.has(item)) problems.push(`${file} ${r.quest}: ${item} is not a ${PGI_JAR} item`);

    // the quest: its "\t\t\tid" line, then the "\t\t{" before it and the "\t\t}" after it
    const idLine = lines.indexOf(`\t\t\tid: "${r.quest}"`);
    if (idLine < 0) { problems.push(`${file}: quest ${r.quest} not found`); continue; }
    let start = idLine; while (start > 0 && lines[start] !== '\t\t{') start--;
    let end = idLine; while (end < lines.length && lines[end] !== '\t\t}' && lines[end] !== '\t\t},') end++;
    if (lines[start] !== '\t\t{' || end >= lines.length) { problems.push(`${file}: could not delimit quest ${r.quest}`); continue; }

    const block = lines.slice(start, end + 1).join('\n');
    const todo = r.items.map(([item, count], i) => ({ item, count, id: r.ids[i] }))
      .filter((x) => { const has = block.includes(`id: "${x.id}"`); if (has) present++; return !has; });
    if (!todo.length) continue;
    const fresh = todo.flatMap((x) => itemReward(x.id, x.item, x.count));

    // where the rewards are, and in which of FTB's three shapes
    let at = -1;
    for (let i = start + 1; i < end; i++) if (/^\t\t\trewards: \[/.test(lines[i])) { at = i; break; }
    if (at < 0) {
      // no rewards yet: the key goes before the first top-level key that sorts after it
      let ins = end;
      for (let i = start + 1; i < end; i++) {
        const m = /^\t\t\t([a-z_]+):/.exec(lines[i]);
        if (m && m[1] > 'rewards') { ins = i; break; }
      }
      lines.splice(ins, 0, '\t\t\trewards: [', ...fresh, '\t\t\t]');
    } else if (lines[at] === '\t\t\trewards: [') {
      let close = at; while (close < end && lines[close] !== '\t\t\t]') close++;
      if (close >= end) { problems.push(`${file}: no end to the rewards of ${r.quest}`); continue; }
      lines.splice(close, 0, ...fresh);
    } else if (lines[at] === '\t\t\trewards: [{') {
      let close = at; while (close < end && lines[close] !== '\t\t\t}]') close++;
      if (close >= end) { problems.push(`${file}: no end to the single reward of ${r.quest}`); continue; }
      const inner = lines.slice(at + 1, close).map((l) => '\t' + l);
      lines.splice(at, close - at + 1, '\t\t\trewards: [', '\t\t\t\t{', ...inner, '\t\t\t\t}', ...fresh, '\t\t\t]');
    } else if (/^\t\t\trewards: \[\{.*\}\]$/.test(lines[at])) {
      const one = lines[at].replace(/^\t\t\trewards: \[/, '').replace(/\]$/, '');
      lines.splice(at, 1, '\t\t\trewards: [', `\t\t\t\t${one}`, ...fresh, '\t\t\t]');
    } else if (lines[at] === '\t\t\trewards: [ ]' || lines[at] === '\t\t\trewards: []') {
      lines.splice(at, 1, '\t\t\trewards: [', ...fresh, '\t\t\t]');
    } else { problems.push(`${file}: unknown rewards shape in ${r.quest}: ${lines[at].trim()}`); continue; }

    added += todo.length; fileAdded += todo.length;
  }
  if (fileAdded) { pending.set(p, lines.join('\n')); console.log(`${file.padEnd(28)} +${fileAdded} reward(s)`); }
}

console.log(`\nrewards added: ${added}   already present: ${present}`);
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S) - nothing written:`);
  for (const p of problems) console.log(`  ! ${p}`);
  process.exit(1);
}
if (!DRY) for (const [p, s] of pending) fs.writeFileSync(p, s.replace(/\n/g, '\r\n'), 'utf8');
console.log(DRY ? '--dry: no file written.' : `written: ${pending.size} file(s).`);
