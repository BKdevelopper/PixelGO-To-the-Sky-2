#!/usr/bin/env node
/* =============================================================================
 *  PixelGO — quest book: the "Refined Storage" chapter (chapters/ae2.snbt)
 * =============================================================================
 *  Rebuilt on 2026-11-09. This pass owns the whole chapter: quest list (layout,
 *  dependencies, tasks, REWARDS) of ae2.snbt and every title / subtitle /
 *  description in lang/en_us.snbt. Mods: Refined Storage 2.0.9, Extra Disks
 *  4.0.15, Refined Equivalence 1.1.0 (EMC Link).
 *
 *  - A quest that already exists is found by its first task item and keeps
 *    its id and that task's id (players keep their progress). Its rewards are
 *    REPLACED: the old ones handed back the item just shown, or the part of
 *    the tier below (a free refund of the craft), or plain XP.
 *  - Rewards: sellable coins (coins.mjs) + Mystery Bags at milestones +
 *    PokéLoot at the very top. Coins sit well under the price-guide cost of
 *    the craft (tools/pixelgo-shop/craftcost.mjs, 2026-11-09): a quest pays
 *    for part of the climb (20-70 % of the craft from 100 $ up), never for the
 *    item itself; the cheapest blocks get a flat 100 $. 7 500 $ is the ceiling
 *    of any single quest in the book (SUPRA cap, coins.mjs).
 *  - Every task item has a working recipe (craftcost.mjs, 2026-11-09).
 *    Silicon is Pixelmon's (sieve -> raw silicon -> furnace): RS silicon has
 *    no recipe and every RS recipe takes #c:silicon (30_tech.js).
 *  - No recipe in the text (norecipes.mjs): JEI has them.
 *
 *  Idempotent.
 *    node tools/pixelgo-quests/refined.mjs --dry
 *    node tools/pixelgo-quests/refined.mjs
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { coinRewards, coinBlock } from './coins.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DRY = process.argv.includes('--dry');
const QDIR = path.join(ROOT, 'config', 'ftbquests', 'quests');
const CHF = path.join(QDIR, 'chapters', 'ae2.snbt');
const LANGF = path.join(QDIR, 'lang', 'en_us.snbt');

const JEI = '&7Recipe in &6JEI&7.';
const RS = 'refinedstorage:';
const ED = 'extradisks:';

/* --- the chapter ---------------------------------------------------------------
 *  key    : task item (also the quest's identity)
 *  x, y   : position; shape / size optional
 *  deps   : keys of quests that must be done first; hide: hide those lines
 *  money  : coins ($); bag: Mystery Bag tier (1-4); loot: PokéLoot tier (0-3)
 * ----------------------------------------------------------------------------- */
const Q = [];
const add = (q) => Q.push(q);

/* ---- y 0 / 1.5 / 3 : the first network ---- */
add({ key: 'checkmark:intro', x: -2.5, y: 1.5, size: 2.0, shape: 'gear', icon: RS + 'controller', money: 100,
  title: '&b&lRefined Storage', subtitle: '&7Every item you own, in one screen',
  desc: [
    '&7&oOne network, one screen, every chest you ever filled.',
    '',
    '&b&lRefined Storage&r&7 puts all your items on &fdisks&7 and shows them in a single searchable &fGrid&7. Cables carry the network from block to block.',
    '',
    '&e&lTHE THREE BLOCKS YOU NEED',
    '&7&l- &a&lController&r&7 &8- &7the heart. It needs &cpower&7 (any FE source: a generator, a solar panel, Mekanism...)',
    '&7&l- &a&lDisk Drive&r&7 + &a&lStorage Disks&r&7 &8- &7where the items live',
    '&7&l- &a&lGrid&r&7 &8- &7where you see them and take them out',
    '',
    '&e&lHOW THIS PAGE READS',
    '&7Top rows: the first network. Then the disk ladders, moving items in and out, upgrades, autocrafting, wireless, and the &d&lEMC Link&r&7 at the bottom.',
    '',
    '&7The &fCreative Controller&7, &fCreative Wireless Grid&7 and &fCreative Storage Disk&7 are in the &d&lCreative Items&r&7 chapter.',
  ] });

