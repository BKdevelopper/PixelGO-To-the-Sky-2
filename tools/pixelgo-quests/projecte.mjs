#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — quest book: texts of the ProjectE chapter
 * =============================================================================
 *  The ProjectE chapter (chapters/projecte.snbt) is hand-made, it is not in
 *  content.mjs. This pass writes the title, subtitle and description of each
 *  of its quests into lang/en_us.snbt: what every item does, and the fact that
 *  EMC generation is disabled in this pack (2026-11-08: collectors and relays
 *  have no recipe and are hidden, Project Expansion was removed).
 *
 *  Quests are found by their task item (and, for the tier row, by y = -3), so
 *  ids are never hard-coded. No recipe in the text — JEI has them
 *  (see norecipes.mjs).
 *
 *  Idempotent: it overwrites its own keys and nothing else.
 *
 *    node tools/pixelgo-quests/projecte.mjs --dry
 *    node tools/pixelgo-quests/projecte.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');
const QDIR = path.join(ROOT, 'config', 'ftbquests', 'quests');
const CHF = path.join(QDIR, 'chapters', 'projecte.snbt');
const LANGF = path.join(QDIR, 'lang', 'en_us.snbt');

/* --- shared text ------------------------------------------------------------ */
const NO_EMC = [
  '&c&lEMC GENERATION IS DISABLED',
  '&7Nothing in this pack creates EMC out of thin air: the &fEnergy Collectors&7 and &fAnti-Matter Relays&7 have been removed, and so has Project Expansion. Every point of EMC you own comes from an item you burned yourself.',
  '&7Anything a shop buys - diamonds, crops, cobblestone... - is worth &f0 EMC&7 and cannot be burned.',
];

/* --- main line: by task item ------------------------------------------------- */
const MAIN = {
  'projecte:philosophers_stone': {
    title: '&d&lThe Philosopher\'s Stone',
    subtitle: '&7The key to the whole chapter',
    desc: [
      '&7The stone that opens &d&lProjectE&r&7. It is never used up: every recipe that needs it hands it back.',
      '&7It is one of the last items of the pack: it is made from the items of the &5&lCreative Items&r&7 chapter that need no ProjectE - see &6JEI&7.',
      '',
      '&e&lWHAT IT DOES',
      '&7- &fRight-click&7 a block to transmute it into its counterpart (stone, dirt, sand, logs...). &fSneak&7 for the alternate result.',
      '&7- the &fCharge&7 key widens the area, &fChange Mode&7 switches between cube, panel and line.',
      '&7- the &fExtra Function&7 key opens a crafting grid anywhere.',
      '&7- it steps the alchemical fuels up and down, and every machine of this chapter needs it somewhere upstream.',
      '',
      ...NO_EMC,
    ],
  },
  'projecte:transmutation_table': {
    title: '&d&lTransmutation Table',
    subtitle: '&7Burn an item, learn it, make it again',
    desc: [
      '&7Drop an item into the table to &fburn&7 it: it turns into &d&lEMC&r&7 and the table &flearns&7 it. From then on you can create that item for its EMC value, as often as your EMC allows.',
      '&7Your EMC and what you have learned belong to &fyou&7, not to the table: every table shows the same thing.',
      '&7A &b&lKlein Star&r&7 put in the table is filled from your EMC, so you can carry it around.',
      '',
      '&c&lNO FREE EMC',
      '&7EMC generation is disabled: collectors and relays have been removed. The table only moves value around - you have to burn items to make others.',
      '&7Items the shops buy are worth &f0 EMC&7.',
    ],
  },
  'projecte:alchemical_coal': {
    title: '&6&lAlchemical Coal',
    subtitle: '&7The first alchemical fuel',
    desc: [
      '&7A fuel that burns &f&l4 times&r&7 longer than coal, in anything that takes coal.',
      '&7First of the three alchemical fuels: &6Alchemical Coal&7, &6Mobius Fuel&7, &6Aeternalis Fuel&7. The Philosopher\'s Stone moves between them, up and down - see &6JEI&7.',
    ],
  },
  'projecte:mobius_fuel': {
    title: '&6&lMobius Fuel',
    subtitle: '&7The second fuel',
    desc: [
      '&7Burns &f&l16 times&r&7 longer than coal.',
      '&7The &b&lKlein Stars&r&7 are made from it, and it leads to Aeternalis Fuel.',
    ],
  },
  'projecte:aeternalis_fuel': {
    title: '&6&lAeternalis Fuel',
    subtitle: '&7The fuel of the matters',
    desc: [
      '&7Burns &f&l64 times&r&7 longer than coal: one piece runs a furnace for more than an hour.',
      '&7Every &5&lDark Matter&r&7 and &c&lRed Matter&r&7 is made with it - this is where alchemy really starts.',
    ],
  },
  'projecte:aeternalis_fuel_block': {
    title: '&6&lAeternalis Fuel Block',
    subtitle: '&7Nine fuels in one',
    desc: [
      '&7Compact storage for Aeternalis Fuel, and a fuel that lasts nine times as long. It turns back into nine fuels whenever you need them.',
    ],
  },
  'projecte:dark_matter': {
    title: '&5&lDark Matter',
    subtitle: '&7The first matter',
    desc: [
      '&7The base material of ProjectE\'s tools and machines.',
      '',
      '&e&lWHAT IT IS FOR',
      '&7- &5Dark Matter&7 tools: they never break, and charge up to work faster',
      '&7- &5Dark Matter&7 armor, the &5Dark Matter Furnace&7 and the &5Dark Matter Pedestal',
      '&7- &c&lRed Matter&r&7, the next tier',
      '&7- in this pack, the &fWaystone&7 and its scrolls',
    ],
  },
  'projecte:red_matter': {
    title: '&c&lRed Matter',
    subtitle: '&7The strongest ProjectE material',
    desc: [
      '&7Everything Dark Matter does, faster and wider: &cRed Matter&7 tools, armor that shrugs off nearly any hit, the &cRed Matter Furnace&7 and the &dEnergy Condenser MK2&7.',
      '&7In this pack its blocks also go into the &fPixelmonGo Pokéstop&7 and the &fEMC Singularity&7.',
    ],
  },
  'projecte:dm_pick': {
    title: '&5&lDark Matter Pickaxe',
    subtitle: '&7A pickaxe that never breaks',
    desc: [
      '&7No durability: it never wears out.',
      '&7- the &fCharge&7 key makes it dig faster.',
      '&7- &fChange Mode&7 mines a line of three blocks (tall, wide or deep) instead of one.',
      '&7- &fRight-click&7 an ore to mine the whole vein.',
    ],
  },
  'projecte:rm_pick': {
    title: '&c&lRed Matter Pickaxe',
    subtitle: '&7Faster, with more charge',
    desc: [
      '&7The same tricks as the Dark Matter Pickaxe - no durability, charge, three-block modes, vein mining - with a higher top speed and more charge levels.',
    ],
  },
  'projecte:dm_furnace': {
    title: '&5&lDark Matter Furnace',
    subtitle: '&7A furnace that does not wait',
    desc: [
      '&7Smelts far faster than a vanilla furnace and holds several stacks of input and output, so it can run on its own for a long time. Any furnace fuel works, and hoppers or pipes can feed it.',
    ],
  },
  'projecte:rm_furnace': {
    title: '&c&lRed Matter Furnace',
    subtitle: '&7The fastest furnace of ProjectE',
    desc: [
      '&7The Dark Matter Furnace pushed further: even faster, with even more slots.',
      '&7In this pack it also goes into the &dTransmutation Tablet&7, the &fMaster Ball Singularity&7 and the &8&lBlack Ticket&r&7.',
    ],
  },
};

