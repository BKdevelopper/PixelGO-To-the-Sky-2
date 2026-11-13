#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — quest book: the "Legendary" chapter (chapters/sinnoh.snbt)
 * =============================================================================
 *  Rebuilt on 2026-11-13 as a collection page. This pass owns the whole chapter:
 *  - one "Catch (any)" quest per Pokémon, no text (the task title is enough);
 *  - no frame, sprites at x2; legendaries + mythicals on four rings in Pokédex order, starting at the
 *    top and going clockwise; Ultra Beasts on an outer ring;
 *  - a big checkmark in the middle that needs the whole collection.
 *
 *  Species list = Pixelmon 9.4.2 tags (data/pixelmon/species/*.json):
 *  71 `legendary`, 23 `mythical`, 11 `ultrabeast`, plus the 3 Galarian birds.
 *  Phione (egg only), Pecharunt (no source), Melmetal and Naganadel (evolution
 *  only) cannot be caught in the pack: kept as catch quests anyway (user, 2026-11-13).
 *
 *  - A quest that already exists is found by its species and KEEPS its id and
 *    rewards (players keep their progress); an old "submit" task becomes a
 *    catch task with a new id.
 *  - Every other quest of the chapter (items, shrines, explanations) is deleted,
 *    with its texts in lang/en_us.snbt and lang/fr_fr.snbt.
 *  - New quests: tier 4 Mystery Bag (tier 3 for Ultra Beasts).
 *
 *  Idempotent.
 *    node tools/pixelgo-quests/legendaries.mjs --dry
 *    node tools/pixelgo-quests/legendaries.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');
const QDIR = path.join(ROOT, 'config', 'ftbquests', 'quests');
const CHF = path.join(QDIR, 'chapters', 'sinnoh.snbt');
const LANGS = ['en_us', 'fr_fr'].map(l => path.join(QDIR, 'lang', l + '.snbt'));
const KJ_LANGS = ['en_us', 'fr_fr', 'zh_cn'].map(l => path.join(ROOT, 'kubejs', 'assets', 'kubejs', 'lang', l + '.json'));

/* --- the collection, Pokédex order. [spec, kind]  L legendary, M mythical, U Ultra Beast */
const L = 'L', M = 'M', U = 'U';
const MONS = [
  ['Articuno', L], ['articuno form:galarian', L], ['Zapdos', L], ['zapdos form:galarian', L],
  ['Moltres', L], ['moltres form:galarian', L], ['Mewtwo', L], ['Mew', M],
  ['raikou', L], ['entei', L], ['suicune', L], ['lugia', L], ['Ho-Oh', L], ['celebi', M],
  ['regirock', L], ['regice', L], ['registeel', L], ['latias', L], ['latios', L],
  ['kyogre', L], ['groudon', L], ['rayquaza', L], ['jirachi', M], ['deoxys', M],
  ['uxie', L], ['mesprit', L], ['azelf', L], ['dialga', L], ['palkia', L], ['heatran', L],
  ['regigigas', L], ['giratina', L], ['cresselia', L], ['Phione', M], ['manaphy', M], ['darkrai', M],
  ['shaymin', M], ['arceus', M],
  ['victini', M], ['cobalion', L], ['terrakion', L], ['virizion', L], ['tornadus', L],
  ['thundurus', L], ['reshiram', L], ['zekrom', L], ['landorus', L], ['kyurem', L],
  ['keldeo', M], ['meloetta', M], ['genesect', M],
  ['xerneas', L], ['yveltal', L], ['zygarde', L], ['diancie', M], ['hoopa', M], ['volcanion', M],
  ['TypeNull', L], ['Silvally', L], ['tapukoko', L], ['tapulele', L], ['tapubulu', L],
  ['tapufini', L], ['cosmog', L], ['cosmoem', L], ['solgaleo', L], ['Lunala', L],
  ['Nihilego', U], ['Buzzwole', U], ['Pheromosa', U], ['Xurkitree', U], ['Celesteela', U],
  ['Kartana', U], ['Guzzlord', U], ['necrozma', L], ['magearna', M], ['Marshadow', M],
  ['Poipole', U], ['Naganadel', U], ['Stakataka', U], ['Blacephalon', U], ['zeraora', M], ['meltan', M], ['Melmetal', M],
  ['Zacian', L], ['Zamazenta', L], ['eternatus', L], ['kubfu', L], ['urshifu', L],
  ['zarude', M], ['regieleki', L], ['regidrago', L], ['glastrier', L], ['spectrier', L],
  ['calyrex', L], ['enamorus', L],
  ['Wo-Chien', L], ['Chien-Pao', L], ['Ting-Lu', L], ['Chi-Yu', L], ['Koraidon', L],
  ['Miraidon', L], ['Okidogi', L], ['Munkidori', L], ['Fezandipiti', L], ['Ogerpon', L],
  ['Terapagos', L], ['Pecharunt', M],
];

/* --- layout ----------------------------------------------------------------------- */
// no frame (shape "none"), sprite drawn at x2 (user's Lugia example, 2026-11-13):
// rings far enough apart that the big sprites do not overlap
const ICON_SCALE = 2;
const RINGS = [4, 6, 8, 10];      // legendaries + mythicals
const UB_RING = 12.25;            // Ultra Beasts
const CHECK_SIZE = 3;

/* --- read the chapter --------------------------------------------------------------- */
const ch = fs.readFileSync(CHF, 'utf8');
const EOLC = ch.includes('\r\n') ? '\r\n' : '\n';
const chLines = ch.split(/\r?\n/);
const qStart = chLines.indexOf('\tquests: [');
let qEnd = qStart + 1;
const blocks = [];
for (let cur = null; qEnd < chLines.length; qEnd++) {
  const l = chLines[qEnd];
  if (l === '\t]') break;
  if (l === '\t\t{') { cur = []; continue; }
  if (l === '\t\t}') { blocks.push(cur); cur = null; continue; }
  cur.push(l);
}
if (qStart < 0 || chLines[qEnd] !== '\t]') throw new Error('quest list not found in sinnoh.snbt');

const norm = s => s.toLowerCase().replace(/[^a-z0-9:]/g, '');
const sliceList = (b, head) => {
  const i = b.findIndex(l => l.startsWith(head));
  if (i < 0) return null;
  if (/\]$/.test(b[i])) return [b[i]];
  let j = i + 1; while (!/^\t\t\t\}?\]$/.test(b[j])) j++;
  return b.slice(i, j + 1);
};
const old = new Map();           // norm(spec) -> { id, rewards, tasks, type }
const oldIds = [];
let check = null;                // the existing collection checkmark, if any
for (const b of blocks) {
  const body = b.join('\n');
  const id = body.match(/^\t\t\tid: "(\w+)"/m)[1];
  oldIds.push(id);
  const tasks = sliceList(b, '\t\t\ttasks: [');
  const rewards = sliceList(b, '\t\t\trewards: [');
  const spec = body.match(/^\t\t\t\tpokemon: "([^"]+)"/m)?.[1];
  const type = body.match(/^\t\t\t\ttype: "(pixelgoquests:\w+|checkmark)"/m)?.[1];
  if (spec) old.set(norm(spec), { id, rewards, tasks, type });
  else if (type === 'checkmark' && (!check || /hide_dependency_lines: true/.test(body))) check = { id, tasks };
}

