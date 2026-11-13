#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — quest book: the "Creative Items" chapter (chapters/other.snbt)
 * =============================================================================
 *  Rebuilt on 2026-11-08. This pass owns the whole chapter: it rewrites the
 *  quest list of other.snbt (layout, shapes, dependencies, tasks) and the
 *  title / subtitle / description of every quest in lang/en_us.snbt.
 *
 *  - A quest that already exists is found by its task item and KEEPS its id,
 *    its task id and its rewards (players keep their progress).
 *  - A new quest gets a stable id hashed from its key (first digit 0-7: FTB
 *    replaces ids starting with 8-F on load) and one tier 4 Mystery Bag.
 *  - Every item of this chapter has a working recipe in the pack (checked on
 *    2026-11-08 with tools/pixelgo-shop/craftcost.mjs; Master Ball, Ultimate
 *    Singularity and The Ultimate Component got theirs that day).
 *  - No recipe in the text — JEI has them (see norecipes.mjs). Saying which
 *    table or machine does the job is fine.
 *
 *  Idempotent.
 *    node tools/pixelgo-quests/creative.mjs --dry
 *    node tools/pixelgo-quests/creative.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');
const QDIR = path.join(ROOT, 'config', 'ftbquests', 'quests');
const CHF = path.join(QDIR, 'chapters', 'other.snbt');
const LANGF = path.join(QDIR, 'lang', 'en_us.snbt');

const SEE_JEI = '&7Recipe in &6JEI&7.';

/* --- the chapter, row by row -------------------------------------------------
 *  key      : task item (`id|ball` for a Poké Ball)
 *  x, y     : position; shape / size optional
 *  deps     : keys of quests that must be done first (same chapter)
 *  keepText : leave the existing texts alone
 * --------------------------------------------------------------------------- */
