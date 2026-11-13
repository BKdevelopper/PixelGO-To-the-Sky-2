/* =============================================================================
 *  PixelGO — quest content
 * =============================================================================
 *  Everything this tool adds or rewrites, in one place. `generate.mjs` only
 *  knows how to apply it.
 *
 *  Every number in here was read out of the pack, not remembered:
 *    - upgradepokemon        config/upgradepokemon.json + UpgradeLogic.speciesChance
 *    - pixelnav              assets/pixelnav/lang/en_us.json + options.txt keybinds
 *    - puffish skills        tools/pixelgo-skilltree/README.md (generated tree)
 *    - gate ranks            GateRank.class enum constants (levels, rooms, elites)
 *    - gate rarity           config/pixelgo_dungeon-common.toml [gates.rarity]
 *    - beacon drop rates     tools/pixelgo-loot/generate.mjs gate_beacons_t1..t4
 *    - pokedolls             pokedolls.json, read out of the Pokeblocks jar
 *                            (ModItems registrations + DollRarity weights)
 * ========================================================================== */

import fs from 'node:fs';
import { createHash } from 'node:crypto';

/* ---------------------------------------------------------------- new quests
 * id / task id / reward ids are fixed so a re-run finds them again instead of
 * adding a second copy. */

/** A fixed id derived from a name, for quests generated from a list. The first
 *  hex digit is kept in 0-7 like every id already in the book. */
const hid = (name) => {
  const h = createHash('sha1').update('pixelgo-quests:' + name).digest('hex').toUpperCase();
  return (parseInt(h[0], 16) & 7).toString(16) + h.slice(1, 16);
};

/* ---------------------------------------------- cobblestone generator tiers
 * 2026-11-09. The book only had the wooden one (056A651565DC1C95). Each tier is
 * a chain below it, at x = -1. Speed and buffer come from
 * config/havencobblegens-common.toml (ticks per cobblestone, storage). Every
 * generator block drops itself, so one upgraded in place can still be handed in. */
const COBBLE_TIERS = [
  { tier: 'stone',     name: 'Stone',     ink: '&7&l', ticks: 80, buffer: 16, money: 200,  bag: 'pixelgo:tier1' },
  { tier: 'iron',      name: 'Iron',      ink: '&f&l', ticks: 60, buffer: 32, money: 500,  bag: 'pixelgo:tier1' },
  { tier: 'gold',      name: 'Gold',      ink: '&6&l', ticks: 40, buffer: 64, money: 1000, bag: 'pixelgo:tier2' },
  { tier: 'diamond',   name: 'Diamond',   ink: '&b&l', ticks: 20, buffer: 64, money: 2500, bag: 'pixelgo:tier2' },
  { tier: 'emerald',   name: 'Emerald',   ink: '&a&l', ticks: 10, buffer: 64, money: 5000, bag: 'pixelgo:tier3' },
  { tier: 'netherite', name: 'Netherite', ink: '&5&l', ticks: 5,  buffer: 64, money: 7500, bag: 'pixelgo:tier4' },
].map((t) => ({ ...t, id: hid('cobblegen:' + t.tier) }));

const COBBLE_QUESTS = COBBLE_TIERS.map((t, i) => ({
  id: t.id,
  dependencies: [i === 0 ? '056A651565DC1C95' : COBBLE_TIERS[i - 1].id],
  x: -1.0, y: 8.5 + i,
  rewards: [
    { id: hid('cobblegen-money:' + t.tier), money: t.money },
    { id: hid('cobblegen-bag:' + t.tier), bag: t.bag },
  ],
  task: { id: hid('cobblegen-task:' + t.tier), type: 'item', item: `havencobblegens:${t.tier}_cobble_gen` },
}));

/* --------------------------------------------------------- first minion tiers
 * 2026-11-09. Two short ladders in The beginning: a Cobblestone Minion beside
 * the generators (tier I hangs off the wooden generator) and a Wheat Minion at
 * the end of the wheat branch (tier I hangs off the Rookie Hoe). Tier I is the
 * crafting table recipe, II+ are bought in the minion's own Upgrade menu; the
 * Pickup button gives the item back at its tier (one item id per tier). */
const ROMAN = ['I', 'II', 'III', 'IV'];
const MINION_TIER_REWARDS = [
  { money: 300, bag: 'pixelgo:tier1' },
  { money: 500, bag: 'pixelgo:tier1' },
  { money: 800, bag: 'pixelgo:tier2' },
  { money: 1200, bag: 'pixelgo:tier2' },
];
const MINION_LINES = [
  { minion: 'cobblestone', name: 'Cobblestone', ink: '&7&l', dep: '056A651565DC1C95', x: -2.5, y: 8.5, makes: 'cobblestone' },
  { minion: 'wheat', name: 'Wheat', ink: '&e&l', dep: '0897F67C04837138', x: 12.0, y: 3.0, makes: 'wheat and seeds' },
];
const MINION_TIERS = MINION_LINES.flatMap((m) => ROMAN.map((roman, i) => ({
  ...m, tier: i + 1, roman, ...MINION_TIER_REWARDS[i], id: hid(`minion-tier:${m.minion}:${i + 1}`),
})));
const MINION_QUESTS = MINION_TIERS.map((t) => ({
  id: t.id,
  dependencies: [t.tier === 1 ? t.dep : hid(`minion-tier:${t.minion}:${t.tier - 1}`)],
  x: t.x, y: t.y + (t.tier - 1),
  rewards: [
    { id: hid(`minion-tier-money:${t.minion}:${t.tier}`), money: t.money },
    { id: hid(`minion-tier-bag:${t.minion}:${t.tier}`), bag: t.bag },
  ],
  task: { id: hid(`minion-tier-task:${t.minion}:${t.tier}`), type: 'item', item: `pixelgo_minions:${t.minion}_minion_${t.tier}` },
}));

/* ---------------------------------------------------------------- Power Pots
 * 2026-11-09. Three tiers under the hopper botany pot (37A7B4C89E939832), at
 * x 0. Speed, yield and power read out of config/PowerPots.json; recipes in
 * 15_farm_gate.js (each one eats a #pixelgo:farm_harvest). */
const POWER_POTS = [
  { tier: 1, roman: 'I', speed: 2, yield: 1, fe: 10, store: 1000, money: 1000, bag: 'pixelgo:tier2' },
  { tier: 2, roman: 'II', speed: 3, yield: 1.5, fe: 20, store: 2000, money: 2500, bag: 'pixelgo:tier3' },
  { tier: 3, roman: 'III', speed: 4, yield: 2, fe: 40, store: 4000, money: 5000, bag: 'pixelgo:tier3' },
].map((p) => ({ ...p, id: hid('powerpot:' + p.tier) }));
const POWER_POT_QUESTS = POWER_POTS.map((p, i) => ({
  id: p.id,
  dependencies: [i === 0 ? '37A7B4C89E939832' : POWER_POTS[i - 1].id],
  x: 0.0, y: 8.5 + i,
  rewards: [
    { id: hid('powerpot-money:' + p.tier), money: p.money },
    { id: hid('powerpot-bag:' + p.tier), bag: p.bag },
  ],
  task: { id: hid('powerpot-task:' + p.tier), type: 'item', item: `powerpots:power_pot_${p.tier}` },
}));

/* --------------------------------------------------- minion tools, crafted again
 * 2026-11-09. The 19 tools are crafted again (00_removals.js). The chapter had
 * the hoe line, the Rookie Farming Axe, the Sculptor Axe and the Wheat Sickle;
 * this adds the two missing axes (the Sculptor Axe is moved to x 1.5 y 10 and
 * now hangs off the Advanced Gardening Axe, by hand in minions.snbt) and one
 * row of crop tools under the enchanted books. Bags as on the existing tools. */
const MINION_TOOLS = [
  { tool: 'basic_gardening_axe', name: 'Basic Gardening Axe', dep: '0777B51EC73EE2D5', x: 1.5, y: 6.0, bag: 'pixelgo:tier3' },
  { tool: 'advanced_gardening_axe', name: 'Advanced Gardening Axe', depTool: 'basic_gardening_axe', x: 1.5, y: 8.0, bag: 'pixelgo:tier4' },
  ...[
    ['carrot_shovel', 'Gauss Carrot Shovel', 'carrots'],
    ['potato_shovel', 'Pythagorean Potato Shovel', 'potatoes'],
    ['sugar_cane_cutter', 'Turing Sugar Cane Cutter', 'sugar cane'],
    ['nether_wart_cutter', 'Newton Nether Wart Cutter', 'nether wart'],
    ['pumpkin_dicer', 'Pumpkin Dicer', 'pumpkins'],
    ['melon_dicer', 'Melon Dicer', 'melons'],
    ['cactus_knife', 'Cactus Knife', 'cactus'],
    ['fungi_cutter', 'Fungi Cutter', 'mushrooms'],
    ['sunflower_scythe', 'Eclipse Sickle', 'sunflowers and flowers'],
    ['cocoa_chopper', 'Cocoa Chopper', 'cocoa beans'],
  ].map(([tool, name, crop], i) => ({ tool, name, crop, x: -6.75 + 1.5 * i, y: 16.0, bag: 'pixelgo:tier3' })),
].map((t) => ({ ...t, id: hid('minion-tool:' + t.tool) }));
const MINION_TOOL_QUESTS = MINION_TOOLS.map((t) => ({
  id: t.id,
  ...(t.dep || t.depTool ? { dependencies: [t.dep || hid('minion-tool:' + t.depTool)] } : {}),
  x: t.x, y: t.y,
  rewards: [{ id: hid('minion-tool-bag:' + t.tool), bag: t.bag }],
  task: { id: hid('minion-tool-task:' + t.tool), type: 'item', item: `pixelgo_minions:${t.tool}` },
}));
export const SCULPTOR_AXE_DEP = hid('minion-tool:advanced_gardening_axe');

/* ------------------------------------------------------------- Gates to clear
 * 2026-11-09. One "clear a Gate of this rank" quest beside each rank card of
 * the Gates chapter (x 4.5 -> x 6). The task is the KubeJS stage
 * pixelgo_gate_clear_<rank>, given by kubejs/server_scripts/pixelgo/
 * 62_gates_quetes.js the moment the exit Gate opens in the boss room. */
const GATE_CLEARS = [
  { rank: 'e', name: 'E', ink: '&8&l', card: '210D0D36A3C1FA37', y: 0, money: 300, bag: 'pixelgo:tier1' },
  { rank: 'd', name: 'D', ink: '&7&l', card: '61C9BC202F4ABBA4', y: 2, money: 500, bag: 'pixelgo:tier1' },
  { rank: 'c', name: 'C', ink: '&e&l', card: '0DA4B6C86A8AEA48', y: 4, money: 800, bag: 'pixelgo:tier2' },
  { rank: 'b', name: 'B', ink: '&6&l', card: '2496D6AA6B39C868', y: 6, money: 1000, bag: 'pixelgo:tier2' },
  { rank: 'a', name: 'A', ink: '&c&l', card: '205861383D2207C4', y: 8, money: 1500, bag: 'pixelgo:tier3' },
  { rank: 's', name: 'S', ink: '&d&l', card: '58F99C4C400A3D87', y: 10, money: 2500, bag: 'pixelgo:tier3' },
  { rank: 'ss', name: 'SS', ink: '&c&l', card: '1A9F3C0D5B2E7406', y: 12, money: 3500, bag: 'pixelgo:tier4' },
  { rank: 'sss', name: 'SSS', ink: '&6&l', card: '1A9F3C0D5B2E7407', y: 14, money: 5000, bag: 'pixelgo:tier4' },
  { rank: 'demon', name: 'DEMON', ink: '&4&l', card: '1A9F3C0D5B2E7408', y: 16, money: 7500, bag: 'pixelgo:tier4' },
].map((g) => ({ ...g, id: hid('gate-clear:' + g.rank) }));
const GATE_CLEAR_QUESTS = GATE_CLEARS.map((g) => ({
  id: g.id,
  dependencies: [g.card],
  icon: `pixelgo_dungeon:gate_beacon_${g.rank}`,
  x: 6.0, y: g.y,
  ...(g.rank === 'demon' ? { size: 1.25 } : {}),
  rewards: [
    { id: hid('gate-clear-money:' + g.rank), money: g.money },
    { id: hid('gate-clear-bag:' + g.rank), bag: g.bag },
  ],
  task: { id: hid('gate-clear-task:' + g.rank), type: 'gamestage', data: { stage: `pixelgo_gate_clear_${g.rank}` } },
}));

/** 20 ticks a second: "1 every 4 s", "2 a second" */
const cobbleRate = (ticks) => (ticks >= 20 ? `&f&l1&r&7 every &f&l${ticks / 20}&r&7 s` : `&f&l${20 / ticks}&r&7 a second`);

export const QUESTS = {
  'complete_all.snbt': [
    {
      id: '1A9F3C0D5B2E7401',
      icon: 'pixelnav:pokenav_item_base',
      x: -3.0, y: 3.0, shape: 'square',
      rewards: [{ id: '1A9F3C0D5B2E74A1', money: 100 }],
      task: { id: '1A9F3C0D5B2E74B1', type: 'checkmark' },
    },
    {
      id: '1A9F3C0D5B2E7402',
      icon: 'upgradepokemon:upgrade_orb',
      x: 3.0, y: 3.0, shape: 'square',
      rewards: [{ id: '1A9F3C0D5B2E74A2', money: 100 }],
      task: { id: '1A9F3C0D5B2E74B2', type: 'checkmark' },
    },
    {
      id: '1A9F3C0D5B2E7403',
      icon: 'minecraft:experience_bottle',
      x: 1.0, y: 3.0, shape: 'square',
      rewards: [{ id: '1A9F3C0D5B2E74A3', money: 100 }],
      task: { id: '1A9F3C0D5B2E74B3', type: 'checkmark' },
    },
    {
      // grid centred on 0,0 (2026-11-11): 5x3 block x -4..4, last row -3/-1/1/3
      id: '1A9F3C0D5B2E7409',
      icon: 'helscrates:master_crate',
      x: -4.0, y: 1.0, shape: 'square',
      rewards: [{ id: '1A9F3C0D5B2E74A9', money: 100 }],
      task: { id: '1A9F3C0D5B2E74B9', type: 'checkmark' },
    },
    {
      // last row, centred under the grid
      // Shockbyte banner (12x1.9) sits below it at y 5.5
      id: '1A9F3C0D5B2E740A',
      icon: 'pixelgo_dimension:time_capsule',
      x: -1.0, y: 3.0, shape: 'square',
      rewards: [{ id: '1A9F3C0D5B2E74AA', money: 100 }],
      task: { id: '1A9F3C0D5B2E74BA', type: 'checkmark' },
    },
  ],

  'for_the_beginning.snbt': [
    {
      // both metals come out of the sieve from the iron mesh up (30_tech.js,
      // ORE_MESH_FLOOR = 2), so the iron mesh quest is the honest gate
      id: '1A9F3C0D5B2E7404',
      dependencies: ['466152E3A665F0DF'],
      x: 7.5, y: 6.0,
      rewards: [{ id: '1A9F3C0D5B2E74A4', money: 500 }],
      task: { id: '1A9F3C0D5B2E74B4', type: 'item', item: 'pixelnav:pokenav_item_base' },
    },
    {
      // an anvil is 31 iron ingots; ruby is a drop, not a sieve product
      id: '1A9F3C0D5B2E7405',
      dependencies: ['466152E3A665F0DF'],
      x: 7.5, y: 7.5,
      rewards: [{ id: '1A9F3C0D5B2E74A5', money: 500 }],
      task: { id: '1A9F3C0D5B2E74B5', type: 'item', item: 'upgradepokemon:upgrade_orb' },
    },
    ...COBBLE_QUESTS,
    ...MINION_QUESTS,
    ...POWER_POT_QUESTS,
  ],

  'gates.snbt': [
    {
      id: '1A9F3C0D5B2E7406',
      dependencies: ['58F99C4C400A3D87'],
      icon: 'pixelgo_dungeon:gate_beacon_ss',
      x: 4.5, y: 12.0,
      rewards: [{ id: '1A9F3C0D5B2E74A6', money: 3500 }, { id: '1A9F3C0D5B2E74C6', loot: 2 }],
      task: { id: '1A9F3C0D5B2E74B6', type: 'checkmark' },
    },
    {
      id: '1A9F3C0D5B2E7407',
      dependencies: ['1A9F3C0D5B2E7406'],
      icon: 'pixelgo_dungeon:gate_beacon_sss',
      x: 4.5, y: 14.0,
      rewards: [{ id: '1A9F3C0D5B2E74A7', money: 5000 }, { id: '1A9F3C0D5B2E74C7', loot: 2 }],
      task: { id: '1A9F3C0D5B2E74B7', type: 'checkmark' },
    },
    {
      id: '1A9F3C0D5B2E7408',
      dependencies: ['1A9F3C0D5B2E7407'],
      icon: 'pixelgo_dungeon:gate_beacon_demon',
      x: 4.5, y: 16.0,
      // loot_tier 3b = LootTier.FOUR, the top of PokelootReward's enum. The only
      // other quest that uses it is Pokédoll Master (2026-10-14)
      rewards: [{ id: '1A9F3C0D5B2E74A8', money: 10000 }, { id: '1A9F3C0D5B2E74C8', loot: 3 }],
      task: { id: '1A9F3C0D5B2E74B8', type: 'checkmark' },
    },
    ...GATE_CLEAR_QUESTS,
  ],
};

/* ------------------------------------------------ 2026-10-14 — new chapters
 * A chapter listed here is created (empty) by generate.mjs when its file does
 * not exist yet; its quests then come from QUESTS like any other. The title is
 * written once, as plain text: run tools/quest-gradient.js afterwards and it
 * gets the gradient of its group like every other chapter. */
export const CHAPTERS = {
  'pokedolls.snbt': {
    id: '2C5D8E1F7A30D011',
    group: '1A3BB00B8761BF8C', // -=[ PIXELMON ]=-
    order_index: 11, // after the Pokédex (10)
    icon: 'pokeblocks:pokedoll_eevee',
    title: '- Pokédolls',
  },
};

/* ------------------------------------------- Poké Balls — the seven apricorns
 * A row above the chapter (y = -5, nothing there). One quest per colour, and
 * the collector on the left that needs all seven. */
