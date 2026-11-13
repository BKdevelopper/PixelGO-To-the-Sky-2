#!/usr/bin/env node
/* =============================================================================
 *  PixelLoot — event reward tables for "PixelGO To the sky 2.0"
 * =============================================================================
 *  Rewrites config/pixelloot/events/*.yml.
 *
 *  Everything this script emits is checked against catalog-items.txt and
 *  catalog-balls.txt first; an unknown id is a hard failure, never a silent
 *  substitution. See README.md for how those catalogues are built and why the
 *  Pixelmon language file must not be used for the job.
 *
 *    node tools/pixelgo-pixelloot/generate.mjs --dry   report only
 *    node tools/pixelgo-pixelloot/generate.mjs         write
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(ROOT, 'config', 'pixelloot', 'events');
const DRY = process.argv.includes('--dry');

const readCat = (f) =>
  new Set(
    fs
      .readFileSync(path.join(HERE, f), 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  );

const ITEMS = readCat('catalog-items.txt');
const BALLS = readCat('catalog-balls.txt');
const SPECIES = JSON.parse(fs.readFileSync(path.join(HERE, 'catalog-species.json'), 'utf8'));

const problems = [];
const notes = [];

/* -- reward builders -------------------------------------------------------
 * `v` is a coarse value rank 0..9 used only by the monotonicity check at the
 * end; it never reaches the config file.
 */

/** A plain item reward. */
const I = (id, n, name, w, v) => {
  if (!ITEMS.has(id)) problems.push(`unknown item id "${id}" (reward "${name}")`);
  return { name, w, v, cmd: `give %player% ${id} ${n}` };
};

/** A Poke Ball reward. In Pixelmon 9.x every variant is ONE item plus the
 *  pixelmon:poke_ball data component — pixelmon:great_ball does not exist. */
const B = (variant, n, name, w, v) => {
  if (!BALLS.has(variant)) problems.push(`unknown ball variant "${variant}" (reward "${name}")`);
  return {
    name,
    w,
    v,
    cmd: `give %player% pixelmon:poke_ball[pixelmon:poke_ball="${variant}"] ${n}`,
  };
};

const px = (s) => `pixelmon:${s}`;
const kj = (s) => `kubejs:${s}`;

/* -- content ---------------------------------------------------------------
 * Weights are per pool and always add up to 100, so `chance` reads as a
 * percentage even though PixelLoot treats it as a weight (see README).
 */

// ---------------------------------------------------------------- KILL ----
// Beating a wild Pokemon: the most frequent event by far. Consumables that
// feed straight back into the next battle, plus the sieve metals that are
// actually scarce on a skyblock.
const KILL = [
  [1, 15, [
    B('poke_ball', 4, '&fPoke Ball x4', 22, 1),
    I(px('xs_exp_candy'), 3, '&bXS Exp. Candy x3', 16, 1),
    I(px('potion'), 2, '&dPotion x2', 13, 1),
    I(px('oran_berry'), 4, '&aOran Berry x4', 11, 1),
    I('pokeblocks:nickel', 3, '&7Nickel x3', 9, 1),
    I(px('aluminum_ingot'), 2, '&7Aluminum Ingot x2', 8, 1),
    I(px('red_apricorn'), 3, '&cRed Apricorn x3', 7, 1),
    I(px('leppa_berry'), 2, '&2Leppa Berry x2', 6, 1),
    B('great_ball', 2, '&9Great Ball x2', 5, 2),
    I(px('exp_share'), 1, '&6Exp. Share', 3, 3),
  ]],
  [16, 30, [
    B('great_ball', 4, '&9Great Ball x4', 20, 2),
    I(px('s_exp_candy'), 3, '&bS Exp. Candy x3', 16, 2),
    I(px('super_potion'), 2, '&dSuper Potion x2', 13, 2),
    I(px('sitrus_berry'), 3, '&aSitrus Berry x3', 11, 2),
    I('pokeblocks:dime', 3, '&7Dime x3', 9, 2),
    I(px('silver_ingot'), 2, '&7Silver Ingot x2', 8, 2),
    I(px('revive'), 1, '&2Revive', 7, 2),
    I(px('black_apricorn'), 3, '&8Black Apricorn x3', 6, 2),
    B('ultra_ball', 2, '&5Ultra Ball x2', 5, 3),
    I(px('lucky_egg'), 1, '&6Lucky Egg', 3, 4),
    I('pixelgoitems:random_ev', 1, '&3Random EV', 2, 4),
  ]],
  [31, 50, [
    B('ultra_ball', 4, '&5Ultra Ball x4', 18, 3),
    I(px('m_exp_candy'), 3, '&bM Exp. Candy x3', 15, 3),
    I(px('hyper_potion'), 2, '&dHyper Potion x2', 12, 3),
    I('pokeblocks:poke_coin', 2, '&6Poke Coin x2', 10, 3),
    I(px('platinum_ingot'), 2, '&7Platinum Ingot x2', 9, 3),
    I(px('max_revive'), 1, '&2Max Revive', 8, 3),
    I(px('leftovers'), 1, '&6Leftovers', 7, 4),
    I(px('pp_up'), 1, '&aPP Up', 6, 4),
    B('exp_xs_ball', 2, '&eEXP XS Ball x2', 5, 4),
    I(px('rare_candy'), 2, '&dRare Candy x2', 4, 4),
    I('pixelgoitems:random_ev', 1, '&3Random EV', 3, 4),
    B('dusk_ball', 3, '&5Dusk Ball x3', 3, 3),
  ]],
  [51, 100, [
    I(px('l_exp_candy'), 3, '&bL Exp. Candy x3', 16, 4),
    I(px('rare_candy'), 3, '&dRare Candy x3', 13, 4),
    B('ultra_ball', 6, '&5Ultra Ball x6', 14, 4),
    I(px('hp_up'), 2, '&6HP Up x2', 8, 4),
    I(px('protein'), 2, '&6Protein x2', 7, 4),
    I(px('carbos'), 2, '&6Carbos x2', 7, 4),
    I(px('full_restore'), 2, '&2Full Restore x2', 8, 4),
    B('exp_s_ball', 2, '&eEXP S Ball x2', 7, 5),
    I('pixelgoitems:random_iv', 1, '&3Random IV', 6, 5),
    I(px('pp_max'), 1, '&aPP Max', 5, 5),
    I(px('assault_vest'), 1, '&dAssault Vest', 4, 5),
    I(kj('light_gray_ticket'), 1, '&7Light Gray Ticket [MK 0]', 3, 5),
    I(px('gold_bottle_cap'), 1, '&6Gold Bottle Cap', 2, 6),
  ]],
];