const ROWS = [
  /* ---- y 0 : the five keystones everything else is built on ---- */
  { key: 'mysticalagradditions:creative_essence', x: -4, y: 0, shape: 'gear',
    title: '&d&lCreative Essence', subtitle: '&7The last essence',
    desc: [
      '&7The essence one step above &5&lInsanium&r&7, made at the &fElite Crafting Table&7 (7x7). It is a crafting material only.',
      '',
      '&e&lWHAT IT GOES INTO',
      '&7- the &fPipez Infinity Upgrade',
      '&7- the &fCreative Storage Disk',
      '&7- the four pieces of &cRed Matter Gem Armor',
      '&7- the &dPhilosopher\'s Stone',
      '',
      SEE_JEI,
    ] },
  { key: 'extendedcrafting:ultimate_singularity', x: -2, y: 0, shape: 'gear',
    title: '&5&lUltimate Singularity', subtitle: '&7The singularity of singularities',
    desc: [
      '&7Every singularity is filled in the &fQuantum Compressor&7: feed it one material until the counter is full. The Ultimate one is then put together at the &fUltimate Crafting Table&7 (9x9).',
      '&7The &fNickel&7, &fElectrum&7 and &fInvar&7 singularities show up in JEI but cannot be filled in this pack - none of them is needed.',
      '',
      '&e&lWHAT IT GOES INTO',
      '&7- the &6&lUltimate Catalyst',
      '&7- the &fCreative Storage Disk&7 and the &fTransmutation Tablet',
      '&7- the &dPhilosopher\'s Stone',
      '',
      '&7Also sold in the &6Endgame&7 shop.',
      SEE_JEI,
    ] },
  { key: 'extendedcrafting:the_ultimate_component', x: 0, y: 0, shape: 'gear',
    title: '&e&lThe Ultimate Component', subtitle: '&7Every component in one',
    desc: [
      '&7The last component of &fExtended Crafting&7, made at the &fAdvanced Crafting Table&7 (5x5).',
      '&7It goes into the &6&lUltimate Catalyst&r&7 and the &dPhilosopher\'s Stone&7.',
      '',
      '&7Also sold in the &6Endgame&7 shop.',
      SEE_JEI,
    ] },
  { key: 'extendedcrafting:the_ultimate_catalyst', x: 2, y: 0, shape: 'gear', size: 1.5,
    deps: ['extendedcrafting:ultimate_singularity', 'extendedcrafting:the_ultimate_component'],
    title: '&6&lThe Ultimate Catalyst', subtitle: '&7The key to the creative tier',
    desc: [
      '&7The rarest catalyst of the pack. Its singularities come from the &fQuantum Compressor&7.',
      '',
      '&e&lWHAT IT GOES INTO',
      '&7- the &fCreative Controller&7 and the &fCreative Wireless Grid&7, at the &fSmithing Table&7 with a &fNetherite Upgrade&7 template',
      '&7- the &6&lLegendary Pokéstop',
      '',
      SEE_JEI,
    ] },
  { key: 'pixelmon:poke_ball|master_ball', x: 4.5, y: 0, shape: 'gear', size: 1.5,
    title: '&5&lMaster Ball', subtitle: '&7Catches anything, first throw',
    desc: [
      '&7Catch rate &f&l255&r&7: any Pokémon, legendaries included, is caught on the first throw.',
      '',
      '&e&lWHERE IT COMES FROM',
      '&7- the end of the &6&lBall Line&r&7: bring your &fcomplete collection&7 of craftable balls to the &fUltimate Crafting Table&7 (9x9)',
      '&7- loot: the &5Master Crate&7 always holds one, and the chests of high-rank &dGates&7 sometimes do',
      '',
      '&e&lWHAT IT GOES INTO',
      '&7- the &dPhilosopher\'s Stone&7: &f68&7 of them',
      '&7- the &cRed Matter Gem Armor&7 and the &e&lSSR Ticket',
      '',
      SEE_JEI,
    ] },

  /* ---- y 2.5 : Pokémon ---- */
  { key: 'kubejs:random_egg', x: -5, y: 2.5, size: 1.25, keepText: true },
  { key: 'pixelmongo:pokestop', x: -3, y: 2.5,
    title: '&b&lPixelmonGo Pokéstop', subtitle: '&7The first of four Pokéstops',
    desc: [
      '&7Place it and &fright-click&7 it: it hands out &f3 to 5&7 items, then has to recharge.',
      '&7What comes out: potions, revives, &fRare Candy&7, Hisuian Poké Balls, &dMystery Eggs&7 and &fPixelmonGo Eggs&7 up to &fMK 6&7.',
      '',
      '&7Made at the &fElite Crafting Table&7 (7x7). It is the core of the &fCommon Pokéstop&7.',
      SEE_JEI,
    ] },
  { key: 'pixelmon:common_pokestop', x: -1.5, y: 2.5, deps: ['pixelmongo:pokestop'],
    title: '&9&lCommon Pokéstop', subtitle: '&7Healing items and small candies',
    desc: [
      '&7A Pixelmon Pokéstop: &fright-click&7 it for a handful of items, then wait for it to recharge.',
      '&7What comes out: Poké Ball lids, potions, revives, status heals, lure casings, &fXS&7 and &fS Exp. Candies&7.',
      '',
      '&7Made at the &fElite Crafting Table&7, around a PixelmonGo Pokéstop. It is the core of the &aRare Pokéstop&7.',
      SEE_JEI,
    ] },
  { key: 'pixelmon:rare_pokestop', x: 0, y: 2.5, deps: ['pixelmon:common_pokestop'],
    title: '&a&lRare Pokéstop', subtitle: '&7Training and type items',
    desc: [
      '&7Same use as the Common Pokéstop, with better loot.',
      '&7What comes out: Poké Ball lids, super and hyper potions, ethers, &fEV feathers&7, PP Ups, type-boosting held items, &fType Gems&7, &fM&7 and &fL Exp. Candies&7.',
      '',
      '&7Made at the &fElite Crafting Table&7, around a Common Pokéstop. It is the core of the &6Legendary Pokéstop&7.',
      SEE_JEI,
    ] },
  { key: 'pixelmon:legendary_pokestop', x: 1.5, y: 2.5, size: 1.5,
    deps: ['pixelmon:rare_pokestop', 'extendedcrafting:the_ultimate_catalyst'],
    title: '&6&lLegendary Pokéstop', subtitle: '&7The best Pokéstop there is',
    desc: [
      '&7The top Pokéstop.',
      '&7What comes out: Poké Balls and lids, max potions and revives, Full Restores, &fvitamins&7, PP Max, &fevolution stones&7, trade-evolution items, &fRare Candy&7 and &fXL Exp. Candies&7.',
      '',
      '&7Made at the &fElite Crafting Table&7, around a Rare Pokéstop, with &6Ultimate Catalysts&7.',
      SEE_JEI,
    ] },
  // Silver / Gold Bottle Cap: no recipe since 2026-11-09 (loot, shop, quest
  // rewards only), so they have no quest here — every item in this chapter
  // must be craftable.

  /* ---- y 5 : storage and logistics ---- */
  { key: 'refinedstorage:creative_controller', x: -5, y: 5, size: 1.25,
    deps: ['extendedcrafting:the_ultimate_catalyst'],
    title: '&b&lCreative Controller', subtitle: '&7A Refined Storage network that needs no power',
    desc: [
      '&7Works like the normal &fController&7, but it never needs energy: the whole network runs for free.',
      '',
      '&7An upgrade of the Controller at the &fSmithing Table&7, with a &fNetherite Upgrade&7 template and an &6Ultimate Catalyst&7.',
      SEE_JEI,
    ] },
  { key: 'refinedstorage:creative_wireless_grid', x: -3.5, y: 5,
    deps: ['extendedcrafting:the_ultimate_catalyst'],
    title: '&b&lCreative Wireless Grid', subtitle: '&7Your network in your pocket, no charging',
    desc: [
      '&7The Wireless Grid with an endless battery: open your Refined Storage network from anywhere in range without ever recharging it.',
      '',
      '&7An upgrade of the Wireless Grid at the &fSmithing Table&7, with a &fNetherite Upgrade&7 template and an &6Ultimate Catalyst&7.',
      SEE_JEI,
    ] },
  { key: 'refinedstorage:creative_storage_disk', x: -2, y: 5,
    title: '&b&lCreative Storage Disk', subtitle: '&7Storage without a limit',
    desc: [
      '&7A Refined Storage disk with no size limit: put it in a &fDisk Drive&7 and it holds any amount of items.',
      '',
      '&7Made at the &fUltimate Crafting Table&7 (9x9). It needs &dCreative Essence&7 and an &5Ultimate Singularity&7.',
      SEE_JEI,
    ] },
  // was the Survival Infinity Upgrade (Sophisticated Storage) until 2026-11-09: removed, too strong
  { key: 'extendedcrafting:the_ultimate_ingot', was: 'sophisticatedstorage:survival_infinity_upgrade', x: -0.5, y: 5,
    title: '&e&lThe Ultimate Ingot', subtitle: '&7Every enchanted metal in one bar',
    desc: [
      '&7The last ingot of &fExtended Crafting&7, made at the &fAdvanced Crafting Table&7 (5x5) from the &6enchanted ingots&7 of your minions.',
      '',
      '&e&lWHAT IT GOES INTO',
      '&7- the &dPhilosopher\'s Stone',
      '',
      SEE_JEI,
    ] },
  { key: 'pipez:infinity_upgrade', x: 1, y: 5,
    title: '&e&lPipez Infinity Upgrade', subtitle: '&7A pipe with no speed cap',
    desc: [
      '&7Put it in a &fPipez&7 extracting side: it moves items, fluids, energy and gas as fast as the other side can take them.',
      '',
      '&7An upgrade of the Ultimate Upgrade at the &fSmithing Table&7, with a &fNetherite Upgrade&7 template and &dCreative Essence&7.',
      SEE_JEI,
    ] },
  { key: 'mekanism:creative_fluid_tank', x: 2.5, y: 5, size: 1.25,
    title: '&9&lCreative Fluid Tank', subtitle: '&7One bucket, forever',
    desc: [
      '&7Fill it once with a fluid and it gives that fluid out forever, as fast as you pull it.',
      '',
      '&7Made at the &fUltimate Crafting Table&7 (9x9), with &fwater&7 and &flava&7 buckets and an &6Enchanted Netherite Scrap&7 at its heart.',
      SEE_JEI,
    ] },

  /* ---- y 7.5 : tools ---- */
  { key: 'constructionwand:infinity_wand', x: -5, y: 7.5,
    title: '&d&lInfinity Wand', subtitle: '&7Build without ever breaking it',
    desc: [
      '&7The Construction Wand that never breaks and places up to &f1024&7 blocks at a time. &fRight-click&7 a face to extend it with the blocks in your inventory.',
      '',
      '&7Made at the workbench around a Nether Star Singularity.',
      SEE_JEI,
    ] },
  { key: 'naturescompass:naturescompass', x: -3.5, y: 7.5,
    title: '&a&lNature\'s Compass', subtitle: '&7Points to any biome',
    desc: [
      '&7&fRight-click&7 to pick a biome: the compass then points to the closest one.',
      '',
      '&7Made at the workbench from Mystical Agriculture\'s &fNature&7 seeds and fertilized essence. It also goes into the Explorer\'s Compass.',
      SEE_JEI,
    ] },
  { key: 'explorerscompass:explorerscompass', x: -2, y: 7.5, deps: ['naturescompass:naturescompass'],
    title: '&6&lExplorer\'s Compass', subtitle: '&7Points to any structure',
    desc: [
      '&7&fRight-click&7 to pick a structure - dungeons, villages, Pixelmon structures... - and the compass points to the closest one.',
      '',
      '&7Made on the Mystical Agriculture &fInfusion Altar&7, from Nature\'s Compasses and Berry Singularities.',
      SEE_JEI,
    ] },
  { key: 'ironfurnaces:million_furnace', x: -0.5, y: 7.5,
    title: '&c&lRainbow Furnace', subtitle: '&7The fastest furnace of Iron Furnaces',
    desc: [
      '&7The last tier of Iron Furnaces: it smelts faster than any other furnace in the pack.',
      '',
      '&7An upgrade of the Netherite Furnace at the &fSmithing Table&7, with a &fNetherite Upgrade&7 template and a Nether Star.',
      SEE_JEI,
    ] },
  { key: 'havencobblegens:creative_cobble_gen', x: 1, y: 7.5,
    title: '&7&lCreative Cobblestone Generator', subtitle: '&7Endless cobblestone, at full speed',
    desc: [
      '&7The last cobblestone generator: unlimited cobblestone, for any pipe, hopper or storage that pulls from it.',
      '',
      '&7An upgrade of the Netherite generator at the workbench, with Nether Stars.',
      SEE_JEI,
    ] },
  { key: 'projecte:transmutation_tablet', x: 2.5, y: 7.5, size: 1.25,
    title: '&d&lTransmutation Tablet', subtitle: '&7The Transmutation Table in your pocket',
    desc: [
      '&7Everything the Transmutation Table does, from your inventory: &fright-click&7 it, or press &fK&7 while wearing it.',
      '&7Your EMC and what you have learned are the same as on every table. &cEMC generation is disabled&7: it only moves the value of what you burned.',
      '',
      '&7Made at the &fUltimate Crafting Table&7 (9x9), around a Transmutation Table.',
      SEE_JEI,
    ] },

  /* ---- y 10 : Red Matter Gem Armor ---- */
  ...[
    ['helmet', 'Helmet', -3.5, 'it carries the powers of the &fEvertide Amulet&7 and the &fSoul Stone&7, and its offensive ability calls down &flightning&7'],
    ['chestplate', 'Chestplate', -2, 'it carries the powers of the &fVolcanite Amulet&7 and the &fBody Stone&7, and its offensive ability sets off an &fexplosion&7 around you'],
    ['leggings', 'Leggings', -0.5, 'it carries the powers of the &fBlack Hole Band&7 and the &fWatch of Flowing Time&7'],
    ['boots', 'Boots', 1, 'it carries the power of the &fSwiftwolf\'s Rending Gale&7'],
  ].map(([p, name, x, power]) => ({
    key: `projecte:gem_${p}`, x, y: 10,
    title: `&c&lGem ${name}`, subtitle: '&7Red Matter Gem Armor',
    desc: [
      '&7The strongest armor of ProjectE. With the full set, almost no damage gets through.',
      `&7This piece: ${power}. Read its tooltip in game for the keys.`,
      '',
      '&7Made at the &fUltimate Crafting Table&7 (9x9), around the matching &cRed Matter&7 piece, with &dCreative Essence&7, &5Master Balls&7 and EMC Singularities.',
      SEE_JEI,
    ],
  })),

  /* ---- y 12.5 : the four random items, made from every berry (2026-11-14) ---- */
  ...[
    ['random_ev', 'Random EV', -3.5, 'Reroll every EV', 'reroll &nall&r&7 of its EVs at random'],
    ['random_iv', 'Random IV', -2, 'Reroll every IV', 'reroll &nall&r&7 of its IVs at random'],
    ['random_level', 'Random Level', -0.5, 'Anywhere from 1 to 100', 'set it to a random level between &f&l1&r&7 and &f&l100&r&7'],
    ['size_randomizer', 'Random Size', 1, 'Tiny, huge, or in between', 'give it a random size'],
  ].map(([n, title, x, subtitle, effect]) => ({
    key: `pixelgoitems:${n}`, x, y: 12.5,
    title: `&a&l${title}`, subtitle: `&7${subtitle}`,
    desc: [
      `&7Right-click one of your Pokémon to ${effect}.`,
      '',
      '&7Made at the &fUltimate Crafting Table&7 (9x9) from one of &aevery berry&7.',
      SEE_JEI,
    ],
  })),
];