const APRICORNS = ['red', 'yellow', 'green', 'blue', 'pink', 'black', 'white'];
QUESTS['balls.snbt'] = [
  {
    id: '2C5D8E1F7A30A108',
    dependencies: APRICORNS.map((_, i) => `2C5D8E1F7A30A10${i + 1}`),
    hideDependencyLines: true,
    icon: 'pixelmon:apricorn_box',
    x: -14.0, y: -5.0, size: 1.5, shape: 'gear',
    rewards: [{ id: '2C5D8E1F7A30A308', money: 1500 }, { id: '2C5D8E1F7A30A408', loot: 0 }],
    task: { id: '2C5D8E1F7A30A208', type: 'checkmark' },
  },
  ...APRICORNS.map((c, i) => ({
    id: `2C5D8E1F7A30A10${i + 1}`,
    x: -12.0 + 1.5 * i, y: -5.0,
    rewards: [{ id: `2C5D8E1F7A30A30${i + 1}`, money: 250 }],
    task: { id: `2C5D8E1F7A30A20${i + 1}`, type: 'item', item: `pixelmon:${c}_apricorn` },
  })),
];

/* ------------------------------------------------- Minions — the infinite steak
 * Its ingredients come out of a cow minion (enchanted raw beef), so it sits in
 * the free slot under the enchanted iron quest. */
QUESTS['minions.snbt'] = [
  {
    id: '2C5D8E1F7A30B101',
    dependencies: ['4C37C66CB2F889B6'],
    x: -3.0, y: 8.0,
    rewards: [{ id: '2C5D8E1F7A30B301', money: 1000 }],
    task: { id: '2C5D8E1F7A30B201', type: 'item', item: 'kubejs:infinite_steak' },
  },
  ...MINION_TOOL_QUESTS,
];

/* ------------------------------------------------------- Pokédolls — 82 quests
 * One quest per Pokédoll, one row group per rarity (ten to a row), a collection
 * quest per rarity on the left and the master quest under everything.
 *
 * Rarity weights come from DollRarity: common 500, uncommon 300, rare 150,
 * epic 70, legendary 30 (shiny 5, gigantic 0). Shiny and gigantic dolls are not
 * part of the collection. Doll ids are hashed from the item id, so the order of
 * pokedolls.json can change without moving a quest. */
const DOLLS = JSON.parse(fs.readFileSync(new URL('./pokedolls.json', import.meta.url), 'utf8'));
export const DOLL_RARITY = [
  { key: 'common', label: 'Common', ink: '&7', money: 150, set: 1500, loot: 0 },
  { key: 'uncommon', label: 'Uncommon', ink: '&a', money: 300, set: 3000, loot: 0 },
  { key: 'rare', label: 'Rare', ink: '&9', money: 600, set: 6000, loot: 1 },
  { key: 'epic', label: 'Epic', ink: '&5', money: 1200, set: 12000, loot: 1 },
  { key: 'legendary', label: 'Legendary', ink: '&6', money: 2500, set: 25000, loot: 2 },
];
const COLS = 10, X0 = 2.0, STEP = 1.5, GROUP_GAP = 1.0;
const dollQuests = [];
const dollLang = {};
let rowY = 0;
DOLL_RARITY.forEach((r, ri) => {
  const list = DOLLS.filter((d) => d.rarity === r.key).sort((a, b) => a.name.localeCompare(b.name));
  const rows = Math.ceil(list.length / COLS);
  list.forEach((d, i) => {
    const q = hid('pokedoll:' + d.id);
    dollQuests.push({
      id: q,
      x: X0 + STEP * (i % COLS), y: rowY + STEP * Math.floor(i / COLS),
      rewards: [{ id: hid('pokedoll-reward:' + d.id), money: r.money }],
      task: { id: hid('pokedoll-task:' + d.id), type: 'item', item: d.id },
    });
    dollLang[`quest.${q}.quest_subtitle`] = `${r.ink}${r.label}`;
  });
  const set = `2C5D8E1F7A30D11${ri + 1}`;
  dollQuests.push({
    id: set,
    dependencies: list.map((d) => hid('pokedoll:' + d.id)),
    hideDependencyLines: true,
    icon: list[list.length - 1].id,
    x: 0.0, y: rowY + STEP * (rows - 1) / 2, size: 1.5, shape: 'hexagon',
    rewards: [{ id: `2C5D8E1F7A30D31${ri + 1}`, money: r.set }, { id: `2C5D8E1F7A30D41${ri + 1}`, loot: r.loot }],
    task: { id: `2C5D8E1F7A30D21${ri + 1}`, type: 'checkmark' },
  });
  dollLang[`quest.${set}.title`] = `${r.ink}&l${r.label} Collection`;
  dollLang[`quest.${set}.quest_subtitle`] = `&7All ${list.length} ${r.label} Pokédolls`;
  dollLang[`quest.${set}.quest_desc`] = [`&7Every ${r.ink}&l${r.label}&r&7 Pokédoll on this row. Collect them all, then come back here.`];
  rowY += STEP * rows + GROUP_GAP;
});
const GRID_MID = X0 + STEP * (COLS - 1) / 2;
QUESTS['pokedolls.snbt'] = [
  {
    id: '2C5D8E1F7A30D101',
    icon: 'pokeblocks:pokedoll_eevee',
    x: GRID_MID, y: -2.5, size: 2.0, shape: 'gear',
    rewards: [{ id: '2C5D8E1F7A30D301', money: 100 }],
    task: { id: '2C5D8E1F7A30D201', type: 'checkmark' },
  },
  ...dollQuests,
  {
    id: '2C5D8E1F7A30D120',
    dependencies: DOLL_RARITY.map((_, ri) => `2C5D8E1F7A30D11${ri + 1}`),
    hideDependencyLines: true,
    icon: 'pokeblocks:pokedoll_snorlax',
    x: GRID_MID, y: rowY + 0.5, size: 2.0, shape: 'gear',
    rewards: [{ id: '2C5D8E1F7A30D320', money: 25000 }, { id: '2C5D8E1F7A30D420', loot: 3 }],
    task: { id: '2C5D8E1F7A30D220', type: 'checkmark' },
  },
];

/* ------------------------------------------------------------------ the text
 * Written in the house style of the Welcome chapter:
 *   &7 body, &e&l CAPS section headers, blank line between sections,
 *   &c&l for anything that can cost the player something, &a&l for a payoff,
 *   &f&l for a number, &8- as the separator inside a list line. */

const L = (...lines) => lines;