// ------------------------------------------------------------- CAPTURE ----
// Filling the dex. Pays mostly in balls, so catching funds more catching,
// and opens the pack's own summon-ticket ladder at the top.
const CAPTURE = [
  [1, 15, [
    B('poke_ball', 5, '&fPoke Ball x5', 26, 1),
    B('great_ball', 3, '&9Great Ball x3', 18, 2),
    I(px('yellow_apricorn'), 4, '&eYellow Apricorn x4', 14, 1),
    I(px('xs_exp_candy'), 4, '&bXS Exp. Candy x4', 12, 1),
    I(px('aluminum_ingot'), 3, '&7Aluminum Ingot x3', 10, 1),
    B('heal_ball', 3, '&dHeal Ball x3', 8, 1),
    I(px('potion'), 3, '&dPotion x3', 6, 1),
    B('net_ball', 2, '&2Net Ball x2', 4, 2),
    B('ultra_ball', 1, '&5Ultra Ball', 2, 3),
  ]],
  [16, 30, [
    B('great_ball', 5, '&9Great Ball x5', 22, 2),
    B('ultra_ball', 3, '&5Ultra Ball x3', 16, 3),
    I(px('s_exp_candy'), 4, '&bS Exp. Candy x4', 13, 2),
    B('timer_ball', 3, '&eTimer Ball x3', 11, 2),
    B('repeat_ball', 3, '&2Repeat Ball x3', 9, 2),
    I(px('silver_ingot'), 3, '&7Silver Ingot x3', 8, 2),
    I(px('sitrus_berry'), 4, '&aSitrus Berry x4', 7, 2),
    I(px('soothe_bell'), 1, '&6Soothe Bell', 6, 3),
    B('dusk_ball', 3, '&5Dusk Ball x3', 4, 3),
    I(px('ever_stone'), 1, '&7Ever Stone', 3, 3),
    B('quick_ball', 2, '&bQuick Ball x2', 1, 3),
  ]],
  [31, 50, [
    B('ultra_ball', 5, '&5Ultra Ball x5', 20, 3),
    I(px('m_exp_candy'), 4, '&bM Exp. Candy x4', 14, 3),
    B('quick_ball', 4, '&bQuick Ball x4', 12, 3),
    B('dusk_ball', 4, '&5Dusk Ball x4', 10, 3),
    B('luxury_ball', 3, '&6Luxury Ball x3', 9, 3),
    I('pokeblocks:poke_coin', 3, '&6Poke Coin x3', 8, 3),
    I(px('destiny_knot'), 1, '&dDestiny Knot', 7, 4),
    I(kj('random_egg'), 1, '&aRandom Egg', 6, 5),
    B('exp_xs_ball', 2, '&eEXP XS Ball x2', 5, 4),
    B('dive_ball', 4, '&3Dive Ball x4', 4, 3),
    I(kj('gray_ticket'), 1, '&8Gray Ticket [MK 1]', 3, 5),
    I(px('amulet_coin'), 1, '&6Amulet Coin', 2, 4),
  ]],
  [51, 100, [
    B('ultra_ball', 8, '&5Ultra Ball x8', 16, 4),
    I(px('l_exp_candy'), 4, '&bL Exp. Candy x4', 13, 4),
    B('exp_s_ball', 3, '&eEXP S Ball x3', 11, 5),
    B('level_ball', 4, '&aLevel Ball x4', 10, 4),
    B('repeat_ball', 6, '&2Repeat Ball x6', 9, 4),
    I(kj('random_egg'), 2, '&aRandom Egg x2', 8, 6),
    I(px('eviolite'), 1, '&2Eviolite', 7, 5),
    B('ev_hp_ball', 2, '&dEV HP Ball x2', 6, 6),
    I(kj('red_ticket'), 1, '&cRed Ticket [MK 2]', 5, 6),
    B('iv_hp_ball', 1, '&9IV HP Ball', 4, 6),
    I(px('gold_bottle_cap'), 1, '&6Gold Bottle Cap', 4, 6),
    I(px('ability_capsule'), 1, '&3Ability Capsule', 3, 5),
    B('dream_ball', 3, '&dDream Ball x3', 2, 5),
    I(kj('mega_key'), 1, '&5Mega Key', 2, 7),
  ]],
];

// ------------------------------------------------------------- TRAINER ----
// NPC trainers are finite content, so they pay in progression items:
// evolution stones, vitamins, competitive gear, and cosmetic trainer kit.
const TRAINER = [
  [1, 15, [
    B('poke_ball', 6, '&fPoke Ball x6', 22, 1),
    I(px('xs_exp_candy'), 5, '&bXS Exp. Candy x5', 16, 1),
    I(px('aluminum_ingot'), 4, '&7Aluminum Ingot x4', 13, 1),
    I(px('potion'), 4, '&dPotion x4', 11, 1),
    I('pokeblocks:nickel', 6, '&7Nickel x6', 10, 1),
    I(px('oran_berry'), 6, '&aOran Berry x6', 9, 1),
    I(px('revive'), 2, '&2Revive x2', 5, 2),
    I(px('fire_stone'), 1, '&cFire Stone', 4, 3),
    I(px('water_stone'), 1, '&9Water Stone', 4, 3),
    I(px('thunder_stone'), 1, '&eThunder Stone', 3, 3),
    I(px('exp_share'), 1, '&6Exp. Share', 3, 3),
  ]],
  [16, 30, [
    B('great_ball', 6, '&9Great Ball x6', 19, 2),
    I(px('s_exp_candy'), 5, '&bS Exp. Candy x5', 15, 2),
    I(px('silver_ingot'), 4, '&7Silver Ingot x4', 12, 2),
    I('pokeblocks:dime', 6, '&7Dime x6', 10, 2),
    I(px('super_potion'), 4, '&dSuper Potion x4', 8, 2),
    I(px('muscle_band'), 1, '&6Muscle Band', 7, 4),
    I(px('hp_up'), 1, '&6HP Up', 6, 3),
    B('ultra_ball', 3, '&5Ultra Ball x3', 5, 3),
    I(px('leaf_stone'), 1, '&2Leaf Stone', 5, 3),
    I(px('moon_stone'), 1, '&fMoon Stone', 5, 3),
    I(px('sun_stone'), 1, '&6Sun Stone', 4, 3),
    I(px('charcoal'), 1, '&8Charcoal', 4, 3),
  ]],
  [31, 50, [
    B('ultra_ball', 5, '&5Ultra Ball x5', 16, 3),
    I(px('m_exp_candy'), 5, '&bM Exp. Candy x5', 13, 3),
    I(px('platinum_ingot'), 4, '&7Platinum Ingot x4', 11, 3),
    I('pokeblocks:poke_coin', 5, '&6Poke Coin x5', 9, 3),
    I(px('leftovers'), 1, '&6Leftovers', 8, 4),
    I(px('shiny_stone'), 1, '&dShiny Stone', 7, 4),
    I(px('dusk_stone'), 1, '&5Dusk Stone', 6, 4),
    I(px('dawn_stone'), 1, '&eDawn Stone', 6, 4),
    I(px('ice_stone'), 1, '&bIce Stone', 5, 4),
    I(px('protein'), 2, '&6Protein x2', 5, 4),
    I(px('choice_scarf'), 1, '&3Choice Scarf', 4, 5),
    I(px('focus_sash'), 1, '&9Focus Sash', 4, 5),
    I('weavers_cosmetics_cosplay:pokemaniac_pikachu_helmet', 1, '&ePokemaniac Pikachu Cap', 3, 5),
    B('exp_m_ball', 1, '&eEXP M Ball', 3, 5),
  ]],
  [51, 100, [
    I(px('l_exp_candy'), 5, '&bL Exp. Candy x5', 13, 4),
    I(px('rare_candy'), 4, '&dRare Candy x4', 11, 4),
    B('ultra_ball', 10, '&5Ultra Ball x10', 9, 4),
    I(px('assault_vest'), 1, '&6Assault Vest', 8, 5),
    I(px('choice_band'), 1, '&3Choice Band', 7, 5),
    I(px('choice_specs'), 1, '&dChoice Specs', 7, 5),
    I(px('life_orb'), 1, '&cLife Orb', 6, 5),
    B('ev_atk_ball', 1, '&aEV Atk Ball', 6, 6),
    I(px('ability_patch'), 1, '&2Ability Patch', 5, 6),
    I(px('gold_bottle_cap'), 2, '&6Gold Bottle Cap x2', 5, 6),
    I('weavers_cosmetics_cosplay:pkmn_trainer_red_helmet', 1, '&cTrainer Cap (Red)', 5, 5),
    B('exp_l_ball', 1, '&eEXP L Ball', 4, 6),
    I(kj('red_ticket'), 1, '&cRed Ticket [MK 2]', 4, 6),
    I('pixelgoitems:random_iv', 1, '&3Random IV', 4, 5),
    I(kj('purple_ticket'), 1, '&5Purple Ticket [MK 5]', 3, 7),
    I(kj('mega_key'), 1, '&5Mega Key', 3, 7),
  ]],
];