add({ key: RS + 'quartz_enriched_iron', x: 0, y: 0, money: 100,
  title: '&f&lQuartz Enriched Iron', subtitle: '&7The metal of the whole mod',
  desc: ['&7Iron and quartz pressed together. Almost every Refined Storage block, part and cable is made from it.', '', JEI] });
add({ key: 'pixelmon:silicon', x: 1.5, y: 0, money: 100,
  title: '&7&lSilicon', subtitle: '&7From the sieve, through the furnace',
  desc: [
    '&7Refined Storage has no silicon of its own here: every recipe takes &fPixelmon\'s Silicon&7.',
    '&7&l- &7Sieve &fsand&7 or &fcrushed deepslate&7 for &fRaw Silicon',
    '&7&l- &7Smelt it into &fSilicon',
  ] });
add({ key: RS + 'processor_binding', x: 3, y: 0, money: 100,
  title: '&f&lProcessor Binding', subtitle: '&7Holds a processor together',
  desc: ['&7Slime and string, the glue of every raw processor.', '', JEI] });
add({ key: RS + 'basic_processor', x: 4.5, y: 0, deps: [RS + 'processor_binding', 'pixelmon:silicon'], money: 100,
  title: '&7&lBasic Processor', subtitle: '&7The iron one',
  desc: ['&7Craft the &fRaw Basic Processor&7, then smelt it.', '&7The first of three: basic, improved, advanced.'] });
add({ key: RS + 'improved_processor', x: 6, y: 0, deps: [RS + 'basic_processor'], money: 100,
  title: '&6&lImproved Processor', subtitle: '&7The gold one',
  desc: ['&7Same path as the basic one, with gold. Smelt the raw processor.'] });
add({ key: RS + 'advanced_processor', x: 7.5, y: 0, deps: [RS + 'improved_processor'], money: 200,
  title: '&b&lAdvanced Processor', subtitle: '&7The diamond one',
  desc: ['&7The top processor of Refined Storage. The Controller, the bigger storage parts and the &d&lEMC Link&r&7 all need it.'] });

add({ key: RS + 'machine_casing', x: 0, y: 1.5, deps: [RS + 'quartz_enriched_iron'], money: 100,
  title: '&f&lMachine Casing', subtitle: '&7The frame of every machine',
  desc: ['&7The empty shell almost every Refined Storage block is built around.', '', JEI] });
add({ key: RS + 'cable', x: 1.5, y: 1.5, deps: [RS + 'quartz_enriched_iron'], money: 100,
  title: '&f&lCable', subtitle: '&7Carries the network',
  desc: ['&7Connects every block of the network to the &a&lController&r&7. Blocks that touch each other connect without a cable.', '&7Dye it to split two networks that run side by side.'] });
add({ key: RS + 'controller', x: 3, y: 1.5, size: 1.5, deps: [RS + 'machine_casing', RS + 'advanced_processor'], money: 300, bag: 1,
  title: '&b&lController', subtitle: '&7The heart of the network',
  desc: [
    '&7One per network. Everything connected to it shares the same storage.',
    '',
    '&c&lIt needs power. &7Feed it FE from any generator. The more blocks on the network, the more it draws.',
    '&7A Controller that still holds energy keeps it when broken.',
  ] });
add({ key: RS + 'grid', x: 4.5, y: 1.5, deps: [RS + 'controller'], money: 200,
  title: '&a&lGrid', subtitle: '&7See everything, take anything',
  desc: ['&7Shows every item on the network, with a search bar. Click to take, shift-click to put away.'] });
add({ key: RS + 'crafting_grid', x: 6, y: 1.5, deps: [RS + 'grid'], money: 300,
  title: '&a&lCrafting Grid', subtitle: '&7A Grid with a crafting table',
  desc: ['&7A Grid with a 3x3 crafting area that pulls its ingredients straight from the network. Shift-click the result to craft as many as the network can pay for.'] });