/* --- read the chapter --------------------------------------------------------- */
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
if (qStart < 0 || chLines[qEnd] !== '\t]') throw new Error('quest list not found in other.snbt');

const taskKey = (body) => {
  const t = body.slice(body.indexOf('\t\t\ttasks:')).match(/item: \{ (?:components: \{ "pixelmon:poke_ball": "([a-z_]+)" \}, )?count: \d+, id: "([a-z0-9_]+:[a-z0-9_/]+)" \}/);
  return t ? t[2] + (t[1] ? '|' + t[1] : '') : null;
};
const old = new Map();
for (const b of blocks) {
  const body = b.join('\n');
  const key = taskKey(body);
  // rewards: from '\t\t\trewards: [' to its closing line, verbatim
  const ri = b.findIndex(l => l.startsWith('\t\t\trewards: ['));
  let rewards = null;
  if (ri >= 0) {
    if (b[ri].endsWith(']')) rewards = [b[ri]];
    else { let j = ri + 1; while (!/^\t\t\t\]$|^\t\t\t\}\]$/.test(b[j])) j++; rewards = b.slice(ri, j + 1); }
  }
  const ti = b.findIndex(l => l.startsWith('\t\t\ttasks: ['));
  let tasks = null;
  if (ti >= 0) { let j = ti; while (!/^\t\t\t\}?\]$/.test(b[j])) j++; tasks = b.slice(ti, j + 1); }
  old.set(key, { id: body.match(/^\t\t\tid: "(\w+)"/m)[1], rewards, tasks });
}