export const LANG = {
  /* ===================================================== WELCOME — new cards */

  'quest.1A9F3C0D5B2E7401.title': '&b&lThe PokeNav',
  'quest.1A9F3C0D5B2E7401.quest_subtitle': '&7/checkspawn, in your pocket',
  'quest.1A9F3C0D5B2E7401.quest_desc': L(
    '&7A handheld that tells you what can spawn where you are standing. It answers the one question a skyblock never does out loud: &oam I even in the right biome for this?',
    '',
    '&e&lOPENING IT',
    '&f&lN &8- &7open the PokeNav',
    '&7&l- &7or right click it in your hand',
    '&7The &a&lLocation&r&7 app has a key of its own, unbound by default. Set it in Controls, under &b&lPixelNav&r&7.',
    '',
    '&e&lWHAT IT SHOWS',
    '&7One page per spawner: &f&lWild&r&7, &6&lLegendary&r&7 and &c&lMega Boss&r&7. These are exactly &b/checkspawn&7, &b/checkspawn legendary&7 and &b/checkspawn megaboss&7 - the same list, the same percentages.',
    '',
    '&7&l- &7Hover a card for its level range',
    '&7&l- &7Click a card for the conditions behind it: time, weather, light, height, ground block, open sky, moon phase',
    '&7&l- &7A marker on a card means one is &a&lalready roaming near you&r&7. Click it and a 3D arrow points the way until you re-open the PokeNav.',
    '',
    '&a&lOn a skyblock this is not a luxury. &7Your island is one biome. The PokeNav is how you find out what that biome will and will not give you.',
    '',
    '&7&oThe coloured shells, the netherite one and the Gholdengo one are the same device in a different case.',
  ),

  'quest.1A9F3C0D5B2E7402.title': '&5&lThe Upgrade Orb',
  'quest.1A9F3C0D5B2E7402.quest_subtitle': '&4A slot machine that eats Pokemon',
  'quest.1A9F3C0D5B2E7402.quest_desc': L(
    '&7Hold it, right click, and the &5&lPOKEMON UPGRADER&r&7 opens. Pick a Pokemon out of your party, pick what you want changed, press &c&lGAMBLE&r&7.',
    '',
    '&c&lIf the roll fails, that Pokemon is DELETED. &7Not fainted. Not sent to your PC. Gone. This pack runs the orb on its harshest setting, and there is no undo.',
    '',
    '&e&lSEVEN THINGS IT CAN CHANGE',
    '&f&lIVs &8- &a&l30%&r&7, and a win adds &f&l+6&r&7 to every stat',
    '&f&lNature &8- &a&l25%',
    '&f&lTera type &8- &a&l20%',
    '&f&lSize &8- &a&l20%',
    '&f&lHidden ability &8- &a&l12%',
    '&f&lShiny &8- &a&l4%',
    '&f&lSpecies &8- &7calculated, see below',
    '',
    '&e&lTURNING ONE POKEMON INTO ANOTHER',
    '&7The chance is the ratio of the two base stat totals raised to the &f&lfourth power&r&7. Aiming lower than you already are is nearly free. Aiming higher falls off a cliff.',
    '',
    '&7&l- &7Magikarp to Gyarados &8- &c&l1.6%',
    '&7&l- &7Dratini to Dragonite &8- &c&l5.3%',
    '&7&l- &7Anything to a Legendary &8- &4&lthe 0.1% floor',
    '',
    '&7A Legendary counts &f&lfour times&r&7 its stat total and a Mythical &f&lfive times&r&7, which is what puts them out of reach for good.',
    '',
    '&e&lBUYING BETTER ODDS',
    '&7&f&l10,000&r&7 PokeDollars buys &a&l+1%&r&7, up to &a&l+25%&r&7 for &f&l250,000&r&7. &c&lThe money is spent either way &8- &7winning does not give it back.',
    '',
    '&e&lTHE RULES',
    '&7&l- &7You cannot stake your last Pokemon',
    '&7&l- &7You cannot stake an egg',
    '&7&l- &7Three seconds between attempts',
    '&7&l- &7Nothing ever goes above &f&l90%&r&7 or below &f&l0.1%',
    '',
    '&7&oUse it on something you caught twice. Never on something you spent a night hunting.',
  ),

  'quest.1A9F3C0D5B2E7403.title': '&a&lThe Trainer\'s Path',
  'quest.1A9F3C0D5B2E7403.quest_subtitle': '&7Press K. You already have points.',
  'quest.1A9F3C0D5B2E7403.quest_desc': L(
    '&f&lK&r&7 opens the skill tree. &a&lThere are points waiting for you the first time you press it&r&7 - go and spend them.',
    '',
    '&7Every skill raises a real stat: catch rate, shiny odds, Pokemon XP, EV gain, drop luck, harvest yield. Nothing in it is cosmetic.',
    '',
    '&e&lHOW POINTS WORK',
    '&7&l- &f&l1&r&7 point to start, &f&l1&r&7 more per level, level cap &f&l100',
    '&7&l- &7so &f&l101&r&7 points in an entire game',
    '&7&l- &7the tree costs &c&l133&r&7. &c&lYou cannot take everything.',
    '&7&l- &7each branch ends in &f&l4&r&7 keystones forming &f&l2&r&7 exclusive pairs &8- &c&ltaking one locks the other for good',
    '',
    '&e&lSIX BRANCHES',
    '&b&lCapture &8- &7catch rate, shiny odds',
    '&c&lTraining &8- &7Pokemon XP, EV gain',
    '&d&lBreeding &8- &7friendship, egg hatching, party healing',
    '&6&lLoot &8- &7Pokemon drops, PokeLoot chests',
    '&a&lHarvest &8- &7apricorns, berries, fishing',
    '&e&lDigging &8- &7fossils, mining, mobility',
    '',
    '&e&lWHERE THE XP COMES FROM',
    '&7&l- &7Defeating a Pokemon &8- &f&l8 to 120&r&7, by how tough it was',
    '&7&l- &7Mining an ore &8- &f&l12&r&7  &8| &7stone &8- &f&l2&r&7  &8| &7cobblestone &8- &f&l1',
    '&7&l- &7Crafting a Poke Ball &8- &f&l6&r&7 each',
    '&7&l- &7Fishing something up &8- &f&l12',
    '',
    '&a&lYour cobblestone generator levels you up on its own. &7Slowly, but it never stops.',
    '',
    '&e&lWHAT A WHOLE BRANCH IS WORTH',
    '&7&l- &7Catch rate &8- &a&l+116%',
    '&7&l- &7Pokemon XP &8- &a&l+175%&r&7  &8| &7EV gain &8- &a&l+112%',
    '&7&l- &7Drop luck &8- &a&l+147%&r&7  &8| &7PokeLoot luck &8- &a&l+137%',
    '&7&l- &7Harvest &8- &a&l+213%&r&7  &8| &7Shiny odds &8- &a&l+8 rolls',
    '',
    '&8&lK also opens the ProjectE transmutation tablet if you are wearing one. Rebind either in Controls if the two get in each other\'s way.',
  ),

  'quest.1A9F3C0D5B2E7409.title': '&d&lThe Crates',
  'quest.1A9F3C0D5B2E7409.quest_subtitle': '&7Four blocks, four keys',
  'quest.1A9F3C0D5B2E7409.quest_desc': L(
    '&7Four crates stand on your starting island. &c&lThey do nothing without a key&r&7, and a key only ever fits its own crate.',
    '',
    '&e&lTHE FOUR',
    '&c&lPoke Crate &8- &7common key &8| &f&l2-3&r&7 rewards',
    '&9&lGreat Crate &8- &7uncommon key &8| &f&l2-4&r&7 rewards',
    '&e&lUltra Crate &8- &7rare key &8| &f&l3-4&r&7 rewards',
    '&5&lMaster Crate &8- &7epic key &8| &f&l3-5&r&7 rewards',
    '',
    '&e&lHOW TO OPEN ONE',
    '&7&l- &7Right click the crate holding the matching key',
    '&7&l- &7The key is &c&lconsumed&r&7, and each kind has a &f&l7.5&r&7 second cooldown',
    '&7&l- &7A key that does not fit says so and nothing happens',
    '&7&l- &a&lShift click a crate to preview it&r&7 &8- &7the full list, with the exact percentages',
    '',
    '&e&lWHAT IS INSIDE',
    '&7Every crate gives one &f&lguaranteed&r&7 reward and rolls the rest. The pool mixes Poke Balls, medicine, candies, evolution stones, emeralds and raw experience with &d&lfully built Pokemon&r&7 - nicknamed, with a chosen ability, four moves and often a held item.',
    '',
    '&5&lThe Master Crate always gives a Master Ball&r&7 and a hoard of Rare Candy, and carries a &a&l1.5%&r&7 Shiny Ball and a &a&l0.9%&r&7 IV ALL Ball.',
    '',
    '&e&lWHERE THE KEYS COME FROM',
    '&7Loot chests. The better the chest, the better the key:',
    '',
    '&7&l- &c&lPoke &8- &7about &f&l11%&r&7 of an &8&lE&r&7-rank Gate chest, fading out at the top',
    '&7&l- &9&lGreat &8- &7around &f&l6&r&7 to &f&l7%&r&7 from rank &6&lB&r&7 upward',
    '&7&l- &e&lUltra &8- &f&l2.5%&r&7 at rank &d&lS&r&7, &f&l5%&r&7 in a &4&lDEMON&r&7 Gate',
    '&7&l- &5&lMaster &8- &f&l0.55%&r&7 in a &4&lDEMON&r&7 Gate, and rarer than an SSR ticket everywhere else',
    '',
    '&7&oAll four counted together, about one key in every eight chests you open.',
    '',
    '&a&lSpare keys climb a rank:&r &7craft them into the next key up - see &6&lJEI&r&7.',
  ),

  'quest.1A9F3C0D5B2E740A.title': '&5&lThe Dimension Timer',
  'quest.1A9F3C0D5B2E740A.quest_subtitle': '&7Twenty minutes, then you go home',
  'quest.1A9F3C0D5B2E740A.quest_desc': L(
    '&7Four dimensions are on a clock. You are allowed to visit them. You are not allowed to live in them.',
    '',
    '&e&lTHE WATCHED FOUR',
    '&c&lThe Nether',
    '&5&lThe End',
    '&a&lThe Overworld Mirror &8- &7a full, ordinary Overworld: real terrain, real biomes, real ore',
    '&b&lUltra Space',
    '',
    '&c&lThey share ONE timer. &7Twenty minutes in total, not twenty each. Burn it in the Nether and the End is shut to you as well.',
    '',
    '&e&lTHE CLOCK',
    '&7&l- &f&l20&r&7 minutes per run',
    '&7&l- &7It only ticks while you are inside one of the four',
    '&7&l- &7Walking from one to another &a&lcarries the time over&r&7 rather than restarting it',
    '&7&l- &7The counter sits in the &f&lbottom right&r&7 of your screen',
    '',
    '&c&lThere are no chat warnings in this pack. &7The HUD is the only thing that will tell you. Look at it.',
    '',
    '&e&lLEAVE EARLY. ALWAYS.',
    '&a&lGo home on your own with time to spare&r&7 and what is left is &a&lbanked&r&7 - you get it back on your next trip, and there is no cooldown at all.',
    '',
    '&c&lLet the clock reach zero&r&7 and three things happen at once:',
    '&7&l- &7You are teleported to your bed, or to world spawn if you have none',
    '&7&l- &7Your banked time is &c&lwiped',
    '&7&l- &7All four dimensions lock for &c&l20 minutes',
    '',
    '&7&oCome back with a minute left. It costs you nothing and it saves you forty.',
    '',
    '&e&lMAKING THE CLOCK LONGER',
    '&f&lTime Capsule &8- &a&l+60 seconds, permanently&r&7, kept through death, and there is no limit on how many you stack.',
    '&7It has no recipe and drops from nothing. The &a&lPixelGO General Store&r&7 sells it for &6&l100,000&r&7 PokeDollars, and it cannot be sold back.',
    '',
    '&f&lGolden Apple &8- &f&l+30&r&7 seconds on the current run only. Eat one before you set off and the bonus waits for you.',
    '',
    '&7&oOn a skyblock the Mirror is the only place with ground under it. Twenty minutes is the whole reason this pack is a skyblock and not a normal world.',
  ),

  /* ============================================ WELCOME — the Gates card, updated */

  'quest.26F11FEA478B4DAC.quest_desc': L(
    '&7Sooner or later a &5&lGate&r&7 tears open near you. It is a doorway into a dungeon that only exists while somebody is inside it.',
    '',
    '&7&l- &f&lNine&r&7 ranks, &8&lE&r&7 through &4&lDEMON',
    '&7&l- &7The Pokemon inside are levelled to the rank',
    '&7&l- &7Find the boss, beat it, take the chests',
    '&7&l- &7From rank &c&lA&r&7 up, the boss can be a Legendary',
    '',
    '&7On this map they open &a&lclose to you&r&7 - between &f&l3&r&7 and &f&l20&r&7 blocks away and within &f&l3&r&7 blocks of your own height, because skyblock placement is on. The game rolls once a minute and almost always succeeds, so you will usually be sitting at the cap of &f&l2&r&7 open Gates. An unused one closes after a full Minecraft day.',
    '',
    '&c&lThere is no way out until you beat the boss. &7Losing a battle ejects you and that dungeon is gone.',
    '',
    '&e&lWHERE THE PACK ENDS',
    '&7The last rank is &4&lDEMON&r&7: twenty eight level 100 Legendaries, seven of them elite guards, drawn from a hand written list with competitive natures and EV spreads.',
    '',
    '&4&lClear a Demon Gate and you have finished this modpack. &7There is nothing above it.',
    '',
    '&7It has its own chapter: &5&lPixelGO Gates&r&7. Read it before you walk into a red one.',
  ),

  /* =========================== WELCOME — Your Trainer, K is shared now */

  'quest.7957CFD388B13419.quest_desc': L(
    '&7The first time you join you choose a &a&lTrainer&r&7 look and a background. That is the Origins screen, and it is &n&lpurely cosmetic&r&7 - no skill, no stat, no penalty, no wrong answer.',
    '',
    '&f&lO &8- &7look at your choice again',
    '',
    '&e&lWHILE WE ARE ON KEYS',
    '&f&lK &8- &7the &a&lskill tree&r&7 &8- &7and the &5&lProjectE&r&7 tablet, much later, if you wear one',
    '&f&lN &8- &7the &b&lPokeNav&r&7, once you own one',
    '&f&lB &8- &7open your &6&lSophisticated Backpack&r&7, once you own one',
    '&f&lMiddle click &8- &7sort any inventory, anywhere',
    '&f&l[ &7and &f&l] &8- &7move a whole inventory in or out of a container',
    '',
    '&7&oPick a look you like and get back to the island.',
  ),

  /* ============================================== THE BEGINNING — new crafts */

  'quest.1A9F3C0D5B2E7404.title': '&b&lPokeNav',
  'quest.1A9F3C0D5B2E7404.quest_subtitle': '&7Know what your island can spawn',
  'quest.1A9F3C0D5B2E7404.quest_desc': L(
    '&e&lWHERE THE METAL COMES FROM',
    '&7Neither ore generates in this world, so both come out of the &6&lsieve&r&7:',
    '&7&l- &a&lBauxite &8- &7gravel and crushed deepslate, then smelted to Aluminum',
    '&7&l- &a&lSilicon &8- &7sand and crushed deepslate',
    '&c&lNeither drops below the iron mesh&r&7, which is why this quest sits behind it.',
    '',
    '&e&lWHAT IT IS FOR',
    '&7Press &f&lN&r&7 and it lists every Pokemon that can spawn where you are standing, with the same percentages &b/checkspawn&7 prints, the conditions behind each one, and an arrow pointing at anything already roaming nearby.',
    '',
    '&a&lOn a skyblock this is not a luxury. &7Your island is one biome. This is how you find out what that biome will and will not give you.',
  ),

  'quest.1A9F3C0D5B2E7405.title': '&5&lUpgrade Orb',
  'quest.1A9F3C0D5B2E7405.quest_subtitle': '&4Re-roll a Pokemon. Or lose it.',
  'quest.1A9F3C0D5B2E7405.quest_desc': L(
    '&e&lWHERE THE RUBY COMES FROM',
    '&c&lRuby does not come out of the sieve. &7It is a drop:',
    '&7&l- &f&lStaryu&r&7 and &f&lStarmie&r&7 &8- &a&lone every time',
    '&7&l- &f&lSableye&r&7, &f&lPersian&r&7, &f&lBoldore&r&7, &f&lGigalith&r&7 &8- &7about half the time',
    '',
    '&e&lWHAT IT IS FOR',
    '&7Right click it and stake one of your Pokemon on a re-roll: IVs, nature, Tera type, size, hidden ability, shiny, or a completely different species.',
    '',
    '&c&lA failed roll deletes the Pokemon. &7Permanently. The full table of odds is on the &e&lUpgrade Orb&r&7 card in the &6&lWelcome&r&7 chapter - read it before you stake anything.',
  ),

  /* ==================================== THE BEGINNING — cobblestone generators */

  ...Object.fromEntries(COBBLE_TIERS.flatMap((t, i) => {
    const prev = i === 0 ? 'Wooden' : COBBLE_TIERS[i - 1].name;
    const last = i === COBBLE_TIERS.length - 1;
    return [
      [`quest.${t.id}.title`, `${t.ink}${t.name} Cobblestone Generator`],
      [`quest.${t.id}.quest_subtitle`, t.ticks >= 20 ? `&7A cobblestone every ${t.ticks / 20} s` : `&7${20 / t.ticks} cobblestones a second`],
      [`quest.${t.id}.quest_desc`, L(
        `&7The tier after the &a&l${prev} Cobblestone Generator&r&7: faster, and it holds more.`,
        '',
        '&e&lWHAT IT GIVES',
        `&7&l- &7Speed &8- ${cobbleRate(t.ticks)}`,
        `&7&l- &7Storage &8- &f&l${t.buffer}&r&7 cobblestone before it stops`,
        '',
        '&e&lUPGRADING IN PLACE',
        `&7No need to break the old one: the matching &a&lGenerator Upgrade&r&7, used with &bCrouch + Right Click&7 on the ${prev.toLowerCase()} generator, turns it into this one.`,
        '&7Already upgraded it in the world? &aBreak it&7: a generator always drops itself, tier included, so you can hand it in.',
        ...(last ? ['', '&a&lThe fastest generator you can build. &7Only the creative one goes further.'] : []),
      )],
    ];
  })),

  /* ======================================== THE BEGINNING — first minion tiers */

  ...Object.fromEntries(MINION_TIERS.flatMap((t) => {
    const first = t.tier === 1;
    const last = t.tier === ROMAN.length;
    return [
      [`quest.${t.id}.title`, `${t.ink}${t.name} Minion ${t.roman}`],
      [`quest.${t.id}.quest_subtitle`, first ? `&7It ${t.minion === 'wheat' ? 'farms' : 'mines'} while you are away` : `&7Tier ${t.roman}: faster, and it holds more`],
      [`quest.${t.id}.quest_desc`, first ? L(
        `&7A small helper that produces &f${t.makes}&7 on its own, next to where you place it.`,
        '',
        '&e&lHOW IT WORKS',
        '&7&l- &7Place it with room around it: it works the blocks of its &a&lwork area',
        '&7&l- &7Right click it to open its storage and &aCollect&7 what it made',
        '&7&l- &7It keeps working while you are offline, up to &f&l24&r&7 hours',
        '',
        '&a&lEvery tier after this one is bought in the minion itself. &7Check JEI for the cost of each tier.',
      ) : L(
        `&7The same &a&l${t.name} Minion&r&7, one tier up.`,
        '',
        '&e&lUPGRADING',
        '&7Right click the placed minion and press &aUpgrade&7. The cost of every tier is in JEI.',
        `&7To hand it in, press &aPickup&7: the minion comes back as an item &f&lat its tier&r&7.`,
        ...(last ? ['', `&7This is where the starter line stops. The &5&lPixelGO Minions&r&7 chapter takes it from here.`] : []),
      )],
    ];
  })),

  /* =============================================== GATES — gates to clear */

  ...Object.fromEntries(GATE_CLEARS.flatMap((g, i) => [
    [`quest.${g.id}.title`, `${g.ink}Clear a Rank ${g.name} Gate`],
    [`quest.${g.id}.quest_subtitle`, g.rank === 'demon' ? '&4The end of the pack' : `&7Beat the boss of a Rank ${g.name} Gate`],
    [`quest.${g.id}.quest_desc`, L(
      `&7Walk into a &5&lRank ${g.name}&r&7 Gate, fight your way to the boss room and &abeat the boss&7.`,
      '',
      '&e&lWHEN IT COUNTS',
      '&7The quest is done the moment the &a&lexit Gate&r&7 opens in the boss room. Stay inside until then: being thrown out by a lost battle does not count.',
      '&7Every player near the boss room when it opens gets it, so a team clears it together.',
      '',
      '&e&lWHERE TO FIND ONE',
      `&7&l- &7A natural Gate opening near your island, or`,
      `&7&l- &7a &b&l${g.name === 'DEMON' ? 'Demon' : g.name + '-Rank'} Gate Beacon&r&7, which opens one on the spot`,
      ...(i === 0 ? ['', '&7Read the rank card on the left before going in: it lists the levels and what waits inside.'] : []),
      ...(g.rank === 'demon' ? ['', '&c&lLegendaries only, all at level 100 with perfect IVs. &7Bring your best team.'] : []),
    )],
  ])),

  /* ================================================= THE BEGINNING — Power Pots */

  ...Object.fromEntries(POWER_POTS.flatMap((p, i) => [
    [`quest.${p.id}.title`, `&d&lPower Pot ${p.roman}`],
    [`quest.${p.id}.quest_subtitle`, `&7Crops grow x${p.speed}, yield x${p.yield}`],
    [`quest.${p.id}.quest_desc`, L(
      i === 0
        ? '&7A &a&lHopper Botany Pot&r&7 that runs on power: whatever grows in it grows faster, and gives more.'
        : `&7The &d&lPower Pot ${POWER_POTS[i - 1].roman}&r&7, one tier up.`,
      '',
      '&e&lWHAT IT GIVES',
      `&7&l- &7Growth speed &8- &a&lx${p.speed}`,
      `&7&l- &7Yield &8- &a&lx${p.yield}`,
      '',
      '&e&lWHAT IT NEEDS',
      `&7&l- &7Power &8- &f&l${p.fe}&r&7 FE per tick, &f&l${p.store}&r&7 FE stored`,
      '&c&lNo power, no boost. &7Run a cable or a generator into it.',
      ...(i === 0 ? ['', '&7Each one is an &e&laccelerator&r&7: each one you build uses up a full harvest. The recipe is in JEI.'] : []),
    )],
  ])),

  /* ============================================ PIXELGO MINIONS — minion tools */

  ...Object.fromEntries(MINION_TOOLS.flatMap((t) => [
    [`quest.${t.id}.title`, `&a&l${t.name}`],
    [`quest.${t.id}.quest_subtitle`, t.crop ? `&7The specialised tool for ${t.crop}` : (t.tool.startsWith('basic') ? '&7Second rung of the axe ladder' : '&7Third rung, one step from the Sculptor Axe')],
    [`quest.${t.id}.quest_desc`, t.crop ? L(
      `&7A harvesting tool made for &f${t.crop}&7 and nothing else.`,
      '',
      '&e&lWHY BOTHER',
      `&7&l- &7It adds &a&lFarming Fortune&r&7 on ${t.crop}: every &f&l100&r&7 fortune is one more drop per harvest`,
      '&7&l- &7Only a &aspecialised tool&7 can roll the rare crop drops',
      '&7&l- &7It levels up as you use it',
      '',
      '&7The recipe is in JEI.',
    ) : L(
      `&7One tier above the &a&l${t.tool.startsWith('basic') ? 'Rookie Farming Axe' : 'Basic Gardening Axe'}&r&7: more &a&lFarming Fortune&r&7 than the axe before it.`,
      '',
      '&7The recipe is in JEI.',
    )],
  ])),

  /* ====================================================== GATES — new ranks */

  'quest.1A9F3C0D5B2E7406.title': '&c&lRank SS',
  'quest.1A9F3C0D5B2E7406.quest_subtitle': '&cOne natural Gate in 50',
  'quest.1A9F3C0D5B2E7406.quest_desc': L(
    '&c&lSS&r&7 is where the ladder stops pretending. Every Pokemon inside is level &f&l100&r&7 - there is no range any more.',
    '',
    '&e&lPOKEMON',
    '&7Level &f&l100&r&7 flat. No base stat limit.',
    '&c&lLegendary bosses are allowed.',
    '',
    '&e&lDUNGEON',
    '&7&l- &f&l20&r&7 Pokemon in total',
    '&7&l- &f&l5 to 8&r&7 combat rooms',
    '&7&l- &f&l5&r&7 elite guards',
    '&7&l- &7an &f&lultimate&r&7 tier boss',
    '',
    '&e&lHOW OFTEN',
    '&7Weight &f&l200&r&7 of &f&l10000&r&7 - &a&l2%&r&7 of all natural Gates, or one in &f&l50&r&7.',
    '',
    '&e&lIN THE CHESTS',
    '&7Everything rank &d&lS&r&7 holds, and this is the first rank whose chests reach &f&lt9&r&7, the top rung of the pack\'s own loot ladder.',
    '',
    '&a&lEvery chest hands you a beacon&r&7: an &d&lS-Rank&r&7 one three times in four, a &c&lSS-Rank&r&7 one the fourth time.',
  ),

  'quest.1A9F3C0D5B2E7407.title': '&6&lRank SSS',
  'quest.1A9F3C0D5B2E7407.quest_subtitle': '&6One natural Gate in 100',
  'quest.1A9F3C0D5B2E7407.quest_desc': L(
    '&6&lSSS&r&7 is twenty four level 100 Pokemon and six elite guards standing between you and the boss.',
    '',
    '&e&lPOKEMON',
    '&7Level &f&l100&r&7 flat. No base stat limit.',
    '&c&lLegendary bosses are allowed.',
    '',
    '&e&lDUNGEON',
    '&7&l- &f&l24&r&7 Pokemon in total',
    '&7&l- &f&l5 to 9&r&7 combat rooms',
    '&7&l- &f&l6&r&7 elite guards',
    '&7&l- &7an &f&lultimate&r&7 tier boss',
    '',
    '&e&lHOW OFTEN',
    '&7Weight &f&l100&r&7 of &f&l10000&r&7 - &a&l1%&r&7 of all natural Gates, or one in &f&l100&r&7.',
    '',
    '&e&lIN THE CHESTS',
    '&a&lEvery chest hands you a beacon&r&7: a &c&lSS-Rank&r&7 one three times in four, a &6&lSSS-Rank&r&7 one the fourth time.',
    '',
    '&7This is the rank that feeds the next one. &a&lTwo SSS Gates for every DEMON&r&7 - if you are seeing SSS regularly, the last rank is within reach.',
  ),

  'quest.1A9F3C0D5B2E7408.title': '&4&lRank DEMON',
  'quest.1A9F3C0D5B2E7408.quest_subtitle': '&4The end of the modpack',
  'quest.1A9F3C0D5B2E7408.quest_desc': L(
    '&4&lDEMON&r&7 is not another rung on the ladder. It is a different dungeon.',
    '',
    '&c&lEvery Pokemon inside comes from a hand written list of &f&l112&r&7 Legendaries, Mythicals, Ultra Beasts and Paradox Pokemon&r&7 - each one given a set nature and a competitive EV spread. Nothing in there is a wild roll.',
    '',
    '&e&lPOKEMON',
    '&7Level &f&l100&r&7 flat. No base stat limit.',
    '&4&lAll of them are Legendaries.',
    '',
    '&e&lDUNGEON',
    '&7&l- &f&l28&r&7 Pokemon in total',
    '&7&l- &f&l6 to 10&r&7 combat rooms',
    '&7&l- &f&l7&r&7 elite guards',
    '&7&l- &7an &f&lultimate&r&7 tier boss',
    '&7&l- &7the portal itself stands &f&l10&r&7 blocks tall',
    '',
    '&e&lHOW OFTEN',
    '&7Weight &f&l50&r&7 of &f&l10000&r&7 - &a&lone natural Gate in two hundred&r&7. Gates cycle two at a time and an unused one expires after a Minecraft day, so that is on the order of &f&l30&r&7 hours of play. Long. Not impossible - that is the point.',
    '',
    '&e&lIN THE CHESTS',
    '&7The richest table in the pack. &a&lEvery chest hands you a beacon&r&7: a &6&lSSS-Rank&r&7 one six times in seven, a &4&lDEMON-Rank&r&7 one the seventh time.',
    '',
    '&4&lIf you clear a Demon Gate, you have finished PixelGO. &7There is no rank above it, no chest better than this one, and nothing left in this book that is harder.',
  ),

  /* ============================================ GATES — existing cards fixed */

  // rank S moved from one Gate in 96 to one in 33: pinning DEMON at one in 200 leaves
  // only three rungs above S, so S had to come down to make room
  'quest.58F99C4C400A3D87.quest_subtitle': '&dOne natural Gate in thirty three',


  'quest.19D51924561B0304.quest_desc': L(
    '&7A &5&lGate&r&7 is a tear hanging in the air. Right click one and it drops you into a dungeon built for you, in a dimension of its own.',
    '',
    '&e&lTHE NINE RANKS',
    '&8&lE &8> &7&lD &8> &e&lC &8> &6&lB &8> &c&lA &8> &d&lS',
    '&c&lSS &8> &6&lSSS &8> &4&lDEMON',
    '',
    '&7The rank decides everything: how strong the Pokemon inside are, how large the dungeon is, what the chests hold, and whether the boss can be a Legendary.',
    '',
    '&7The first six are the game. &c&lThe last three are the endgame&r&7 - every Pokemon in them is level 100, and a &4&lDEMON&r&7 Gate is the last thing this pack has to offer.',
    '',
    '&c&lA Gate is not a structure. &7It is generated the moment you step through and torn down when the last player leaves. Nothing you build inside survives, and nothing you leave behind can be retrieved.',
  ),

  'quest.0E9470A009C52A27.quest_desc': L(
    '&7Gates open on their own, around players. You never have to go looking for one.',
    '',
    '&e&lTHE NUMBERS',
    '&7&l- &7The game rolls once a &f&lminute&r&7, for each player',
    '&7&l- &7Each roll has a &f&l99%&r&7 chance to succeed',
    '&7&l- &7At most &f&l2&r&7 are open around you at once, so in practice you are always at the cap',
    '&7&l- &7Between &f&l3&r&7 and &f&l20&r&7 blocks away, within &f&l3&r&7 blocks of your height &8- &7skyblock placement, so they float',
    '&7&l- &7An unused Gate closes after &f&lone Minecraft day',
    '',
    '&e&lWHICH RANK YOU GET',
    '&7These are weights, not percentages. Add them up and divide.',
    '',
    '&8&lE &8- &f3600&r&7    &7&lD &8- &f2600&r&7    &e&lC &8- &f1700',
    '&6&lB &8- &f950&r&7      &c&lA &8- &f500&r&7      &d&lS &8- &f300',
    '&c&lSS &8- &f200&r&7      &6&lSSS &8- &f100&r&7    &4&lDEMON &8- &f50',
    '',
    '&7That is &f&l10000&r&7 in total, so a weight is its percentage times a hundred:',
    '&7&l- &d&lS&r&7 is one Gate in &f&l33',
    '&7&l- &c&lSS&r&7 is one in &f&l50',
    '&7&l- &6&lSSS&r&7 is one in &f&l100',
    '&7&l- &4&lDEMON&r&7 is one in &f&l200',
    '',
    '&7Each endgame rank is &f&ltwice&r&7 as rare as the one below it, all the way to &4&lDEMON&r&7. That is the whole climb, and it is meant to be walked rather than won in a lottery.',
  ),

  'quest.7CA3EE0F1865A813.quest_desc': L(
    '&7The dungeon is a set of rooms joined by corridors, cut from blackstone, deepslate and nether brick, lit by froglights and glowstone.',
    '',
    '&e&lTHREE KINDS OF ROOM',
    '&a&lStart &8- &7where the Gate puts you down',
    '&c&lCombat &8- &7Pokemon waiting for you',
    '&5&lBoss &8- &7the end of the run',
    '',
    '&7The higher the rank, the more combat rooms and the more Pokemon in each. A rank &8&lE&r&7 has one or two rooms and five Pokemon. A rank &4&lDEMON&r&7 has up to &f&lten&r&7 rooms and &f&ltwenty eight&r&7 Pokemon.',
    '',
    '&7The Gate itself grows with the rank too - &f&l3&r&7 blocks tall at &8&lE&r&7, &f&l10&r&7 at &4&lDEMON&r&7. You can read the rank off the portal before you touch it.',
    '',
    '&7&oThe layout is generated fresh every time. There is no map to learn and no route to memorise.',
  ),

  'quest.473D3678B8871016.quest_desc': L(
    '&7Dungeon Pokemon do not wait politely. Come within &c&l7 blocks&r&7 of one and it attacks - the battle starts on the spot.',
    '',
    '&7Chat names it first: &o&7A wild Gyarados blocks your path.',
    '',
    '&e&lELITE GUARDS',
    '&7From rank &7&lD&r&7 upward, some of the Pokemon in a room are &6&lelites&r&7 - visibly larger, and a real step up from the rest.',
    '',
    '&7&l- &d&lS&r&7 puts &f&l4&r&7 of them between you and the boss',
    '&7&l- &c&lSS&r&7 puts &f&l5',
    '&7&l- &6&lSSS&r&7 puts &f&l6',
    '&7&l- &4&lDEMON&r&7 puts &f&l7&r&7, and every one of them is a Legendary',
    '',
    '&a&lThey can all be caught. &7A Gate is one of the best places in the pack to fill a Pokedex, because the level range is guaranteed and the spawns are dense.',
  ),

  'quest.5D67F40D6B8E19A5.quest_desc': L(
    '&7One room holds the boss. Chat announces it, and the Pokemon that rises is scaled up - larger than anything else in the dungeon.',
    '',
    '&e&lBOSS QUALITY BY RANK',
    '&8&lE &8- &7common',
    '&7&lD &7and &e&lC &8- &7rare',
    '&6&lB &8- &7epic',
    '&c&lA &8- &7legendary',
    '&d&lS&r&7, &c&lSS&r&7, &6&lSSS&r&7 and &4&lDEMON &8- &7ultimate',
    '',
    '&c&lFrom rank A upward the boss can be an actual Legendary Pokemon. &7That is the fastest legendary encounter in the pack, and the hardest fight in it.',
    '',
    '&7In a &4&lDEMON&r&7 Gate there is no "can be" about it - the whole dungeon is drawn from a list of Legendaries, so the boss is one by definition.',
    '',
    '&a&lBeat it and the screen reads Dungeon Cleared. &7An &a&lexit Gate&r&7 opens in the boss room. Right click it and you go home with everything you picked up.',
  ),

  'quest.4C1290476E35646A.quest_desc': L(
    '&7Nine items, one per rank. Right click a &a&lblock&r&7 with one and a Gate of that rank opens on the spot. No waiting, no luck.',
    '',
    '&8&lE-Rank Gate Beacon &8- &7level 5-15',
    '&7&lD-Rank Gate Beacon &8- &7level 15-30',
    '&e&lC-Rank Gate Beacon &8- &7level 30-45',
    '&6&lB-Rank Gate Beacon &8- &7level 45-60',
    '&c&lA-Rank Gate Beacon &8- &7level 60-80',
    '&d&lS-Rank Gate Beacon &8- &7level 80-100',
    '&c&lSS-Rank Gate Beacon &8- &7level 100',
    '&6&lSSS-Rank Gate Beacon &8- &7level 100',
    '&4&lDEMON-Rank Gate Beacon &8- &7level 100, Legendaries only',
    '',
    '&7The beacon is consumed. It needs open ground: if there is not enough room, the Gate refuses to open and the beacon stays in your hand.',
    '',
    '&e&lWHERE THEY COME FROM',
    '&7&l- &a&lGate chests&r&7 from rank &c&lSS&r&7 upward always hold one, always the rank below and sometimes the rank itself',
    '&7&l- &7Loot chests everywhere else carry them too, rarely, and the better the chest the better the rank',
    '&7&l- &a&lCrafting&r&7: every beacon is built around the one of the rank below - look it up in &6&lJEI',
    '',
    '&7Rough odds per chest: about &f&l2%&r&7 for an &8&lE&8/&7&lD&8/&e&lC&r&7 beacon out of an armoury, &f&l1%&r&7 for &6&lB&8/&c&lA&r&7 out of a buried treasure, and &f&l0.2%&r&7 for anything &d&lS&r&7 or above.',
    '',
    '&c&lA DEMON beacon is still the hardest item in the pack. &7Out of a chest it is roughly one in a thousand three hundred, and only in the very best chests in the game. Crafting one means building every beacon below it first.',
  ),
};