add({ key: RS + 'disk_drive', x: 7.5, y: 1.5, deps: [RS + 'controller'], money: 300, bag: 1,
  title: '&a&lDisk Drive', subtitle: '&7Eight disks, one block',
  desc: ['&7Holds up to &f&l8&r&7 storage disks. Each disk adds its space to the network.', '&7The lights on the front fill up with the disks.'] });

add({ key: RS + 'storage_housing', x: 0, y: 3, deps: [RS + 'quartz_enriched_iron'], money: 100,
  title: '&f&lStorage Housing', subtitle: '&7The case of a disk',
  desc: ['&7Put a storage part in a housing and you get a disk. Shift-right-click an empty disk to take its part back out.'] });
add({ key: RS + '1k_storage_disk', x: 1.5, y: 3, deps: [RS + 'storage_housing', RS + '1k_storage_part'], money: 100, bag: 1,
  title: '&f&l1k Storage Disk', subtitle: '&71 000 items',
  desc: ['&7Your first disk: &f&l1 000&r&7 items, any mix. Every bigger disk is the same thing with a bigger part.', '', '&7A disk can also be placed as a &fStorage Block&7 on the network, no Disk Drive needed.'] });
add({ key: RS + 'wrench', x: 3, y: 3, deps: [RS + 'quartz_enriched_iron'], money: 100,
  title: '&f&lWrench', subtitle: '&7Rotate and pick up',
  desc: ['&7Rotates network blocks, and picks them up with a sneak-click. Also binds a Network Card.'] });

/* ---- y 5 : item storage parts, y 6.5 : fluid storage parts ---- */
const ITEM_PARTS = [
  [RS + '1k_storage_part', '1k', '1 000', 100, 0],
  [RS + '4k_storage_part', '4k', '4 000', 100, 0],
  [RS + '16k_storage_part', '16k', '16 000', 400, 0],
  [RS + '64k_storage_part', '64k', '64 000', 1500, 2],
  [ED + '256k_item_storage_part', '256k', '256 000', 4000, 2],
  [ED + '1024k_item_storage_part', '1 024k', 'about 1 million', 7500, 3],
  [ED + '4096k_item_storage_part', '4 096k', 'about 4 million', 7500, 3],
  [ED + '16384k_item_storage_part', '16 384k', 'about 16 million', 7500, 3, 1],
  [ED + '65536k_item_storage_part', '65 536k', 'about 65 million', 7500, 4],
  [ED + '262144k_item_storage_part', '262 144k', 'about 262 million', 7500, 4, 1],
  [ED + '1048576k_item_storage_part', '1 048 576k', 'about a billion', 7500, 4, 2],
  [ED + 'infinite_item_storage_part', 'Infinite', 'no limit at all', 7500, 4, 3],
];
ITEM_PARTS.forEach(([key, name, holds, money, bag, loot], i) => add({
  key, x: 1.5 * i, y: 5, money, bag, loot,
  deps: i === 0 ? ['pixelmon:silicon'] : [ITEM_PARTS[i - 1][0], ...(i === 10 ? [ED + 'withering_processor'] : [])],
  hide: i === 0,
  ...(i === ITEM_PARTS.length - 1 ? { shape: 'gear', size: 1.25 } : {}),
  title: `${i < 4 ? '&f&l' : i < 8 ? '&b&l' : '&d&l'}${name} Item Storage Part`,
  subtitle: `&7A disk of ${holds} items`,
  desc: [
    `&7The core of a &f${name}&7 item disk: ${holds === 'no limit at all' ? '&f&lno limit at all' : `&f&l${holds}&r&7 items`}.`,
    i === 0 ? '&7Each part is built on the one below it, so the ladder is climbed one tier at a time.'
      : i < 4 ? '&7Built on the part of the tier below.'
        : '&7An &fExtra Disks&7 part, built on the part of the tier below.',
    ...(i >= 10 ? ['&7It needs a &5&lWithering Processor&r&7.'] : []),
    '',
    '&7Put it in a &fStorage Housing&7 for a disk.',
  ],
}));
add({ key: ED + 'infinite_item_storage_disk', x: 1.5 * ITEM_PARTS.length, y: 5, size: 1.25, shape: 'gear',
  deps: [ED + 'infinite_item_storage_part'], bag: 4, loot: 3,
  title: '&d&lInfinite Item Storage Disk', subtitle: '&7The last disk you will ever need',
  desc: ['&7An item disk with no limit at all. It is not assembled in a Storage Housing like the others: check its own recipe.', '', JEI] });