/* --- stable ids for new quests ------------------------------------------------- */
// ids used anywhere else in the book (this chapter excluded: its own ids are reused, never re-hashed)
const allText = fs.readdirSync(path.join(QDIR, 'chapters')).filter(f => f !== 'other.snbt')
  .map(f => fs.readFileSync(path.join(QDIR, 'chapters', f), 'utf8')).join('\n')
  + fs.readdirSync(path.join(QDIR, 'reward_tables')).map(f => fs.readFileSync(path.join(QDIR, 'reward_tables', f), 'utf8')).join('\n');
const newId = (seed) => {
  for (let n = 0; ; n++) {
    const h = crypto.createHash('sha1').update('pixelgo-creative:' + seed + (n ? ':' + n : '')).digest('hex').toUpperCase().slice(0, 16);
    const id = '01234567'[parseInt(h[0], 16) % 8] + h.slice(1);
    if (!allText.includes(id) && !ch.includes(id)) return id;
  }
};

/* --- build the quest list ------------------------------------------------------- */
const fmt = (n) => (Number.isInteger(n) ? n.toFixed(1) : String(n)) + 'd';
// `was`: the quest used to ask for another item -> keep its id, rewards and task id, swap the item
const oldOf = (q) => old.get(q.key) ?? (q.was && old.get(q.was) && { ...old.get(q.was), swap: true });
const idOf = new Map();
for (const q of ROWS) idOf.set(q.key, oldOf(q)?.id ?? newId('quest:' + q.key));
const missingOld = [...old.keys()].filter(k => !ROWS.some(q => q.key === k || q.was === k));
if (missingOld.length) { console.error('Existing quests not placed in ROWS: ' + missingOld.join(', ')); process.exit(1); }