/* ================================================ 2026-10-14 — the new quests */
Object.assign(LANG, {
  /* ---------------------------------------------------- Poké Balls — apricorns */
  'quest.2C5D8E1F7A30A108.title': '&6&lApricorn Collector',
  'quest.2C5D8E1F7A30A108.quest_subtitle': '&7One of each colour',
  'quest.2C5D8E1F7A30A108.quest_desc': L(
    '&7&a&lApricorns&r&7 are the fruit every Poké Ball starts from. There are &f&lseven&r&7 colours, and this row wants one of each: &cred&7, &eyellow&7, &agreen&7, &9blue&7, &dpink&7, &8black&7 and &fwhite&7.',
    '',
    '&e&lWHERE TO FIND THEM',
    '&7&l- &7Loot chests carry all seven',
    '&7&l- &7Wild Pokémon drop the &cred&7, &9blue&7 and &8black&7 ones, and the &c&lPoke Crate&r&7 hands out red',
    '&7&l- &a&lPlant one&r&7: right click the ground with an apricorn and it grows into a tree of its colour',
    '&7&l- &7Or put it in a &a&lBotany Pot&r&7 on dirt: the pot grows that colour on its own',
    '',
    '&a&lOne apricorn of a colour is all you ever need. &7The tree gives that colour back forever.',
  ),

  /* ------------------------------------------------- Minions — infinite steak */
  'quest.2C5D8E1F7A30B101.quest_subtitle': '&7Food, solved for good',
  'quest.2C5D8E1F7A30B101.quest_desc': L(
    '&7A steak that is &a&lnever used up&r&7. It feeds you like a cooked steak - &f&l8&r&7 hunger points and the same saturation - and stays in your hand.',
    '',
    '&7Like any food it waits until you are hungry: on a full bar nothing happens.',
    '',
    '&e&lTip:&r &7One is enough for the whole game. Keep it on your hotbar and food stops being a chore.',
  ),

  /* --------------------------------------------------------------- Pokédolls */
  'quest.2C5D8E1F7A30D101.title': '&d&lPokédolls',
  'quest.2C5D8E1F7A30D101.quest_subtitle': '&7Plushies to collect - 82 of them',
  'quest.2C5D8E1F7A30D101.quest_desc': L(
    '&7A &d&lPokédoll&r&7 is a plush you can place: a little Pokémon sitting on a shelf, a bed, the edge of your island. There are &f&l82&r&7 of them, and every one has its own quest on this page.',
    '',
    '&e&lWHERE THEY COME FROM',
    '&7&l- &7Vanilla loot chests: villages, dungeons, mineshafts, strongholds, temples, mansions, outposts, bastions, ancient cities, trial chambers',
    '&7&l- &f&l3 chests in 10&r&7 of those hold one',
    '&7&l- &7The pack\'s own structure loot hands out &f&l21&r&7 of them as well',
    '&7&l- &d&lMystery Bags&r&7: the better the bag, the rarer the doll. A &6&lMystery Legendary Bag&r&7 holds a Legendary doll one time in four',
    '',
    '&e&lHOW RARE',
    '&7&lCommon &8- &f&l45%&r&7 of the dolls you find',
    '&a&lUncommon &8- &f&l27%',
    '&9&lRare &8- &f&l16%',
    '&5&lEpic &8- &f&l5%',
    '&6&lLegendary &8- &f&l2%',
    '',
    '&c&lThe Legendary row is a long road.&r &7Out of a chest, a given Legendary doll is about one doll in &f&l630&r&7. Mystery Legendary Bags are the shortcut.',
    '',
    '&7&oShiny and Gigantic versions do not count here: keep them for decoration.',
  ),
  'quest.2C5D8E1F7A30D120.title': '&d&lPokédoll Master',
  'quest.2C5D8E1F7A30D120.quest_subtitle': '&7All 82 Pokédolls',
  'quest.2C5D8E1F7A30D120.quest_desc': L(
    '&7Every Pokédoll in the pack, from the first Common to the last Legendary.',
    '',
    '&a&lYour island is now the best stocked toy shop in the region.',
  ),
}, dollLang);

/* ===================================================== 2026-10-17 — Pokémon Challenges
 * A chapter of count challenges built on PixelGO Quests task types. Four rows,
 * red < blue < yellow < purple; finishing a row gives its PixelGO Items trophy
 * and opens the next row; the four trophies give the Soul Sand Trophy. These
 * quests are the only source of the five trophies (bags.mjs keeps them out).
 *
 * No challenge names a species: types, categories (shiny, legendary, boss) and
 * plain counts only.
 *
 * Task fields are the ones the PixelGO Quests classes write (javap of
 * PokemonTask / CatchTask / DefeatTask / DefeatTrainerTask / EvolutionTask /
 * HatchTask / LevelTask in pixelgoquests-1.0.0):
 *   catchType  4b = CATCH_OR_RAID: a ball capture or a raid capture. Eggs,
 *              trades and commands (tickets, eggs given to the party) do not count.
 *   wild       true = only wild Pokémon (an FTB Tristate, absent = any)
 *   cause      1b = BATTLE: levels gained in battle, not from candies
 *   pokemon    a Pixelmon spec: type:<type>, shiny, legendary, isboss; "" = any
 * A trainer counts when the player WINS against an NPC (raids, simulated and
 * PvP battles are skipped by TaskListener.onBattleEnd). */
const b = (n) => ({ snbt: `${n}b` });
const T = {
  catch: (spec, n) => ({ type: 'pixelgoquests:catch_pokemon', data: { catchType: b(4), count: n, invert: false, pokemon: spec } }),
  wild: (spec, n) => ({ type: 'pixelgoquests:defeat_pokemon', data: { count: n, invert: false, invertUsed: false, pokemon: spec, usedPokemonSpec: '', wild: true } }),
  boss: (n) => ({ type: 'pixelgoquests:defeat_pokemon', data: { count: n, invert: false, invertUsed: false, pokemon: 'isboss', usedPokemonSpec: '' } }),
  trainers: (n) => ({ type: 'pixelgoquests:defeat_trainer', data: { count: n, customName: '', trainerUUID: '' } }),
  evolve: (n) => ({ type: 'pixelgoquests:evolve_pokemon', data: { count: n, evolution_type: b(0), invert: false, pokemon: '' } }),
  hatch: (n) => ({ type: 'pixelgoquests:hatch_egg', data: { count: n, invert: false, pokemon: '' } }),
  levels: (n) => ({ type: 'pixelgoquests:level_pokemon', data: { cause: b(1), count: n, invert: false, pokemon: '' } }),
};
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const TYPE = (t, n) => ({ key: `type_${t}_${n}`, icon: `pixelmon:${t}_gem`, task: T.catch(`type:${t}`, n),
  title: `${cap(t)} Collector`, sub: `Catch &f&l${n}&r&7 ${cap(t)}-type Pokémon` });

const CHALLENGE_TIERS = [
  { key: 'red', label: 'Red', ink: '&c', money: 500, trophy: { money: 2500, loot: 0 }, rows: [
    { key: 'catch_50', icon: 'pixelmon:poke_ball', task: T.catch('', 50), title: 'First Catches', sub: 'Catch &f&l50&r&7 Pokémon' },
    TYPE('bug', 25), TYPE('grass', 25), TYPE('water', 25),
    { key: 'wild_100', icon: 'pixelmon:black_belt', task: T.wild('', 100), title: 'Into the Grass', sub: 'Defeat &f&l100&r&7 wild Pokémon' },
    { key: 'trainers_10', icon: 'pixelmon:boulder_badge', task: T.trainers(10), title: 'Rookie Trainer', sub: 'Beat &f&l10&r&7 trainers' },
    { key: 'evolve_10', icon: 'pixelmon:fire_stone', task: T.evolve(10), title: 'Growing Up', sub: 'Evolve &f&l10&r&7 Pokémon' },
  ] },
  { key: 'blue', label: 'Blue', ink: '&9', money: 1500, trophy: { money: 7500, loot: 1 }, rows: [
    TYPE('normal', 100), TYPE('fire', 50), TYPE('electric', 50), TYPE('flying', 50),
    { key: 'wild_300', icon: 'pixelmon:black_belt', task: T.wild('', 300), title: 'Tall Grass Regular', sub: 'Defeat &f&l300&r&7 wild Pokémon' },
    { key: 'trainers_50', icon: 'pixelmon:marsh_badge', task: T.trainers(50), title: 'Ace Trainer', sub: 'Beat &f&l50&r&7 trainers' },
    { key: 'hatch_10', icon: 'pixelmon:oval_charm', task: T.hatch(10), title: 'Breeder', sub: 'Hatch &f&l10&r&7 eggs' },
    { key: 'levels_100', icon: 'pixelmon:rare_candy', task: T.levels(100), title: 'Battle Hardened', sub: 'Gain &f&l100&r&7 levels in battle' },
  ] },
  { key: 'yellow', label: 'Yellow', ink: '&e', money: 4000, trophy: { money: 20000, loot: 2 }, rows: [
    TYPE('poison', 50), TYPE('ground', 50), TYPE('rock', 50), TYPE('fighting', 50), TYPE('psychic', 50),
    { key: 'trainers_150', icon: 'pixelmon:earth_badge', task: T.trainers(150), title: 'Veteran Trainer', sub: 'Beat &f&l150&r&7 trainers' },
    { key: 'evolve_50', icon: 'pixelmon:razor_claw', task: T.evolve(50), title: 'Evolution Expert', sub: 'Evolve &f&l50&r&7 Pokémon' },
    { key: 'shiny_5', icon: 'pixelmon:shiny_charm', task: T.catch('shiny', 5), title: 'A Different Colour', sub: 'Catch &f&l5&r&7 shiny Pokémon' },
  ] },
  { key: 'purple', label: 'Purple', ink: '&5', money: 10000, trophy: { money: 50000, loot: 2 }, rows: [
    TYPE('ghost', 50), TYPE('dragon', 25), TYPE('steel', 50), TYPE('dark', 50), TYPE('fairy', 50), TYPE('ice', 50),
    { key: 'legendary_5', icon: 'pixelmon:red_chain', task: T.catch('legendary', 5), title: 'Living Legend', sub: 'Catch &f&l5&r&7 Legendary Pokémon' },
    { key: 'trainers_300', icon: 'pixelmon:expert_belt', task: T.trainers(300), title: 'Champion', sub: 'Beat &f&l300&r&7 trainers' },
    { key: 'boss_25', icon: 'pixelmon:key_stone', task: T.boss(25), title: 'Boss Hunter', sub: 'Defeat &f&l25&r&7 boss Pokémon' },
    { key: 'shiny_15', icon: 'pixelmon:shiny_charm', task: T.catch('shiny', 15), title: 'Shiny Hunter', sub: 'Catch &f&l15&r&7 shiny Pokémon' },
  ] },
];

CHAPTERS['challenges.snbt'] = {
  id: '2C5D8E1F7A30C4A1',
  group: '1A3BB00B8761BF8C', // -=[ PIXELMON ]=-
  order_index: 12, // after Pokédolls (11)
  icon: 'pixelgoitems:trophy_purple',
  title: '- Pokémon Challenges',
};