const FLUID_PARTS = [
  [RS + '64b_fluid_storage_part', '64B', '64 buckets', 100, 0],
  [RS + '256b_fluid_storage_part', '256B', '256 buckets', 200, 0],
  [RS + '1024b_fluid_storage_part', '1 024B', '1 024 buckets', 500, 0],
  [RS + '4096b_fluid_storage_part', '4 096B', '4 096 buckets', 1500, 2],
  [ED + '16384b_fluid_storage_part', '16 384B', '16 384 buckets', 4000, 2],
  [ED + '65536b_fluid_storage_part', '65 536B', '65 536 buckets', 7500, 3],
  [ED + '262144b_fluid_storage_part', '262 144B', '262 144 buckets', 7500, 3],
  [ED + '1048576b_fluid_storage_part', '1 048 576B', 'about a million buckets', 7500, 4],
  [ED + 'infinite_fluid_storage_part', 'Infinite', 'no limit at all', 7500, 4, 2],
];
FLUID_PARTS.forEach(([key, name, holds, money, bag, loot], i) => add({
  key, x: 1.5 * i, y: 6.5, money, bag, loot,
  deps: i === 0 ? ['pixelmon:silicon'] : [FLUID_PARTS[i - 1][0], ...(i >= 7 ? [ED + 'withering_processor'] : [])],
  hide: i === 0 || i >= 7,
  ...(i === FLUID_PARTS.length - 1 ? { shape: 'gear', size: 1.25 } : {}),
  title: `${i < 4 ? '&9&l' : '&3&l'}${name} Fluid Storage Part`,
  subtitle: `&7A fluid disk of ${holds}`,
  desc: [
    `&7The core of a &f${name}&7 fluid disk: ${holds === 'no limit at all' ? '&f&lno limit at all' : `&f&l${holds}`}&r&7.`,
    '&7Fluid disks hold &flava, water, essences...&7 and show them in the Grid, beside your items.',
    i === 0 ? '&7Each part is built on the one below it.' : '&7Built on the part of the tier below.',
    '',
    '&7Put it in a &fStorage Housing&7 for a disk.',
  ],
}));
add({ key: ED + 'withering_processor', x: 1.5 * 10, y: 6.5, shape: 'gear', deps: [RS + 'advanced_processor'], hide: true, money: 2000, bag: 3,
  title: '&5&lWithering Processor', subtitle: '&7A processor with a Nether Star in it',
  desc: [
    '&7The processor of &fExtra Disks&7, past the advanced one. It costs a &fNether Star&7: time to fight the &5Wither&7.',
    '&7Needed for the &f1 048 576k&7 and &fInfinite&7 parts, items and fluids.',
    '',
    '&7Craft the raw one, then smelt it.',
  ] });