// --------------------------------------------------------------- SHINY ----
// A shiny is a 1-in-4096 moment, so this event always pays (chance 100).
const SHINY = [
  [1, 15, [
    I(px('rare_candy'), 5, '&dRare Candy x5', 26, 4),
    B('ultra_ball', 5, '&5Ultra Ball x5', 20, 3),
    I(px('m_exp_candy'), 5, '&bM Exp. Candy x5', 16, 3),
    I(px('sitrus_berry'), 8, '&aSitrus Berry x8', 12, 2),
    B('luxury_ball', 3, '&6Luxury Ball x3', 10, 3),
    I(px('soothe_bell'), 1, '&6Soothe Bell', 8, 3),
    I('pixelgoitems:random_level', 1, '&3Random Level', 5, 5),
    I(kj('gray_ticket'), 1, '&8Gray Ticket [MK 1]', 3, 5),
  ]],
  [16, 30, [
    I(px('rare_candy'), 8, '&dRare Candy x8', 22, 4),
    I(px('l_exp_candy'), 5, '&bL Exp. Candy x5', 17, 4),
    B('ultra_ball', 8, '&5Ultra Ball x8', 14, 4),
    B('cherish_ball', 2, '&cCherish Ball x2', 11, 5),
    I('pixelgoitems:skin_swapper', 1, '&6Skin Swapper', 9, 6),
    B('ev_spd_ball', 1, '&aEV Speed Ball', 8, 6),
    I('pixelgoitems:size_randomizer', 1, '&3Size Randomizer', 7, 5),
    I(kj('red_ticket'), 1, '&cRed Ticket [MK 2]', 6, 6),
    I(px('gold_bottle_cap'), 1, '&6Gold Bottle Cap', 4, 6),
    I(kj('magenta_ticket'), 1, '&dMagenta Ticket [MK 3]', 2, 6),
  ]],
  [31, 50, [
    I(px('rare_candy'), 12, '&dRare Candy x12', 18, 5),
    I(px('xl_exp_candy'), 3, '&bXL Exp. Candy x3', 14, 5),
    B('cherish_ball', 3, '&cCherish Ball x3', 12, 5),
    I('pixelgoitems:skin_swapper', 2, '&6Skin Swapper x2', 10, 6),
    B('iv_spatk_ball', 1, '&9IV Sp. Atk Ball', 9, 6),
    I(kj('purple_ticket'), 1, '&5Purple Ticket [MK 5]', 8, 7),
    I(px('ability_patch'), 1, '&2Ability Patch', 7, 6),
    I(kj('mega_key'), 1, '&5Mega Key', 6, 7),
    I(px('gold_bottle_cap'), 3, '&6Gold Bottle Cap x3', 5, 6),
    I('pixelgoitems:random_iv', 2, '&3Random IV x2', 4, 6),
    I('weavers_cosmetics_cosplay:pokemaniac_pikachu_shiny_helmet', 1, '&ePokemaniac Shiny Pikachu Cap', 4, 6),
    I(kj('blue_ticket'), 1, '&9Blue Ticket [MK 6]', 3, 7),
  ]],
  [51, 100, [
    I(px('rare_candy'), 16, '&dRare Candy x16', 15, 5),
    I(px('xl_exp_candy'), 5, '&bXL Exp. Candy x5', 12, 6),
    I('pixelgoitems:shiny_swapper', 1, '&6Shiny Swapper', 11, 8),
    I(kj('cyan_ticket'), 1, '&bCyan Ticket [MK 7]', 10, 7),
    B('iv_all_ball', 1, '&9IV ALL Ball', 9, 8),
    I(kj('mega_key'), 2, '&5Mega Key x2', 8, 7),
    I(kj('green_ticket'), 1, '&2Green Ticket [MK 9]', 7, 8),
    I(px('gold_bottle_cap'), 5, '&6Gold Bottle Cap x5', 6, 7),
    B('shiny_ball', 1, '&dShiny Ball', 5, 8),
    I(px('ability_patch'), 2, '&2Ability Patch x2', 5, 7),
    I(kj('lime_ticket'), 1, '&aLime Ticket [MK 10]', 4, 8),
    I('pokemon_armor:gyarados_helmet', 1, '&3Gyarados Helmet', 4, 7),
    I(kj('ssr_ticket'), 1, '&cSSR Ticket', 3, 9),
    B('master_ball', 1, '&5Master Ball', 1, 9),
  ]],
];