{
  const ROW_Y = 2.5, STEP = 1.5, TROPHY_X = 16.0;
  const qs = [];
  const lang = {};
  const trophyIds = [];
  let prevTrophy = null;
  CHALLENGE_TIERS.forEach((tier, ti) => {
    const y = ti * ROW_Y;
    const ids = [];
    tier.rows.forEach((c, i) => {
      const k = `${tier.key}:${c.key}`;
      const id = hid('challenge:' + k);
      ids.push(id);
      qs.push({
        id,
        ...(prevTrophy ? { dependencies: [prevTrophy], hideDependencyLines: true } : {}),
        icon: c.icon,
        x: STEP * i, y,
        rewards: [{ id: hid('challenge-reward:' + k), money: tier.money }],
        task: { id: hid('challenge-task:' + k), ...c.task },
      });
      lang[`quest.${id}.title`] = `${tier.ink}&l${c.title}`;
      lang[`quest.${id}.quest_subtitle`] = `&7${c.sub}`;
    });
    const trophy = hid(`challenge-trophy:${tier.key}`);
    qs.push({
      id: trophy,
      dependencies: ids, hideDependencyLines: true,
      icon: `pixelgoitems:trophy_${tier.key}`,
      x: TROPHY_X, y, size: 1.5, shape: 'gear',
      rewards: [
        { id: hid(`challenge-trophy-item:${tier.key}`), item: `pixelgoitems:trophy_${tier.key}` },
        { id: hid(`challenge-trophy-money:${tier.key}`), money: tier.trophy.money },
        { id: hid(`challenge-trophy-loot:${tier.key}`), loot: tier.trophy.loot },
      ],
      task: { id: hid(`challenge-trophy-task:${tier.key}`), type: 'checkmark' },
    });
    const next = CHALLENGE_TIERS[ti + 1];
    lang[`quest.${trophy}.title`] = `${tier.ink}&l${tier.label} Trophy`;
    lang[`quest.${trophy}.quest_subtitle`] = `&7Every ${tier.label.toLowerCase()} challenge, done`;
    lang[`quest.${trophy}.quest_desc`] = [
      `&7All &f&l${tier.rows.length}&r&7 challenges of the ${tier.ink}&l${tier.label.toLowerCase()}&r&7 row are behind you. The ${tier.ink}&l${tier.label} Trophy&r&7 is yours to put on a shelf.`,
      '',
      next ? `&a&lThe ${next.ink}&l${next.label.toLowerCase()}&a&l row is open.` : '&a&lFour trophies. The last one is waiting on the right.',
    ];
    trophyIds.push(trophy);
    prevTrophy = trophy;
  });
  const mid = (CHALLENGE_TIERS.length - 1) * ROW_Y / 2;
  qs.unshift({
    id: '2C5D8E1F7A30C401',
    icon: 'pixelgoitems:trophy_red',
    x: -3.0, y: mid, size: 2.0, shape: 'gear',
    rewards: [{ id: '2C5D8E1F7A30C301', money: 100 }],
    task: { id: '2C5D8E1F7A30C201', type: 'checkmark' },
  });
  qs.push({
    id: '2C5D8E1F7A30C499',
    dependencies: trophyIds,
    icon: 'pixelgoitems:trophy_soul_sand',
    x: TROPHY_X + 3.5, y: mid, size: 2.5, shape: 'gear',
    rewards: [
      { id: '2C5D8E1F7A30C399', item: 'pixelgoitems:trophy_soul_sand' },
      { id: '2C5D8E1F7A30C398', money: 100000 },
      { id: '2C5D8E1F7A30C397', loot: 3 },
    ],
    task: { id: '2C5D8E1F7A30C299', type: 'checkmark' },
  });
  QUESTS['challenges.snbt'] = qs;

  Object.assign(LANG, lang, {
    'quest.2C5D8E1F7A30C401.title': '&6&lPokémon Challenges',
    'quest.2C5D8E1F7A30C401.quest_subtitle': '&7Four rows, four trophies, one more',
    'quest.2C5D8E1F7A30C401.quest_desc': L(
      '&7Four rows of challenges, from &c&lred&r&7 to &5&lpurple&r&7. Finish every challenge of a row and its &6&ltrophy&r&7 is yours - and the next row opens.',
      '',
      '&e&lTHE ORDER',
      '&c&lRed &8> &9&lBlue &8> &e&lYellow &8> &5&lPurple',
      '&7Win all four and the &8&lSoul Sand Trophy&r&7 is yours as well.',
      '',
      '&e&lWHAT COUNTS',
      '&7&l- &7&lCatch&r&7: Pokémon you catch with a ball, raids included. Eggs, trades and Pokémon handed to you do not count.',
      '&7&l- &7&lDefeat&r&7: every wild Pokémon your team knocks out.',
      '&7&l- &7&lTrainers&r&7: every NPC trainer battle you &nwin&r&7.',
      '&7&l- &7&lLevels&r&7: levels gained in battle, not from candies.',
      '',
      '&c&lA row only counts once it is open.&r &7Nothing done before that is carried over, so finish a row before you chase the next one.',
      '',
      '&7&oThese trophies cannot be found anywhere else.',
    ),
    'quest.2C5D8E1F7A30C499.title': '&8&lSoul Sand Trophy',
    'quest.2C5D8E1F7A30C499.quest_subtitle': '&7Red, blue, yellow and purple',
    'quest.2C5D8E1F7A30C499.quest_desc': L(
      '&7The &c&lred&r&7, &9&lblue&r&7, &e&lyellow&r&7 and &5&lpurple&r&7 trophies: you have earned all four.',
      '',
      '&a&lThis one is the proof.',
    ),
  });
}

/* ===================================================== 2026-11-01 — no Minion Workshop
 * The 2026-10-24 Minion Workshop (one repeatable quest per minion tier) was
 * taken out on the user's request: pixelgo_minions 4.0.0 crafts tier I at the
 * bench again (`pixelgo_minions:minion_upgrade`) and upgrades every later tier
 * inside the minion itself. minions.json is no longer read. */

/* ===================================================== 2026-10-24 — Mega Evolution, Pixelmon 9.4.2
 * The chapter had one quest per Mega Stone up to Pixelmon 9.3 (47). Missing: the five
 * 9.4.2 stones (Clefable, Chimecho, Eelektross, Drampa, Zeraora) and the six of 9.4.0
 * (Raichu X/Y, Starmie, Dragonite, Darkrai, Chandelure). They take a new row under the
 * others, in Pokédex order, with the same rewards (XL Exp. Candy + Mystery Epic Bag).
 * 58 stones = ItemRegistration.MEGA_STONES of Pixelmon 9.4.2; Mega Rayquaza needs none. */
{
  const NEW_STONES = ['raichunite_x', 'raichunite_y', 'clefablite', 'starminite', 'dragoninite',
    'chimechite', 'darkranite', 'eelektrossite', 'chandelurite', 'drampanite', 'zeraorite'];
  QUESTS['mega_evolution.snbt'] = NEW_STONES.map((s, i) => ({
    id: hid('megastone:' + s),
    dependencies: ['2E0CDB2758CC71AC'],
    x: -5.0 + i, y: 3.0,
    rewards: [
      { id: hid('megastone-candy:' + s), item: 'pixelmon:xl_exp_candy' },
      { id: hid('megastone-bag:' + s), bag: 'pixelgo:tier3' },
    ],
    task: { id: hid('megastone-task:' + s), type: 'item', item: 'pixelmon:' + s },
  }));
  Object.assign(LANG, {
    'quest.2E0CDB2758CC71AC.quest_desc': L(
      '&7The &a&lMega Key&r&7 summons one of the &f&l59&r&7 Mega Evolutions, picked at random, as an &b&lUltimate&r&7 boss: always shiny and far stronger than anything wild.',
      '',
      '&e&lWHAT YOU GET',
      '&7&l- &7Beat it the first time and its &d&lMega Stone&r&7 is yours. Beat the same Mega again and the stone only comes back now and then.',
      '&7&l- &d&lMega Stones&r&7 also turn up in structure loot chests.',
      '&7&l- &7Every quest on this page wants one stone: &f&l58&r&7 in all, since &d&lMega Rayquaza&r&7 needs none.',
      '',
      '&c&lOne summon every 5 minutes.&r &7The key is used up when the boss appears.',
    ),
  });
}

/* ===================================================== 2026-11-08 — PixelGO Items
 * On request, every `pixelgoitems:*` item was taken out of every loot source
 * (Mystery Bags, structure chests, Pokémon drops, Poké Chests, raids, the FTB
 * `ticket` / `supra_reward` tables). They now come from their recipes and from
 * this book, two ways:
 *   1. a chapter (pixelgo_items.snbt, PIXELMON group, after the Challenges):
 *      one "get it" quest per item (the trophies stay in the Challenges);
 *   2. EXTRA_REWARDS — PixelGO Items added as rewards to quests that already
 *      exist, applied by rewards.mjs (generate.mjs never rewrites a quest).
 * No card spells a recipe out: the machine is named, JEI has the rest. */
export const PGI_STATS = [
  ['hp', 'HP'], ['atk', 'Attack'], ['def', 'Defence'], ['spatk', 'Sp. Attack'], ['spdef', 'Sp. Defence'], ['spd', 'Speed'],
];
/** { file, quest, items: [[item id, count], ...], ids: [reward id, ...] } — read by rewards.mjs */
export const EXTRA_REWARDS = [];

CHAPTERS['pixelgo_items.snbt'] = {
  id: hid('chapter:pixelgo_items'),
  group: '1A3BB00B8761BF8C', // -=[ PIXELMON ]=-
  order_index: 13, // after the Pokémon Challenges (12)
  icon: 'pixelgoitems:shiny_swapper',
  title: '- PixelGO Items',
};