/* ---- y 8.5 : moving items in and out ---- */
const MOVE = [
  [RS + 'importer', '&a&lImporter', '&7Pulls items in', ['&7Pulls items out of the inventory it faces (chest, furnace, machine...) into the network.', '&7Set a filter to import only some items.'], 100],
  [RS + 'exporter', '&a&lExporter', '&7Pushes items out', ['&7Pushes the items you choose from the network into the inventory it faces. Perfect to keep a machine fed.'], 100],
  [RS + 'external_storage', '&a&lExternal Storage', '&7A chest becomes part of the network', ['&7Faces a chest, a drawer or any inventory and adds its content to the network, as if it were a disk.'], 100],
  [RS + 'interface', '&a&lInterface', '&7Import and export in one block', ['&7A block with an input and an output: what goes in is stored, what you set in its export slots is kept in stock for pipes and hoppers.'], 200],
  [RS + 'constructor', '&a&lConstructor', '&7Places blocks', ['&7Places blocks from the network in front of it, or drops items. Pair it with a Destructor for a block farm.'], 300],
  [RS + 'destructor', '&a&lDestructor', '&7Breaks blocks', ['&7Breaks the block in front of it, or picks up items lying there, and stores them in the network.'], 300],
  [RS + 'detector', '&a&lDetector', '&7Redstone from a count', ['&7Gives a redstone signal when the network holds more, less or exactly the amount of an item you set.'], 100],
  [RS + 'relay', '&a&lRelay', '&7A network switch', ['&7Passes the network along, unless it gets a redstone signal. Cut a whole part of the network with one lever.'], 200],
  [RS + 'storage_monitor', '&a&lStorage Monitor', '&7A counter on the wall', ['&7Shows how many of one item the network holds. Click it to take one, put items on it to store them.'], 100],
  [RS + 'disk_interface', '&a&lDisk Interface', '&7Move disks around', ['&7Empties a disk into the network, or fills a disk from it. Handy to swap a small disk for a bigger one.'], 200],
];
MOVE.forEach(([key, title, subtitle, desc, money], i) => add({
  key, x: 1.5 * i, y: 8.5, money, deps: [RS + 'controller'], hide: true, title, subtitle, desc: [...desc, '', JEI] }));

/* ---- y 10 : upgrades ---- */
add({ key: RS + 'upgrade', x: 0, y: 10, deps: [RS + 'controller'], hide: true, money: 100,
  title: '&f&lUpgrade', subtitle: '&7The blank of every upgrade',
  desc: ['&7An empty upgrade. Every upgrade below is made from it.', '&7Upgrades go in the slots of Importers, Exporters, Constructors, Destructors, Interfaces, Wireless Transmitters and Autocrafters.'] });
[
  [RS + 'speed_upgrade', '&b&lSpeed Upgrade', '&7Faster', ['&7Makes the block work faster. Several stack up.'], 100],
  [RS + 'stack_upgrade', '&b&lStack Upgrade', '&7A whole stack at a time', ['&7Moves a full stack per operation instead of one item.'], 300],
  [RS + 'range_upgrade', '&b&lRange Upgrade', '&7Further', ['&7In a &fWireless Transmitter&7: more range for every wireless item.'], 100],
  [RS + 'regulator_upgrade', '&b&lRegulator Upgrade', '&7Keep exactly that many', ['&7In an Exporter: keeps the amount you set in the target inventory, never more.'], 100],
  [RS + 'autocrafting_upgrade', '&b&lAutocrafting Upgrade', '&7Craft what is missing', ['&7In an Exporter or Constructor: if the item runs out, the network &fautocrafts&7 more.'], 100],
].forEach(([key, title, subtitle, desc, money], i) => add({
  key, x: 1.5 * (i + 1), y: 10, money, deps: [RS + 'upgrade'], title, subtitle, desc: [...desc, '', JEI] }));
add({ key: RS + 'configuration_card', x: 1.5 * 6, y: 10, deps: [RS + 'controller'], hide: true, money: 100,
  title: '&f&lConfiguration Card', subtitle: '&7Copy and paste settings',
  desc: ['&7Sneak-click a block to copy its settings and upgrades, then click another block of the same kind to paste them.'] });

/* ---- y 11.5 : autocrafting ---- */
add({ key: RS + 'pattern', x: 0, y: 11.5, deps: [RS + 'controller'], hide: true, money: 100,
  title: '&e&lPattern', subtitle: '&7A recipe the network remembers',
  desc: ['&7An empty pattern. Encode a recipe on it in a &fPattern Grid&7, put it in an &fAutocrafter&7, and the network knows how to make that item.'] });
add({ key: RS + 'pattern_grid', x: 1.5, y: 11.5, deps: [RS + 'pattern', RS + 'grid'], money: 300, bag: 1,
  title: '&e&lPattern Grid', subtitle: '&7Where patterns are written',
  desc: ['&7A Grid that encodes patterns: crafting, processing (for machines), stonecutter and smithing table.', '&7Pick the recipe, put a blank pattern in, take the encoded one out.'] });