/* --- stable ids for new quests / tasks / rewards ------------------------------------- */
const allText = fs.readdirSync(path.join(QDIR, 'chapters')).filter(f => f !== 'sinnoh.snbt')
  .map(f => fs.readFileSync(path.join(QDIR, 'chapters', f), 'utf8')).join('\n')
  + fs.readdirSync(path.join(QDIR, 'reward_tables')).map(f => fs.readFileSync(path.join(QDIR, 'reward_tables', f), 'utf8')).join('\n');
const used = new Set();
const newId = (seed) => {
  for (let n = 0; ; n++) {
    const h = crypto.createHash('sha1').update('pixelgo-legendary:' + seed + (n ? ':' + n : '')).digest('hex').toUpperCase().slice(0, 16);
    const id = '01234567'[parseInt(h[0], 16) % 8] + h.slice(1);
    if (!allText.includes(id) && !used.has(id)) { used.add(id); return id; }
  }
};

/* --- positions ------------------------------------------------------------------------ */
const fmt = (n) => { const r = Math.round(n * 100) / 100; return (Number.isInteger(r) ? r.toFixed(1) : String(r)) + 'd'; };
const ring = (n, r) => Array.from({ length: n }, (_, i) => {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return [r * Math.cos(a), r * Math.sin(a)];
});
const inner = MONS.filter(m => m[1] !== U);
const ubs = MONS.filter(m => m[1] === U);
// split the inner list over the rings in proportion to their circumference
const total = RINGS.reduce((s, r) => s + r, 0);
const counts = RINGS.map(r => Math.round(inner.length * r / total));
counts[counts.length - 1] += inner.length - counts.reduce((s, c) => s + c, 0);
const pos = [];
RINGS.forEach((r, i) => pos.push(...ring(counts[i], r)));
pos.push(...ring(ubs.length, UB_RING));
const placed = [...inner, ...ubs];

