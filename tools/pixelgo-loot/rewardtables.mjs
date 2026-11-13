#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — Mystery Bags -> FTB Quests reward tables
 * =============================================================================
 *  One FTB Quests reward table per Mystery Bag (Treasure Bags types
 *  pixelgo:tier1..4), listing every stack that bag can give. They are built
 *  from the bags' loot tables (kubejs/data/loot/loot_table/tier1..4.json), so
 *  they are only ever as right as the last run: bags.mjs calls this script at
 *  the end of every run; a bag edited by hand needs
 *
 *    node tools/pixelgo-loot/rewardtables.mjs [--dry]
 *
 *  HOW A BAG IS FLATTENED
 *  A loot table has several pools (utils rolled 1-2 times, minions, Pokédolls)
 *  and an FTB table has one list. Every stack is listed once, with:
 *    - weight = how many times that stack drops per 1 000 bags opened
 *      (pool rolls x entry weight / pool weight, through nested tables), so
 *      the % FTB shows next to it is its share of everything the bag drops;
 *    - count / random_bonus = the set_count range (FTB gives count +
 *      0..random_bonus, the same spread as minecraft:uniform);
 *    - loot_size = how many stacks a bag gives on average, rounded.
 *  Nested loot tables (minions, Pokédolls) are expanded down to the items;
 *  a Mystery Bag that drops another Mystery Bag lists that bag as an item.
 *  "Nothing" entries (minecraft:empty) only lower the other weights.
 *
 *  Each table is rewritten whole on every run. Its id and its rewards' ids
 *  are hashed from the bag and the stack, so they do not change between runs
 *  and a quest that points at a table keeps working. The title comes from
 *  the bag's own display name (kubejs/data/pixelgo/treasurebags_types) and
 *  goes into config/ftbquests/quests/lang/en_us.snbt, where FTB keeps titles.
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');
const DATA = path.join(ROOT, 'kubejs', 'data');
const QUESTS = path.join(ROOT, 'config', 'ftbquests', 'quests');
const TABLES = path.join(QUESTS, 'reward_tables');
const LANG = path.join(QUESTS, 'lang', 'en_us.snbt');

const BAGS = ['tier1', 'tier2', 'tier3', 'tier4'];
const PER = 1000; // weights are drops per PER bags
const COLOR = { green: '&a', blue: '&9', dark_purple: '&5', gold: '&6' };

const problems = [];
const skipped = [];

/* ------------------------------------------------------------ loot tables */
const tableFile = (ref) => {
  const [ns, p] = ref.split(':');
  return path.join(DATA, ns, 'loot_table', `${p}.json`);
};
const readTable = (ref) => {
  const f = tableFile(ref);
  if (!fs.existsSync(f)) { problems.push(`loot table ${ref} not found in kubejs/data (${path.relative(ROOT, f)})`); return null; }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
};
const mean = (n, where) => {
  if (typeof n === 'number') return n;
  if (n && n.type === 'minecraft:uniform') return (n.min + n.max) / 2;
  if (n && n.type === 'minecraft:constant') return n.value;
  problems.push(`${where}: number provider ${JSON.stringify(n)} not handled`);
  return 0;
};
const range = (n, where) => {
  if (typeof n === 'number') return [n, n];
  if (n && n.type === 'minecraft:uniform') return [Math.floor(n.min), Math.floor(n.max)];
  if (n && n.type === 'minecraft:constant') return [n.value, n.value];
  problems.push(`${where}: count ${JSON.stringify(n)} not handled`);
  return [1, 1];
};

/** A stack as FTB sees it: id, components (JSON, or raw SNBT for custom data), count range. */
const stackOf = (entry, where) => {
  const components = {};
  let count = [1, 1];
  for (const fn of entry.functions || []) {
    if (fn.conditions?.length) problems.push(`${where}: conditional function ${fn.function} cannot be mirrored`);
    switch (fn.function) {
      case 'minecraft:set_count': count = range(fn.count, where); break;
      case 'minecraft:set_components': Object.assign(components, fn.components); break;
      case 'minecraft:set_custom_data': components['minecraft:custom_data'] = { raw: fn.tag }; break;
      case 'treasurebags:set_bag_type': components['treasurebags:bag_type'] = fn.bag_type; break;
      default: problems.push(`${where}: function ${fn.function} not handled`);
    }
  }
  return { id: entry.name, components, count };
};