// ----------------------------------------------------------- LEGENDARY ----
// The single rarest thing a player can do. Always pays, and pays big.
const LEGENDARY = [
  I(px('xl_exp_candy'), 10, '&bXL Exp. Candy x10', 18, 7),
  B('master_ball', 1, '&5Master Ball', 14, 9),
  I('pixelgoitems:shiny_swapper', 2, '&6Shiny Swapper x2', 12, 9),
  B('iv_all_ball', 1, '&9IV ALL Ball', 10, 8),
  I(kj('ssr_ticket'), 1, '&cSSR Ticket', 9, 9),
  I(kj('rainbow_ticket'), 1, '&dRainbow Ticket [MK 16]', 8, 9),
  I(kj('mega_key'), 3, '&5Mega Key x3', 7, 8),
  I(kj('black_ticket'), 1, '&8Black Ticket [MK 15]', 6, 9),
  I('pokemon_armor:charizard_chestplate', 1, '&6Charizard Chestplate', 5, 8),
  I(px('gold_bottle_cap'), 10, '&6Gold Bottle Cap x10', 4, 8),
  I('pokemon_armor:groudon_helmet', 1, '&cGroudon Helmet', 3, 8),
  B('shiny_ball', 2, '&dShiny Ball x2', 2, 9),
  I('pokemon_armor:charizard_shiny_helmet', 1, '&eShiny Charizard Helmet', 2, 9),
];

// ---------------------------------------------------------------- RAID ----
// Raids cost a pass to enter, so the table is built to refund the loop.
const RAID = [
  I('pokeblocks:raid_pass', 1, '&bRaid Pass', 22, 5),
  I(px('rare_candy'), 6, '&dRare Candy x6', 16, 5),
  B('ultra_ball', 6, '&5Ultra Ball x6', 13, 4),
  I('pokeblocks:raid_voucher', 1, '&6Raid Voucher', 11, 6),
  I(px('l_exp_candy'), 5, '&bL Exp. Candy x5', 9, 5),
  B('ev_def_ball', 1, '&aEV Def Ball', 8, 6),
  I('pokeblocks:radiant_voucher', 1, '&dRadiant Voucher', 6, 7),
  I(px('gold_bottle_cap'), 2, '&6Gold Bottle Cap x2', 5, 6),
  I(kj('pink_ticket'), 1, '&dPink Ticket [MK 4]', 4, 6),
  B('iv_spd_ball', 1, '&9IV Speed Ball', 3, 7),
  I(kj('mega_key'), 1, '&5Mega Key', 2, 7),
  I(kj('cyan_ticket'), 1, '&bCyan Ticket [MK 7]', 1, 8),
];

