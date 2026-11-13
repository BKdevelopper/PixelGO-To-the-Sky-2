#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — Mystery Bags : l'équivalent 1.21.1 des bags de l'ancienne version
 * =============================================================================
 *  Les quatre Mystery Bags (Treasure Bags, types pixelgo:tier1..4) tirent les
 *  tables kubejs/data/loot/loot_table/tier1..4.json. Depuis le 2026-11-08, à la
 *  demande, ces tables reprennent au plus près celles de l'ancienne instance
 *  (« a prendre exemple/loot/loot_tables », PixelGO - To the Sky 1.16.5) :
 *    - un seul pool « utils », mêmes objets, mêmes poids, mêmes quantités que l'exemple ;
 *      tiré 5 à 10 fois (ROLLS) : un bag ouvert donne 5 à 10 stacks (demande du 2026-11-08) ;
 *    - chaque objet dont le mod a changé est remplacé par son équivalent (table BAGS) ;
 *    - les objets sans équivalent dans le pack sont listés dans GONE et ne sont pas remis ;
 *    - plus de coffres vanilla (retirés le 2026-11-08 pour tenir les 5 à 10 objets) ;
 *    - plus de pools minions / Pokédolls ni d'ajouts (tickets, modèles, livres, PokéNav…) :
 *      « exemple strict » (demande du 2026-11-08). Les tables pixelgo:pokedolls/* restent
 *      sur le disque mais aucun bag ne les tire.
 *  Exception à la règle « pas de PixelGO Items dans le loot » (choix du 2026-11-08) : les
 *  coupons de l'ancienne version deviennent les PixelGO Items qui font la même chose, et les
 *  objets de Pokéhaan Craft (Trading Sim, Healer, Laptop) leurs équivalents PixelGO Items.
 *  Les Poké Balls deviennent des couvercles (lids.mjs), sauf la Master Ball qui n'en a pas.
 *
 *  Réécrit les 4 tables en entier (idempotent), puis les tables de récompense FTB.
 *    node tools/pixelgo-loot/bags.mjs --dry
 *    node tools/pixelgo-loot/bags.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toLids } from './lids.mjs';
import { loadCosts } from '../pixelgo-shop/craftcost.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
process.chdir(ROOT);
const DRY = process.argv.includes('--dry');
const BAGS = path.join(ROOT, 'kubejs', 'data', 'loot', 'loot_table');

/* ------------------------------------------------------------- helpers
 * I(id, poids, [min, max]) ; options : { components, bag } */
const I = (name, weight, count, opt = {}) => ({ name, weight, count, ...opt });
const BAG = (tier, weight) => I('treasurebags:treasure_bag', weight, null, { bag: `pixelgo:tier${tier}` });
const LID = (ball, weight, count) => I('pixelmon:poke_ball', weight, count, { components: { 'pixelmon:poke_ball': ball } });
const STATS = ['atk', 'def', 'hp', 'spatk', 'spd', 'spdef'];
const share = (weight, i) => Math.floor(weight / 6) + (i < weight % 6 ? 1 : 0); // poids réparti sur les 6 stats
const EV_LIDS = (weight, count) => STATS.map((s, i) => LID(`ev_${s}_ball`, share(weight, i), count));
const ADD_IV = (weight, count) => STATS.map((s, i) => I(`pixelgoitems:add_iv_${s}`, share(weight, i), count));

/* ------------------------------------------------------ LES QUATRE BAGS
 * Ordre et poids de l'exemple. En commentaire : l'objet 1.16.5 quand il a changé. */
