#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — Pokemon drops
 * =============================================================================
 *  Adds this pack's own items to kubejs/data/pixelmon/drops/:
 *    pokedrops.json       what a defeated Pokemon drops
 *    pokechestdrops.json  the four Poke Chest tiers
 *    raiddrops.json       raid rewards, by star level and type
 *
 *  Always rebuilt from the pristine snapshot in base/, so re-running never
 *  stacks entries and nothing that shipped with the pack is ever modified —
 *  only added to. Delete base/ after a Pixelmon update to re-snapshot.
 *
 *    node tools/pixelgo-drops/generate.mjs --dry
 *    node tools/pixelgo-drops/generate.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// les Poké Balls du loot deviennent des couvercles (2026-11-08), voir lids.mjs
import { toLids } from '../pixelgo-loot/lids.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(ROOT, 'kubejs', 'data', 'pixelmon', 'drops');
const BASE = path.join(HERE, 'base');
const DRY = process.argv.includes('--dry');

const SPECIES = JSON.parse(fs.readFileSync(path.join(HERE, 'catalog-species.json'), 'utf8'));
const catFile = path.join(ROOT, 'tools', 'pixelgo-pixelloot', 'catalog-items.txt');
const ITEMS = new Set(
  fs.readFileSync(catFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
);
const BALLS = new Set(
  fs.readFileSync(path.join(ROOT, 'tools', 'pixelgo-pixelloot', 'catalog-balls.txt'), 'utf8')
    .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
);

const problems = [];
const notes = [];

/* -- builders ------------------------------------------------------------- */

/** A drop line. `chance` is a probability 0..1, rolled per item independently. */
const D = (id, chance, min = 1, max = min) => {
  if (!ITEMS.has(id)) problems.push(`unknown item id "${id}"`);
  return { item: id, min, max, chance };
};

/** A Poke Ball drop: one item plus the pixelmon:poke_ball component. */
const DB = (variant, chance, min = 1, max = min) => {
  if (!BALLS.has(variant)) problems.push(`unknown ball variant "${variant}"`);
  return {
    item: { id: 'pixelmon:poke_ball', Count: 1, components: { 'pixelmon:poke_ball': variant } },
    min, max, chance,
  };
};

/** A new pokedrops entry. `spec` is a full PokemonSpecification: the species is
 *  mandatory (the registry rejects a spec without one), and every extra key is
 *  re-tested against the entity when the Pokemon dies, so minlvl / palette /
 *  isboss are real gates, not just species selectors. */
const entry = (spec, items) => {
  const name = spec.split(' ')[0];
  if (!SPECIES[name]) problems.push(`unknown species "${name}" in spec "${spec}"`);
  return { pokemon: spec, items };
};

const all = Object.entries(SPECIES);
const withTag = (t) => all.filter(([, s]) => s.tags.includes(t)).map(([n]) => n);
const named = (...names) => {
  for (const n of names) if (!SPECIES[n]) problems.push(`unknown species "${n}"`);
  return names.filter((n) => SPECIES[n]);
};

/* -- pokedrops: new entries ------------------------------------------------
 * Nothing that already ships is touched. getDropsForPokemon collects every
 * registered entry for a species, so these stack on top of the vanilla ones.
 */
const NEW_DROPS = [];
const groupCount = {};
const addGroup = (label, specs, items) => {
  groupCount[label] = specs.length;
  for (const s of specs) NEW_DROPS.push(entry(s, items));
};

// NO PIXELGO ITEMS (2026-11-08, on request): no `pixelgoitems:*` item is dropped by a
// Pokemon, a Poke Chest or a raid. Groups whose only drop was one of them are gone:
// fossils (random_fossil 5%), ditto lvl25+ (skin_swapper 2%), eeveelutions (skin_swapper 3%),
// lucky line (random_iv 5%), giants (size_randomizer 4%). Also removed: random_iv 5% from
// the lvl50+ pseudo-legendaries, random_ev 3% from the strong lvl55+ group, and the
// random_ev / random_iv / size_randomizer entries of the Poke Chests and raids.

// 2. The coin Pokemon pay in coins — Pay Day, Gimmighoul's hoard.
addGroup(
  'money',
  named('Meowth', 'Persian', 'Perrserker', 'Gimmighoul', 'Gholdengo'),
  [D('pokeblocks:nickel', 0.5, 1, 3), D('pokeblocks:dime', 0.2, 1, 2), D('pokeblocks:poke_coin', 0.05)]
);

// 6. Pseudo-legendaries, level 50+. BST >= 600 and not legendary — 12 species,
//    derived rather than listed, so a new generation is picked up automatically.
const PSEUDO = all.filter(([, s]) => s.bst >= 600 && !s.legendary).map(([n]) => n);
addGroup('pseudo-legendaries lvl50+', PSEUDO.map((n) => `${n} minlvl:50`), [
  D('pixelmon:gold_bottle_cap', 0.04),
  D('kubejs:red_ticket', 0.015),
]);

// 7. A shiny pseudo-legendary is about as rare as this pack gets outside a
//    dungeon, so it gets a prestige drop on top of everything else.
addGroup('shiny pseudo-legendaries', PSEUDO.map((n) => `${n} palette:shiny`), [
  D('kubejs:random_egg', 0.5),
  D('pixelmon:gold_bottle_cap', 0.35),
  D('kubejs:purple_ticket', 0.1),
]);

// 8. Anything strong and fully evolved, level 55+. Broad but level-gated, so it
//    only pays once a player is deep into the game.
const STRONG = all
  .filter(([n, s]) => s.bst >= 500 && !s.legendary && !s.evolves && !PSEUDO.includes(n))
  .map(([n]) => n);
addGroup('strong fully-evolved lvl55+', STRONG.map((n) => `${n} minlvl:55`), [
  DB('exp_xs_ball', 0.02),
]);

/* -- poke chests -----------------------------------------------------------
 * getTierNDrop picks ONE element uniformly at random from the list, so rarity
 * here is purely "how many entries out of how many". Adding N entries to a list
 * of L gives each of them 1/(L+N). That is why the top of the pack's ladder —
 * the SSR ticket and the prime balls — is not here at all: tier3 only holds 37
 * entries, so a single copy would be a 2.4% drop, ten times what the best
 * dungeon chest pays.
 */
const ball = (variant) => {
  if (!BALLS.has(variant)) problems.push(`unknown ball variant "${variant}"`);
  return { id: 'pixelmon:poke_ball', components: { 'pixelmon:poke_ball': variant } };
};
const plain = (id) => {
  if (!ITEMS.has(id)) problems.push(`unknown item id "${id}"`);
  return id;
};

const CHEST_ADD = {
  tier1: [
    plain('pokeblocks:nickel'), plain('pokeblocks:nickel'), plain('pokeblocks:dime'),
    ball('exp_xs_ball'),
  ],
  tier2: [
    plain('pokeblocks:poke_coin'), plain('pokeblocks:poke_coin'),
    plain('kubejs:random_egg'), plain('kubejs:light_gray_ticket'), ball('exp_s_ball'),
  ],
  tier3: [
    plain('pixelmon:gold_bottle_cap'), plain('kubejs:random_egg'),
    plain('kubejs:red_ticket'), ball('exp_m_ball'),
  ],
  ultraSpace: [
    plain('kubejs:purple_ticket'), plain('kubejs:mega_key'),
    plain('pixelmon:gold_bottle_cap'), plain('pixelmon:ability_patch'),
    ball('exp_l_ball'), ball('iv_hp_ball'),
  ],
};

/* -- raids -----------------------------------------------------------------
 * {star: {type: [{item, weight}]}}. Added to the `Any` list of each star, which
 * every raid of that level rolls alongside the matching type list.
 *
 * A raid does not roll once: config/pixelmon/drops.yml sets
 * den-star-drops: [2, 4, 6, 8, 10], so a 5-star raid hands out TEN items from a
 * combined pool of roughly 1170 weight. Weight 1 — the smallest there is —
 * therefore still lands 0.85% of the time per raid, and there is no way to go
 * below that without inflating the pool.
 *
 * That sets a hard floor, and raid dens respawn, so the top of the pack's
 * ladder is not here at all: no SSR ticket, no shiny swapper, no prime balls.
 * A mega key or an MK 5 ticket at 0.85% per 5-star raid is the ceiling.
 */
const RAID_ADD = {
  1: [D2('pokeblocks:nickel', 50), DB2('exp_xs_ball', 10)],
  2: [D2('pokeblocks:dime', 40), DB2('exp_s_ball', 8)],
  3: [D2('pokeblocks:poke_coin', 30), DB2('exp_m_ball', 6), D2('kubejs:random_egg', 5)],
  4: [DB2('exp_l_ball', 5), DB2('ev_hp_ball', 2), D2('kubejs:red_ticket', 3)],
  5: [DB2('exp_xl_ball', 4), DB2('iv_atk_ball', 1), D2('kubejs:mega_key', 1), D2('kubejs:purple_ticket', 1)],
};
/** drops per raid, from config/pixelmon/drops.yml den-star-drops */
const DEN_STAR_DROPS = { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 };
function D2(id, weight) {
  if (!ITEMS.has(id)) problems.push(`unknown item id "${id}" (raid)`);
  return { item: id, weight };
}
function DB2(variant, weight) {
  if (!BALLS.has(variant)) problems.push(`unknown ball variant "${variant}" (raid)`);
  return { item: `pixelmon:poke_ball`, weight, components: { 'pixelmon:poke_ball': variant } };
}

/* -- build ---------------------------------------------------------------- */
const readBase = (n) => JSON.parse(fs.readFileSync(path.join(BASE, n), 'utf8'));

// pokedrops
// Where a spec already exists, the new items are appended to that entry rather
// than pushed as a second one. Both would work — the registry keeps a Set of
// entries per species and rolls them all — but merging keeps one entry per spec
// and does not depend on PokemonDropInformation lacking equals().
const pokedrops = readBase('pokedrops.json');
const beforeDrops = pokedrops.length;
const bySpec = new Map(pokedrops.map((e) => [e.pokemon, e]));
let merged = 0;
for (const e of NEW_DROPS) {
  const hit = bySpec.get(e.pokemon);
  if (hit) { hit.items.push(...e.items); merged++; }
  else { pokedrops.push(e); bySpec.set(e.pokemon, e); }
}

// poke chests
const chests = readBase('pokechestdrops.json');
for (const [tier, add] of Object.entries(CHEST_ADD)) {
  if (!Array.isArray(chests[tier])) { problems.push(`poke chest tier "${tier}" missing from the base file`); continue; }
  chests[tier] = chests[tier].concat(add);
}

// raids — and the one genuine typo in the shipped data
const raids = readBase('raiddrops.json');
let typoFixed = 0;
for (const byType of Object.values(raids)) {
  for (const list of Object.values(byType)) {
    for (const d of list) {
      if (d.item === 'minecraft:dragons_breath') { d.item = 'minecraft:dragon_breath'; typoFixed++; }
    }
  }
}
for (const [star, add] of Object.entries(RAID_ADD)) {
  if (!raids[star] || !Array.isArray(raids[star].Any)) { problems.push(`raid star ${star} has no "Any" list`); continue; }
  raids[star].Any = raids[star].Any.concat(add);
}

/* -- report + checks ------------------------------------------------------ */
console.log('pokedrops');
for (const [k, v] of Object.entries(groupCount)) console.log(`  ${k.padEnd(28)} ${String(v).padStart(4)} species`);
console.log(`  ${'TOTAL drop lines added'.padEnd(28)} ${String(NEW_DROPS.length).padStart(4)}   (${merged} merged into an existing spec, ${NEW_DROPS.length - merged} new entries)`);
console.log(`  ${'file'.padEnd(28)} ${beforeDrops} -> ${pokedrops.length} entries`);

console.log('\npoke chests (uniform pick — odds are 1/list length)');
for (const [tier, add] of Object.entries(CHEST_ADD)) {
  const L = chests[tier].length;
  console.log(`  ${tier.padEnd(12)} ${String(L - add.length).padStart(3)} -> ${String(L).padStart(3)} entries   each added item ${(100 / L).toFixed(2)}%`);
}

console.log('\nraids — odds PER RAID, i.e. over all den-star-drops rolls');
for (const [star, add] of Object.entries(RAID_ADD)) {
  const anyW = raids[star].Any.reduce((s, d) => s + d.weight, 0);
  const types = Object.entries(raids[star]).filter(([t]) => t !== 'Any');
  const avgType = types.reduce((s, [, l]) => s + l.reduce((a, d) => a + d.weight, 0), 0) / types.length;
  const pool = anyW + avgType;
  const n = DEN_STAR_DROPS[star];
  const odds = (w) => (1 - Math.pow(1 - w / pool, n)) * 100;
  const line = add
    .map((d) => `${String(d.components ? Object.values(d.components)[0] : d.item).replace(/^\w+:/, '')} ${odds(d.weight).toFixed(2)}%`)
    .join('  ');
  console.log(`  star ${star} (${String(n).padStart(2)} drops, pool ~${pool.toFixed(0)}): ${line}`);
}
console.log(`\ntypo fixed: minecraft:dragons_breath -> minecraft:dragon_breath (${typoFixed} occurrences)`);

if (notes.length) { console.log('\nnotes:'); for (const n of [...new Set(notes)]) console.log(`  - ${n}`); }
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S) — nothing written:`);
  for (const p of [...new Set(problems)]) console.log(`  ! ${p}`);
  process.exit(1);
}
console.log('\nvalidation: every item id, ball variant and species resolved.');

if (DRY) {
  console.log('\n--dry: no file written.');
} else {
  fs.writeFileSync(path.join(OUT, 'pokedrops.json'), JSON.stringify((toLids(pokedrops), pokedrops), null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT, 'pokechestdrops.json'), JSON.stringify((toLids(chests), chests), null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT, 'raiddrops.json'), JSON.stringify((toLids(raids), raids), null, 2) + '\n', 'utf8');
  console.log(`\nwritten to ${path.relative(ROOT, OUT)}: pokedrops.json, pokechestdrops.json, raiddrops.json`);
}