add({ key: RS + 'autocrafter', x: 3, y: 11.5, deps: [RS + 'pattern_grid'], money: 400, bag: 2,
  title: '&e&lAutocrafter', subtitle: '&7The network crafts for you',
  desc: [
    '&7Holds patterns. Ask the Grid for an item you do not have and the network crafts it, sub-ingredients included.',
    '&7For a processing pattern, face the Autocrafter at the machine: it sends the inputs and waits for the result.',
  ] });
add({ key: RS + 'autocrafter_manager', x: 4.5, y: 11.5, deps: [RS + 'autocrafter'], money: 1000, bag: 2,
  title: '&e&lAutocrafter Manager', subtitle: '&7Every pattern in one place',
  desc: ['&7Lists the patterns of every Autocrafter on the network, so you can edit them without walking to each one.'] });
add({ key: RS + 'autocrafting_monitor', x: 6, y: 11.5, deps: [RS + 'autocrafter'], money: 200,
  title: '&e&lAutocrafting Monitor', subtitle: '&7What is the network crafting?',
  desc: ['&7Shows the crafting jobs in progress, what each one is waiting for, and lets you cancel them.'] });

/* ---- y 13 : wireless and linked networks ---- */
add({ key: RS + 'wireless_transmitter', x: 0, y: 13, deps: [RS + 'controller'], hide: true, money: 200,
  title: '&d&lWireless Transmitter', subtitle: '&7Your network, without a cable',
  desc: ['&7Lets the wireless items reach the network. Its range grows with &fRange Upgrades&7.'] });
add({ key: RS + 'wireless_grid', x: 1.5, y: 13, deps: [RS + 'wireless_transmitter'], money: 300, bag: 1,
  title: '&d&lWireless Grid', subtitle: '&7The Grid in your pocket',
  desc: ['&7Right-click it on the Controller to link it, then open your network from anywhere in range. It runs on its own charge.'] });
add({ key: RS + 'wireless_autocrafting_monitor', x: 3, y: 13, deps: [RS + 'wireless_transmitter', RS + 'autocrafting_monitor'], money: 300,
  title: '&d&lWireless Autocrafting Monitor', subtitle: '&7Crafting jobs, from anywhere',
  desc: ['&7The Autocrafting Monitor, wireless. Link it to the Controller like the Wireless Grid.'] });
add({ key: RS + 'portable_grid', x: 4.5, y: 13, deps: [RS + 'grid'], hide: true, money: 500,
  title: '&d&lPortable Grid', subtitle: '&7A disk you carry',
  desc: ['&7A Grid with its own disk slot. It needs no network at all: put a disk in and carry it, or place it down.'] });
add({ key: RS + 'network_card', x: 6, y: 13, deps: [RS + 'controller'], hide: true, money: 200,
  title: '&d&lNetwork Card', subtitle: '&7Remembers a place',
  desc: ['&7Sneak-click a &fNetwork Receiver&7 to bind the card to it, then put the card in a &fNetwork Transmitter&7.'] });
add({ key: RS + 'network_transmitter', x: 7.5, y: 13, deps: [RS + 'network_card'], money: 700, bag: 2,
  title: '&d&lNetwork Transmitter', subtitle: '&7Send the network far away',
  desc: ['&7With a bound &fNetwork Card&7, it carries the network to the matching &fNetwork Receiver&7, at any distance and in any dimension.'] });
add({ key: RS + 'network_receiver', x: 9, y: 13, deps: [RS + 'network_transmitter'], money: 700,
  title: '&d&lNetwork Receiver', subtitle: '&7The other end',
  desc: ['&7Receives the network from a &fNetwork Transmitter&7. Everything connected to it acts as if it were next to the Controller.'] });
add({ key: RS + 'security_manager', x: 10.5, y: 13, deps: [RS + 'controller'], hide: true, money: 1500, bag: 2,
  title: '&c&lSecurity Manager', subtitle: '&7Who may touch your network',
  desc: ['&7On a server: decide what each player can do on your network (insert, extract, build, autocraft...). Each player gets a &fSecurity Card&7.'] });
add({ key: RS + 'security_card', x: 12, y: 13, deps: [RS + 'security_manager'], money: 500,
  title: '&c&lSecurity Card', subtitle: '&7One player\'s rights',
  desc: ['&7Bind it to a player, set their permissions on it, and put it in the Security Manager.'] });