/* --- ticket tiers (same order as TICKET_UPGRADES in 20_pixelmon.js) ---------- */
const TICKETS = [
  { id: 'gray', label: 'Gray', c: '&8', iv: 6, shiny: 1 },
  { id: 'red', label: 'Red', c: '&c', iv: 12, shiny: 2 },
  { id: 'magenta', label: 'Magenta', c: '&d', iv: 18, shiny: 3 },
  { id: 'pink', label: 'Pink', c: '&d', iv: 24, shiny: 4 },
  { id: 'purple', label: 'Purple', c: '&5', iv: 30, shiny: 5 },
  { id: 'blue', label: 'Blue', c: '&9', iv: 36, shiny: 6 },
  { id: 'cyan', label: 'Cyan', c: '&3', iv: 42, shiny: 7 },
  { id: 'light_blue', label: 'Light Blue', c: '&b', iv: 48, shiny: 8 },
  { id: 'green', label: 'Green', c: '&2', iv: 54, shiny: 9 },
  { id: 'lime', label: 'Lime', c: '&a', iv: 60, shiny: 10 },
  { id: 'yellow', label: 'Yellow', c: '&e', iv: 66, shiny: 11 },
  { id: 'orange', label: 'Orange', c: '&6', iv: 72, shiny: 12 },
  { id: 'brown', label: 'Brown', c: '&6', iv: 78, shiny: 13 },
  { id: 'white', label: 'White', c: '&f', iv: 84, shiny: 14 },
  { id: 'black', label: 'Black', c: '&8', iv: 90, shiny: 15 },
  { id: 'rainbow', label: 'Rainbow', c: '&d', iv: 100, shiny: 20, egg: 'Ultimate' },
];
const mk = i => i + 1;
const eggName = (t, i) => `${t.egg ?? t.label} Egg [MK ${mk(i)}]`;