// ---------------------------------------------------------------- BOSS ----
// Ranked by the tier's own data (extraLevels / spawn weight / mega / palette)
// in data/pixelmon/bosstiers/*.json, NOT by the order of the default config,
// which pays `equal` more than `common` and `ultimate` less than `epic`.
//
//   equal 0lvl < haunted +3 < common +5 < uncommon +10
//   < rare +20 = drowned +20 < epic +30 mega < legendary +40 mega/shiny
//   < ultimate +50 mega/shiny, spawn weight 1
const BOSS = {
  equal: [
    B('poke_ball', 8, '&fPoke Ball x8', 30, 1),
    I(px('xs_exp_candy'), 5, '&bXS Exp. Candy x5', 22, 1),
    I(px('oran_berry'), 6, '&aOran Berry x6', 16, 1),
    I('pokeblocks:nickel', 8, '&7Nickel x8', 12, 1),
    I(px('potion'), 4, '&dPotion x4', 10, 1),
    B('great_ball', 3, '&9Great Ball x3', 6, 2),
    I(px('revive'), 2, '&2Revive x2', 4, 2),
  ],
  haunted: [
    I(px('spell_tag'), 1, '&5Spell Tag', 24, 3),
    I(px('s_exp_candy'), 5, '&bS Exp. Candy x5', 19, 2),
    B('dusk_ball', 4, '&8Dusk Ball x4', 15, 3),
    I(px('reaper_cloth'), 1, '&5Reaper Cloth', 12, 3),
    I(px('dusk_stone'), 1, '&5Dusk Stone', 10, 3),
    I(px('lum_berry'), 4, '&2Lum Berry x4', 8, 2),
    I('pokeblocks:dime', 8, '&7Dime x8', 6, 2),
    I('weavers_cosmetics_cosplay:pokemaniac_gengar_helmet', 1, '&5Pokemaniac Gengar Mask', 4, 5),
    I(px('ghostium_z'), 1, '&5Ghostium Z', 2, 6),
  ],
  common: [
    B('great_ball', 6, '&9Great Ball x6', 26, 2),
    I(px('s_exp_candy'), 6, '&bS Exp. Candy x6', 18, 2),
    I(px('silver_ingot'), 4, '&7Silver Ingot x4', 14, 2),
    I(px('super_potion'), 4, '&dSuper Potion x4', 12, 2),
    I(px('sitrus_berry'), 5, '&aSitrus Berry x5', 10, 2),
    I('pokeblocks:dime', 6, '&7Dime x6', 8, 2),
    I(px('revive'), 3, '&2Revive x3', 6, 2),
    I(px('exp_share'), 1, '&6Exp. Share', 4, 3),
    B('ultra_ball', 2, '&5Ultra Ball x2', 2, 3),
  ],
  uncommon: [
    B('ultra_ball', 4, '&5Ultra Ball x4', 22, 3),
    I(px('m_exp_candy'), 5, '&bM Exp. Candy x5', 17, 3),
    I(px('platinum_ingot'), 3, '&7Platinum Ingot x3', 13, 3),
    I(px('muscle_band'), 1, '&6Muscle Band', 11, 4),
    I(px('hyper_potion'), 4, '&dHyper Potion x4', 9, 3),
    I(px('hp_up'), 2, '&6HP Up x2', 8, 3),
    B('exp_xs_ball', 2, '&eEXP XS Ball x2', 7, 4),
    I(px('max_revive'), 1, '&2Max Revive', 5, 3),
    I('pixelgoitems:random_ev', 1, '&3Random EV', 4, 4),
    I(px('leftovers'), 1, '&6Leftovers', 4, 4),
  ],
  drowned: [
    I(px('mystic_water'), 1, '&3Mystic Water', 22, 4),
    B('dive_ball', 5, '&9Dive Ball x5', 17, 3),
    I(px('deep_sea_tooth'), 1, '&bDeep Sea Tooth', 14, 4),
    I(px('deep_sea_scale'), 1, '&3Deep Sea Scale', 12, 4),
    I(px('prism_scale'), 1, '&ePrism Scale', 10, 4),
    I(px('l_exp_candy'), 4, '&bL Exp. Candy x4', 8, 4),
    I('minecraft:heart_of_the_sea', 1, '&2Heart of the Sea', 7, 5),
    I(px('waterium_z'), 1, '&9Waterium Z', 5, 6),
    B('lure_ball', 4, '&6Lure Ball x4', 3, 4),
    I(kj('blue_ticket'), 1, '&9Blue Ticket [MK 6]', 2, 7),
  ],
  rare: [
    B('ultra_ball', 6, '&5Ultra Ball x6', 19, 4),
    I(px('l_exp_candy'), 5, '&bL Exp. Candy x5', 15, 4),
    I(px('focus_sash'), 1, '&6Focus Sash', 12, 5),
    I(px('rare_candy'), 4, '&dRare Candy x4', 10, 4),
    I(px('choice_scarf'), 1, '&3Choice Scarf', 9, 5),
    I(px('protein'), 2, '&6Protein x2', 8, 4),
    B('exp_s_ball', 2, '&eEXP S Ball x2', 7, 5),
    I(px('ability_capsule'), 1, '&2Ability Capsule', 6, 5),
    I(px('gold_bottle_cap'), 1, '&6Gold Bottle Cap', 5, 6),
    I(kj('red_ticket'), 1, '&cRed Ticket [MK 2]', 5, 6),
    I('pixelgoitems:random_iv', 1, '&3Random IV', 4, 5),
  ],
  epic: [
    I(px('rare_candy'), 8, '&dRare Candy x8', 16, 5),
    I(px('xl_exp_candy'), 2, '&bXL Exp. Candy x2', 13, 5),
    I(px('life_orb'), 1, '&cLife Orb', 11, 5),
    I(px('choice_band'), 1, '&3Choice Band', 10, 5),
    I(px('assault_vest'), 1, '&6Assault Vest', 9, 5),
    I(kj('purple_ticket'), 1, '&5Purple Ticket [MK 5]', 8, 7),
    B('ev_atk_ball', 1, '&aEV Atk Ball', 7, 6),
    I(px('ability_patch'), 1, '&2Ability Patch', 6, 6),
    I(px('gold_bottle_cap'), 3, '&6Gold Bottle Cap x3', 6, 6),
    B('exp_m_ball', 2, '&eEXP M Ball x2', 5, 6),
    I(kj('mega_key'), 1, '&5Mega Key', 4, 7),
    I('weavers_cosmetics_cosplay:pkmn_trainer_blue_helmet', 1, '&9Trainer Cap (Blue)', 3, 5),
    I(px('key_stone'), 1, '&6Key Stone', 2, 7),
  ],
  legendary: [
    I(px('xl_exp_candy'), 4, '&bXL Exp. Candy x4', 14, 6),
    I(px('rare_candy'), 12, '&dRare Candy x12', 12, 5),
    I(kj('cyan_ticket'), 1, '&bCyan Ticket [MK 7]', 11, 7),
    B('iv_def_ball', 1, '&9IV Def Ball', 10, 7),
    I(kj('mega_key'), 2, '&5Mega Key x2', 9, 8),
    I(px('ability_patch'), 2, '&2Ability Patch x2', 8, 7),
    I(px('gold_bottle_cap'), 5, '&6Gold Bottle Cap x5', 7, 7),
    B('exp_l_ball', 2, '&eEXP L Ball x2', 6, 7),
    I('pixelgoitems:skin_swapper', 1, '&6Skin Swapper', 6, 7),
    I(kj('green_ticket'), 1, '&2Green Ticket [MK 9]', 5, 8),
    I('pokemon_armor:gyarados_chestplate', 1, '&3Gyarados Chestplate', 4, 8),
    B('shiny_ball', 1, '&dShiny Ball', 4, 8),
    I(kj('lime_ticket'), 1, '&aLime Ticket [MK 10]', 3, 8),
    I(kj('ssr_ticket'), 1, '&cSSR Ticket', 1, 9),
  ],
  ultimate: [
    I(px('xl_exp_candy'), 8, '&bXL Exp. Candy x8', 15, 7),
    I(kj('white_ticket'), 1, '&fWhite Ticket [MK 14]', 12, 8),
    B('iv_all_ball', 1, '&9IV ALL Ball', 11, 8),
    I('pixelgoitems:shiny_swapper', 1, '&6Shiny Swapper', 10, 9),
    I(kj('ssr_ticket'), 1, '&cSSR Ticket', 9, 9),
    I(kj('mega_key'), 3, '&5Mega Key x3', 8, 8),
    I(kj('black_ticket'), 1, '&8Black Ticket [MK 15]', 7, 9),
    I(px('gold_bottle_cap'), 8, '&6Gold Bottle Cap x8', 6, 8),
    I(px('ability_patch'), 3, '&2Ability Patch x3', 6, 8),
    B('shiny_ball', 2, '&dShiny Ball x2', 5, 9),
    I('pokemon_armor:groudon_chestplate', 1, '&cGroudon Chestplate', 4, 8),
    I(kj('rainbow_ticket'), 1, '&dRainbow Ticket [MK 16]', 3, 9),
    B('master_ball', 1, '&5Master Ball', 2, 9),
    I('pokemon_armor:charizard_shiny_chestplate', 1, '&eShiny Charizard Chestplate', 2, 9),
  ],
};

// Write order, and the two rules the values have to obey.
//
// Only six tiers actually spawn in the world; their spawn weight in
// bosstiers/*.json is a clean difficulty ladder (50/40/30/20/10/1) and the
// payout has to follow it. `equal`, `haunted` and `drowned` have
// canRandomlySpawn:false — they come from events and spawners, so they are not
// part of that ladder and are only bounded from either side instead.
const BOSS_RANK = ['equal', 'haunted', 'common', 'uncommon', 'rare', 'drowned', 'epic', 'legendary', 'ultimate'];
const BOSS_LADDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'ultimate'];
// event tier -> [must pay more than, must pay less than]
const BOSS_EVENT_BOUNDS = {
  equal: [null, 'common'],      // +0 levels: the weakest boss there is
  haunted: ['equal', 'rare'],   // +3 levels but x1.25 level multiplier
  drowned: ['uncommon', 'epic'] // +20 levels, model scale 3
};

/* -- sets ------------------------------------------------------------------
 * "Capture all of these and collect the prize." The shipped default asks for
 * Pikachu, Charmander and Charizard in form `galaxy`, which is not a form or a
 * palette anywhere in Pixelmon 9.4.1 (the only `galaxy` assets in the jar are
 * two TCG card backs), so that set can never be completed. Every entry below
 * is checked against catalog-species.json instead.
 *
 * The UI already expects five sets: gui.yml's custom-dex-set-themes maps
 * indices 0-4 to terminal / aqua / ember / atlas / galaxy. One set per theme,
 * in rising order of difficulty.
 */