/* --- build the quest list ---------------------------------------------------------------- */
const rewardLines = (seed, tier, count = 1) => [
  '\t\t\trewards: [{',
  `\t\t\t\tid: "${newId('reward:' + seed)}"`,
  '\t\t\t\titem: {',
  '\t\t\t\t\tcomponents: {',
  `\t\t\t\t\t\t"treasurebags:bag_type": "pixelgo:${tier}"`,
  '\t\t\t\t\t}',
  `\t\t\t\t\tcount: ${count}`,
  '\t\t\t\t\tid: "treasurebags:treasure_bag"',
  '\t\t\t\t}',
  '\t\t\t\ttype: "item"',
  '\t\t\t}]',
];
const catchLines = (spec, taskId) => [
  '\t\t\ttasks: [{',
  '\t\t\t\tcatchType: 0b',
  '\t\t\t\tcount: 1',
  `\t\t\t\tid: "${taskId}"`,
  '\t\t\t\tinvert: false',
  `\t\t\t\tpokemon: "${spec}"`,
  '\t\t\t\ttype: "pixelgoquests:catch_pokemon"',
  '\t\t\t}]',
];
// ids kept from the old file must not be handed out again
for (const o of old.values()) { used.add(o.id); for (const l of [...(o.tasks || []), ...(o.rewards || [])]) { const m = l.match(/id: "(\w{16})"/); if (m) used.add(m[1]); } }
if (check) used.add(check.id);

const out = [];
const questIds = [];
let created = 0, converted = 0;
placed.forEach(([spec, kind], i) => {
  const o = old.get(norm(spec));
  const id = o?.id ?? newId('quest:' + norm(spec));
  if (!o) created++;
  questIds.push(id);
  let tasks = o?.tasks;
  if (!o || o.type !== 'pixelgoquests:catch_pokemon') {
    if (o) converted++;
    tasks = catchLines(spec, newId('task:' + norm(spec)));
  }
  const [x, y] = pos[i];
  out.push('\t\t{');
  out.push(`\t\t\ticon_scale: ${fmt(ICON_SCALE)}`);
  out.push(`\t\t\tid: "${id}"`);
  out.push(...(o?.rewards ?? rewardLines(norm(spec), kind === U ? 'tier3' : 'tier4')));
  out.push('\t\t\tshape: "none"');
  out.push(...tasks);
  out.push(`\t\t\tx: ${fmt(x)}`, `\t\t\ty: ${fmt(y)}`);
  out.push('\t\t}');
});
const checkId = check?.id ?? newId('quest:collection');
out.push('\t\t{');
out.push(`\t\t\tdependencies: [${questIds.map(d => `"${d}"`).join(', ')}]`);
out.push('\t\t\thide_dependency_lines: true');
out.push(`\t\t\tid: "${checkId}"`);
out.push(...rewardLines('collection', 'tier4', 3));
out.push('\t\t\tshape: "gear"');
out.push(`\t\t\tsize: ${fmt(CHECK_SIZE)}`);
out.push('\t\t\ttasks: [{', `\t\t\t\tid: "${check?.tasks?.join('\n').match(/id: "(\w{16})"/)?.[1] ?? newId('task:collection')}"`, '\t\t\t\ttype: "checkmark"', '\t\t\t}]');
out.push('\t\t\tx: 0.0d', '\t\t\ty: 0.0d');
out.push('\t\t}');