const taskLines = (q, taskId) => {
  const [id, ball] = q.key.split('|');
  const item = ball ? `{ components: { "pixelmon:poke_ball": "${ball}" }, count: 1, id: "${id}" }` : `{ count: 1, id: "${id}" }`;
  return [
    '\t\t\ttasks: [{',
    `\t\t\t\tid: "${taskId ?? newId('task:' + q.key)}"`,
    `\t\t\t\titem: ${item}`,
    ...(ball ? ['\t\t\t\tmatch_components: "fuzzy"'] : []),
    '\t\t\t\ttype: "item"',
    '\t\t\t}]',
  ];
};
const rewardLines = (q) => [
  '\t\t\trewards: [{',
  `\t\t\t\tid: "${newId('reward:' + q.key)}"`,
  '\t\t\t\titem: {',
  '\t\t\t\t\tcomponents: {',
  '\t\t\t\t\t\t"treasurebags:bag_type": "pixelgo:tier4"',
  '\t\t\t\t\t}',
  '\t\t\t\t\tcount: 1',
  '\t\t\t\t\tid: "treasurebags:treasure_bag"',
  '\t\t\t\t}',
  '\t\t\t\ttype: "item"',
  '\t\t\t}]',
];
const out = [];
let created = 0;
for (const q of ROWS) {
  const o = oldOf(q);
  if (!o) created++;
  if (o?.swap) o.tasks = taskLines(q, o.tasks.join('\n').match(/id: "(\w{16})"/)[1]);
  for (const d of q.deps || []) if (!idOf.has(d)) throw new Error(`${q.key}: unknown dependency ${d}`);
  out.push('\t\t{');
  if (q.deps?.length) out.push(`\t\t\tdependencies: [${q.deps.map(d => `"${idOf.get(d)}"`).join(', ')}]`);
  out.push(`\t\t\tid: "${idOf.get(q.key)}"`);
  out.push(...(o?.rewards ?? rewardLines(q)));
  out.push(`\t\t\tshape: "${q.shape ?? 'rsquare'}"`);
  if (q.size) out.push(`\t\t\tsize: ${fmt(q.size)}`);
  out.push(...(o?.tasks ?? taskLines(q)));
  out.push(`\t\t\tx: ${fmt(q.x)}`, `\t\t\ty: ${fmt(q.y)}`);
  out.push('\t\t}');
}
const newCh = [...chLines.slice(0, qStart + 1), ...out, ...chLines.slice(qEnd)].join(EOLC);