{
  const PGI = (n) => `pixelgoitems:${n}`;
  const BENCH = '&7Crafted at the workbench - &bJEI&7 has the recipe.';
  const INFUSER = '&7Made in the &a&lMetallurgic Infuser&r&7 (Mekanism) - &bJEI&7 has the recipe.';
  const BADGES = '&7The &e&lbadges&r&7 of the Battle Towers hand them out too.';
  const PIECE = { Cap: 'hat', Jacket: 'chest', Trousers: 'legs', Boots: 'feet' };
  const ROWS = [
    { label: 'TRAINER TOOLS', items: [
      { n: 'healer', title: 'Healer', money: 300, sub: 'Heal your team anywhere',
        desc: ['&7Right-click to heal your whole team, wherever you are.', '', '&e&lCOOLDOWN', '&f&l5&r&7 minutes between two uses.', '', BENCH] },
      { n: 'upgraded_healer', title: 'Upgraded Healer', money: 1500, sub: 'The same, every 2 minutes', after: 'healer',
        desc: ['&7Heals your whole team like the &a&lHealer&r&7, with a much shorter cooldown: &f&l2&r&7 minutes.', '', BENCH] },
      { n: 'laptop', title: 'Laptop', money: 500, sub: 'Your PC, in your pocket',
        desc: ['&7Right-click to open your &a&lPC&r&7 from anywhere. No more walking home to swap your team.', '', BENCH] },
      { n: 'trading_sim', title: 'Trading Simulator', money: 500, sub: 'Trade evolutions, alone',
        desc: ['&7Trade two of &nyour own&r&7 Pokémon with each other, and trade evolutions happen as if a second player were there.', '',
          '&e&lHOW', '&7&l- &7Left-click the first Pokémon.', '&7&l- &7Right-click the second one.', '', BENCH] },
      { n: 'gym_finder', title: 'Gym Finder', money: 300, sub: 'Where is the nearest gym?',
        desc: ['&7Right-click to locate the nearest &a&lPixelmon gym&r&7, up to &f&l100&r&7 chunks away.', '', BENCH] },
      { n: 'enchanted_egg', title: 'Enchanted Egg', money: 2500, sub: 'A random Pokémon, for a Nether Star',
        desc: ['&7Right-click to feed it and hatch a completely random Pokémon.', '',
          '&c&lEvery use eats a Nether Star&r&7 from your inventory, and the egg then rests for &f&l10&r&7 minutes.', '', BENCH] },
      { n: 'old_chisel', title: 'Old Chisel', money: 1500, sub: 'Statues, no permission needed',
        desc: ['&7Place and edit &a&lPokémon statues&r&7 without needing a permission.', '', BENCH] },
      { n: 'max_raid_summoner', title: 'Max Raid Summoner', money: 1500, sub: 'A Max Raid den, here and now',
        desc: ['&7Right-click the ground to raise a &a&lMax Raid&r&7 den, then right-click the den to join.', '',
          '&c&lNot every biome has a Max Raid.&r &7If none can spawn where you stand, nothing appears.', '', BENCH] },
      { n: 'tera_raid_summoner', title: 'Tera Raid Summoner', money: 1500, sub: 'A Tera Raid den, here and now',
        desc: ['&7Right-click the ground to raise a &a&lTera Raid&r&7 den, then right-click the den to join.', '',
          '&c&lNot every biome has a Tera Raid.&r &7If none can spawn where you stand, nothing appears.', '', BENCH] },
    ] },
    { label: 'EV TRAINING', items: [
      ...PGI_STATS.map(([k, name]) => ({ n: `add_ev_${k}`, title: `Add EV ${k.toUpperCase()}`, money: 100, sub: `+20 ${name} EVs`,
        desc: [`&7Right-click one of your Pokémon to add &f&l20&r&7 ${name} EVs.`, '&7At most &f&l252&r&7 in one stat and &f&l510&r&7 in all.', '',
          INFUSER, BADGES] })),
      { n: 'random_ev', title: 'Random EV', money: 300, sub: 'Reroll every EV',
        desc: ['&7Right-click one of your Pokémon to reroll &nall&r&7 of its EVs at random.', '',
          '&c&lA reroll can go down as well as up.', '',
          '&7Crafted at the workbench, or made in the &a&lAlloy Smelter&r&7 (Ender IO) - &bJEI&7 has both.'] },
    ] },
    { label: 'IV TRAINING', items: [
      ...PGI_STATS.map(([k, name]) => ({ n: `add_iv_${k}`, title: `Add IV ${k.toUpperCase()}`, money: 250, sub: `+1 ${name} IV`,
        desc: [`&7Right-click one of your Pokémon to raise its ${name} IV by &f&l1&r&7, up to &f&l31&r&7.`, '',
          INFUSER, BADGES] })),
      { n: 'random_iv', title: 'Random IV', money: 1000, sub: 'Reroll every IV',
        desc: ['&7Right-click one of your Pokémon to reroll &nall&r&7 of its IVs at random.', '',
          '&c&lA reroll can go down as well as up.&r &7Do not use it on a Pokémon you are happy with.', '',
          '&7Crafted at the workbench, or made in the &a&lSoul Binder&r&7 (Ender IO) - &bJEI&7 has both.'] },
    ] },
    { label: 'GIMMICKS', items: [
      { n: 'random_level', title: 'Random Level', money: 500, sub: 'Anywhere from 1 to 100',
        desc: ['&7Right-click one of your Pokémon to set it to a random level between &f&l1&r&7 and &f&l100&r&7.', '',
          '&c&lIt can send a level 90 back to level 3.', '',
          '&7Made in the &a&lEnrichment Chamber&r&7 (Mekanism) - &bJEI&7 has the recipe.'] },
      { n: 'size_randomizer', title: 'Random Size', money: 500, sub: 'Tiny, huge, or in between',
        desc: ['&7Right-click one of your Pokémon to give it a random size.', '',
          '&7Crafted at the workbench, or made in the &a&lSolidifier&r&7 (Cyclic) - &bJEI&7 has both.'] },
      { n: 'skin_swapper', title: 'Skin Swapper', money: 2000, sub: 'A random alternate skin',
        desc: ['&7Right-click one of your Pokémon to give it a random alternate skin.', '', BENCH] },
      { n: 'shiny_swapper', title: 'Shiny Swapper', money: 10000, sub: 'Shiny, or back to normal',
        desc: ['&7Right-click one of your Pokémon to turn it &e&lshiny&r&7 - or back to normal if it already is.', '&7It works on any Pokémon you own, Legendaries included.', '', BENCH] },
      { n: 'random_fossil', title: 'Random Fossil', money: 500, sub: 'Any Pokémon, out of a fossil',
        desc: ['&7Put it in a &a&lFossil Machine&r&7 to revive a completely random Pokémon.', '',
          '&e&lWHERE IT COMES FROM',
          '&7&l- &7Mine &a&lFossil&r&7 ore with a normal pickaxe: one drops with the usual fossils. &c&lSilk Touch gives the ore block instead.',
          '&7&l- &7Crush raw fossil in the &a&lCrusher&r&7 (Cyclic).'] },
    ] },
    { label: 'OUTFITS', items: [
      ...[['ash', 'World Champion'], ['misty', 'Orange Hair']].flatMap(([set, name]) => Object.entries(PIECE).map(([piece, slot]) => ({
        n: `${set}_${slot}`, title: `${name} ${piece}`, money: 100, sub: `Part of the ${name} outfit`,
        desc: [`&7One of the four pieces of the &a&l${name}&r&7 outfit. Purely for looks.`, '', BENCH,
          set === 'ash' ? '&7The whole outfit is also the reward of &6&lPokémon Master&r&7, in the Badge chapter.'
            : '&7The whole outfit is also the reward of the &9&lCascade Badge&r&7, in the Badge chapter.'],
      }))),
    ] },
  ];

  const STEP = 1.5, ROW_Y = 1.75, OUTFIT_GAP = 0.75;
  const INTRO = hid('pgi:intro');
  const qs = [];
  const lang = {};
  const ids = {};
  ROWS.forEach((row, ri) => {
    row.items.forEach((it, i) => {
      const id = hid('pgi:' + it.n);
      ids[it.n] = id;
      const gap = row.label === 'OUTFITS' && i >= 4 ? OUTFIT_GAP : 0;
      qs.push({
        id,
        dependencies: [it.after ? ids[it.after] : INTRO],
        ...(it.after ? {} : { hideDependencyLines: true }),
        x: STEP * i + gap, y: ri * ROW_Y,
        rewards: [{ id: hid('pgi-reward:' + it.n), money: it.money }],
        task: { id: hid('pgi-task:' + it.n), type: 'item', item: PGI(it.n) },
      });
      lang[`quest.${id}.title`] = `&a&l${it.title}`;
      lang[`quest.${id}.quest_subtitle`] = `&7${it.sub}`;
      lang[`quest.${id}.quest_desc`] = it.desc;
    });
  });
  qs.unshift({
    id: INTRO,
    icon: 'pixelgoitems:shiny_swapper',
    x: -3.0, y: (ROWS.length - 1) * ROW_Y / 2, size: 2.0, shape: 'gear',
    rewards: [{ id: hid('pgi-reward:intro'), money: 100 }],
    task: { id: hid('pgi-task:intro'), type: 'checkmark' },
  });
  QUESTS['pixelgo_items.snbt'] = qs;

  Object.assign(LANG, lang, {
    [`quest.${INTRO}.title`]: '&6&lPixelGO Items',
    [`quest.${INTRO}.quest_subtitle`]: '&7Tools and tweaks for your team',
    [`quest.${INTRO}.quest_desc`]: L(
      '&7Trainer tools, EV and IV training, gimmicks and two outfits. One quest per item on this page: get it once and the quest is done.',
      '',
      '&e&lTHE ROWS',
      '&7&l- &a&lTrainer tools&r&7: heal, PC, trades, raids, statues',
      '&7&l- &a&lEV training&r&7 and &a&lIV training&r&7: one stat at a time, or a reroll of all six',
      '&7&l- &a&lGimmicks&r&7: level, size, skin, shiny, fossil',
      '&7&l- &a&lOutfits&r&7: World Champion and Orange Hair',
      '',
      '&c&lNever found in loot.&r &7No chest, Mystery Bag, Pokémon drop, Poké Chest or raid gives a PixelGO Item. They are crafted, made in machines, or earned in this book.',
      '',
      '&e&lQUESTS THAT GIVE THEM',
      '&7&l- &7Every &e&lbadge&r&7 of the Battle Towers: EV and IV items, more as the floors go up',
      '&7&l- &7The &e&lPokédex&r&7 milestones, the &e&lChallenge&r&7 trophies, &e&lPokédoll Master&r&7',
      '&7&l- &7The &a&lFossil Machine&r&7, the &a&lDay Care&r&7 and the &e&lItem of Evolution&r&7 chapter',
      '',
      '&7&oThe five trophies are in the Pokémon Challenges chapter.',
    ),
    // stale cards elsewhere in the book: they still sent players to shops, chests and bags
    'quest.361F2484977B7C2F.quest_desc': L(
      '&7&a&lPixelGO Items&r&7 raise a single IV by one point, up to &f&l31&r&7. They come out of the &a&lMetallurgic Infuser&r&7 (Mekanism) and from the &e&lbadges&r&7 of the Battle Towers - see the &6&lPixelGO Items&r&7 chapter.',
    ),
    'quest.60542DE7B1C71E7A.quest_desc': L(
      '&7The rarest of them all: it is crafted (see &bJEI&7) or earned - the &e&lPokédex&r&7 at 100% and the &8&lSoul Sand Trophy&r&7 each give one. No chest or bag holds it any more.',
    ),
  });

  /* ---------------------------------------------- 2. rewards on existing quests
   * rewards.mjs adds each item as an item reward of that quest, once (the reward
   * id is a hash of quest + item, so a second run finds it again). */
  const R = (file, quest, ...items) => ({ file, quest, items: items.map(([n, c]) => [PGI(n), c || 1]) });
  const rewards = [];

  // Battle Tower badges: 3 spires x 7 floors x 4 badges. The reward climbs with the
  // floor; the stat turns round the six, so every spire hands out every stat.
  const FLOOR = {
    1: (s) => [[`add_ev_${s}`, 2]], 2: (s) => [[`add_ev_${s}`, 3]], 3: () => [['random_ev']],
    4: (s) => [[`add_iv_${s}`]], 5: (s) => [[`add_iv_${s}`, 2]], 6: (s) => [[`add_iv_${s}`, 3]], 7: () => [['random_iv']],
  };
  const arena = fs.readFileSync(new URL('../../config/ftbquests/quests/chapters/arena.snbt', import.meta.url), 'utf8').replace(/\r/g, '');
  const qlang = fs.readFileSync(new URL('../../config/ftbquests/quests/lang/en_us.snbt', import.meta.url), 'utf8');
  const badges = [];
  for (const block of arena.split('\n\t\t{\n').slice(1)) {
    const id = /^\t\t\tid: "([0-9A-F]{16})"/m.exec(block)?.[1];
    const badge = /item: \{ count: 1, id: "(pixelmon:[a-z_]+_badge[a-z_]*)" \}/.exec(block)?.[1];
    const raw = id && new RegExp(`quest\\.${id}\\.quest_subtitle: "([^"]*)"`).exec(qlang)?.[1];
    const sub = raw && /(\w+) Spire - Floor (\d)/.exec(raw.replace(/&#[0-9A-Fa-f]{6}|&./g, ''));
    if (id && badge && sub) {
      badges.push({ id, spire: sub[1], floor: +sub[2],
        x: +/\n\t\t\tx: ([-\d.]+)d/.exec('\n' + block)[1], y: +/\n\t\t\ty: ([-\d.]+)d/.exec('\n' + block)[1] });
    }
  }
  if (badges.length !== 84) throw new Error(`content.mjs: expected 84 Battle Tower badges in arena.snbt, found ${badges.length}`);
  for (const spire of [...new Set(badges.map((b) => b.spire))].sort()) {
    badges.filter((b) => b.spire === spire)
      .sort((a, b) => a.floor - b.floor || a.y - b.y || a.x - b.x)
      .forEach((b, i) => rewards.push(R('arena.snbt', b.id, ...FLOOR[b.floor](PGI_STATS[i % 6][0]))));
  }
  rewards.push(R('arena.snbt', '6DFB952588AB8D81', ['misty_hat'], ['misty_chest'], ['misty_legs'], ['misty_feet'])); // Cascade Badge, Misty's
  rewards.push(R('arena.snbt', '2552C92F0E289F9F', ['ash_hat'], ['ash_chest'], ['ash_legs'], ['ash_feet'])); //      Pokémon Master

  // Pokédex milestones 20 / 40 / 60 / 80 / 100 %
  rewards.push(R('pokedex.snbt', '33D93ED6DB0267BA', ['healer']));
  rewards.push(R('pokedex.snbt', '72A80B8D6B03A0E6', ['laptop']));
  rewards.push(R('pokedex.snbt', '58394DDD314DB759', ['random_iv'], ['size_randomizer']));
  rewards.push(R('pokedex.snbt', '35B8BB6FF60EC071', ['upgraded_healer'], ['skin_swapper']));
  rewards.push(R('pokedex.snbt', '33D88A4C271515B1', ['shiny_swapper']));

  // Pokémon Challenges trophies
  rewards.push(R('challenges.snbt', hid('challenge-trophy:red'), ['random_level', 2]));
  rewards.push(R('challenges.snbt', hid('challenge-trophy:blue'), ['size_randomizer', 2]));
  rewards.push(R('challenges.snbt', hid('challenge-trophy:yellow'), ['skin_swapper']));
  rewards.push(R('challenges.snbt', hid('challenge-trophy:purple'), ['max_raid_summoner'], ['tera_raid_summoner']));
  rewards.push(R('challenges.snbt', '2C5D8E1F7A30C499', ['shiny_swapper'])); // Soul Sand Trophy

  // one each where the item belongs
  rewards.push(R('pokedolls.snbt', '2C5D8E1F7A30D120', ['old_chisel'], ['skin_swapper'])); // Pokédoll Master
  rewards.push(R('fossils.snbt', '65633318191A811E', ['random_fossil', 2])); //             Fossil Machine
  rewards.push(R('other_evolution.snbt', '6E080BC90ECDB014', ['enchanted_egg'])); //         Day Care
  rewards.push(R('objects_of_evolution.snbt', '4379ECD2E57F184D', ['trading_sim'])); //      Item of Evolution intro (trade evolutions)

  EXTRA_REWARDS.push(...rewards.map((r) => ({ ...r, ids: r.items.map(([item]) => hid(`pgi-extra:${r.quest}:${item}`)) })));
}

/* ------------------------------------------ Battle Tower trophies + Pokémon League
 * 2026-11-09. Read out of pixelgobattletower 2.0:
 *   - trophies       item.pixelgobattletower.<tower>_trophy, given by the mod when all
 *                    28 Trainers of a tower are beaten ([rewards] giveTrophies = true)
 *   - league         worldgen/structure_set/pokemon_league.json (random_spread 44/18),
 *                    biome tag has_structure/pokemon_league (jagged/frozen/stony peaks,
 *                    snowy slopes), 1 league_reliquary chest, 12 Champions + the Rival
 *   - teams          kubejs/data/pixelgobattletower/.../league/lg_c01..12.json (pack
 *                    overrides) and the jar's lg_rival.json
 *   - rules          config/pixelgobattletower-common.toml: levels copy the strongest
 *                    Pokémon (HIGHEST), +0 bonus, vanishOnDefeat = true,
 *                    rivalNeedsAllChampions = false; LeagueTrainers.CHAMPION_REWARD
 *   - progress       advancements league_enter / league_clear / league_rival (all
 *                    "impossible" criteria granted by the mod) -> FTB advancement tasks
 *   - commands       /battletower (alias /bt) locate [tower|league], /battletower progress
 * The Rival, Kyusama, is the pack's author. */
const TROPHIES = [
  { key: 'solaris', name: 'Solaris Spire', ink: '&6&l', x: -3.0 },
  { key: 'tidal', name: 'Tidal Spire', ink: '&b&l', x: 0.0 },
  { key: 'umbral', name: 'Umbral Spire', ink: '&5&l', x: 3.0 },
].map((t) => ({ ...t, id: hid('bt-trophy:' + t.key) }));

QUESTS['arena.snbt'] = [
  ...(QUESTS['arena.snbt'] || []),
  ...TROPHIES.map((t) => ({
    id: t.id,
    x: t.x, y: 10.0, size: 1.5, shape: 'gear',
    rewards: [
      { id: hid('bt-trophy-money:' + t.key), money: 5000 },
      { id: hid('bt-trophy-bag:' + t.key), bag: 'pixelgo:tier4' },
      { id: hid('bt-trophy-loot:' + t.key), loot: 2 },
    ],
    task: { id: hid('bt-trophy-task:' + t.key), type: 'item', item: `pixelgobattletower:${t.key}_trophy` },
  })),
];

Object.assign(LANG, Object.fromEntries(TROPHIES.flatMap((t) => [
  [`quest.${t.id}.title`, `${t.ink}${t.name} Trophy`],
  [`quest.${t.id}.quest_subtitle`, `&7All 28 Trainers of the ${t.name}`],
  [`quest.${t.id}.quest_desc`, L(
    `&7Beat &f&levery one&r&7 of the &f&l28&r&7 Trainers of a ${t.ink}${t.name}&r&7, all seven floors, and the tower hands you its &d&lTrophy&r&7 on the spot.`,
    '',
    '&7The trophy is &anot consumed&7: it stays yours as proof of the climb.',
    '',
    '&7&oThree tower trophies here, and a fourth one at the end of the &e&lPokémon League&r&7&o chapter.',
  )],
])));

const LEAGUE_ID = '2C5D8E1F7A30E011';
CHAPTERS['league.snbt'] = {
  id: LEAGUE_ID,
  group: '1A3BB00B8761BF8C', // -=[ PIXELMON ]=-
  order_index: 14, // after PixelGO Items (13)
  icon: 'pixelgobattletower:league_trophy',
  title: '- Pokémon League',
};

const CHAMPIONS = [
  ['c01', 'Blue', 'Kanto', 'Red / Blue', ['Pidgeot', 'Alakazam', 'Rhydon', 'Exeggutor', 'Arcanine', 'Blastoise']],
  ['c02', 'Lance', 'Johto', 'Gold / Silver / Crystal', ['Gyarados', 'Dragonite', 'Dragonite', 'Dragonite', 'Aerodactyl', 'Charizard']],
  ['c03', 'Steven Stone', 'Hoenn', 'Ruby / Sapphire', ['Skarmory', 'Claydol', 'Aggron', 'Cradily', 'Armaldo', 'Metagross']],
  ['c04', 'Wallace', 'Hoenn', 'Emerald', ['Wailord', 'Tentacruel', 'Ludicolo', 'Whiscash', 'Gyarados', 'Milotic']],
  ['c05', 'Cynthia', 'Sinnoh', 'Diamond / Pearl', ['Spiritomb', 'Roserade', 'Gastrodon', 'Lucario', 'Milotic', 'Garchomp']],
  ['c06', 'Cynthia', 'Sinnoh', 'Platinum', ['Spiritomb', 'Roserade', 'Togekiss', 'Lucario', 'Milotic', 'Garchomp']],
  ['c07', 'Alder', 'Unova', 'Black / White', ['Accelgor', 'Bouffalant', 'Druddigon', 'Vanilluxe', 'Escavalier', 'Volcarona']],
  ['c08', 'Iris', 'Unova', 'Black 2 / White 2', ['Hydreigon', 'Druddigon', 'Aggron', 'Archeops', 'Lapras', 'Haxorus']],
  ['c09', 'Diantha', 'Kalos', 'X / Y', ['Hawlucha', 'Tyrantrum', 'Aurorus', 'Gourgeist', 'Goodra', 'Gardevoir']],
  ['c10', 'Professor Kukui', 'Alola', 'Sun / Moon', ['Lycanroc', 'Ninetales', 'Braviary', 'Magnezone', 'Snorlax', 'Primarina']],
  ['c11', 'Leon', 'Galar', 'Sword / Shield', ['Aegislash', 'Dragapult', 'Haxorus', 'Seismitoad', 'Inteleon', 'Charizard']],
  ['c12', 'Geeta', 'Paldea', 'Scarlet / Violet', ['Espathra', 'Gogoat', 'Veluza', 'Avalugg', 'Kingambit', 'Glimmora']],
].map(([key, name, region, games, team], i) => ({ key, name, region, games, team, i, id: hid('league-champion:' + key) }));

const LG = {
  intro: hid('league:intro'),
  first: hid('league:first'),
  clear: hid('league:clear'),
  rival: hid('league:rival'),
  trophy: hid('league:trophy'),
};
const ADV = (id, adv) => ({ id, type: 'advancement', data: { advancement: `pixelgobattletower:${adv}`, criterion: '' } });

QUESTS['league.snbt'] = [
  {
    id: LG.intro, icon: 'pixelgobattletower:league_trophy',
    x: 0.0, y: 0.0, size: 2.0, shape: 'gear',
    rewards: [{ id: hid('league:intro-money'), money: 100 }],
    task: { id: hid('league:intro-task'), type: 'checkmark' },
  },
  {
    id: LG.first, dependencies: [LG.intro],
    x: 0.0, y: 2.5,
    rewards: [{ id: hid('league:first-money'), money: 2500 }, { id: hid('league:first-bag'), bag: 'pixelgo:tier3' }],
    task: ADV(hid('league:first-task'), 'league_enter'),
  },
  ...CHAMPIONS.map((c) => ({
    id: c.id, dependencies: [LG.first], hideDependencyLines: true,
    x: -3.75 + 1.5 * (c.i % 6), y: 4.5 + 1.5 * Math.floor(c.i / 6),
    rewards: [],
    task: { id: hid('league-champion-task:' + c.key), type: 'checkmark' },
  })),
  {
    id: LG.clear, dependencies: [LG.first],
    x: 0.0, y: 8.5, size: 1.5,
    rewards: [{ id: hid('league:clear-money'), money: 7500 }, { id: hid('league:clear-bag'), bag: 'pixelgo:tier4' }, { id: hid('league:clear-loot'), loot: 2 }],
    task: ADV(hid('league:clear-task'), 'league_clear'),
  },
  {
    id: LG.rival, dependencies: [LG.clear],
    x: 0.0, y: 11.0, size: 2.5, shape: 'gear',
    rewards: [{ id: hid('league:rival-money'), money: 7500 }, { id: hid('league:rival-bag'), bag: 'pixelgo:tier4' }, { id: hid('league:rival-loot'), loot: 3 }],
    task: ADV(hid('league:rival-task'), 'league_rival'),
  },
  {
    id: LG.trophy, dependencies: [LG.rival],
    x: 0.0, y: 13.5, size: 1.5,
    rewards: [{ id: hid('league:trophy-bag'), bag: 'pixelgo:tier4' }, { id: hid('league:trophy-loot'), loot: 3 }],
    task: { id: hid('league:trophy-task'), type: 'item', item: 'pixelgobattletower:league_trophy' },
  },
];

Object.assign(LANG, {
  [`quest.${LG.intro}.title`]: '&e&lThe Pokémon League',
  [`quest.${LG.intro}.quest_subtitle`]: '&7Twelve Champions, one Rival, one trophy',
  [`quest.${LG.intro}.quest_desc`]: L(
    '&7&oA citadel of grey stone on the highest peaks, where every Champion waits.',
    '',
    '&7The Battle Towers were the climb. The &e&lPokémon League&r&7 is the summit: &f&l12 Champions&r&7, one from every region from &fKanto&7 to &fPaldea&7, and at the far end of the nave, &6&lthe Rival&r&7.',
    '',
    '&e&lFINDING IT',
    '&7&l- &7It generates in the &a&lOverworld Mirror&r&7, on mountain tops only: &fjagged, frozen and stony peaks&7, and &fsnowy slopes',
    '&7&l- &7Much rarer than a tower: about one every &f&l44 chunks&r&7, and only where there is a peak',
    '&7&l- &b/battletower locate league&7 (or &b/bt&7) points you to the nearest one',
    '&7&l- &7The Mirror runs on the &c&ldimension timer&r&7: go in with time to spare',
    '',
    '&e&lHOW THE BATTLES WORK',
    '&7&l- &7Right-click a Champion to challenge them. &a&lHeal first&r&7: with a fainted team they turn you away',
    '&7&l- &7Every Champion runs &f&l6 Pokémon&r&7 with &f&l31 IVs&r&7, full EV spreads, held items and built movesets',
    '&7&l- &7Their level &f&lcopies your strongest Pokémon&r&7, exactly like in the towers',
    '&7&l- &7Each Champion beaten pays &6&l200 000 PokéDollars',
    '',
    '&c&lA beaten Champion leaves for good. &7They vanish from the League once they lose, for everyone. On a server, the next player has to find another League.',
    '',
    '&e&lTHE RELIQUARY',
    '&7One chest in the citadel: Gold Bottle Caps, Ability Patches, Rare Candies, competitive held items and a few treasures.',
    '',
    '&e&lYOUR PROGRESS',
    '&b/battletower progress&7 lists your towers and how many Champions you have beaten.',
  ),

  [`quest.${LG.first}.title`]: '&a&lFirst Champion',
  [`quest.${LG.first}.quest_subtitle`]: '&7Beat any one of the twelve',
  [`quest.${LG.first}.quest_desc`]: L(
    '&7Beat your first &e&lLeague Champion&r&7, any of them, in any order.',
    '',
    '&7The cards below list who waits in the citadel and what they bring. Read them before you walk in: a Champion who beats you is still there tomorrow, but one you beat is gone.',
  ),

  [`quest.${LG.clear}.title`]: '&6&lTwelve Regions',
  [`quest.${LG.clear}.quest_subtitle`]: '&7Every Champion, Kanto to Paldea',
  [`quest.${LG.clear}.quest_desc`]: L(
    '&7Beat &f&lall twelve&r&7 League Champions.',
    '',
    '&7When the last one falls, the League tells you: &o"The Rival is waiting at the end of the nave."',
  ),

  [`quest.${LG.rival}.title`]: '&6&lThe Rival - Kyusama',
  [`quest.${LG.rival}.quest_subtitle`]: '&6The creator of PixelGO. The final boss.',
  [`quest.${LG.rival}.quest_desc`]: L(
    '&7&o"Twelve Champions. Twelve regions. I built the towers, I built this hall, then I sat down and waited. Last one, challenger. Make it count."',
    '',
    '&6&lKyusama&r&7 made this modpack: the islands, the Gates, the towers, this League. He sits at the far end of the nave, and he is the &c&llast battle of PixelGO&r&7.',
    '',
    '&e&lHIS TEAM',
    '&7A rain team, built like a competitive one:',
    '&7&l- &d&lPolitoed&r&7 &8- &7Drizzle, sets the rain',
    '&7&l- &d&lIncineroar&r&7 &8- &7Intimidate, Fake Out, Parting Shot',
    '&7&l- &d&lRillaboom&r&7 &8- &7Grassy Surge, Grassy Glide',
    '&7&l- &d&lArchaludon&r&7 &8- &7Electro Shot, charged instantly in the rain',
    '&7&l- &d&lFroslass&r&7 &8- &7Aurora Veil and Blizzard',
    '&7&l- &d&lGengar&r&7 &8- &7holding its &5&lGengarite',
    '&7Perfect IVs, full EVs, and like every Champion his level copies your strongest Pokémon.',
    '',
    '&e&lWHEN TO FACE HIM',
    '&7The League does not lock him behind the Champions: you can challenge him whenever you dare. This quest only opens once &6&lTwelve Regions&r&7 is done, because that is how the story ends.',
    '',
    '&7&oLose, and he tells you: "Rain, grass, a veil and six answers - you found four. Think about the first two turns and come back."',
  ),

  [`quest.${LG.trophy}.title`]: '&e&lPokémon League Trophy',
  [`quest.${LG.trophy}.quest_subtitle`]: '&7Taken from the Rival',
  [`quest.${LG.trophy}.quest_desc`]: L(
    '&7&o"...That is it, then. Every tower, every Champion, and now me. Take the trophy. It was always going to have your name on it."',
    '',
    '&7Beat &6&lKyusama&r&7 and the &e&lPokémon League Trophy&r&7 is yours. It is &anot consumed&7 here.',
    '',
    '&7With the three &d&lSpire Trophies&r&7 of the &e&lBadge&r&7 chapter, that is all four. &a&lYou finished PixelGO.',
  ),
});

Object.assign(LANG, Object.fromEntries(CHAMPIONS.flatMap((c) => [
  [`quest.${c.id}.title`, `&e&l${c.name}`],
  [`quest.${c.id}.quest_subtitle`, `&7${c.region} Champion &8- &7${c.games}`],
  [`quest.${c.id}.quest_desc`, L(
    `&7The &f&l${c.region}&r&7 Champion, from &f${c.games}&7.`,
    '',
    '&e&lTEAM',
    ...c.team.map((p) => `&7&l- &d&l${p}`),
    '',
    '&7Perfect IVs, full EV spreads, held items. Level copies your strongest Pokémon.',
    ...(c.key === 'c06' ? ['', '&7&oYes, Cynthia twice: the Diamond / Pearl team first, the Platinum one after it.'] : []),
    '',
    '&7&oThis card is a guide: tick it once read. Your wins are counted by the quests above and below.',
  )],
])));

/* ------------------------------------------------ PixelGO - Expedition chapter
 * 2026-11-11. Read out of pixelgo_expedition-1.0.0:
 *   - block          pixelgo_expedition:expedition_station (shaped recipe, JEI)
 *   - difficulties   data/.../difficulties: Poké 1+, Great 20+, Ultra 40+, Beast 60+,
 *                    Master 80+ (min Pokémon level)
 *   - expeditions    42 + 18 TM crates; per-tier durations in data/.../expeditions
 *   - progress       advancements completed_1/10/25/50/100 and complete_<ball>
 *                    ("impossible" criteria granted by the mod) -> FTB advancement tasks
 *   - config         config/pixelgo_expedition-server.toml: 6 slots, recall allowed
 *   - commands       /expeditions list | stats | recall <slot> */
const EXP_ID = '2C5D8E1F7A30F011';
CHAPTERS['expeditions.snbt'] = {
  id: EXP_ID,
  group: '1A3BB00B8761BF8C', // -=[ PIXELMON ]=-
  order_index: 15, // after Pokémon League (14)
  icon: 'pixelgo_expedition:expedition_station',
  title: '- Expeditions',
};

const EXA = (id, adv) => ({ id, type: 'advancement', data: { advancement: `pixelgo_expedition:${adv}`, criterion: '' } });
const EX = {
  intro: hid('exp:intro'),
  station: hid('exp:station'),
  first: hid('exp:first'),
};
const EX_BALLS = [
  { key: 'poke_ball', name: 'Poké Ball', ink: '&a&l', lvl: 1, adv: 'Out for a Stroll', money: 200, bag: 'pixelgo:tier1' },
  { key: 'great_ball', name: 'Great Ball', ink: '&e&l', lvl: 20, adv: 'Getting Serious', money: 500, bag: 'pixelgo:tier1' },
  { key: 'ultra_ball', name: 'Ultra Ball', ink: '&6&l', lvl: 40, adv: 'Into the Wild', money: 1500, bag: 'pixelgo:tier2' },
  { key: 'beast_ball', name: 'Beast Ball', ink: '&c&l', lvl: 60, adv: 'Veteran Explorer', money: 3500, bag: 'pixelgo:tier3', loot: 1 },
  { key: 'master_ball', name: 'Master Ball', ink: '&5&l', lvl: 80, adv: 'Expedition Master', money: 7500, bag: 'pixelgo:tier4', loot: 2 },
].map((b, i) => ({ ...b, i, id: hid('exp-ball:' + b.key) }));
const EX_COUNTS = [
  { n: 10, adv: 'Seasoned Scout', money: 500, bag: 'pixelgo:tier1' },
  { n: 25, adv: 'Trailblazer', money: 1500, bag: 'pixelgo:tier2' },
  { n: 50, adv: 'Expedition Planner', money: 3000, bag: 'pixelgo:tier3' },
  { n: 100, adv: 'Legend of the Trail', money: 7500, bag: 'pixelgo:tier4', loot: 2 },
].map((c, i) => ({ ...c, i, id: hid('exp-count:' + c.n) }));

/* guide cards: one per family of expeditions, read from the jar's definitions */
const EX_GUIDES = [
  {
    key: 'training', name: 'Training', icon: 'pixelmon:protein', ink: '&c&l', sub: 'EVs, levels, moves, friendship',
    lines: [
      '&e&lEV TRAINING &8- &730 min, every difficulty',
      '&7&l- &fStrength&7 (Attack), &fGuard&7 (Defence), &fSpeed&7, &fEndurance&7 (HP)',
      '&7&l- &fSpecial Attack&7 and &fSpecial Defence Training',
      '&7&l- &fSprint and Strike&7 (Speed + Attack) and &fFocus Training&7 (Sp. Atk + Sp. Def): Ultra Ball and up, 1h30 to 4h',
      '',
      '&e&lOTHER TRAINING',
      '&7&l- &fBattle Training&7 - the Pokémon gains levels (up to Lv. 99), 15 min',
      '&7&l- &fTeam Drill&7 - your &fwhole party&7 gains experience, 20 min',
      '&7&l- &fMove Lessons&7 - learns a new move, Great Ball and up, 40 min',
      '&7&l- &fDay Out&7 - raises friendship, 15 min',
    ],
  },
  {
    key: 'gathering', name: 'Gathering', icon: 'minecraft:wheat', ink: '&a&l', sub: 'Any Pokémon, 10 min to 1h20',
    lines: [
      '&7Open to every Pokémon. Short runs, the island basics:',
      '&7&l- &fForest Forage&7 - food and wood',
      '&7&l- &fBerry Picking&7 and &fApricorn Harvest&7',
      '&7&l- &fLumber Camp&7 - every kind of log',
      '&7&l- &fQuarry Run&7 - stone, earth and gravel',
      '&7&l- &fFarm Harvest&7 - crops, seeds and bread',
      '&7&l- &fRanch Hand&7 - wool, leather, eggs and meat',
      '&7&l- &fFishing Trip&7',
      '&7&l- &fJungle Trek&7 - bamboo, cocoa and melons',
      '&7&l- &fDesert Trek&7 - sand, cactus and the odd relic',
      '&7&l- &fMeadow Stroll&7 - flowers and beehives, every dye',
      '&7&l- &fMonster Patrol&7 - the drops of the night\'s monsters',
    ],
  },
  {
    key: 'digging', name: 'Digging', icon: 'minecraft:iron_pickaxe', ink: '&7&l', sub: 'Ores, fossils, stones, treasure',
    lines: [
      '&7&l- &fCave Dig&7 - ores. &fRock&7, &fGround&7 and &fSteel&7 types find extra gems',
      '&7&l- &fDeep Mining&7 - deepslate, gold and the odd gem, Great Ball and up',
      '&7&l- &fFossil Dig&7 - fossils, Ultra Ball and up. Most finds are rubble',
      '&7&l- &fStone Prospecting&7 - evolution stones, Ultra Ball and up. &cVery rare',
      '&7&l- &fTreasure Hunt&7 - rare loot, Ultra Ball and up, 30 min',
    ],
  },
  {
    key: 'types', name: 'Type Jobs', icon: 'minecraft:blaze_powder', ink: '&6&l', sub: 'Only the right type may go',
    lines: [
      '&7These ones check the &ftype&7 of the Pokémon you send:',
      '&7&l- &c&lFire&r&7 - &fForge Duty&7: smelted goods rather than raw ore',
      '&7&l- &9&lWater&r&7 - &fDeep Dive&7: coral, prismarine, sea treasures',
      '&7&l- &a&lGrass&r&7 - &fOrchard Tending&7: saplings, mushrooms, moss',
      '&7&l- &e&lElectric&r&7 - &fPower the Grid&7: redstone machinery',
      '&7&l- &5&lGhost&r&7 - &fGraveyard Shift&7: crypts and deep dark corners',
      '&7&l- &f&lFlying&r&7 - &fAerial Scouting',
      '&7&l- &b&lIce&r&7 - &fGlacier Survey',
      '',
      '&7And two that check the &fspecies&7:',
      '&7&l- &fPay Day&7 - &fMeowth&7 and &fPersian&7 only',
      '&7&l- &fScavenger&7 - the Pickup Pokémon: Aipom, Ambipom, Phanpy, Donphan, Teddiursa, Ursaring, Zigzagoon, Linoone, Pachirisu',
    ],
  },
  {
    key: 'pokemon', name: 'New Pokémon', icon: 'pixelmon:poke_ball', ink: '&d&l', sub: 'Someone comes back with a friend',
    lines: [
      '&7&l- &fWild Encounter&7 - a wild Pokémon takes a liking to yours and joins your team. Higher difficulties find rarer ones. 1h to 4h',
      '&7&l- &fHatchling Search&7 - finds a newborn Pokémon, Great and Ultra Ball, 1h to 2h',
      '',
      '&7Rarity follows the catch rate of the species: the harder a Pokémon is to catch, the rarer it comes back.',
      '&c&lMake room first: &7the newcomer goes to your party or PC, and a full PC blocks the claim.',
    ],
  },
  {
    key: 'worlds', name: 'Other Worlds', icon: 'minecraft:ender_pearl', ink: '&5&l', sub: 'The Nether and the End, without the timer',
    lines: [
      '&7&l- &fNether Foray&7 - Nether blocks, gold and blaze rods',
      '&7&l- &fEnd Expedition&7 - end stone, chorus and ender pearls',
      '',
      '&7Both are Ultra Ball and up (Lv. &f40+&7), 1h to 3h.',
      '&7Your Pokémon goes there for you: no &c&ldimension timer&r&7 to watch.',
    ],
  },
  {
    key: 'tms', name: 'TM Crates', icon: 'pixelmon:fire_gem', ink: '&b&l', sub: 'Eighteen types, random TMs',
    lines: [
      '&7One &fMystery TM Crate&7 per type, &f18&7 in all, from &fBug&7 to &fWater&7.',
      '&7Any Pokémon can go, whatever its type. It brings back random TMs of that type.',
      '',
      '&7&l- &7Every difficulty, 15 min (Poké Ball) to 3h (Master Ball)',
      '&7&l- &7Higher difficulties bring &fstronger moves&7, and two rolls from Beast Ball up',
    ],
  },
].map((g, i) => ({ ...g, i, id: hid('exp-guide:' + g.key) }));

QUESTS['expeditions.snbt'] = [
  {
    id: EX.intro, icon: 'pixelgo_expedition:expedition_station',
    x: 0.0, y: 0.0, size: 2.0, shape: 'gear',
    rewards: [{ id: hid('exp:intro-money'), money: 100 }],
    task: { id: hid('exp:intro-task'), type: 'checkmark' },
  },
  {
    id: EX.station, dependencies: [EX.intro],
    x: 0.0, y: 2.5, size: 1.5,
    rewards: [{ id: hid('exp:station-money'), money: 200 }],
    task: { id: hid('exp:station-task'), type: 'item', item: 'pixelgo_expedition:expedition_station' },
  },
  {
    id: EX.first, dependencies: [EX.station],
    x: 0.0, y: 4.5,
    rewards: [{ id: hid('exp:first-money'), money: 200 }, { id: hid('exp:first-bag'), bag: 'pixelgo:tier1' }],
    task: EXA(hid('exp:first-task'), 'completed_1'),
  },
  ...EX_BALLS.map((b) => ({
    id: b.id, dependencies: [b.i === 0 ? EX.first : EX_BALLS[b.i - 1].id],
    icon: `pixelmon:${b.key}`,
    x: -4.0 + 2 * b.i, y: 6.5, ...(b.key === 'master_ball' ? { size: 1.5, shape: 'gear' } : {}),
    rewards: [
      { id: hid('exp-ball-money:' + b.key), money: b.money },
      { id: hid('exp-ball-bag:' + b.key), bag: b.bag },
      ...(b.loot ? [{ id: hid('exp-ball-loot:' + b.key), loot: b.loot }] : []),
    ],
    task: EXA(hid('exp-ball-task:' + b.key), 'complete_' + b.key),
  })),
  ...EX_COUNTS.map((c) => ({
    id: c.id, dependencies: [c.i === 0 ? EX.first : EX_COUNTS[c.i - 1].id],
    icon: 'minecraft:map',
    x: -3.0 + 2 * c.i, y: 9.0, ...(c.n === 100 ? { size: 1.5, shape: 'gear' } : {}),
    rewards: [
      { id: hid('exp-count-money:' + c.n), money: c.money },
      { id: hid('exp-count-bag:' + c.n), bag: c.bag },
      ...(c.loot ? [{ id: hid('exp-count-loot:' + c.n), loot: c.loot }] : []),
    ],
    task: EXA(hid('exp-count-task:' + c.n), 'completed_' + c.n),
  })),
  ...EX_GUIDES.map((g) => ({
    id: g.id, dependencies: [EX.intro], hideDependencyLines: true, optional: true,
    icon: g.icon,
    x: g.i < 4 ? -7.0 : 7.0, y: (g.i < 4 ? g.i : g.i - 4) * 2.0,
    rewards: [],
    task: { id: hid('exp-guide-task:' + g.key), type: 'checkmark' },
  })),
];

Object.assign(LANG, {
  [`quest.${EX.intro}.title`]: '&e&lExpeditions',
  [`quest.${EX.intro}.quest_subtitle`]: '&7Send your Pokémon out into the world',
  [`quest.${EX.intro}.quest_desc`]: L(
    '&7&oYour island is small. The world is not. Your Pokémon can go and see it for you.',
    '',
    '&7An &e&lExpedition Station&r&7 sends a Pokémon from your &fparty&7 or your &fPC&7 on a timed job. Pick an expedition, pick a difficulty, press &aSend Out&7. When the timer runs out, come back and &aClaim Rewards&7.',
    '',
    '&e&lHOW IT WORKS',
    '&7&l- &7You have &f&l6 slots&r&7: six Pokémon away at the same time',
    '&7&l- &7While it is away, the Pokémon is &cnot&7 in your party or PC',
    '&7&l- &7The clock keeps running while you are offline. You get a chat message when a run is done',
    '&7&l- &7Your running expeditions float above every station',
    '&7&l- &aRecall&7 brings a Pokémon back early, &cwithout any reward',
    '&7&l- &7Claiming needs room in your party or PC, for the Pokémon and its finds',
    '',
    '&e&lDIFFICULTIES',
    ...EX_BALLS.map((b) => `&7&l- ${b.ink}${b.name}&r&7 - Lv. &f${b.lvl}+`),
    '&7Harder runs take longer and bring back much more. Not every expedition offers every difficulty.',
    '',
    '&e&lWHAT CAN GO WHERE',
    '&7Some expeditions only take a &ftype&7 (Fire, Water...) or a &fspecies&7. The station greys out what your Pokémon cannot do; tick &fOnly expeditions your chosen Pokémon can do&7 to hide the rest.',
    '&7The &6JEI&7 category &fExpeditions&7 lists every one of them: requirements, time and possible rewards.',
    '',
    '&e&lCOMMANDS',
    '&b/expeditions list&7 - your slots and what is left on each',
    '&b/expeditions stats&7 - how many runs you have finished',
    '&b/expeditions recall <slot>&7 - recall from anywhere',
    '',
    '&7&oThe cards on both sides sort the expeditions by family.',
  ),

  [`quest.${EX.station}.title`]: '&e&lExpedition Station',
  [`quest.${EX.station}.quest_subtitle`]: '&7The board where every run starts',
  [`quest.${EX.station}.quest_desc`]: L(
    '&7Make an &e&lExpedition Station&r&7. The recipe is in &6JEI&7, nothing on it is rare.',
    '',
    '&7Right-click it to open the expedition board. Any station works: your slots follow &fyou&7, not the block, so a second station elsewhere shows the same six runs.',
  ),

  [`quest.${EX.first}.title`]: '&a&lFirst Steps',
  [`quest.${EX.first}.quest_subtitle`]: '&7Complete one expedition',
  [`quest.${EX.first}.quest_desc`]: L(
    '&7Send a Pokémon out, wait for the timer, claim the rewards.',
    '',
    '&7Start with a &fgathering&7 run on &a&lPoké Ball&r&7 difficulty: 10 minutes, any Pokémon, any level.',
  ),
});

Object.assign(LANG, Object.fromEntries(EX_BALLS.flatMap((b) => [
  [`quest.${b.id}.title`, `${b.ink}${b.name} Difficulty`],
  [`quest.${b.id}.quest_subtitle`, `&7"${b.adv}"`],
  [`quest.${b.id}.quest_desc`, L(
    `&7Complete an expedition on ${b.ink}${b.name}&r&7 difficulty.`,
    '',
    `&7The Pokémon you send must be at least &fLv. ${b.lvl}&7.`,
    ...(b.key === 'beast_ball' ? ['', '&7Beast Ball runs take up to four times longer than Poké Ball ones and bring back about five times as much.'] : []),
    ...(b.key === 'master_ball' ? ['', '&7The top of the ladder: the longest runs, up to &f4 hours&7, and about &f8 times&7 the rewards of a Poké Ball run.'] : []),
  )],
])));

Object.assign(LANG, Object.fromEntries(EX_COUNTS.flatMap((c) => [
  [`quest.${c.id}.title`, c.n === 100 ? `&6&l${c.adv}` : `&e&l${c.adv}`],
  [`quest.${c.id}.quest_subtitle`, `&7Complete ${c.n} expeditions`],
  [`quest.${c.id}.quest_desc`, L(
    `&7Complete &f&l${c.n}&r&7 expeditions, any kind, any difficulty.`,
    '',
    '&7&b/expeditions stats&7 shows how far you are.',
  )],
])));

Object.assign(LANG, Object.fromEntries(EX_GUIDES.flatMap((g) => [
  [`quest.${g.id}.title`, `${g.ink}${g.name}`],
  [`quest.${g.id}.quest_subtitle`, `&7${g.sub}`],
  [`quest.${g.id}.quest_desc`, L(
    ...g.lines,
    '',
    '&7&oThis card is a guide: tick it once read. Exact rewards are in JEI, under Expeditions.',
  )],
])));

/* ------------------------------------------------------ PixelGO - NPC chapter
 * 2026-11-11. Read out of pixelgo_npc-1.1.0:
 *   - rival          Kyusama (the pack's author), ten brackets Lv.10..100 + Zenith Omega;
 *                    presets rival/kyusama_<tier>, spawn set pixelgo_rivals (villages only)
 *   - rewards        assets/pixelgo_npc/jei/rewards.json: first clear only, medal +
 *                    PokéDollars + items; Lv.70/80/90 unlock Mega / Dynamax / Tera
 *   - traders        wanderer (starter + trade evolutions), skin_artisan (palettes),
 *                    legend_broker (legendary for legendary); villages and some biomes
 *   - progress       advancements rival/* and trade/* ("impossible" criteria granted by
 *                    the mod) -> FTB advancement tasks
 *   - config         config/pixelgo_npc-server.toml: 1 rematch after a loss, then a
 *                    15 min lockout; brackets in any order; beacon consumed, 2 min cooldown
 * 58_pnj_sauvages.js keeps rivals and traders out of its 2-NPC cap (rivals live 30 min). */
const RIV_ID = '2C5D8E1F7A30F021';
CHAPTERS['rival.snbt'] = {
  id: RIV_ID,
  group: '1A3BB00B8761BF8C', // -=[ PIXELMON ]=-
  order_index: 16, // after Expeditions (15)
  icon: 'pixelgo_npc:rival_codex',
  title: '- Rival Kyusama',
};

const NPA = (id, adv) => ({ id, type: 'advancement', data: { advancement: `pixelgo_npc:${adv}`, criterion: '' } });
const RV = {
  intro: hid('rival:intro'),
  contact: hid('rival:contact'),
  streak: hid('rival:streak'),
  comeback: hid('rival:comeback'),
  omega: hid('rival:omega'),
  traders: hid('rival:traders'),
};
const RV_TOOLS = [
  { key: 'rival_codex', name: 'Rival Codex', money: 300,
    text: ['&7A holographic dossier of your rivalry: every bracket, its state, your record and the first-clear rewards.', '', '&7Right-click to open it, or bind &fOpen the Rival Codex&7 in &fControls&7 and open it from anywhere.'] },
  { key: 'rival_radar', name: 'Rival Radar', money: 300,
    text: ['&7Right-click to ping the closest rival within &f160 blocks&7: bracket, distance and bearing.', '', '&7Take it into the villages of the &a&lOverworld Mirror&r&7.'] },
  { key: 'rival_wanted_poster', name: 'Rival Wanted Poster', money: 100,
    text: ['&7Place it on a wall and right-click it to read which rival prowls nearby, and how far.', '', '&7It also turns up in village chests.'] },
  { key: 'rival_beacon', name: 'Rival Beacon', money: 500,
    text: ['&7Right-click to call your &fnext uncleared bracket&7 straight to you. Once the ten are cleared, it calls &5&lZenith Omega&r&7.', '', '&c&lThe beacon is used up&r&7 when he answers, and it has a &f2 minute&7 cooldown.', '&7No village needed: this is how you fight him on your island.'] },
].map((t, i) => ({ ...t, i, id: hid('rival-tool:' + t.key) }));
const RV_TIERS = [
  { t: 10, circuit: 'Rookie', money: 200, bag: 'pixelgo:tier1' },
  { t: 20, circuit: 'Trial', money: 400 },
  { t: 30, circuit: 'Rising', money: 600, bag: 'pixelgo:tier1' },
  { t: 40, circuit: 'Veteran', money: 900 },
  { t: 50, circuit: 'Elite', money: 1300, bag: 'pixelgo:tier2' },
  { t: 60, circuit: 'Ace', money: 1800 },
  { t: 70, circuit: 'Master', money: 2500, bag: 'pixelgo:tier2', unlock: 'Mega Evolution' },
  { t: 80, circuit: 'Champion', money: 3500, unlock: 'Dynamax' },
  { t: 90, circuit: 'Legend', money: 5000, bag: 'pixelgo:tier3', unlock: 'Terastallization' },
  { t: 100, circuit: 'Zenith', money: 7500, bag: 'pixelgo:tier3', loot: 1, unlock: 'infinite Tera energy' },
].map((r, i) => ({ ...r, i, id: hid('rival-tier:' + r.t) }));
const RV_TRADES = [
  { key: 'first', adv: 'trade/first', name: 'Dealmaker', sub: 'Close a trade with one of the three traders', x: 7.0, y: 4.5, dep: 'traders', money: 300, bag: 'pixelgo:tier1', icon: 'pixelmon:poke_ball',
    text: ['&7Trade a Pokémon with any of the three traders.'] },
  { key: 'skin', adv: 'trade/skin', name: 'Painted', sub: 'Trade for a Pokémon wearing a pattern', x: 7.0, y: 6.5, dep: 'first', money: 500, icon: 'pixelmon:pink_apricorn',
    text: ['&7Trade with the &d&lPattern Artisan&r&7 and take home a Pokémon wearing a special pattern.'] },
  { key: 'skin_collector', adv: 'trade/skin_collector', name: 'Pattern Collector', sub: 'Five different patterns', x: 7.0, y: 8.5, dep: 'skin', money: 1500, bag: 'pixelgo:tier2', icon: 'pixelmon:pink_apricorn',
    text: ['&7Collect &f&l5&r&7 different Pokémon patterns.'] },
  { key: 'skin_master', adv: 'trade/skin_master', name: 'Gallery Curator', sub: 'Fifteen different patterns', x: 7.0, y: 10.5, dep: 'skin_collector', money: 4000, bag: 'pixelgo:tier3', icon: 'pixelmon:pink_apricorn',
    text: ['&7Collect &f&l15&r&7 different Pokémon patterns.'] },
  { key: 'legendary', adv: 'trade/legendary', name: 'Legend Broker', sub: 'Trade one legendary for another', x: 9.0, y: 6.5, dep: 'first', money: 2500, bag: 'pixelgo:tier3', icon: 'pixelmon:master_ball',
    text: ['&7Hand the &6&lLegend Broker&r&7 a legendary Pokémon and get its counterpart: Regieleki for Regidrago, Heatran for Cresselia, Solgaleo for Lunala...', '', '&7He only deals legendary for legendary. JEI lists every pair under &fRival Trades&7.'] },
  { key: 'legendary_master', adv: 'trade/legendary_master', name: 'Keeper of Legends', sub: 'Five legendary trades', x: 9.0, y: 8.5, dep: 'legendary', money: 7500, bag: 'pixelgo:tier4', loot: 1, icon: 'pixelmon:master_ball',
    text: ['&7Complete &f&l5&r&7 legendary trades with the Legend Broker.'] },
].map((t) => ({ ...t, id: hid('rival-trade:' + t.key) }));

QUESTS['rival.snbt'] = [
  {
    id: RV.intro, icon: 'pixelgo_npc:rival_codex',
    x: 0.0, y: 0.0, size: 2.0, shape: 'gear',
    rewards: [{ id: hid('rival:intro-money'), money: 100 }],
    task: { id: hid('rival:intro-task'), type: 'checkmark' },
  },
  ...RV_TOOLS.map((t) => ({
    id: t.id, dependencies: [RV.intro],
    x: -3.0 + 2 * t.i, y: 2.5,
    rewards: [{ id: hid('rival-tool-money:' + t.key), money: t.money }],
    task: { id: hid('rival-tool-task:' + t.key), type: 'item', item: `pixelgo_npc:${t.key}` },
  })),
  {
    id: RV.contact, dependencies: [RV.intro], icon: 'pixelgo_npc:rival_radar',
    x: 0.0, y: 4.5, size: 1.5,
    rewards: [{ id: hid('rival:contact-money'), money: 200 }],
    task: NPA(hid('rival:contact-task'), 'rival/first_contact'),
  },
  ...RV_TIERS.map((r) => ({
    id: r.id, dependencies: [r.i === 0 ? RV.contact : RV_TIERS[r.i - 1].id],
    icon: `pixelgo_npc:rival_medal_${r.t}`,
    // snake: Lv.10-50 left to right, Lv.60-100 right to left under them
    x: r.i < 5 ? -4.0 + 2 * r.i : 4.0 - 2 * (r.i - 5), y: r.i < 5 ? 6.5 : 8.5,
    ...(r.t === 100 ? { size: 1.5 } : {}),
    rewards: [
      { id: hid('rival-tier-money:' + r.t), money: r.money },
      ...(r.bag ? [{ id: hid('rival-tier-bag:' + r.t), bag: r.bag }] : []),
      ...(r.loot ? [{ id: hid('rival-tier-loot:' + r.t), loot: r.loot }] : []),
    ],
    task: NPA(hid('rival-tier-task:' + r.t), 'rival/tier_' + r.t),
  })),
  {
    id: RV.omega, dependencies: [RV_TIERS[9].id], icon: 'pixelgo_npc:rival_medal_omega',
    x: -4.0, y: 11.0, size: 2.0, shape: 'gear',
    rewards: [{ id: hid('rival:omega-money'), money: 7500 }, { id: hid('rival:omega-bag'), bag: 'pixelgo:tier4' }, { id: hid('rival:omega-loot'), loot: 2 }],
    task: NPA(hid('rival:omega-task'), 'rival/tier_omega'),
  },
  {
    id: RV.streak, dependencies: [RV.contact], icon: 'pixelmon:star_piece',
    x: -7.0, y: 6.5,
    rewards: [{ id: hid('rival:streak-money'), money: 2500 }, { id: hid('rival:streak-bag'), bag: 'pixelgo:tier2' }],
    task: NPA(hid('rival:streak-task'), 'rival/streak'),
  },
  {
    id: RV.comeback, dependencies: [RV.contact],
    x: -7.0, y: 8.5,
    rewards: [{ id: hid('rival:comeback-money'), money: 1000 }],
    task: NPA(hid('rival:comeback-task'), 'rival/comeback'),
  },
  {
    id: RV.traders, dependencies: [RV.intro], icon: 'minecraft:emerald',
    x: 7.0, y: 2.5,
    rewards: [{ id: hid('rival:traders-money'), money: 100 }],
    task: { id: hid('rival:traders-task'), type: 'checkmark' },
  },
  ...RV_TRADES.map((t) => ({
    id: t.id, dependencies: [t.dep === 'traders' ? RV.traders : RV_TRADES.find((o) => o.key === t.dep).id],
    icon: t.icon,
    x: t.x, y: t.y, ...(t.key === 'legendary_master' || t.key === 'skin_master' ? { size: 1.5 } : {}),
    rewards: [
      { id: hid('rival-trade-money:' + t.key), money: t.money },
      ...(t.bag ? [{ id: hid('rival-trade-bag:' + t.key), bag: t.bag }] : []),
      ...(t.loot ? [{ id: hid('rival-trade-loot:' + t.key), loot: t.loot }] : []),
    ],
    task: NPA(hid('rival-trade-task:' + t.key), t.adv),
  })),
];

/* first-clear rewards of the mod itself, for the bracket cards (jei/rewards.json) */
const RV_MOD = {
  10: '5 Poké Balls, 1 Rare Candy',
  20: '8 Poké Balls, 2 Rare Candies, 4 Exp. Candy S',
  30: '12 Poké Balls, 3 Rare Candies, a Nugget, 4 Exp. Candy M',
  40: '4 Rare Candies, 2 Nuggets, 6 Exp. Candy M, a Silver Bottle Cap',
  50: '5 Rare Candies, 2 Star Pieces, 4 Exp. Candy L, 2 Silver Bottle Caps',
  60: '6 Rare Candies, 2 PP Ups, 6 Exp. Candy L, 2 Proteins',
  70: '8 Rare Candies, 3 PP Ups, 4 Nuggets, 3 Exp. Candy XL, an Ability Capsule, a Key Stone',
  80: '10 Rare Candies, a PP Max, 6 Nuggets, 4 Exp. Candy XL, 2 Ability Capsules',
  90: '12 Rare Candies, 2 PP Max, 8 Nuggets, a Gold Bottle Cap, an Ability Patch',
  100: '16 Rare Candies, 3 PP Max, 12 Nuggets, 3 Gold Bottle Caps, a Shiny Charm',
};

Object.assign(LANG, {
  [`quest.${RV.intro}.title`]: '&c&lRival Kyusama',
  [`quest.${RV.intro}.quest_subtitle`]: '&7Ten brackets, one rivalry',
  [`quest.${RV.intro}.quest_desc`]: L(
    '&7&o"So you\'re the one everyone keeps talking about. Six Pokémon, no excuses. Show me."',
    '',
    '&6&lKyusama&r&7, the author of PixelGO, is hunting you. He comes back again and again, a little stronger each time: &f&lten brackets&r&7, from &fLv. 10&7 to &fLv. 100&7, and one more after that.',
    '',
    '&e&lFINDING HIM',
    '&7&l- &7He waits in &fvillages&7, one rival per village. On a sky island there are none: go to the &a&lOverworld Mirror&r&7 (watch the &c&ldimension timer&r&7)',
    '&7&l- &7Or craft a &c&lRival Beacon&r&7 and he comes to &fyou&7, wherever you are',
    '&7&l- &7The &fRadar&7 and the &fWanted Poster&7 tell you where the nearest one prowls',
    '',
    '&e&lTHE RULES',
    '&7&l- &7Brackets can be fought in any order. Each one has its own &flevel cap',
    '&7&l- &7Lose, and he grants you &f1 rematch&7 on the spot. Lose that too, and he walks away to heal for &c15 minutes',
    '&7&l- &7He refuses a team that cannot stand: heal first',
    '&7&l- &7The &ffirst&7 clear of a bracket pays a &d&lRival Medal&r&7, PokéDollars and supplies. Later wins only count in the Codex',
    '&7&l- &7Lv. 70, 80 and 90 also unlock &fMega Evolution&7, &fDynamax&7 and &fTerastallization&7',
    '',
    '&7&oOnce the ten brackets fall, one last rival appears: Zenith Omega.',
  ),

  [`quest.${RV.contact}.title`]: '&a&lFirst Contact',
  [`quest.${RV.contact}.quest_subtitle`]: '&7Meet your rival in the field',
  [`quest.${RV.contact}.quest_desc`]: L(
    '&7Find Kyusama, in a village or through a beacon. The screen tells you when he has found you: &c&lA RIVAL HAS FOUND YOU&r&7.',
    '',
    '&7Every rival you meet is logged in your &fRival Codex&7.',
  ),

  [`quest.${RV.omega}.title`]: '&5&lZenith Omega',
  [`quest.${RV.omega}.quest_subtitle`]: '&7The rival with no limits left',
  [`quest.${RV.omega}.quest_desc`]: L(
    '&7&o"You cleared every bracket, so there is nothing left to climb. Except me, with no limits left. This is Zenith Omega."',
    '',
    '&7Zenith Omega only fights trainers who cleared &f&lall ten&r&7 brackets. Call him with a &c&lRival Beacon&r&7: once the ten are done, the beacon calls him and nobody else.',
    '',
    '&e&lFIRST CLEAR',
    '&7The &5&lOmega Medal&r&7, &6&l30 000 PokéDollars&r&7, 32 Rare Candies, 6 Gold Bottle Caps, 6 PP Max, 2 Ability Patches and a &e&lShiny Charm&r&7.',
    '',
    '&7&o"Perfect. There is nothing left of me to beat. The rivalry is yours now."',
  ),

  [`quest.${RV.streak}.title`]: '&e&lFive in a Row',
  [`quest.${RV.streak}.quest_subtitle`]: '&7Five rival wins without a loss',
  [`quest.${RV.streak}.quest_desc`]: L(
    '&7Win &f&l5&r&7 rival battles in a row, without a loss in between.',
    '',
    '&7Your current and best streak are in the &fDossier&7 tab of the Codex.',
  ),

  [`quest.${RV.comeback}.title`]: '&e&lComeback Kid',
  [`quest.${RV.comeback}.quest_subtitle`]: '&7Clear a bracket that beat you before',
  [`quest.${RV.comeback}.quest_desc`]: L(
    '&7Lose to a bracket, then come back and clear it.',
    '',
    '&7&o"Legends lose too. They simply come back."',
  ),

  [`quest.${RV.traders}.title`]: '&a&lThe Three Traders',
  [`quest.${RV.traders}.quest_subtitle`]: '&7They do not fight. They deal.',
  [`quest.${RV.traders}.quest_desc`]: L(
    '&7Three new travelling NPCs walk the world with Kyusama. Right-click one to see its offer.',
    '',
    '&e&lWANDERING TRADER',
    '&7Starter for starter (Bulbasaur for Charmander, Chikorita for Cyndaquil...), and the &ftrade evolutions&7: Haunter for Gengar, Kadabra for Alakazam, Boldore for Gigalith...',
    '',
    '&d&lPATTERN ARTISAN',
    '&7Swaps a Pokémon for the same species wearing a special pattern: halloween, drowned, pink...',
    '',
    '&6&lLEGEND BROKER',
    '&7A legendary for another legendary. The rarest of the three by far.',
    '',
    '&7They show up in &fvillages&7 and in some wild biomes. Like every wild NPC, they do not stay long: trade while they are there.',
    '&7JEI lists every trade under &fRival Trades&7.',
  ),
});

Object.assign(LANG, Object.fromEntries(RV_TOOLS.flatMap((t) => [
  [`quest.${t.id}.title`, `&e&l${t.name}`],
  [`quest.${t.id}.quest_subtitle`, '&7Recipe in JEI'],
  [`quest.${t.id}.quest_desc`, L(...t.text)],
])));

Object.assign(LANG, Object.fromEntries(RV_TIERS.flatMap((r) => [
  [`quest.${r.id}.title`, r.t === 100 ? `&6&lLv. 100 - ${r.circuit} Circuit` : `&e&lLv. ${r.t} - ${r.circuit} Circuit`],
  [`quest.${r.id}.quest_subtitle`, `&7Beat the Lv. ${r.t} bracket`],
  [`quest.${r.id}.quest_desc`, L(
    `&7Defeat Kyusama in the &f&l${r.circuit} Circuit&r&7, level cap &fLv. ${r.t}&7.`,
    '',
    '&e&lFIRST CLEAR (from him)',
    `&7The &d&l${r.circuit} Circuit Medal&r&7, PokéDollars, and ${RV_MOD[r.t]}.`,
    ...(r.unlock ? ['', `&7It also unlocks &f&l${r.unlock}&r&7 for you.`] : []),
    ...(r.t === 100 ? ['', '&7And he hands over the &e&lZenith Trophy&r&7, and the first Pokémon he ever raised.'] : []),
  )],
])));

Object.assign(LANG, Object.fromEntries(RV_TRADES.flatMap((t) => [
  [`quest.${t.id}.title`, ['legendary_master', 'skin_master'].includes(t.key) ? `&6&l${t.name}` : `&e&l${t.name}`],
  [`quest.${t.id}.quest_subtitle`, `&7${t.sub}`],
  [`quest.${t.id}.quest_desc`, L(...t.text)],
])));
