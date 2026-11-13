#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — quest book patcher
 * =============================================================================
 *  Adds the quests listed in content.mjs to their chapters and writes their
 *  text into config/ftbquests/quests/lang/en_us.snbt.
 *
 *  Additive and idempotent:
 *    - a quest whose id is already in the chapter is left alone;
 *    - a lang key is rewritten in place, so re-running does not duplicate it;
 *    - nothing that is not named in content.mjs is touched.
 *
 *  The files are CRLF and FTB Quests rewrites them on save, so the exact
 *  formatting here only has to survive being read once.
 *
 *    node tools/pixelgo-quests/generate.mjs --dry
 *    node tools/pixelgo-quests/generate.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as CONTENT from './content.mjs';
import { coinRewards, coinBlock } from './coins.mjs';

const { QUESTS, LANG } = CONTENT;
const CHAPTERS = CONTENT.CHAPTERS || {};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');
const QDIR = path.join(ROOT, 'config', 'ftbquests', 'quests');
const CH = path.join(QDIR, 'chapters');
const LANGF = path.join(QDIR, 'lang', 'en_us.snbt');

const problems = [];
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const write = (f, s) => { if (!DRY) fs.writeFileSync(f, s.replace(/\n/g, '\r\n'), 'utf8'); };

/* ------------------------------------------------- single-line text fixes
 * Ranks E..S each carry one "Weight N of 96" line.
 *
 * Two things were wrong with the shipped weights. The pack had scaled E..S down
 * by 100 (40/26/16/9/4/1) but left SS/SSS/DEMON at the mod's stock 30/10/1,
 * which made a level-100 SS Gate as common as a D one. And the mod's own
 * defaults put DEMON at one Gate in 9641, which is not an objective anybody
 * finishes - it is a lottery.
 *
 * The ladder now ends at DEMON = one in 200, each endgame rank twice as rare as
 * the one below (S 1/33, SS 1/50, SSS 1/100, DEMON 1/200). Only three rungs sit
 * between S and DEMON, so pinning DEMON at 1/200 pulls S down from 1/96 to 1/33
 * and E gives up the difference. Total is 10000, so a weight is its percentage
 * times a hundred. */
const LINE_FIX = {
  'quest.210D0D36A3C1FA37.quest_desc': [[
    '&7Weight &f&l40&r&7 of &f&l96&r&7 - about &a&l42%&r&7 of all natural Gates.',
    '&7Weight &f&l3600&r&7 of &f&l10000&r&7 - &a&l36%&r&7 of all natural Gates.']],
  'quest.61C9BC202F4ABBA4.quest_desc': [[
    '&7Weight &f&l26&r&7 of &f&l96&r&7 - about &a&l27%&r&7 of all natural Gates.',
    '&7Weight &f&l2600&r&7 of &f&l10000&r&7 - &a&l26%&r&7 of all natural Gates.']],
  'quest.0DA4B6C86A8AEA48.quest_desc': [[
    '&7Weight &f&l16&r&7 of &f&l96&r&7 - about &a&l17%&r&7 of all natural Gates.',
    '&7Weight &f&l1700&r&7 of &f&l10000&r&7 - &a&l17%&r&7 of all natural Gates.']],
  'quest.2496D6AA6B39C868.quest_desc': [[
    '&7Weight &f&l9&r&7 of &f&l96&r&7 - about &a&l9%&r&7 of all natural Gates.',
    '&7Weight &f&l950&r&7 of &f&l10000&r&7 - &a&l9.5%&r&7 of all natural Gates, one in &f&l10&r&7.']],
  'quest.205861383D2207C4.quest_desc': [[
    '&7Weight &f&l4&r&7 of &f&l96&r&7 - about &a&l4%&r&7 of all natural Gates.',
    '&7Weight &f&l500&r&7 of &f&l10000&r&7 - &a&l5%&r&7 of all natural Gates, one in &f&l20&r&7.']],
  // PokeDollars (Welcome): PixelGO Items do have recipes, and no shop sells them (2026-11-08)
  'quest.3DCC93742DAB1733.quest_desc': [[
    '&c&lSome things are only ever sold, never crafted. &7Minion tools, the PixelGO Poke Balls and PixelGO Items have no recipe at all. Money is the only way in.',
    '&c&lSome things are only ever sold, never crafted. &7Minion tools and the PixelGO Poke Balls have no recipe at all. Money is the only way in.']],
  'quest.58F99C4C400A3D87.quest_desc': [[
    '&7Weight &f&l1&r&7 of &f&l96&r&7 - just over &a&l1%&r&7 of all natural Gates.',
    '&7Weight &f&l300&r&7 of &f&l10000&r&7 - &a&l3%&r&7 of all natural Gates, one in &f&l33&r&7.']],
};

