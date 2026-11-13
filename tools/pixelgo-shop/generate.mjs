#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — Pokeblocks coins as sellable treasure
 * =============================================================================
 *  Adds pokeblocks:nickel / dime / poke_coin to the Relic Maniac's shop, the
 *  Pixelmon shopkeeper that already exists to buy treasure off players.
 *
 *  Sell-only (buyPrice 0), exactly like the relics next to them: the coins are
 *  loot, nothing in the pack consumes them, and letting players buy them back
 *  would turn PokeDollars into loot-table currency.
 *
 *    node tools/pixelgo-shop/generate.mjs --dry
 *    node tools/pixelgo-shop/generate.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');

const SHOP = path.join(
  ROOT, 'kubejs', 'data', 'pixelmon', 'pixelmon', 'npc', 'preset',
  'shopkeeper', 'utility', 'water', 'maniac_relic.json'
);

const ITEMS = new Set(
  fs.readFileSync(path.join(ROOT, 'tools', 'pixelgo-pixelloot', 'catalog-items.txt'), 'utf8')
    .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
);

/* Prices sit on the ladder this shop already uses, so they read naturally next
 * to the relics:
 *     relic_copper / pearl        20
 *     big_pearl                   80
 *     nugget / relic_silver      100   <- nickel
 *     pearl_string               200   <- dime
 *     big_nugget                 400
 *     relic_gold                 600   <- poke_coin
 *     relic_vase                1000
 *     relic_band                2000
 *     relic_statue              4000
 *     relic_crown               6000
 * A Poke Ball costs 1000 to buy, which is the scale to judge these against.
 * nickel : dime = 1 : 2, the ratio the real coins are named for.
 */
const COINS = [
  ['pokeblocks:nickel', 100],
  ['pokeblocks:dime', 200],
  ['pokeblocks:poke_coin', 600],
];

const problems = [];
for (const [id] of COINS) if (!ITEMS.has(id)) problems.push(`unknown item id "${id}"`);

const json = JSON.parse(fs.readFileSync(SHOP, 'utf8'));

/** every pixelmon:open_shop node in the preset (this one has a single one, but
 *  other presets carry one per NPC variant, so walk them all) */
const shops = [];
const walk = (o) => {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') {
    if (o.type === 'pixelmon:open_shop' && Array.isArray(o.items)) shops.push(o);
    Object.values(o).forEach(walk);
  }
};
walk(json);
if (!shops.length) problems.push('no pixelmon:open_shop node found in the preset');

let added = 0, already = 0;
for (const shop of shops) {
  for (const [id, sell] of COINS) {
    const hit = shop.items.find((e) => e.item && e.item.id === id);
    if (hit) {
      if (hit.sellPrice === sell && hit.buyPrice === 0) { already++; continue; }
      hit.buyPrice = 0; hit.sellPrice = sell; added++;   // repricing counts as a change
      continue;
    }
    // buyPrice and sellPrice are BOTH required by ShopItem.CODEC (fieldOf, not
    // optionalFieldOf); 0 is what makes it sell-only, since isPurchasable()
    // is simply buyPrice > 0.
    shop.items.push({ item: { id, count: 1 }, buyPrice: 0, sellPrice: sell });
    added++;
  }
}

const rel = path.relative(ROOT, SHOP).split(path.sep).join('/');
console.log(`shop: ${rel}`);
console.log(`  open_shop nodes : ${shops.length}`);
console.log(`  entries         : ${shops[0] ? shops[0].items.length : 0}`);
for (const [id, sell] of COINS) console.log(`  ${id.padEnd(24)} buy 0   sell ${String(sell).padStart(4)}`);
console.log(`  added/repriced  : ${added}   already correct: ${already}`);

if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S) — nothing written:`);
  for (const p of problems) console.log(`  ! ${p}`);
  process.exit(1);
}

if (DRY) console.log('\n--dry: no file written.');
else if (!added) console.log('\nnothing to do — already up to date.');
else {
  fs.writeFileSync(SHOP, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`\nwritten: ${rel}`);
}