/* --- tier row (y = -3), in order -------------------------------------------- */
const klein = (size, emc) => [
  `&7A &b&lKlein Star&r&7 - a portable EMC battery - of size &f${size}&7: it holds &f${emc}&7 EMC.`,
  '&7ProjectE tools, rings and amulets draw their EMC from the stars in your inventory. A star is filled from your own EMC in the Transmutation Table: with generation disabled, it only ever holds what you burned.',
];
const same = (name, c) => [`&7The same ${c}&l${name}&r&7 as on the main line. Here it is the step to the next ticket tier.`];
const TIERS = [
  ['projecte:alchemical_coal_block', '&6&lAlchemical Coal Block', ['&7Nine Alchemical Coals in one block: easy storage, and a fuel that lasts nine times as long.']],
  ['projecte:mobius_fuel_block', '&6&lMobius Fuel Block', ['&7Nine Mobius Fuels in one block: storage, and a long-lasting fuel.']],
  ['projecte:klein_star_ein', '&b&lKlein Star Ein', klein('Ein', '50 000')],
  ['projecte:dark_matter', '&5&lDark Matter', same('Dark Matter', '&5')],
  ['projecte:klein_star_zwei', '&b&lKlein Star Zwei', klein('Zwei', '200 000')],
  ['projecte:aeternalis_fuel_block', '&6&lAeternalis Fuel Block', same('Aeternalis Fuel Block', '&6')],
  ['projecte:red_matter', '&c&lRed Matter', same('Red Matter', '&c')],
  ['projecte:klein_star_drei', '&b&lKlein Star Drei', klein('Drei', '800 000')],
  ['projecte:dark_matter_block', '&5&lDark Matter Block', ['&7Nine Dark Matter in one block. It builds the Dark Matter Furnace, the Pedestal and the Energy Condenser MK2 - and, in this pack, the &fWaystone&7.']],
  ['projecte:klein_star_vier', '&b&lKlein Star Vier', klein('Vier', '3 200 000')],
  ['projecte:red_matter_block', '&c&lRed Matter Block', ['&7Nine Red Matter in one block. It goes into the Red Matter Furnace and the Energy Condenser MK2, and in this pack into the &fPixelmonGo Pokéstop&7 and the &fEMC Singularity&7.']],
  ['projecte:dm_pedestal', '&5&lDark Matter Pedestal', [
    '&7Put a ProjectE ring, band, stone or amulet on it, then &fright-click it with an empty hand&7: the item\'s power now works around the pedestal, without you wearing it.',
    '&7For example the &fHarvest Goddess Band&7 grows and harvests the crops nearby, the &fSoul Stone&7 heals you while you stand close, the &fIgnition Ring&7 sets nearby mobs on fire.',
  ]],
  ['projecte:klein_star_sphere', '&b&lKlein Star Sphere', klein('Sphere', '12 800 000')],
  ['projecte:condenser_mk2', '&d&lEnergy Condenser MK2', [
    '&7Put an item in the target slot and feed the condenser anything else: it burns what you give it into EMC and builds copies of the target. The MK2 keeps input and output apart, so hoppers or pipes can fill one side and empty the other.',
    '&c&lNo free EMC: &r&7with collectors and relays gone, a condenser only spends the value of the items you give it - it never creates any.',
  ]],
  ['projecte:rm_furnace', '&c&lRed Matter Furnace', same('Red Matter Furnace', '&c')],
  ['projecte:klein_star_omega', '&b&lKlein Star Omega', [
    ...klein('Omega', '51 200 000'),
    '&7Four Omegas also go into the &e&lSSR Ticket&r&7, which summons a legendary.',
  ]],
];

/* --- read the chapter ----------------------------------------------------------- */
const ch = fs.readFileSync(CHF, 'utf8');
const quests = [];
{
  const lines = ch.split(/\r?\n/);
  let cur = null, inQ = false;
  for (const l of lines) {
    if (/^\tquests: \[$/.test(l)) { inQ = true; continue; }
    if (!inQ) continue;
    if (/^\t\]$/.test(l)) break;
    if (l === '\t\t{') { cur = []; continue; }
    if (l === '\t\t}') {
      const b = cur.join('\n');
      quests.push({
        id: b.match(/^\t\t\tid: "(\w+)"/m)[1],
        item: b.slice(b.indexOf('\t\t\ttasks:')).match(/id: "([a-z0-9_]+:[a-z0-9_/]+)"/)?.[1],
        y: parseFloat(b.match(/^\t\t\ty: ([-\d.]+)d/m)?.[1] ?? '0'),
      });
      continue;
    }
    cur.push(l);
  }
}

