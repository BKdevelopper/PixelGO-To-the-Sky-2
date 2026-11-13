#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — quest book: the "Berries" chapter (chapters/berries.snbt)
 * =============================================================================
 *  Created on 2026-11-14, same collection page as the Legendary chapter
 *  (legendaries.mjs): one item quest per berry, no text, no frame, sprites at
 *  x2, rings around a big checkmark that needs the whole collection.
 *
 *  Berries = the 78 constants of Pixelmon 9.4.2 `enums/BerryType`, in that
 *  order (every one has a berry tree). Left out: `sweet_berry` ("Berry Sweet",
 *  not a berry) and `mickle_berry` (duplicate of Micle, no tree).
 *
 *  Rewards are coins only: one Dime (40 $) per berry, 10 Poke Coins for the
 *  checkmark. The pass owns the whole chapter; existing quests are found by
 *  their berry and keep their ids and rewards.
 *
 *  Idempotent.
 *    node tools/pixelgo-quests/berries.mjs --dry
 *    node tools/pixelgo-quests/berries.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');
const QDIR = path.join(ROOT, 'config', 'ftbquests', 'quests');
const CHF = path.join(QDIR, 'chapters', 'berries.snbt');
const LANGS = { en_us: path.join(QDIR, 'lang', 'en_us.snbt'), fr_fr: path.join(QDIR, 'lang', 'fr_fr.snbt') };

const BERRIES = `cheri chesto pecha rawst aspear leppa oran persim lum sitrus figy wiki mago aguav
  iapapa razz bluk nanab wepear pinap pomeg kelpsy qualot hondew grepa tamato cornn magost rabuta
  nomel spelon pamtre watmel durin belue occa passho wacan rindo yache chople kebia shuca coba
  payapa tanga charti kasib haban colbur babiri chilan roseli liechi ganlon salac petaya apicot
  lansat starf pumkin drash eggant strib nutpea ginema kuo yago touga niniku topo enigma micle
  custap jaboca rowap kee maranga`.trim().split(/\s+/).map(b => `pixelmon:${b}_berry`);

const CHAPTER_ID = '0B3E7A52C19D4F60';
const GROUP = '1A3BB00B8761BF8C';        // PIXELMON
const ORDER = 17;                        // after Rival Kyusama
const TITLE = { en_us: 'Berries', fr_fr: 'Baies' };
const CHECK_TITLE = { en_us: '&6&lBerry Collection', fr_fr: '&6&lCollection de baies' };
const BERRY_REWARD = ['pokeblocks:dime', 1];
const CHECK_REWARD = ['pokeblocks:poke_coin', 10];
const ICON_SCALE = 2;
const RINGS = [4, 6, 8, 10];
const CHECK_SIZE = 3;

/* --- the chapter as it is now (if any) ------------------------------------------------- */
const exists = fs.existsSync(CHF);
const ch = exists ? fs.readFileSync(CHF, 'utf8') : '';
const old = new Map();   // berry -> { id, rewards, tasks }
let check = null;
if (exists) {
  const lines = ch.split(/\r?\n/);
  const qs = lines.indexOf('\tquests: [');
  const blocks = [];
  for (let i = qs + 1, cur = null; lines[i] !== '\t]'; i++) {
    if (lines[i] === '\t\t{') { cur = []; continue; }
    if (lines[i] === '\t\t}') { blocks.push(cur); continue; }
    cur.push(lines[i]);
  }
  const slice = (b, head) => {
    const i = b.findIndex(l => l.startsWith(head));
    if (i < 0) return null;
    if (/\]$/.test(b[i])) return [b[i]];
    let j = i + 1; while (!/^\t\t\t\}?\]$/.test(b[j])) j++;
    return b.slice(i, j + 1);
  };
  for (const b of blocks) {
    const body = b.join('\n');
    const id = body.match(/^\t\t\tid: "(\w+)"/m)[1];
    const tasks = slice(b, '\t\t\ttasks: ['), rewards = slice(b, '\t\t\trewards: [');
    const item = tasks.join('\n').match(/id: "(pixelmon:\w+_berry)"/)?.[1];
    if (item) old.set(item, { id, tasks, rewards });
    else if (/type: "checkmark"/.test(tasks.join('\n'))) check = { id, tasks, rewards };
  }
}

/* --- ids ----------------------------------------------------------------------------------- */
const others = fs.readdirSync(path.join(QDIR, 'chapters')).filter(f => f !== 'berries.snbt')
  .map(f => fs.readFileSync(path.join(QDIR, 'chapters', f), 'utf8')).join('\n')
  + fs.readdirSync(path.join(QDIR, 'reward_tables')).map(f => fs.readFileSync(path.join(QDIR, 'reward_tables', f), 'utf8')).join('\n');
if (others.includes(CHAPTER_ID)) throw new Error('chapter id already used elsewhere');
const used = new Set([...ch.matchAll(/id: "([0-9A-F]{16})"/g)].map(m => m[1]));
const newId = (seed) => {
  for (let n = 0; ; n++) {
    const h = crypto.createHash('sha1').update('pixelgo-berries:' + seed + (n ? ':' + n : '')).digest('hex').toUpperCase().slice(0, 16);
    const id = '01234567'[parseInt(h[0], 16) % 8] + h.slice(1);
    if (!others.includes(id) && !used.has(id)) { used.add(id); return id; }
  }
};