/* ------------------------------------------------------------- id collisions */
const ALL_IDS = new Set();
for (const f of fs.readdirSync(CH)) {
  for (const m of read(path.join(CH, f)).matchAll(/"([0-9A-F]{16})"/g)) ALL_IDS.add(m[1]);
}
for (const f of ['chapter_groups.snbt', 'data.snbt']) {
  const p = path.join(QDIR, f);
  if (fs.existsSync(p)) for (const m of read(p).matchAll(/"([0-9A-F]{16})"/g)) ALL_IDS.add(m[1]);
}
const MINE = new Set();
for (const [, qs] of Object.entries(QUESTS)) {
  for (const q of qs) {
    for (const id of [q.id, q.task.id, ...q.rewards.map((r) => r.id)]) {
      if (!/^[0-9A-F]{16}$/.test(id)) problems.push(`id "${id}" is not 16 uppercase hex`);
      if (MINE.has(id)) problems.push(`id ${id} used twice in content.mjs`);
      MINE.add(id);
    }
  }
}

/* ------------------------------------------------------------ chapter blocks */
/** an SNBT value: booleans and numbers as is, { snbt: '4b' } verbatim, anything else a quoted string */
const snbt = (v) => (typeof v === 'boolean' || typeof v === 'number' ? String(v)
  : v && typeof v === 'object' && 'snbt' in v ? v.snbt
  : `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);

const rewardBlock = (r) => {
  // money is paid in sellable coins, never PokeDollars (coins.mjs)
  if (r.money !== undefined) return coinRewards(r.id, r.money).flatMap((c) => coinBlock(c, '\t\t\t\t'));
  if (r.item !== undefined) {
    return ['\t\t\t\t{', ...(r.count > 1 ? [`\t\t\t\t\tcount: ${r.count}`] : []), `\t\t\t\t\tid: "${r.id}"`,
      '\t\t\t\t\titem: {', '\t\t\t\t\t\tcount: 1', `\t\t\t\t\t\tid: "${r.item}"`, '\t\t\t\t\t}', '\t\t\t\t\ttype: "item"', '\t\t\t\t}'];
  }
  if (r.bag !== undefined) {
    // a Mystery Bag: a treasure bag carrying its bag type, e.g. 'pixelgo:tier3'
    return ['\t\t\t\t{', `\t\t\t\t\tid: "${r.id}"`, '\t\t\t\t\titem: {', '\t\t\t\t\t\tcomponents: {',
      `\t\t\t\t\t\t\t"treasurebags:bag_type": "${r.bag}"`, '\t\t\t\t\t\t}', '\t\t\t\t\t\tcount: 1',
      '\t\t\t\t\t\tid: "treasurebags:treasure_bag"', '\t\t\t\t\t}', '\t\t\t\t\ttype: "item"', '\t\t\t\t}'];
  }
  return ['\t\t\t\t{', '\t\t\t\t\tcount: 1', `\t\t\t\t\tid: "${r.id}"`, `\t\t\t\t\tloot_tier: ${r.loot}b`, '\t\t\t\t\tplay_sound: true', '\t\t\t\t\ttype: "pixelgoquests:pokeloot"', '\t\t\t\t}'];
};

/** a coordinate as FTB Quests writes it: 2.0, -8.25 */
const num = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

const questBlock = (q) => {
  const out = ['\t\t{'];
  if (q.canRepeat) out.push('\t\t\tcan_repeat: true');
  if (q.dependencies) out.push(`\t\t\tdependencies: [${q.dependencies.map((d) => `"${d}"`).join(', ')}]`);
  if (q.disableToast) out.push('\t\t\tdisable_toast: true');
  if (q.hideDependencyLines) out.push('\t\t\thide_dependency_lines: true');
  if (q.icon) out.push('\t\t\ticon: {', `\t\t\t\tid: "${q.icon}"`, '\t\t\t}');
  out.push(`\t\t\tid: "${q.id}"`);
  if (q.optional) out.push('\t\t\toptional: true');
  out.push('\t\t\trewards: [', ...q.rewards.map(rewardBlock).flat(), '\t\t\t]');
  if (q.shape) out.push(`\t\t\tshape: "${q.shape}"`);
  if (q.size) out.push(`\t\t\tsize: ${q.size.toFixed(1)}d`);
  if (q.task.data) {
    // any task type (the PixelGO Quests ones): its fields, keys sorted as FTB Quests writes them
    const fields = { ...q.task.data, id: q.task.id, type: q.task.type };
    out.push('\t\t\ttasks: [{', ...Object.keys(fields).sort().map((k) => `\t\t\t\t${k}: ${snbt(fields[k])}`), '\t\t\t}]');
    out.push(`\t\t\tx: ${num(q.x)}d`, `\t\t\ty: ${num(q.y)}d`, '\t\t}');
    return out.join('\n');
  }
  out.push('\t\t\ttasks: [{');
  // an item task for more than one item: FTB Quests stores the amount on the task, as a long
  if (q.task.consume) out.push('\t\t\t\tconsume_items: true');
  if (q.task.count > 1) out.push(`\t\t\t\tcount: ${q.task.count}L`);
  out.push(`\t\t\t\tid: "${q.task.id}"`);
  if (q.task.type === 'item') out.push(`\t\t\t\titem: { count: 1, id: "${q.task.item}" }`);
  out.push(`\t\t\t\ttype: "${q.task.type}"`, '\t\t\t}]');
  out.push(`\t\t\tx: ${num(q.x)}d`, `\t\t\ty: ${num(q.y)}d`, '\t\t}');
  return out.join('\n');
};

/* ------------------------------------------------------------ new chapters
 * A chapter named in CHAPTERS whose file is missing is created empty, in the
 * key order FTB Quests writes itself. Its title goes into the lang file only
 * on that first run, so a gradient put on it afterwards is never overwritten. */
const created = new Map(); // file -> skeleton text
const TITLES = {};
for (const [file, c] of Object.entries(CHAPTERS)) {
  if (fs.existsSync(path.join(CH, file))) continue;
  if (!/^[0-9A-F]{16}$/.test(c.id)) problems.push(`chapter ${file}: id "${c.id}" is not 16 uppercase hex`);
  if (ALL_IDS.has(c.id) || MINE.has(c.id)) problems.push(`chapter ${file}: id ${c.id} is already used`);
  created.set(file, [
    '{',
    '\tdefault_hide_dependency_lines: false',
    '\tdefault_quest_shape: ""',
    `\tfilename: "${file.replace(/\.snbt$/, '')}"`,
    `\tgroup: "${c.group}"`,
    '\ticon: {', `\t\tid: "${c.icon}"`, '\t}',
    `\tid: "${c.id}"`,
    '\timages: [ ]',
    `\torder_index: ${c.order_index}`,
    '\tquest_links: [ ]',
    '\tquests: [',
    '\t]',
    '}',
    '',
  ].join('\n'));
  TITLES[`chapter.${c.id}.title`] = c.title;
  console.log(`${file.padEnd(26)} new chapter`);
}

let added = 0, skipped = 0;
const pending = new Map(); // nothing is written until every check below has passed
for (const [file, qs] of Object.entries(QUESTS)) {
  const p = path.join(CH, file);
  let s;
  if (created.has(file)) { s = created.get(file); pending.set(p, s); }
  else if (!fs.existsSync(p)) { problems.push(`chapter not found: ${file}`); continue; }
  else s = read(p);

  // every dependency this quest points at must already exist in that chapter
  for (const q of qs) for (const d of q.dependencies || []) {
    if (!s.includes(`"${d}"`) && !qs.some((o) => o.id === d)) problems.push(`${file}: dependency ${d} of ${q.id} is not in that chapter`);
  }

  const start = s.indexOf('\n\tquests: [\n');
  if (start < 0) { problems.push(`${file}: no multi-line "quests: [" array`); continue; }
  const close = s.indexOf('\n\t]\n', start);
  if (close < 0) { problems.push(`${file}: could not find the end of "quests: ["`); continue; }

  const fresh = qs.filter((q) => { const has = s.includes(`id: "${q.id}"`); if (has) skipped++; return !has; });
  if (!fresh.length) continue;
  for (const q of fresh) {
    if (ALL_IDS.has(q.id)) problems.push(`${file}: id ${q.id} already exists somewhere in the book`);
  }
  s = s.slice(0, close + 1) + fresh.map(questBlock).join('\n') + '\n' + s.slice(close + 1);
  added += fresh.length;
  pending.set(p, s);
  console.log(`${file.padEnd(26)} +${fresh.length} quest(s)`);
}

/* ------------------------------------------------------------------- lang */
const esc = (t) => t.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
// a one-line description is written inline, the way FTB Quests saves it itself
const render = (key, val) => (Array.isArray(val)
  ? (val.length === 1 ? `\t${key}: ["${esc(val[0])}"]`
    : [`\t${key}: [`, ...val.map((l) => `\t\t"${esc(l)}"`), '\t]'].join('\n'))
  : `\t${key}: "${esc(val)}"`);

let lines = read(LANGF).split('\n');

/** index every top-level key to its [firstLine, lastLine] */
const indexKeys = () => {
  const map = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m = /^\t([A-Za-z0-9_.]+): (.*)$/.exec(lines[i]);
    if (!m) continue;
    let end = i;
    if (m[2].startsWith('[') && !m[2].trimEnd().endsWith(']')) {
      while (end < lines.length && lines[end] !== '\t]') end++;
    }
    map.set(m[1], [i, end]);
    i = end;
  }
  return map;
};

let langNew = 0, langUpd = 0, langSame = 0;
for (const [key, val] of [...Object.entries(LANG), ...Object.entries(TITLES)]) {
  const keys = indexKeys();
  const block = render(key, val);
  if (keys.has(key)) {
    const [a, b] = keys.get(key);
    const old = lines.slice(a, b + 1).join('\n');
    if (old === block) { langSame++; continue; }
    lines.splice(a, b - a + 1, ...block.split('\n'));
    langUpd++;
  } else {
    const entries = [...indexKeys().entries()];
    let at = entries.length ? entries[entries.length - 1][1][1] + 1 : lines.length - 1;
    for (const [k, [s2]] of entries) if (k > key) { at = s2; break; }
    lines.splice(at, 0, ...block.split('\n'));
    langNew++;
  }
}

/* targeted one-line corrections inside descriptions we are not replacing */
let fixed = 0, alreadyFixed = 0;
for (const [key, pairs] of Object.entries(LINE_FIX)) {
  const keys = indexKeys();
  if (!keys.has(key)) { problems.push(`lang key missing for line fix: ${key}`); continue; }
  const [a, b] = keys.get(key);
  for (const [from, to] of pairs) {
    let hit = false;
    for (let i = a; i <= b; i++) {
      if (lines[i] === `\t\t"${esc(from)}"`) { lines[i] = `\t\t"${esc(to)}"`; hit = true; fixed++; break; }
      if (lines[i] === `\t\t"${esc(to)}"`) { hit = true; alreadyFixed++; break; }
    }
    if (!hit) problems.push(`line fix did not match in ${key}: ${from.slice(0, 50)}...`);
  }
}

console.log('');
console.log(`quests added   : ${added}   already present: ${skipped}`);
console.log(`lang keys      : ${langNew} new, ${langUpd} rewritten, ${langSame} unchanged`);
console.log(`line fixes     : ${fixed} applied, ${alreadyFixed} already correct`);

if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S) - nothing written:`);
  for (const p of problems) console.log(`  ! ${p}`);
  process.exit(1);
}

for (const [p, s] of pending) write(p, s);
write(LANGF, lines.join('\n'));
console.log(DRY ? '\n--dry: no file written.' : `\nwritten: ${pending.size + 1} file(s).`);