const texts = new Map();   // quest id -> { title, subtitle, desc }
const missing = [];
for (const [item, t] of Object.entries(MAIN)) {
  const q = quests.find(q => q.item === item && q.y !== -3);
  if (q) texts.set(q.id, t); else missing.push(item);
}
TIERS.forEach(([item, title, desc], i) => {
  const q = quests.find(q => q.item === item && q.y === -3);
  if (!q) return missing.push(`${item} (tier row)`);
  const t = TICKETS[i];
  texts.set(q.id, {
    title,
    subtitle: `&7Tier ${mk(i)} &8- ${t.c}${t.label} Ticket`,
    desc: [...desc, '', `&7Unlocks the ${t.c}&l${t.label} Ticket&r&7 and the &f${eggName(t, i)}&7 - see &6JEI&7.`],
  });
});
{
  const q = quests.find(q => q.item === 'kubejs:light_gray_ticket');
  if (!q) missing.push('kubejs:light_gray_ticket');
  else texts.set(q.id, {
    title: '&7&lLight Gray Ticket',
    subtitle: '&7The base ticket &8- &7MK 0',
    desc: [
      '&7Right-click to summon a random &fnon-legendary&7 Pokémon next to you. The ticket is used up, and you can use one every &f60 s&7.',
      '&7MK 0 adds no bonus: any IVs, normal shiny odds.',
      '',
      '&e&lWHERE IT COMES FROM',
      '&7- one every &fhour of play&7, on its own',
      '&7- Poké Chests',
      '&7- the crafting table - see &6JEI&7',
      '',
      '&e&lTHE TIERS',
      '&7Each coloured ticket on this row is one tier up, &fMK 1&7 to &fMK 16&7: a higher minimum IV and a better shiny chance. The ProjectE item under each ticket is what unlocks its tier.',
      '&7The reward eggs follow the same tiers. A PixelmonGo egg hatches in an &fEgg Incubator&7 after &f5 000&7 blocks of walking.',
    ],
  });
}
TICKETS.forEach((t, i) => {
  const q = quests.find(q => q.item === `kubejs:${t.id}_ticket`);
  if (!q) return missing.push(`kubejs:${t.id}_ticket`);
  const ivText = t.iv === 100 ? '&f&lperfect IVs&r&7' : `at least &f&l${t.iv}%&r&7 IVs`;
  texts.set(q.id, {
    title: `${t.c}&l${t.label} Ticket`,
    subtitle: `&7MK ${mk(i)} &8- &7min IV &f${t.iv}%&7, shiny &f${t.shiny}%`,
    desc: [
      `&7Right-click to summon a random &fnon-legendary&7 Pokémon with ${ivText} and a &f&l${t.shiny}%&r&7 shiny chance. One ticket every &f60 s&7.`,
      `&7Its tier is unlocked by the ProjectE quest just below. The reward, the &f${eggName(t, i)}&7, has the same odds and hatches by walking.`,
    ],
  });
});
if (missing.length) { console.error('Quests not found:\n  ' + missing.join('\n  ')); process.exit(1); }
const covered = new Set(texts.keys());
const uncovered = quests.filter(q => !covered.has(q.id));
if (uncovered.length) console.warn('Quests left without text: ' + uncovered.map(q => `${q.id} (${q.item})`).join(', '));

/* --- write into the lang file ------------------------------------------------------- */
const lang = fs.readFileSync(LANGF, 'utf8');
const EOL = lang.includes('\r\n') ? '\r\n' : '\n';
const lines = lang.split(/\r?\n/);
// entries at depth 1: '\t<key>: <value>' (value may span lines up to '\t]')
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
  const old = map.get(key);
  if (old && old.body.join('\n') === body.join('\n')) return;
  if (old) { old.body = body; changed++; } else { const e = { key, body }; entries.push(e); map.set(key, e); added++; }
};
for (const [id, t] of texts) {
  put(`quest.${id}.title`, [`\tquest.${id}.title: "${esc(t.title)}"`]);
  put(`quest.${id}.quest_subtitle`, [`\tquest.${id}.quest_subtitle: "${esc(t.subtitle)}"`]);
  put(`quest.${id}.quest_desc`, t.desc.length === 1
    ? [`\tquest.${id}.quest_desc: ["${esc(t.desc[0])}"]`]
    : [`\tquest.${id}.quest_desc: [`, ...t.desc.map(s => `\t\t"${esc(s)}"`), '\t]']);
}
// FTB keeps the file sorted by key; keep it that way.
entries.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
const out = [head, ...entries.flatMap(e => e.body), ...tail].join(EOL);

console.log(`ProjectE chapter: ${texts.size} quests with text, ${added} keys added, ${changed} changed.`);
if (DRY) {
  const [id, t] = [...texts][0];
  console.log(`\nexample (${id}):\n  ${t.title}\n  ${t.subtitle}\n  ` + t.desc.join('\n  '));
} else if (added || changed) {
  fs.writeFileSync(LANGF, out);
  console.log('written.');
}