const newCh = [...chLines.slice(0, qStart + 1), ...out, ...chLines.slice(qEnd)].join(EOLC);
const kept = new Set([...questIds, checkId]);
const removed = oldIds.filter(i => !kept.has(i));

/* --- texts: drop every quest text of the chapter, title the checkmark ------------------- */
const CHECK_TITLE = { en_us: '&6&lLegendary Collection', fr_fr: '&6&lCollection légendaire' };
const chapterIds = new Set([...oldIds, ...kept]);
const langOut = [];
let dropped = 0;
for (const f of LANGS) {
  const loc = path.basename(f, '.snbt');
  const txt = fs.readFileSync(f, 'utf8');
  const EOL = txt.includes('\r\n') ? '\r\n' : '\n';
  const lines = txt.split(/\r?\n/);
  const res = [lines[0]];
  let i = 1;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (l === '}') break;
    const body = [l];
    if (l.endsWith('[')) { while (lines[++i] !== '\t]') body.push(lines[i]); body.push(lines[i]); }
    const m = l.match(/^\tquest\.(\w{16})\./);
    if (m && chapterIds.has(m[1])) { dropped++; continue; }
    res.push(...body);
  }
  // insert the checkmark title in key order
  const entry = `\tquest.${checkId}.title: "${CHECK_TITLE[loc]}"`;
  let at = res.findIndex((l, k) => k > 0 && /^\t\S/.test(l) && l.slice(1).split(':')[0] > `quest.${checkId}.title`);
  if (at < 0) at = res.length;
  res.splice(at, 0, entry);
  res.push(...lines.slice(i));
  langOut.push([f, res.join(EOL)]);
}

/* --- KubeJS lang keys only these texts pointed to ----------------------------------------- */
const refsLeft = new Set();
for (const [, t] of langOut) for (const m of t.matchAll(/\{(quest\.[\w.]+)\}/g)) refsLeft.add(m[1]);
for (const f of fs.readdirSync(path.join(QDIR, 'chapters'))) for (const m of fs.readFileSync(path.join(QDIR, 'chapters', f), 'utf8').matchAll(/\{(quest\.[\w.]+)\}/g)) refsLeft.add(m[1]);
const refsBefore = new Set();
for (const f of LANGS) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\{(quest\.[\w.]+)\}/g)) refsBefore.add(m[1]);
const deadKeys = [...refsBefore].filter(k => !refsLeft.has(k));
const kjOut = [];
for (const f of KJ_LANGS) {
  if (!fs.existsSync(f)) continue;
  const txt = fs.readFileSync(f, 'utf8');
  const EOL = txt.includes('\r\n') ? '\r\n' : '\n';
  const lines = txt.split(/\r?\n/);
  const keep = lines.filter(l => { const m = l.match(/^\s*"([^"]+)":/); return !(m && deadKeys.includes(m[1])); });
  // fix a trailing comma left before the closing brace
  for (let k = keep.length - 1; k > 0; k--) if (/^\s*\}\s*$/.test(keep[k])) { let p = k - 1; while (!keep[p].trim()) p--; keep[p] = keep[p].replace(/,\s*$/, ''); break; }
  const res = keep.join(EOL);
  JSON.parse(res);
  if (res !== txt) kjOut.push([f, res, lines.length - keep.length]);
}

console.log(`quests: ${placed.length} Pokémon (${created} new, ${converted} tasks turned into catch) + checkmark ${checkId}`);
console.log(`rings: ${counts.join(' / ')} + ${ubs.length} Ultra Beasts`);
console.log(`removed quests: ${removed.length}; lang entries dropped: ${dropped}; dead KubeJS keys: ${deadKeys.length}`);
for (const [f, , n] of kjOut) console.log(`  ${path.relative(ROOT, f)}: -${n}`);
if (DRY) process.exit(0);
fs.writeFileSync(CHF, newCh);
for (const [f, t] of langOut) fs.writeFileSync(f, t);
for (const [f, t] of kjOut) fs.writeFileSync(f, t);
console.log('written');