/** A set member. `form`/`palette` default to the wildcards SetEntryMatcher
 *  accepts ("none" also reads as base/any). */
const P = (species, display, opts = {}) => {
  const form = opts.form ?? 'none';
  const palette = opts.palette ?? 'none';
  const sp = SPECIES[species];
  if (!sp) {
    problems.push(`set: unknown species "${species}"`);
  } else {
    const formKey = form === 'none' ? 'base' : form;
    const pal = sp.forms[formKey];
    if (!pal) problems.push(`set: "${species}" has no form "${formKey}" (has: ${Object.keys(sp.forms).join(', ')})`);
    else if (palette !== 'none' && !pal.includes(palette))
      problems.push(`set: "${species}" form "${formKey}" has no palette "${palette}" (has: ${pal.join(', ')})`);
  }
  return { species, display, form, palette, legendary: sp?.legendary ?? false };
};

/** A set completion reward. Sets use `command` (singular) and {player}. */
const R = (id, n, name, material, w, v) => {
  if (!ITEMS.has(id)) problems.push(`set reward: unknown item id "${id}" ("${name}")`);
  if (!ITEMS.has(material.toLowerCase())) problems.push(`set reward: unknown material "${material}" ("${name}")`);
  return { name, material: material.toUpperCase(), w, v, cmd: `give {player} ${id} ${n}` };
};

const SETS = [
  {
    key: '0', theme: 'terminal', pane: 'LIME',
    name: '&a&lField Notes', lore: '&7The first five pages of any trainer’s log.',
    material: 'pixelmon:poke_ball', rewardAmount: 1,
    info: '&aCatch these five to close your first log.',
    pokemon: [
      P('Pidgey', '&aPidgey'), P('Rattata', '&aRattata'), P('Caterpie', '&aCaterpie'),
      P('Weedle', '&aWeedle'), P('Magikarp', '&aMagikarp'),
    ],
    rewards: [
      R('pixelmon:s_exp_candy', 8, '&bS Exp. Candy x8', 'pixelmon:s_exp_candy', 34, 2),
      R('pixelmon:silver_ingot', 6, '&7Silver Ingot x6', 'pixelmon:silver_ingot', 26, 2),
      R('pokeblocks:dime', 10, '&7Dime x10', 'pokeblocks:dime', 20, 2),
      R('pixelmon:exp_share', 1, '&6Exp. Share', 'pixelmon:exp_share', 12, 3),
      R('pixelmon:leftovers', 1, '&6Leftovers', 'pixelmon:leftovers', 8, 4),
    ],
  },
  {
    key: '1', theme: 'aqua', pane: 'LIGHT_BLUE',
    name: '&3&lTidecaller', lore: '&7Everything that breathes water.',
    material: 'pixelmon:mystic_water', rewardAmount: 2,
    info: '&3Six water types stand between you and the tide prize.',
    pokemon: [
      P('Squirtle', '&3Squirtle'), P('Psyduck', '&3Psyduck'), P('Poliwag', '&3Poliwag'),
      P('Staryu', '&3Staryu'), P('Tentacool', '&3Tentacool'), P('Gyarados', '&3Gyarados'),
    ],
    rewards: [
      R('pixelmon:mystic_water', 1, '&3Mystic Water', 'pixelmon:mystic_water', 26, 4),
      R('pixelmon:m_exp_candy', 6, '&bM Exp. Candy x6', 'pixelmon:m_exp_candy', 21, 3),
      R('pixelmon:deep_sea_scale', 1, '&3Deep Sea Scale', 'pixelmon:deep_sea_scale', 17, 4),
      R('pixelmon:deep_sea_tooth', 1, '&bDeep Sea Tooth', 'pixelmon:deep_sea_tooth', 15, 4),
      R('pixelmon:prism_scale', 1, '&ePrism Scale', 'pixelmon:prism_scale', 11, 4),
      R('minecraft:heart_of_the_sea', 1, '&2Heart of the Sea', 'minecraft:heart_of_the_sea', 6, 5),
      R('pixelmon:waterium_z', 1, '&9Waterium Z', 'pixelmon:waterium_z', 4, 6),
    ],
  },
  {
    key: '2', theme: 'ember', pane: 'ORANGE',
    name: '&6&lEmberheart', lore: '&7Six that burn.',
    material: 'pixelmon:charcoal', rewardAmount: 2,
    info: '&6Only fire answers to fire.',
    pokemon: [
      P('Charmander', '&6Charmander'), P('Vulpix', '&6Vulpix'), P('Growlithe', '&6Growlithe'),
      P('Ponyta', '&6Ponyta'), P('Magmar', '&6Magmar'), P('Arcanine', '&6Arcanine'),
    ],
    rewards: [
      R('pixelmon:charcoal', 1, '&8Charcoal', 'pixelmon:charcoal', 24, 3),
      R('pixelmon:fire_stone', 2, '&cFire Stone x2', 'pixelmon:fire_stone', 20, 3),
      R('pixelmon:l_exp_candy', 5, '&bL Exp. Candy x5', 'pixelmon:l_exp_candy', 17, 4),
      R('pixelmon:magmarizer', 1, '&cMagmarizer', 'pixelmon:magmarizer', 14, 4),
      R('pixelmon:life_orb', 1, '&cLife Orb', 'pixelmon:life_orb', 11, 5),
      R('pixelmon:firium_z', 1, '&cFirium Z', 'pixelmon:firium_z', 8, 6),
      R('kubejs:red_ticket', 1, '&cRed Ticket [MK 2]', 'kubejs:red_ticket', 6, 6),
    ],
  },
  {
    key: '3', theme: 'atlas', pane: 'BROWN',
    name: '&5&lAtlas Dominion', lore: '&7The six that were never meant to be easy.',
    material: 'pixelmon:dragon_scale', rewardAmount: 3,
    info: '&5Six pseudo-legendaries. Bring a team.',
    pokemon: [
      P('Dragonite', '&5Dragonite'), P('Tyranitar', '&5Tyranitar'), P('Salamence', '&5Salamence'),
      P('Metagross', '&5Metagross'), P('Garchomp', '&5Garchomp'), P('Hydreigon', '&5Hydreigon'),
    ],
    rewards: [
      R('pixelmon:xl_exp_candy', 4, '&bXL Exp. Candy x4', 'pixelmon:xl_exp_candy', 22, 6),
      R('pixelmon:choice_band', 1, '&3Choice Band', 'pixelmon:choice_band', 17, 5),
      R('pixelmon:ability_patch', 1, '&2Ability Patch', 'pixelmon:ability_patch', 15, 6),
      R('pixelmon:gold_bottle_cap', 4, '&6Gold Bottle Cap x4', 'pixelmon:gold_bottle_cap', 13, 7),
      R('kubejs:purple_ticket', 1, '&5Purple Ticket [MK 5]', 'kubejs:purple_ticket', 12, 7),
      R('kubejs:mega_key', 2, '&5Mega Key x2', 'kubejs:mega_key', 10, 8),
      R('pixelmon:key_stone', 1, '&6Key Stone', 'pixelmon:key_stone', 7, 7),
      R('kubejs:green_ticket', 1, '&2Green Ticket [MK 9]', 'kubejs:green_ticket', 4, 8),
    ],
  },
  {
    key: '4', theme: 'galaxy', pane: 'PURPLE',
    name: '&5&lGalaxy Set', lore: '&7Five that most trainers never see.',
    material: 'kubejs:ssr_ticket', rewardAmount: 3,
    info: '&5Three shinies and two of the rarest things alive.',
    pokemon: [
      P('Charizard', '&6&lShiny &cCharizard', { palette: 'shiny' }),
      P('Gyarados', '&6&lShiny &3Gyarados', { palette: 'shiny' }),
      P('Dragonite', '&6&lShiny &eDragonite', { palette: 'shiny' }),
      P('Rayquaza', '&6&lShiny &2Rayquaza', { palette: 'shiny' }),
      P('Jirachi', '&e&lJirachi'),
    ],
    rewards: [
      R('pixelmon:xl_exp_candy', 10, '&bXL Exp. Candy x10', 'pixelmon:xl_exp_candy', 20, 7),
      R('pixelgoitems:shiny_swapper', 1, '&6Shiny Swapper', 'pixelgoitems:shiny_swapper', 17, 8),
      R('kubejs:ssr_ticket', 1, '&cSSR Ticket', 'kubejs:ssr_ticket', 15, 9),
      R('pixelmon:gold_bottle_cap', 10, '&6Gold Bottle Cap x10', 'pixelmon:gold_bottle_cap', 13, 8),
      R('kubejs:mega_key', 3, '&5Mega Key x3', 'kubejs:mega_key', 12, 8),
      R('kubejs:black_ticket', 1, '&8Black Ticket [MK 15]', 'kubejs:black_ticket', 10, 9),
      R('pokemon_armor:charizard_shiny_chestplate', 1, '&eShiny Charizard Chestplate', 'pokemon_armor:charizard_shiny_chestplate', 8, 9),
      R('kubejs:rainbow_ticket', 1, '&dRainbow Ticket [MK 16]', 'kubejs:rainbow_ticket', 5, 9),
    ],
  },
];