/* ---- y 15.5 : the EMC Link ---- */
add({ key: 'refined_equivalence:emc_link', x: 4.5, y: 15.5, size: 2.0, shape: 'gear',
  deps: [RS + 'advanced_processor', RS + 'machine_casing'], hide: true, money: 7500, bag: 4, loot: 2,
  title: '&d&lEMC Link', subtitle: '&7Your EMC, inside the network',
  desc: [
    '&7&oFrom Refined Equivalence.',
    '',
    '&7The &d&lEMC Link&r&7 joins &fProjectE&7 to your network. Place it on the network and &fsneak + right-click&7 it to bind it to &fyour&7 transmutation knowledge.',
    '',
    '&e&lWHAT IT DOES',
    '&7&l- &7Every item you have &alearned&7 shows up in the Grid, as many as your &fEMC&7 can pay for',
    '&7&l- &7Take one out and its EMC is spent, exactly like at the Transmutation Table',
    '&7&l- &7Put an item in and it is &fburned into EMC&7 and learned. Items without an EMC value are refused',
    '&7&l- &7Autocrafting can use it as a source like any disk',
    '',
    '&c&lIt only works while its owner is online.',
    '&c&lEMC generation is disabled in this pack: &7the Link only moves the value of what you burn, it never creates any. Shop items are worth &f0 EMC&7.',
    '',
    JEI,
  ] });

/* --- read the chapter (same reader as creative.mjs) -------------------------------- */
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
if (qStart < 0 || chLines[qEnd] !== '\t]') throw new Error('quest list not found in ae2.snbt');

const old = new Map();
for (const b of blocks) {
  const body = b.join('\n');
  const t = body.slice(body.indexOf('\t\t\ttasks:'));
  const first = t.match(/id: "(\w{16})"\n\t+item: \{ count: \d+, id: "([a-z0-9_]+:[a-z0-9_/]+)" \}/);
  const check = t.match(/id: "(\w{16})"\n\t+type: "checkmark"/);
  const key = first ? first[2] : (check ? 'checkmark:intro' : null);
  if (!key) throw new Error('quest without a readable task in ae2.snbt:\n' + body);
  old.set(key, { id: body.match(/^\t\t\tid: "(\w+)"/m)[1], taskId: first ? first[1] : check[1] });
}

/* --- stable ids ------------------------------------------------------------------------- */
const allText = fs.readdirSync(path.join(QDIR, 'chapters')).filter(f => f !== 'ae2.snbt')
  .map(f => fs.readFileSync(path.join(QDIR, 'chapters', f), 'utf8')).join('\n')
  + fs.readdirSync(path.join(QDIR, 'reward_tables')).map(f => fs.readFileSync(path.join(QDIR, 'reward_tables', f), 'utf8')).join('\n');
const used = new Set();
const newId = (seed) => {
  for (let n = 0; ; n++) {
    const h = crypto.createHash('sha1').update('pixelgo-refined:' + seed + (n ? ':' + n : '')).digest('hex').toUpperCase().slice(0, 16);
    const id = '01234567'[parseInt(h[0], 16) % 8] + h.slice(1);
    // an id of the old chapter that is not a quest/task id we keep is free to reuse only if it is ours
    if (!allText.includes(id) && !used.has(id)) { used.add(id); return id; }
  }
};
for (const o of old.values()) { used.add(o.id); if (o.taskId) used.add(o.taskId); }

const keys = new Set(Q.map(q => q.key));
const missingOld = [...old.keys()].filter(k => !keys.has(k));
if (missingOld.length) { console.error('Existing quests not placed: ' + missingOld.join(', ')); process.exit(1); }
const idOf = new Map(Q.map(q => [q.key, old.get(q.key)?.id ?? newId('quest:' + q.key)]));
const pos = new Set();
for (const q of Q) {
  const p = q.x + ',' + q.y;
  if (pos.has(p)) throw new Error('two quests at ' + p);
  pos.add(p);
  for (const d of q.deps || []) if (!idOf.has(d)) throw new Error(`${q.key}: unknown dependency ${d}`);
}