/* --- texts into the lang file (same writer as projecte.mjs) ----------------------- */
const lang = fs.readFileSync(LANGF, 'utf8');
const EOL = lang.includes('\r\n') ? '\r\n' : '\n';
const lines = lang.split(/\r?\n/);
const head = lines[0];
const entries = [];
let i = 1;
for (; i < lines.length; i++) {
  const l = lines[i];
  if (l === '}') break;
  const m = l.match(/^\t([^\s:]+): /);
  if (!m) throw new Error(`unexpected lang line ${i + 1}: ${l}`);
  const body = [l];
  if (l.endsWith('[')) { while (lines[++i] !== '\t]') body.push(lines[i]); body.push(lines[i]); }
  entries.push({ key: m[1], body });
}
const tail = lines.slice(i);
const esc = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const map = new Map(entries.map(e => [e.key, e]));
let added = 0, changed = 0;
const put = (key, body) => {
  const o = map.get(key);
  if (o && o.body.join('\n') === body.join('\n')) return;
  if (o) { o.body = body; changed++; } else { const e = { key, body }; entries.push(e); map.set(key, e); added++; }
};
for (const q of ROWS) {
  if (q.keepText) continue;
  const id = idOf.get(q.key);
  put(`quest.${id}.title`, [`\tquest.${id}.title: "${esc(q.title)}"`]);
  put(`quest.${id}.quest_subtitle`, [`\tquest.${id}.quest_subtitle: "${esc(q.subtitle)}"`]);
  put(`quest.${id}.quest_desc`, q.desc.length === 1
    ? [`\tquest.${id}.quest_desc: ["${esc(q.desc[0])}"]`]
    : [`\tquest.${id}.quest_desc: [`, ...q.desc.map(s => `\t\t"${esc(s)}"`), '\t]']);
}
entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
const newLang = [head, ...entries.flatMap(e => e.body), ...tail].join(EOL);

const chChanged = newCh !== ch;
console.log(`Creative chapter: ${ROWS.length} quests (${created} new), chapter ${chChanged ? 'rewritten' : 'unchanged'}; lang ${added} keys added, ${changed} changed.`);
if (DRY) {
  for (const q of ROWS) console.log(`  ${old.has(q.key) ? 'keep' : oldOf(q) ? 'SWAP' : 'NEW '} ${idOf.get(q.key)}  (${q.x}, ${q.y})  ${q.key}${q.deps ? '  <- ' + q.deps.join(', ') : ''}`);
} else {
  if (chChanged) fs.writeFileSync(CHF, newCh);
  if (added || changed) fs.writeFileSync(LANGF, newLang);
  console.log('written.');
}