const BAGS_DEF = {
  tier1: [
    I('pixelmon:white_poke_bag', 30),
    I('mysticalagriculture:infusion_crystal', 30),
    I('mekanism:basic_fluid_tank', 30),
    I('botanypots:terracotta_hopper_botany_pot', 40),       // botanypots:hopper_botany_pot
    I('waystones:waystone', 40),
    I('refinedstorage:cable', 10, [8, 16]),                  // projectexpansion:basic_power_flower (ProjectE -> Refined Storage, 2026-11-08)
    I('excompressum:compressed_iron_hammer', 20),            // excompressum:compressed_hammer_iron
    I('exdeorum:iron_mesh', 40),                             // exnihilosequentia:mesh_iron
    I('sophisticatedstorage:iron_chest', 40),                // ironchest:iron_chest
    I('mekanismgenerators:solar_generator', 30),
    I('pipez:energy_pipe', 70),
    I('sophisticatedbackpacks:backpack', 50),
    I('pixelgoitems:size_randomizer', 80),                   // coupons « Small » (40) + « Bigger » (40)
    I('pixelgoitems:random_iv', 40),                         // coupon « IV-Random »
    I('storagedrawers:iron_storage_upgrade', 50, [2, 3]),
    I('pipez:item_pipe', 70),
    I('refinedstorage:1k_storage_disk', 30),                 // projecte:collector_mk1
    I('pipez:wrench', 70),
    I('ironfurnaces:copper_furnace', 60),
    I('havencobblegens:wooden_cobble_gen', 70),              // cobblefordays:tier_1
    BAG(1, 20),                                              // kubejs:lootbox_1
    I('projecte:white_alchemical_bag', 30),
    I('cyclic:hopper', 70),
    I('kubejs:random_egg', 70, [2, 3]),
    I('storagedrawers:oak_full_drawers_1', 70),
    LID('nest_ball', 70, [2, 3]),                            // Giga Ball (bonus sur les petits Pokémon)
    LID('great_ball', 70, [2, 3])                            // Nature Ball (pas d'équivalent : la Super Ball, comme avant)
  ],
  tier2: [
    I('pixelgoitems:trading_sim', 50),                       // pokehaancraftadd:trading_sim
    I('pixelgoitems:healer', 50),                            // pokehaancraftadd:healer
    I('cyclic:tank', 30),
    I('powerpots:power_pot_1', 40),                          // ftb-power-pots:power_pot_mk1
    I('pixelgoitems:laptop', 40),                            // pokehaancraftadd:laptop
    I('refinedstorage:disk_drive', 10),                      // projectexpansion:dark_power_flower
    I('excompressum:compressed_golden_hammer', 30),          // excompressum:compressed_hammer_gold
    I('exdeorum:diamond_mesh', 40),                          // exnihilosequentia:mesh_diamond
    I('sophisticatedstorage:gold_chest', 40),                // ironchest:gold_chest
    I('mekanismgenerators:wind_generator', 30),
    I('mysticalagriculture:infusion_pedestal', 40),
    I('sophisticatedbackpacks:iron_backpack', 50),
    I('pixelgoitems:size_randomizer', 80, [2, 3]),           // coupons « Small » + « Bigger »
    I('pixelgoitems:random_iv', 40, [2, 3]),                 // coupon « IV-Random »
    I('storagedrawers:gold_storage_upgrade', 50, [2, 3]),
    I('refinedstorage:4k_storage_disk', 30),                 // projecte:collector_mk2
    I('sophisticatedbackpacks:stack_upgrade_tier_2', 50),
    I('ironfurnaces:gold_furnace', 50),
    I('havencobblegens:stone_cobble_gen', 50),               // cobblefordays:tier_2
    BAG(2, 20),                                              // kubejs:lootbox_2
    I('pipez:improved_upgrade', 40),
    I('cyclic:hopper_gold', 70),
    I('kubejs:random_egg', 70, [3, 5]),
    I('mekanism:basic_energy_cube', 40),
    LID('ultra_ball', 70, [2, 3]),                           // Legendary Ball (pas d'équivalent : l'Hyper Ball, comme avant)
    ...EV_LIDS(70, [2, 3]),                                  // EV Ball (max 1 EV) -> les 6 EV Balls, poids partagé
    I('cookingforblockheads:sink', 50),
    I('projecte:aeternalis_fuel', 40),                       // projectexpansion:violet_fuel (mod retiré du pack)
    I('pixelmon:new_running_boots', 50)
  ],
  tier3: [
    I('enderstorage:ender_tank', 50),
    I('constructionwand:diamond_wand', 60),
    I('havencobblegens:gold_cobble_gen', 50),                // cobblefordays:tier_4
    I('pixelmon:cloning_machine', 30),
    I('ironfurnaces:diamond_furnace', 40),
    I('mekanismgenerators:advanced_solar_generator', 50),
    I('mysticalagriculture:supremium_farmland', 40),
    I('powerpots:power_pot_2', 40),                          // ftb-power-pots:power_pot_mk2
    I('enderstorage:ender_chest', 40),
    I('pipez:advanced_upgrade', 40),
    I('refinedstorage:crafting_grid', 40),                   // projectexpansion:red_power_flower
    I('mekanism:elite_fluid_tank', 50),
    I('cyclic:solidifier', 40),                              // thermal:machine_bottler (fluide + objet -> objet)
    I('excompressum:auto_hammer', 40),
    I('excompressum:auto_compressed_hammer', 40),
    I('sophisticatedbackpacks:advanced_magnet_upgrade', 40),
    BAG(3, 20),                                              // kubejs:lootbox_3
    I('sophisticatedbackpacks:gold_backpack', 50),
    I('refinedstorage:16k_storage_disk', 40),                // projecte:collector_mk3
    I('sophisticatedbackpacks:stack_upgrade_tier_3', 50),
    I('refinedstorage:controller', 50),                      // projecte:relay_mk3
    I('cyclic:melter', 50),                                  // thermal:machine_crucible (fond les objets en fluide)
    I('exdeorum:netherite_mesh', 40),                        // exnihilosequentia:mesh_emerald (cran au-dessus du diamant)
    I('excompressum:compressed_diamond_hammer', 40),         // excompressum:compressed_hammer_diamond
    I('itemcollectors:advanced_collector', 40),
    I('mekanism:basic_energy_cube', 40),
    I('sophisticatedstorage:diamond_chest', 50),             // ironchest:diamond_chest
    I('kubejs:mega_key', 40)
  ],
  tier4: [
    I('mekanism:ultimate_energy_cube', 50),
    I('sophisticatedbackpacks:inception_upgrade', 30),
    // the_ultimate_ingot : retiré le 2026-11-09 (il a désormais une recette, 30_tech.js)
    I('extendedcrafting:ultimate_singularity', 20),
    I('pipez:ultimate_upgrade', 60),
    I('pipez:infinity_upgrade', 30),
    // storagedrawers:creative_storage_upgrade : retiré le 2026-11-09 (trop fort, masqué dans JEI)
    ...ADD_IV(40, [1, 2]),                                   // coupon « IV-Max » -> les 6 Add IV, poids partagé
    I('pixelgoitems:random_ev', 40, [1, 2]),                 // coupon « EV-Max » (refait les EV)
    I('havencobblegens:diamond_cobble_gen', 50),             // cobblefordays:tier_5
    I('excompressum:compressed_netherite_hammer', 50),       // excompressum:compressed_hammer_netherite
    I('minecraft:diamond', 30, [3, 5]),                      // ironfurnaces:million_furnace (Rainbow Furnace), remplacé le 2026-11-08
    I('powerpots:power_pot_3', 40),                          // ftb-power-pots:power_pot_mk3
    I('refinedstorage:64k_storage_disk', 20),                // projectexpansion:pink_power_flower
    I('sophisticatedbackpacks:stack_upgrade_tier_4', 50),
    BAG(4, 20),                                              // kubejs:lootbox_4
    I('mysticalagradditions:creative_essence', 30),
    I('ironfurnaces:netherite_furnace', 50),
    I('mysticalagradditions:insanium_farmland', 50),
    I('minecraft:nether_star', 30),
    I('pixelmon:poke_ball', 30, null, { components: { 'pixelmon:poke_ball': 'master_ball' } }) // sans couvercle : reste une ball
  ]
};
/* Nombre de tirages par ouverture (2026-11-08) : 5 à 10 stacks, plus de pool « vanilla_chests ».
 * L'ancienne version (coffres vanilla 3 à 4 en plus) : backups/mystery-bags-halved-2026-11-08/bags.mjs */