/** Expected drops of every stack for one opening of `ref`, scaled by `scale`. */
const flatten = (ref, scale, out, seen = []) => {
  if (seen.includes(ref)) { problems.push(`loot table loop: ${[...seen, ref].join(' -> ')}`); return; }
  const t = readTable(ref);
  if (!t) return;
  t.pools.forEach((pool, i) => {
    const where = `${ref} pool ${pool.name || i}`;
    // coffres vanilla (pool « vanilla_chests », 2026-11-08) : enchantements, usure, cartes…
    // impossibles à reproduire dans une table FTB ; la table liste le reste du bag.
    if (pool.name === 'vanilla_chests') { skipped.push(`${ref} : pool vanilla_chests non reproduit (coffres vanilla)`); return; }
    if (pool.conditions?.length) problems.push(`${where}: pool conditions cannot be mirrored`);
    if (pool.functions?.length) problems.push(`${where}: pool functions not handled`);
    const rolls = mean(pool.rolls, where);
    const total = pool.entries.reduce((a, e) => a + (e.weight ?? 1), 0);
    for (const e of pool.entries) {
      const p = scale * rolls * (e.weight ?? 1) / total;
      if (e.conditions?.length) problems.push(`${where}: entry conditions cannot be mirrored`);
      if (e.type === 'minecraft:empty') continue;
      if (e.type === 'minecraft:loot_table') { flatten(e.value, p, out, [...seen, ref]); continue; }
      if (e.type !== 'minecraft:item') { problems.push(`${where}: entry type ${e.type} not handled`); continue; }
      const s = stackOf(e, where);
      const key = JSON.stringify([s.id, s.components, s.count]);
      const had = out.get(key);
      if (had) had.expected += p; else out.set(key, { ...s, expected: p });
    }
  });
};

/* ------------------------------------------------------------------- SNBT */
const SNBT_KEY = /^[A-Za-z0-9_.+-]+$/;
const snbtKey = (k) => (SNBT_KEY.test(k) ? k : JSON.stringify(k));
const snbt = (v) => {
  if (v && typeof v === 'object' && 'raw' in v) return v.raw; // already SNBT (set_custom_data tag)
  if (Array.isArray(v)) return `[${v.map(snbt).join(', ')}]`;
  if (v && typeof v === 'object') {
    const ks = Object.keys(v).sort();
    return ks.length ? `{ ${ks.map((k) => `${snbtKey(k)}: ${snbt(v[k])}`).join(', ')} }` : '{ }';
  }
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : `${v}d`;
  problems.push(`cannot write ${JSON.stringify(v)} as SNBT`);
  return '0';
};
const float = (x) => {
  const v = Math.max(0.001, Number(x.toFixed(3)));
  return `${Number.isInteger(v) ? v.toFixed(1) : v}f`;
};

/* --------------------------------------------------------------------- ids
 * FTB ids are 64-bit, written as 16 hex digits; every id in the pack is
 * positive, so the top bit is cleared. Hashed, so they are the same on every
 * run; one that would land on an id used elsewhere in the book is re-salted. */
const taken = new Set();
const mine = new Set();
for (const f of fs.readdirSync(TABLES)) {
  if (/^mystery_bag_tier\d\.snbt$/.test(f)) {
    for (const m of fs.readFileSync(path.join(TABLES, f), 'utf8').matchAll(/\bid: "([0-9A-F]{16})"/g)) mine.add(m[1]);
  }
}
const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(QUESTS).filter((x) => x.endsWith('.snbt') && !/mystery_bag_tier\d\.snbt$/.test(x))) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\b([0-9A-F]{16})\b/g)) taken.add(m[1]);
}
for (const id of mine) taken.delete(id); // the lang file names our own tables
const used = new Set();
const idFor = (key) => {
  for (let salt = 0; ; salt++) {
    const h = crypto.createHash('sha1').update(`pixelgo-ftb|${key}|${salt}`).digest('hex').slice(0, 16).toUpperCase();
    const id = (parseInt(h[0], 16) & 7).toString(16).toUpperCase() + h.slice(1);
    if (id !== '0000000000000000' && !taken.has(id) && !used.has(id)) { used.add(id); return id; }
  }
};

/* ------------------------------------------------------------------ build */
// order_index after every other table, stable across runs
let order = -1;
for (const f of fs.readdirSync(TABLES).filter((x) => x.endsWith('.snbt') && !/^mystery_bag_tier\d\.snbt$/.test(x))) {
  const m = fs.readFileSync(path.join(TABLES, f), 'utf8').match(/^\torder_index: (\d+)/m);
  if (m) order = Math.max(order, Number(m[1]));
}