/* -- yaml emitter ----------------------------------------------------------
 * Matches the layout Pixelmon's own yaml config writer produces, so a reload
 * that rewrites the file changes nothing but whitespace.
 */
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const HEAD = '# © PixelmonMod 2012-2025\n\n# For assistance visit https://pixelmonmod.com/wiki/Config\n';

const rewards = (list, indent) => {
  const p = ' '.repeat(indent);
  const out = [`${p}rewards:`];
  list.forEach((r, i) => {
    out.push(`${p}    ${q(String(i))}:`);
    out.push(`${p}        name: ${q(r.name)}`);
    out.push(`${p}        chance: ${r.w.toFixed(1)}`);
    out.push(`${p}        permission: none`);
    out.push(`${p}        commands:`);
    out.push(`${p}        - ${q(r.cmd)}`);
  });
  return out;
};

const levelEvent = (key, chance, bands) => {
  const out = [HEAD.trimEnd(), `${key}:`, '    enabled: true', `    chance: ${chance.toFixed(1)}`, '    level-tiers:'];
  for (const [min, max, list] of bands) {
    out.push(`    -   min-level: ${min}`);
    out.push(`        max-level: ${max}`);
    out.push(...rewards(list, 8));
  }
  return out.join('\n') + '\n';
};

const flatEvent = (key, chance, list) => {
  const out = [HEAD.trimEnd(), `${key}:`, '    enabled: true', `    chance: ${chance.toFixed(1)}`];
  out.push(...rewards(list, 4));
  return out.join('\n') + '\n';
};

const bossEvent = (tiers) => {
  const out = [HEAD.trimEnd(), 'tiers:'];
  for (const name of BOSS_RANK) {
    out.push(`    ${name}:`);
    out.push('        enabled: true');
    out.push('        chance: 100.0');
    out.push(...rewards(tiers[name], 8));
  }
  return out.join('\n') + '\n';
};

const setsFile = () => {
  const out = [HEAD.trimEnd(), 'PixelLoot:', '    sets:'];
  for (const s of SETS) {
    out.push(`        ${q(s.key)}:`);
    out.push(`            name: ${q(s.name)}`);
    out.push(`            material: ${s.material.toUpperCase()}`);
    out.push(`            lore: ${q(s.lore)}`);
    out.push(`            message: ${q(`${s.name} &acompleted! You receive {rewardName}`)}`);
    out.push('            permission: none');
    out.push(`            error-message: ${q('&8&l(&4&l!&8&l) &cYou do not have permission for this set!')}`);
    out.push('            pokemon:');
    s.pokemon.forEach((p, i) => {
      out.push(`            -   id: ${i}`);
      out.push(`                name: ${p.species}`);
      out.push(`                display-name: ${q(p.display)}`);
      out.push(`                form: ${p.form}`);
      out.push(`                palette: ${p.palette}`);
      out.push('                aura: none');
    });
    out.push('            repeatable: false');
    out.push('            rewards:');
    s.rewards.forEach((r, i) => {
      out.push(`                ${q(String(i))}:`);
      out.push(`                    name: ${q(r.name)}`);
      out.push(`                    material: ${r.material}`);
      out.push(`                    chance: ${r.w.toFixed(1)}`);
      out.push('                    command:');
      out.push(`                    - ${q(r.cmd)}`);
    });
    out.push(`            reward-amount: ${s.rewardAmount}`);
  }
  return out.join('\n') + '\n';
};

/* The pack runs sets-ui-mode: custom_client, so these chest layouts are only
 * the fallback — but the mod only ever generates one for set0, so a switch back
 * to the chest UI would leave sets 1-4 blank. One page of 18 slots holds every
 * set below, so no next/back button is needed. */