/* --- layout --------------------------------------------------------------------------------- */
const fmt = (n) => { const r = Math.round(n * 100) / 100; return (Number.isInteger(r) ? r.toFixed(1) : String(r)) + 'd'; };
const total = RINGS.reduce((s, r) => s + r, 0);
const counts = RINGS.map(r => Math.round(BERRIES.length * r / total));
counts[counts.length - 1] += BERRIES.length - counts.reduce((s, c) => s + c, 0);
const pos = RINGS.flatMap((r, k) => Array.from({ length: counts[k] }, (_, i) => {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / counts[k];
  return [r * Math.cos(a), r * Math.sin(a)];
}));

const coinReward = (seed, [item, count]) => [
  '\t\t\trewards: [{',
  ...(count > 1 ? [`\t\t\t\tcount: ${count}`] : []),
  `\t\t\t\tid: "${newId('reward:' + seed)}"`,
  `\t\t\t\titem: { count: 1, id: "${item}" }`,
  '\t\t\t\ttype: "item"',
  '\t\t\t}]',
];

const out = [];
const ids = [];
let created = 0;
BERRIES.forEach((item, i) => {
  const o = old.get(item);
  if (!o) created++;
  const id = o?.id ?? newId('quest:' + item);
  ids.push(id);
  out.push('\t\t{');
  out.push(`\t\t\ticon_scale: ${fmt(ICON_SCALE)}`);
  out.push(`\t\t\tid: "${id}"`);
  out.push(...(o?.rewards ?? coinReward(item, BERRY_REWARD)));
  out.push('\t\t\tshape: "none"');
  out.push(...(o?.tasks ?? [
    '\t\t\ttasks: [{',
    `\t\t\t\tid: "${newId('task:' + item)}"`,
    `\t\t\t\titem: { count: 1, id: "${item}" }`,
    '\t\t\t\ttype: "item"',
    '\t\t\t}]',
  ]));
  out.push(`\t\t\tx: ${fmt(pos[i][0])}`, `\t\t\ty: ${fmt(pos[i][1])}`);
  out.push('\t\t}');
});
const checkId = check?.id ?? newId('quest:collection');
out.push('\t\t{');
out.push(`\t\t\tdependencies: [${ids.map(d => `"${d}"`).join(', ')}]`);
out.push('\t\t\thide_dependency_lines: true');
out.push(`\t\t\tid: "${checkId}"`);
out.push(...(check?.rewards ?? coinReward('collection', CHECK_REWARD)));
out.push('\t\t\tshape: "gear"');
out.push(`\t\t\tsize: ${fmt(CHECK_SIZE)}`);
out.push(...(check?.tasks ?? ['\t\t\ttasks: [{', `\t\t\t\tid: "${newId('task:collection')}"`, '\t\t\t\ttype: "checkmark"', '\t\t\t}]']));
out.push('\t\t\tx: 0.0d', '\t\t\ty: 0.0d');
out.push('\t\t}');

const file = [
  '{',
  '\tdefault_hide_dependency_lines: false',
  '\tdefault_quest_shape: ""',
  '\tfilename: "berries"',
  `\tgroup: "${GROUP}"`,
  '\ticon: {',
  '\t\tid: "pixelmon:oran_berry"',
  '\t}',
  `\tid: "${CHAPTER_ID}"`,
  '\timages: [ ]',
  `\torder_index: ${ORDER}`,
  '\tquest_links: [ ]',
  '\tquests: [',
  ...out,
  '\t]',
  '}',
  '',
].join('\r\n');

/* --- titles: chapter (gradient of the PIXELMON group, see tools/quest-gradient.js) + checkmark */
const hsl = (h, s, l) => {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return t.map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0').toUpperCase()).join('');
};
const grad = (text, h0 = 282, h1 = 318, s = 70, l0 = 78, l1 = 63) => {
  const n = Math.max(text.length - 1, 1);
  let o = '';
  for (let i = 0; i < text.length; i++) { const t = i / n; o += '&#' + hsl(h0 + (h1 - h0) * t, s, l0 + (l1 - l0) * t) + text[i]; }
  return o;
};
const langOut = [];
for (const [loc, f] of Object.entries(LANGS)) {
  const txt = fs.readFileSync(f, 'utf8');
  const EOL = txt.includes('\r\n') ? '\r\n' : '\n';
  const lines = txt.split(/\r?\n/);
  const set = (key, value) => {
    const line = `\t${key}: "${value}"`;
    const at = lines.findIndex(l => l.startsWith(`\t${key}: `));
    if (at >= 0) { lines[at] = line; return; }
    let i = lines.findIndex((l, k) => k > 0 && /^\t\S/.test(l) && l.slice(1).split(':')[0] > key);
    if (i < 0) i = lines.lastIndexOf('}');
    lines.splice(i, 0, line);
  };
  set(`chapter.${CHAPTER_ID}.title`, grad('- ' + TITLE[loc]));
  set(`quest.${checkId}.title`, CHECK_TITLE[loc]);
  langOut.push([f, lines.join(EOL)]);
}

console.log(`${BERRIES.length} berries (${created} new) on rings ${counts.join(' / ')} + checkmark ${checkId}`);
if (DRY) process.exit(0);
fs.writeFileSync(CHF, file);
for (const [f, t] of langOut) fs.writeFileSync(f, t);
console.log('written');