const pending = new Map();
const titles = new Map(); // table id -> title
const report = [];
BAGS.forEach((tier, i) => {
  const type = JSON.parse(fs.readFileSync(path.join(DATA, 'pixelgo', 'treasurebags_types', `${tier}.json`), 'utf8'));
  if (type.loot_table !== `loot:${tier}`) problems.push(`${tier}: bag type rolls ${type.loot_table}, expected loot:${tier}`);
  const stacks = new Map();
  flatten(type.loot_table, 1, stacks);
  const list = [...stacks.values()];
  const perBag = list.reduce((a, s) => a + s.expected, 0);

  const tableId = idFor(`table|${tier}`);
  const title = `${COLOR[type.display_name.color] || ''}${type.display_name.text}`;
  titles.set(tableId, title);

  const rewards = list.map((s) => {
    const item = { count: 1, id: s.id };
    if (Object.keys(s.components).length) item.components = s.components;
    const fields = [`id: "${idFor(`reward|${tier}|${JSON.stringify([s.id, s.components, s.count])}`)}"`];
    if (s.count[0] !== 1) fields.unshift(`count: ${s.count[0]}`);
    fields.push(`item: ${snbt(item)}`);
    if (s.count[1] > s.count[0]) fields.push(`random_bonus: ${s.count[1] - s.count[0]}`);
    fields.push(`weight: ${float(s.expected * PER)}`);
    return `\t\t{ ${fields.join(', ')} }`;
  });

  const icon = { components: { 'treasurebags:bag_type': `pixelgo:${tier}` }, id: 'treasurebags:treasure_bag' };
  const txt = [
    '{',
    `\ticon: ${snbt(icon)}`,
    `\tid: "${tableId}"`,
    `\tloot_size: ${Math.max(1, Math.round(perBag))}`,
    `\torder_index: ${order + 1 + i}`,
    '\trewards: [',
    ...rewards,
    '\t]',
    '}',
    '',
  ].join('\n');
  const f = path.join(TABLES, `mystery_bag_${tier}.snbt`);
  if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== txt) pending.set(f, txt);
  report.push(`${tier}: ${list.length} stacks, ${perBag.toFixed(2)} stacks per bag -> loot_size ${Math.max(1, Math.round(perBag))}, ` +
    `table ${tableId} "${title}"`);
});

/* ------------------------------------------------------------------- lang
 * FTB keeps the file sorted by key; the reward_table.* lines are one block. */
{
  const prev = fs.readFileSync(LANG, 'utf8');
  const eol = prev.includes('\r\n') ? '\r\n' : '\n';
  const lines = prev.split(/\r?\n/);
  const RT = /^\treward_table\.([0-9A-F]{16})\.title: /;
  // drop the old lines of these four tables (an id that changed must not linger)
  const kept = lines.filter((l) => {
    const m = l.match(RT);
    return !(m && (titles.has(m[1]) || mine.has(m[1])));
  });
  const add = [...titles].map(([id, t]) => `\treward_table.${id}.title: ${JSON.stringify(t)}`);
  const block = kept.map((l, i) => (RT.test(l) ? i : -1)).filter((i) => i >= 0);
  let out;
  if (block.length) {
    const first = block[0], last = block[block.length - 1];
    const merged = [...kept.slice(first, last + 1), ...add].sort();
    out = [...kept.slice(0, first), ...merged, ...kept.slice(last + 1)];
  } else {
    const at = kept.findIndex((l) => /^\t[a-z_]+\./.test(l) && l.slice(1) > 'reward_table');
    out = [...kept.slice(0, at), ...add.sort(), ...kept.slice(at)];
  }
  const txt = out.join(eol);
  if (txt !== prev) pending.set(LANG, txt);
}

/* ------------------------------------------------------------------ write */
console.log(report.join('\n'));
for (const s of skipped) console.log('  · ' + s);
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S):`);
  for (const p of problems) console.log(`  ! ${p}`);
  console.log('nothing written.');
  process.exit(1);
}
for (const [f, txt] of pending) if (!DRY) fs.writeFileSync(f, txt);
console.log(`${pending.size} file(s) ${DRY ? 'to change' : 'changed'}`);
for (const f of pending.keys()) console.log('  ' + path.relative(ROOT, f));