const ROLLS = { type: 'minecraft:uniform', min: 5, max: 10 };

/* Sans équivalent dans le pack, pas remis : */
const GONE = {
  tier1: ['coupon « Ball-Switch » (changer de ball)', 'coupon « Breed-Switch » (statut de reproduction)'],
  tier2: ['coupon « Ball-Switch »', 'coupon « Breed-Switch »'],
  tier3: ['compactmachines:machine_giant (Compact Machines absent)'],
  tier4: ['mysticaladaptations:insanium_furnace (Mystical Adaptations absent)', 'compactmachines:machine_maximum (Compact Machines absent)']
};

/* ------------------------------------------------------------ écriture */
const entry = (e) => {
  const fns = [];
  if (e.components) fns.push({ function: 'minecraft:set_components', components: e.components });
  if (e.bag) fns.push({ function: 'treasurebags:set_bag_type', bag_type: e.bag });
  if (e.count) fns.push({ function: 'minecraft:set_count', count: { type: 'minecraft:uniform', min: e.count[0], max: e.count[1] } });
  return { type: 'minecraft:item', weight: e.weight, name: e.name, ...(fns.length ? { functions: fns } : {}) };
};
const C = loadCosts();
const kubejsIds = new Set([...fs.readFileSync(path.join(ROOT, 'kubejs', 'startup_scripts', 'main.js'), 'utf8')
  .matchAll(/event\.create\('([a-z0-9_]+)'/g)].map(m => 'kubejs:' + m[1]));
const problems = [];
const pending = new Map();
const report = [];
for (const [tier, list] of Object.entries(BAGS_DEF)) {
  for (const e of list) if (!C.items.has(e.name) && !kubejsIds.has(e.name)) problems.push(`${tier}: objet inconnu ${e.name}`);
  const table = { type: 'minecraft:gift', pools: [
    { name: 'utils', rolls: ROLLS, entries: list.map(entry) }
  ] };
  toLids(table);
  const f = path.join(BAGS, `${tier}.json`);
  const txt = JSON.stringify(table, null, 2) + '\n';
  if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== txt) pending.set(f, txt);
  const total = list.reduce((a, e) => a + e.weight, 0);
  report.push(`${tier} : ${list.length} objets, poids total ${total}, ${ROLLS.min} à ${ROLLS.max} tirages` + (GONE[tier].length ? `\n    sans équivalent : ${GONE[tier].join(' ; ')}` : ''));
}
console.log(report.join('\n'));
if (problems.length) { console.log(`\n${problems.length} PROBLÈME(S) :`); for (const p of problems) console.log('  ! ' + p); console.log('rien écrit.'); process.exit(1); }
for (const [f, txt] of pending) if (!DRY) fs.writeFileSync(f, txt);
console.log(`${pending.size} fichier(s) ${DRY ? 'à changer' : 'changé(s)'}`);
for (const f of pending.keys()) console.log('  ' + path.relative(ROOT, f));

// les tables de récompense FTB suivent les bags (avec --dry, elles lisent les fichiers actuels)
console.log('\n--- tables de récompense FTB Quests');
await import('./rewardtables.mjs');