const guiFile = () => {
  const out = [
    HEAD.trimEnd(),
    'sets-ui-mode: custom_client',
    'custom-dex-theme: galaxy',
    'custom-dex-theme-mode: global',
    'use-sounds: true',
    'custom-dex-set-themes:',
    ...SETS.map((s) => `    ${q(s.key)}: ${s.theme}`),
    'capture-animation-type: fireworks',
    'opening-animation-type: fade',
    'gui-configs:',
    '    main:',
    `        gui-name: ${q('&bPixel Loot Sets')}`,
    '        rows: 6',
    '        pages: 1',
    '        page: {}',
    '        slots: {}',
    '        next-button: PIXELMON:TRADE_HOLDER_RIGHT',
    '        back-button: PIXELMON:TRADE_HOLDER_LEFT',
  ];
  for (const s of SETS) {
    const pane = `MINECRAFT:${s.pane}_STAINED_GLASS_PANE`;
    out.push(`    set${s.key}:`);
    out.push(`        gui-name: ${q(s.name)}`);
    out.push('        rows: 2');
    out.push('        pages: 1');
    out.push('        page:');
    out.push(`            ${q('1')}:`);
    for (let slot = 1; slot <= 18; slot++) {
      const v = slot <= s.pokemon.length ? `pokemon${slot - 1}` : pane;
      out.push(`                ${q(String(slot))}: ${v}`);
    }
    out.push('        slots: {}');
    out.push(`        reward-item: ${s.material.toUpperCase()}`);
    out.push(`        reward-lore: ${q(`${s.name} &7rewards`)}`);
    out.push('        next-button: PIXELMON:TRADE_HOLDER_RIGHT');
    out.push('        back-button: PIXELMON:TRADE_HOLDER_LEFT');
    out.push('        main-menu-item: PIXELMON:FOSSIL_MACHINE_DISPLAY');
    out.push('        info-item: minecraft:paper');
    out.push(`        info-lore: ${q(s.info)}`);
  }
  return out.join('\n') + '\n';
};

/* -- checks --------------------------------------------------------------- */
const avg = (list) => list.reduce((s, r) => s + r.w * r.v, 0) / list.reduce((s, r) => s + r.w, 0);

const checkPool = (label, list) => {
  const sum = list.reduce((s, r) => s + r.w, 0);
  if (sum !== 100) problems.push(`${label}: weights add up to ${sum}, expected 100`);
  const seen = new Set();
  for (const r of list) {
    if (seen.has(r.cmd)) notes.push(`${label}: duplicate reward command "${r.cmd}"`);
    seen.add(r.cmd);
  }
  return avg(list);
};

const checkLadder = (label, pairs) => {
  for (let i = 1; i < pairs.length; i++) {
    if (pairs[i][1] < pairs[i - 1][1] - 1e-9) {
      problems.push(
        `${label}: "${pairs[i][0]}" (${pairs[i][1].toFixed(2)}) pays less than "${pairs[i - 1][0]}" (${pairs[i - 1][1].toFixed(2)})`
      );
    }
  }
};

/* -- run ------------------------------------------------------------------ */
const CHANCES = { kill: 15, capture: 20, trainer: 35, shiny: 100, legendary: 100, raid: 60 };

const setFiles = { 'sets.yml': setsFile(), 'gui.yml': guiFile() };

const files = {
  'kill.yml': levelEvent('kill', CHANCES.kill, KILL),
  'capture.yml': levelEvent('capture', CHANCES.capture, CAPTURE),
  'trainer.yml': levelEvent('trainer', CHANCES.trainer, TRAINER),
  'shiny.yml': levelEvent('shiny-capture', CHANCES.shiny, SHINY),
  'legendary.yml': flatEvent('legendary-capture', CHANCES.legendary, LEGENDARY),
  'raid.yml': flatEvent('raid-win', CHANCES.raid, RAID),
  'boss.yml': bossEvent(BOSS),
};

const report = [];
for (const [name, bands] of [['kill', KILL], ['capture', CAPTURE], ['trainer', TRAINER], ['shiny', SHINY]]) {
  const pairs = bands.map(([min, max, l]) => [`${min}-${max}`, checkPool(`${name} ${min}-${max}`, l)]);
  checkLadder(`${name} level bands`, pairs);
  report.push([name, bands.reduce((s, b) => s + b[2].length, 0), pairs.map(([k, v]) => `${k}:${v.toFixed(1)}`).join('  ')]);
}
report.push(['legendary', LEGENDARY.length, `flat:${checkPool('legendary', LEGENDARY).toFixed(1)}`]);
report.push(['raid', RAID.length, `flat:${checkPool('raid', RAID).toFixed(1)}`]);

const bossValue = Object.fromEntries(BOSS_RANK.map((t) => [t, checkPool(`boss ${t}`, BOSS[t])]));
checkLadder('boss spawn ladder', BOSS_LADDER.map((t) => [t, bossValue[t]]));
for (const [tier, [lo, hi]] of Object.entries(BOSS_EVENT_BOUNDS)) {
  if (lo && bossValue[tier] < bossValue[lo]) problems.push(`boss "${tier}" pays less than "${lo}"`);
  if (hi && bossValue[tier] > bossValue[hi]) problems.push(`boss "${tier}" pays more than "${hi}"`);
}
report.push([
  'boss',
  BOSS_RANK.reduce((s, t) => s + BOSS[t].length, 0),
  BOSS_RANK.map((t) => `${t}:${bossValue[t].toFixed(1)}`).join('  '),
]);

const setPairs = SETS.map((s) => [s.name.replace(/&[0-9a-fl]/g, ''), checkPool(`set ${s.key}`, s.rewards)]);
checkLadder('sets', setPairs);
report.push(['sets', SETS.reduce((n, s) => n + s.rewards.length, 0), setPairs.map(([k, v]) => `${k}:${v.toFixed(1)}`).join('  ')]);
for (const s of SETS) {
  const legs = s.pokemon.filter((p) => p.legendary).map((p) => p.species);
  if (legs.length) notes.push(`set "${s.name.replace(/&[0-9a-fl]/g, '')}" asks for ${legs.join(' + ')} — legendary capture goals, not giveaways`);
}

const total = Object.keys(files).length + Object.keys(setFiles).length;
console.log(`PixelLoot — ${total} files, ${report.reduce((s, r) => s + r[1], 0)} rewards\n`);
for (const [n, c, d] of report) console.log(`  ${n.padEnd(10)} ${String(c).padStart(3)} rewards   ${d}`);

if (notes.length) {
  console.log('\nnotes:');
  for (const n of notes) console.log(`  - ${n}`);
}
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S) — nothing written:`);
  for (const p of problems) console.log(`  ! ${p}`);
  process.exit(1);
}
console.log('\nvalidation: every item id, ball variant and weight checks out; every ladder is monotonic.');

if (DRY) {
  console.log('\n--dry: no file written.');
} else {
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name), body, 'utf8');
  for (const [name, body] of Object.entries(setFiles))
    fs.writeFileSync(path.join(OUT, '..', name), body, 'utf8');
  console.log(`\nwritten to ${path.relative(ROOT, OUT)}: ${Object.keys(files).join(', ')}`);
  console.log(`written to ${path.relative(ROOT, path.join(OUT, '..'))}: ${Object.keys(setFiles).join(', ')}`);
}