/* --- rewards ------------------------------------------------------------------------------ */
const T4 = '\t\t\t\t';
const rewardLines = (q) => {
  const out = [];
  if (q.money) out.push(...coinRewards(newId('reward-money:' + q.key), q.money).flatMap(c => coinBlock(c, T4)));
  if (q.bag) out.push(`${T4}{`, `${T4}\tid: "${newId('reward-bag:' + q.key)}"`, `${T4}\titem: {`, `${T4}\t\tcomponents: {`,
    `${T4}\t\t\t"treasurebags:bag_type": "pixelgo:tier${q.bag}"`, `${T4}\t\t}`, `${T4}\t\tcount: 1`,
    `${T4}\t\tid: "treasurebags:treasure_bag"`, `${T4}\t}`, `${T4}\ttype: "item"`, `${T4}}`);
  if (q.loot !== undefined) out.push(`${T4}{`, `${T4}\tcount: 1`, `${T4}\tid: "${newId('reward-loot:' + q.key)}"`,
    `${T4}\tloot_tier: ${q.loot}b`, `${T4}\tplay_sound: true`, `${T4}\ttype: "pixelgoquests:pokeloot"`, `${T4}}`);
  return ['\t\t\trewards: [', ...out, '\t\t\t]'];
};

/* --- build the quest list -------------------------------------------------------------------- */
const fmt = (n) => (Number.isInteger(n) ? n.toFixed(1) : String(n)) + 'd';
const out = [];
let created = 0;
for (const q of Q) {
  const o = old.get(q.key);
  if (!o) created++;
  out.push('\t\t{');
  if (q.deps?.length) out.push(`\t\t\tdependencies: [${q.deps.map(d => `"${idOf.get(d)}"`).join(', ')}]`);
  if (q.hide) out.push('\t\t\thide_dependency_lines: true');
  if (q.icon) out.push('\t\t\ticon: {', `\t\t\t\tid: "${q.icon}"`, '\t\t\t}');
  out.push(`\t\t\tid: "${idOf.get(q.key)}"`);
  out.push(...rewardLines(q));
  if (q.shape) out.push(`\t\t\tshape: "${q.shape}"`);
  if (q.size) out.push(`\t\t\tsize: ${fmt(q.size)}`);
  const taskId = o?.taskId ?? newId('task:' + q.key);
  if (q.key.startsWith('checkmark:')) {
    out.push('\t\t\ttasks: [{', `\t\t\t\tid: "${taskId}"`, '\t\t\t\ttype: "checkmark"', '\t\t\t}]');
  } else {
    out.push('\t\t\ttasks: [{', `\t\t\t\tid: "${taskId}"`, `\t\t\t\titem: { count: 1, id: "${q.key}" }`, '\t\t\t\ttype: "item"', '\t\t\t}]');
  }
  out.push(`\t\t\tx: ${fmt(q.x)}`, `\t\t\ty: ${fmt(q.y)}`);
  out.push('\t\t}');
}
const newCh = [...chLines.slice(0, qStart + 1), ...out, ...chLines.slice(qEnd)].join(EOLC);

/* --- texts (same writer as creative.mjs) ------------------------------------------------------- */
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
for (const q of Q) {
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
const total = Q.reduce((s, q) => s + (q.money || 0), 0);
console.log(`Refined Storage chapter: ${Q.length} quests (${created} new), ${total} $ in coins over the chapter; chapter ${chChanged ? 'rewritten' : 'unchanged'}; lang ${added} keys added, ${changed} changed.`);
if (DRY) {
  for (const q of Q) console.log(`  ${old.has(q.key) ? 'keep' : 'NEW '} ${idOf.get(q.key)}  (${q.x}, ${q.y})  ${q.key.padEnd(44)} ${String(q.money || 0).padStart(5)} $${q.bag ? '  bag ' + q.bag : ''}${q.loot !== undefined ? '  loot ' + q.loot : ''}`);
} else {
  if (chChanged) fs.writeFileSync(CHF, newCh);
  if (added || changed) fs.writeFileSync(LANGF, newLang);
  console.log('written.');
}
