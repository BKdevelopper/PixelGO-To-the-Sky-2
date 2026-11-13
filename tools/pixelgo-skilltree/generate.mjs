import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];

// ---------- palette ----------
const C = {
  capture: '#FF6B6B',
  train: '#FFB347',
  bond: '#FF8FC7',
  loot: '#FFD95A',
  harvest: '#7ED77E',
  dig: '#A98BE8',
  root: '#69D2FF',
  eff: '#9BE7FF',
  eff2: '#FFE9A3',
  flavor: '#8A8A8A',
};

// ---------- json helpers ----------
// In Pixelmon 9.x every Poke Ball is ONE single item, `pixelmon:poke_ball`, and the variant
// is carried by the `pixelmon:poke_ball` data component.
// `pixelmon:great_ball` & friends do not exist in the registry: write the id here and let
// item() turn it into item + component.
const BALL_VARIANTS = new Set([
  'poke_ball', 'great_ball', 'ultra_ball', 'master_ball', 'beast_ball', 'cherish_ball',
  'premier_ball', 'net_ball', 'nest_ball', 'dive_ball', 'dusk_ball', 'heal_ball',
  'luxury_ball', 'quick_ball', 'repeat_ball', 'timer_ball',
]);
const item = (id) => {
  const m = /^pixelmon:(.+)$/.exec(id);
  if (m && BALL_VARIANTS.has(m[1])) {
    return { type: 'item', data: { item: 'pixelmon:poke_ball', components: { 'pixelmon:poke_ball': m[1] } } };
  }
  return { type: 'item', data: { item: id } };
};
const frame = (f) => ({ type: 'advancement', data: { frame: f } });
const attr = (id, value, operation = 'add_value') => ({
  type: 'puffish_skills:attribute',
  data: { attribute: id, value, operation },
});
const title = (text, color) => ({ text, color, bold: true, italic: false });
const desc = (lines) => ({
  text: '',
  italic: false,
  extra: lines.map((l, i) => ({ text: (i ? '\n' : '') + l[0], color: l[1] || C.eff, italic: false })),
});
const flavor = (text) => ({ text, color: C.flavor, italic: true });

// pixelgo attributes
const PG = (n) => `pixelgo:${n}`;
const catchRate = (v) => attr(PG('catch_rate'), v);
const shiny = (v) => attr(PG('shiny_odds'), v);
const pkxp = (v) => attr(PG('pokemon_experience'), v);
const ev = (v) => attr(PG('ev_gain'), v);
const friend = (v) => attr(PG('friendship_gain'), v);
const vitality = (v) => attr(PG('party_vitality'), v);
const egg = (v) => attr(PG('egg_hatch_speed'), v);
const dropLuck = (v) => attr(PG('pokemon_drop_luck'), v);
const lootLuck = (v) => attr(PG('pokeloot_luck'), v);
const harvest = (v) => attr(PG('harvest_yield'), v);
const fossil = (v) => attr(PG('fossil_luck'), v);
const fishing = (v) => attr(PG('fishing_luck'), v);
const MC = (n) => `minecraft:${n}`;

// ---------- layout ----------
const SLOT_ANGLE = {
  g: 0,
  a: -20, b: 0, c: 20,
  d: -22, e: 0, f: 22,
  h: -24, i: -8, j: 8, k: 24,
  l: -24, m: -8, n: 8, o: 24,
  z: 0,
};
const SLOT_RADIUS = {
  g: 42,
  a: 88, b: 88, c: 88,
  d: 134, e: 134, f: 134,
  h: 180, i: 180, j: 180, k: 180,
  l: 226, m: 226, n: 226, o: 226,
  z: 276,
};
const EDGES = [
  ['g', 'a'], ['g', 'b'], ['g', 'c'],
  ['a', 'd'], ['b', 'e'], ['c', 'f'],
  ['d', 'h'], ['d', 'i'], ['e', 'i'], ['e', 'j'], ['f', 'j'], ['f', 'k'],
  ['h', 'l'], ['i', 'm'], ['j', 'n'], ['k', 'o'],
  ['l', 'z'], ['m', 'z'], ['n', 'z'], ['o', 'z'],
];
const EXCLUSIVE = [['l', 'm'], ['n', 'o']];

const branches = [];

// =========================================================
// 1. CAPTURE  (up)
// =========================================================
branches.push({
  key: 'capture', angle: 90, color: C.capture,
  slots: {
    g: { id: 'capture_root', t: 'Catcher’s Hand', ic: 'pixelmon:poke_ball',
      d: [['+5% catch bonus']], fl: 'It all starts with one Poké Ball and a lot of misses.',
      rw: [catchRate(5)] },

    a: { id: 'capture_throw_1', t: 'Steady Throw', ic: 'pixelmon:great_ball',
      d: [['+6% catch bonus']], fl: 'It is all in the wrist.', rw: [catchRate(6)] },
    b: { id: 'capture_gleam_1', t: 'Odd Gleam', ic: 'pixelmon:stardust',
      d: [['+1 shiny roll on wild spawns', C.eff2]],
      fl: 'Was that Rattata really sparkling?', rw: [shiny(1)] },
    c: { id: 'capture_grip_1', t: 'Hunter’s Grip', ic: 'pixelmon:net_ball',
      d: [['+6% catch bonus']], fl: 'Firm, but not crushing.', rw: [catchRate(6)] },

    d: { id: 'capture_throw_2', t: 'Steady Throw II', ic: 'pixelmon:ultra_ball',
      d: [['+8% catch bonus']], fl: 'A thousand throws, a thousand corrections.', rw: [catchRate(8)] },
    e: { id: 'capture_gleam_2', t: 'Odd Gleam II', ic: 'pixelmon:star_piece',
      d: [['+1 shiny roll on wild spawns', C.eff2]],
      fl: 'You will never look at a bush the same way again.', rw: [shiny(1)] },
    f: { id: 'capture_grip_2', t: 'Hunter’s Grip II', ic: 'pixelmon:repeat_ball',
      d: [['+8% catch bonus']], fl: 'Second try, better hold.', rw: [catchRate(8)] },

    h: { id: 'capture_timing', t: 'Perfect Timing', ic: 'pixelmon:timer_ball',
      d: [['+10% catch bonus']], fl: 'Waiting for the right turn is an art.', rw: [catchRate(10)] },
    i: { id: 'capture_dusk', t: 'Night Stalker', ic: 'pixelmon:dusk_ball',
      d: [['+1 shiny roll on wild spawns', C.eff2], ['+6% catch bonus']],
      fl: 'At night, colours lie a little less.', rw: [shiny(1), catchRate(6)] },
    j: { id: 'capture_quick', t: 'Lightning Reflex', ic: 'pixelmon:quick_ball',
      d: [['+10% catch bonus']], fl: 'Before it even realises what happened.', rw: [catchRate(10)] },
    k: { id: 'capture_prism', t: 'Inner Prism', ic: 'pixelmon:comet_shard',
      d: [['+1 shiny roll on wild spawns', C.eff2]],
      fl: 'A shard of comet in your pocket.', rw: [shiny(1)] },

    l: { id: 'capture_master', t: 'Master Catcher', ic: 'pixelmon:beast_ball', cost: 2, fr: 'goal',
      d: [['+15% catch bonus']], fl: 'Specialisation: pure capture.', rw: [catchRate(15)] },
    m: { id: 'capture_luxury', t: 'Ball of Luxury', ic: 'pixelmon:luxury_ball', cost: 2, fr: 'goal',
      d: [['+9% catch bonus'], ['+2 friendship per aura pulse', C.eff2]],
      fl: 'Specialisation: comfortable capture.', rw: [catchRate(9), friend(2)] },
    n: { id: 'capture_hunter', t: 'Shiny Stalker', ic: 'pixelmon:shiny_charm', cost: 2, fr: 'goal',
      d: [['+2 shiny rolls on wild spawns', C.eff2]],
      fl: 'Specialisation: shiny hunting.', rw: [shiny(2)] },
    o: { id: 'capture_charm', t: 'Catcher’s Charm', ic: 'pixelmon:catching_charm', cost: 2, fr: 'goal',
      d: [['+10% catch bonus'], ['+1 shiny roll', C.eff2]],
      fl: 'Specialisation: all-rounder.', rw: [catchRate(10), shiny(1)] },

    z: { id: 'capture_legend', t: 'Pokédex Legend', ic: 'pixelmon:master_ball', cost: 3, fr: 'challenge', size: 2,
      d: [['+20% catch bonus'], ['+1 shiny roll', C.eff2], ['+1 Luck', C.eff2]],
      fl: 'They say you never missed a throw again.',
      rw: [catchRate(20), shiny(1), attr(MC('generic.luck'), 1)], sp: 45 },
  },
});

// =========================================================
// 2. TRAINING / COMBAT
// =========================================================
branches.push({
  key: 'train', angle: 30, color: C.train,
  slots: {
    g: { id: 'train_root', t: 'Trainer’s Discipline', ic: 'pixelmon:exp_share',
      d: [['+10% Pokémon experience']], fl: 'A good trainer trains too.', rw: [pkxp(10)] },

    a: { id: 'train_xp_1', t: 'Basic Lesson', ic: 'pixelmon:xs_exp_candy',
      d: [['+12% Pokémon experience']], fl: 'The fundamentals, over and over.', rw: [pkxp(12)] },
    b: { id: 'train_ev_1', t: 'Effort Program', ic: 'pixelmon:protein',
      d: [['+10% EVs gained after a battle', C.eff2]], fl: 'Three sets, no cheating.', rw: [ev(10)] },
    c: { id: 'train_power_1', t: 'Fighter’s Grip', ic: 'minecraft:iron_sword',
      d: [['+1 attack damage', C.eff2]], fl: 'Sometimes you have to defend yourself.',
      rw: [attr(MC('generic.attack_damage'), 1)] },

    d: { id: 'train_xp_2', t: 'Advanced Lesson', ic: 'pixelmon:s_exp_candy',
      d: [['+14% Pokémon experience']], fl: 'The blackboard is full.', rw: [pkxp(14)] },
    e: { id: 'train_ev_2', t: 'Intensive Program', ic: 'pixelmon:iron',
      d: [['+12% EVs gained after a battle', C.eff2]], fl: 'One more set.', rw: [ev(12)] },
    f: { id: 'train_guard', t: 'Trainer’s Guard', ic: 'minecraft:iron_chestplate',
      d: [['+2 armor', C.eff2]], fl: 'Wild Pokémon do not bring a referee.',
      rw: [attr(MC('generic.armor'), 2)] },

    h: { id: 'train_xp_3', t: 'Master Class', ic: 'pixelmon:m_exp_candy',
      d: [['+16% Pokémon experience']], fl: 'Now you are the one teaching.', rw: [pkxp(16)] },
    i: { id: 'train_share', t: 'Shared Experience', ic: 'pixelmon:lucky_egg',
      d: [['+18% Pokémon experience']], fl: 'Nobody sits on the bench.', rw: [pkxp(18)] },
    j: { id: 'train_ev_3', t: 'Weighted Braces', ic: 'pixelmon:macho_brace',
      d: [['+15% EVs gained after a battle', C.eff2]], fl: 'Heavy, but it works.', rw: [ev(15)] },
    k: { id: 'train_vitality', t: 'Trainer’s Endurance', ic: 'minecraft:golden_apple',
      d: [['+4 max health', C.eff2]], fl: 'Days on the road are long.',
      rw: [attr(MC('generic.max_health'), 4)] },

    l: { id: 'train_mentor', t: 'Legendary Mentor', ic: 'pixelmon:l_exp_candy', cost: 2, fr: 'goal',
      d: [['+30% Pokémon experience']], fl: 'Specialisation: levelling.', rw: [pkxp(30)] },
    m: { id: 'train_drill', t: 'Drill Sergeant', ic: 'pixelmon:power_weight', cost: 2, fr: 'goal',
      d: [['+30% EVs gained after a battle', C.eff2]], fl: 'Specialisation: effort values.', rw: [ev(30)] },
    n: { id: 'train_perfect', t: 'Perfectionist', ic: 'pixelmon:silver_bottle_cap', cost: 2, fr: 'goal',
      d: [['+20% EVs gained after a battle', C.eff2], ['+10% Pokémon experience']],
      fl: 'Specialisation: min-maxing.', rw: [ev(20), pkxp(10)] },
    o: { id: 'train_tactician', t: 'Field Tactician', ic: 'pixelmon:ability_capsule', cost: 2, fr: 'goal',
      d: [['+20% Pokémon experience'], ['+2 attack damage', C.eff2]],
      fl: 'Specialisation: aggression.', rw: [pkxp(20), attr(MC('generic.attack_damage'), 2)] },

    z: { id: 'train_champion', t: 'Gym Champion', ic: 'pixelmon:xl_exp_candy', cost: 3, fr: 'challenge', size: 2,
      d: [['+40% Pokémon experience'], ['+25% EVs gained', C.eff2], ['+2 max health', C.eff2]],
      fl: 'You are the one handing out the badge now.',
      rw: [pkxp(40), ev(25), attr(MC('generic.max_health'), 2)], sp: 45 },
  },
});

// =========================================================
// 3. BREEDING / BONDS
// =========================================================
branches.push({
  key: 'bond', angle: 330, color: C.bond,
  slots: {
    g: { id: 'bond_root', t: 'Trainer’s Heart', ic: 'pixelmon:soothe_bell',
      d: [['+1 friendship per aura pulse (30 s)']], fl: 'They can tell when you care.', rw: [friend(1)] },

    a: { id: 'bond_friend_1', t: 'Morning Cuddle', ic: 'pixelmon:oran_berry',
      d: [['+1 friendship per aura pulse']], fl: 'A ritual before setting out.', rw: [friend(1)] },
    b: { id: 'bond_egg_1', t: 'Cosy Nest', ic: 'pixelmon:oval_charm',
      d: [['+25 egg steps per aura pulse', C.eff2]], fl: 'Straw, wool, patience.', rw: [egg(25)] },
    c: { id: 'bond_heal_1', t: 'First Aid', ic: 'pixelmon:potion',
      d: [['+2% of max HP restored to the party per pulse', C.eff2]], fl: 'A kit always within reach.', rw: [vitality(2)] },

    d: { id: 'bond_friend_2', t: 'Walk Together', ic: 'pixelmon:sitrus_berry',
      d: [['+1 friendship per aura pulse']], fl: 'Walking side by side is often enough.', rw: [friend(1)] },
    e: { id: 'bond_egg_2', t: 'Handmade Incubator', ic: 'pixelmon:honey',
      d: [['+30 egg steps per aura pulse', C.eff2]], fl: 'Warm, cobbled together, effective.', rw: [egg(30)] },
    f: { id: 'bond_heal_2', t: 'Medical Kit', ic: 'pixelmon:hyper_potion',
      d: [['+3% of max HP restored to the party per pulse', C.eff2]], fl: 'The bag is heavier, the party holds up better.', rw: [vitality(3)] },

    h: { id: 'bond_friend_3', t: 'Relaxing Massage', ic: 'pixelmon:lum_berry',
      d: [['+2 friendship per aura pulse']], fl: 'Nobody says no.', rw: [friend(2)] },
    i: { id: 'bond_destiny', t: 'Destiny Bond', ic: 'pixelmon:destiny_knot',
      d: [['+35 egg steps per pulse', C.eff2], ['+1 friendship per pulse']],
      fl: 'What is tied never comes undone.', rw: [egg(35), friend(1)] },
    j: { id: 'bond_egg_3', t: 'Thermal Incubator', ic: 'pixelmon:moomoo_milk',
      d: [['+40 egg steps per aura pulse', C.eff2]], fl: 'Constant heat, constant results.', rw: [egg(40)] },
    k: { id: 'bond_heal_3', t: 'Soothing Aura', ic: 'pixelmon:heal_ball',
      d: [['+4% of max HP restored to the party per pulse', C.eff2]], fl: 'Your presence alone puts them back on their feet.', rw: [vitality(4)] },

    l: { id: 'bond_soulmate', t: 'Soulmate', ic: 'pixelmon:luxury_ball', cost: 2, fr: 'goal',
      d: [['+3 friendship per pulse'], ['+3% of max HP restored per pulse', C.eff2]],
      fl: 'Specialisation: affection.', rw: [friend(3), vitality(3)] },
    m: { id: 'bond_breeder', t: 'Expert Breeder', ic: 'pixelmon:nest_ball', cost: 2, fr: 'goal',
      d: [['+60 egg steps per aura pulse', C.eff2]], fl: 'Specialisation: hatching.', rw: [egg(60)] },
    n: { id: 'bond_nurse', t: 'Field Nurse', ic: 'pixelmon:full_restore', cost: 2, fr: 'goal',
      d: [['+6% of max HP restored to the party per pulse', C.eff2]], fl: 'Specialisation: healing.', rw: [vitality(6)] },
    o: { id: 'bond_scale', t: 'Heart Scale', ic: 'pixelmon:heart_scale', cost: 2, fr: 'goal',
      d: [['+2 friendship per pulse'], ['+30 egg steps per pulse', C.eff2]],
      fl: 'Specialisation: balance.', rw: [friend(2), egg(30)] },

    z: { id: 'bond_legend', t: 'Master of Bonds', ic: 'pixelmon:red_pc', cost: 3, fr: 'challenge', size: 2,
      d: [['+3 friendship per pulse'], ['+60 egg steps per pulse', C.eff2], ['+5% of max HP restored per pulse', C.eff2]],
      fl: 'Your PC box looks like a family album.',
      rw: [friend(3), egg(60), vitality(5)], sp: 45 },
  },
});

// =========================================================
// 4. LOOT
// =========================================================
branches.push({
  key: 'loot', angle: 270, color: C.loot,
  slots: {
    g: { id: 'loot_root', t: 'Scavenger’s Eye', ic: 'pixelmon:nugget',
      d: [['+10% chance to duplicate a Pokémon drop']], fl: 'Nothing goes to waste.', rw: [dropLuck(10)] },

    a: { id: 'loot_drop_1', t: 'Quick Search', ic: 'pixelmon:pearl',
      d: [['+12% chance to duplicate a Pokémon drop']], fl: 'One glance is enough.', rw: [dropLuck(12)] },
    b: { id: 'loot_chest_1', t: 'Nose for Chests', ic: 'pixelmon:rare_pokestop',
      d: [['+12% chance to duplicate a Poké Loot chest item', C.eff2]], fl: 'Always in the same spot, right at the back.', rw: [lootLuck(12)] },
    c: { id: 'loot_clover', t: 'Trainer’s Clover', ic: 'minecraft:rabbit_foot',
      d: [['+1 Luck', C.eff2]], fl: 'Apparently it works.', rw: [attr(MC('generic.luck'), 1)] },

    d: { id: 'loot_drop_2', t: 'Methodical Search', ic: 'pixelmon:big_pearl',
      d: [['+14% chance to duplicate a Pokémon drop']], fl: 'Square by square.', rw: [dropLuck(14)] },
    e: { id: 'loot_chest_2', t: 'Lockpicking', ic: 'pixelmon:escape_rope',
      d: [['+14% chance to duplicate a Poké Loot chest item', C.eff2]], fl: 'Technically, it was not locked.', rw: [lootLuck(14)] },
    f: { id: 'loot_star', t: 'Lucky Star', ic: 'pixelmon:star_piece',
      d: [['+1 Luck', C.eff2]], fl: 'Born under the right one, evidently.', rw: [attr(MC('generic.luck'), 1)] },

    h: { id: 'loot_drop_3', t: 'Salvager', ic: 'pixelmon:big_nugget',
      d: [['+16% chance to duplicate a Pokémon drop']], fl: 'Pockets are full.', rw: [dropLuck(16)] },
    i: { id: 'loot_amulet', t: 'Amulet Coin', ic: 'pixelmon:amulet_coin',
      d: [['+10% Pokémon drop duplication'], ['+10% Poké Loot duplication', C.eff2]],
      fl: 'It shines in a very motivating way.', rw: [dropLuck(10), lootLuck(10)] },
    j: { id: 'loot_chest_3', t: 'Ruin Plunderer', ic: 'pixelmon:relic_gold',
      d: [['+16% chance to duplicate a Poké Loot chest item', C.eff2]], fl: 'The ruins had no further use for it.', rw: [lootLuck(16)] },
    k: { id: 'loot_fortune', t: 'Traveller’s Fortune', ic: 'pixelmon:comet_shard',
      d: [['+1 Luck', C.eff2]], fl: 'Chance eventually learns your name.', rw: [attr(MC('generic.luck'), 1)] },

    l: { id: 'loot_scavenger', t: 'Supreme Scavenger', ic: 'pixelmon:leftovers', cost: 2, fr: 'goal',
      d: [['+30% chance to duplicate a Pokémon drop']], fl: 'Specialisation: battle drops.', rw: [dropLuck(30)] },
    m: { id: 'loot_treasure', t: 'Treasure Hunter', ic: 'pixelmon:gold_bottle_cap', cost: 2, fr: 'goal',
      d: [['+30% chance to duplicate a Poké Loot chest item', C.eff2]], fl: 'Specialisation: chests.', rw: [lootLuck(30)] },
    n: { id: 'loot_insolent', t: 'Insolent Luck', ic: 'minecraft:enchanted_golden_apple', cost: 2, fr: 'goal',
      d: [['+2 Luck', C.eff2], ['+10% Pokémon drop duplication']],
      fl: 'Specialisation: raw luck.', rw: [attr(MC('generic.luck'), 2), dropLuck(10)] },
    o: { id: 'loot_shared', t: 'Shared Spoils', ic: 'pixelmon:premier_ball', cost: 2, fr: 'goal',
      d: [['+15% Pokémon drop duplication'], ['+15% Poké Loot duplication', C.eff2]],
      fl: 'Specialisation: all-rounder.', rw: [dropLuck(15), lootLuck(15)] },

    z: { id: 'loot_legend', t: 'King of Loot', ic: 'pixelmon:cherish_ball', cost: 3, fr: 'challenge', size: 2,
      d: [['+30% Pokémon drop duplication'], ['+30% Poké Loot duplication', C.eff2], ['+1 Luck', C.eff2]],
      fl: 'Your chest is overflowing and you keep going anyway.',
      rw: [dropLuck(30), lootLuck(30), attr(MC('generic.luck'), 1)], sp: 45 },
  },
});

// =========================================================
// 5. HARVEST & FISHING
// =========================================================
branches.push({
  key: 'harvest', angle: 210, color: C.harvest,
  slots: {
    g: { id: 'harvest_root', t: 'Green Thumb', ic: 'pixelmon:red_apricorn',
      d: [['+12% apricorns and berries per harvest']], fl: 'The first sapling survives. The second one does not.', rw: [harvest(12)] },

    a: { id: 'harvest_apricorn_1', t: 'Apricorn Picker', ic: 'pixelmon:yellow_apricorn',
      d: [['+15% apricorns and berries per harvest']], fl: 'You can tell a good tree by touch.', rw: [harvest(15)] },
    b: { id: 'harvest_berry_1', t: 'Gardener', ic: 'pixelmon:oran_berry',
      d: [['+15% apricorns and berries per harvest']], fl: 'Water, wait, repeat.', rw: [harvest(15)] },
    c: { id: 'fishing_1', t: 'Sunday Angler', ic: 'pixelmon:old_rod',
      d: [['-5% wait time and empty catches while fishing', C.eff2]], fl: 'Mostly for the quiet.', rw: [fishing(5)] },

    d: { id: 'harvest_apricorn_2', t: 'Pruner', ic: 'pixelmon:apricorn_log',
      d: [['+18% apricorns and berries per harvest']], fl: 'Cutting in the right place doubles the yield.', rw: [harvest(18)] },
    e: { id: 'harvest_berry_2', t: 'Market Gardener', ic: 'pixelmon:sitrus_berry',
      d: [['+18% apricorns and berries per harvest']], fl: 'The vegetable patch became a business.', rw: [harvest(18)] },
    f: { id: 'fishing_2', t: 'Decent Angler', ic: 'pixelmon:good_rod',
      d: [['-6% wait time and empty catches while fishing', C.eff2]], fl: 'The rod is finally decent.', rw: [fishing(6)] },

    h: { id: 'harvest_shears', t: 'Sharpened Shears', ic: 'minecraft:shears',
      d: [['+15% mining speed', C.eff2]], fl: 'Sharpened every morning.',
      rw: [attr(MC('player.block_break_speed'), 0.15, 'add_multiplied_base')] },
    i: { id: 'harvest_orchard', t: 'Private Orchard', ic: 'pixelmon:green_apricorn',
      d: [['+20% apricorns and berries per harvest']], fl: 'Seven colours, seven rows.', rw: [harvest(20)] },
    j: { id: 'fishing_3', t: 'Seasoned Angler', ic: 'pixelmon:super_rod',
      d: [['-7% wait time and empty catches while fishing', C.eff2]], fl: 'You already know what is biting.', rw: [fishing(7)] },
    k: { id: 'fishing_water', t: 'Water Ease', ic: 'minecraft:heart_of_the_sea',
      d: [['+30% water movement efficiency', C.eff2], ['+2 oxygen bonus', C.eff2]],
      fl: 'Water barely slows you down any more.',
      rw: [attr(MC('generic.water_movement_efficiency'), 0.3), attr(MC('generic.oxygen_bonus'), 2)] },

    l: { id: 'harvest_master', t: 'Master Gardener', ic: 'pixelmon:white_apricorn', cost: 2, fr: 'goal',
      d: [['+40% apricorns and berries per harvest']], fl: 'Specialisation: farming.', rw: [harvest(40)] },
    m: { id: 'harvest_botanist', t: 'Botanist', ic: 'pixelmon:leppa_berry', cost: 2, fr: 'goal',
      d: [['+25% apricorns and berries per harvest'], ['+1 Luck', C.eff2]],
      fl: 'Specialisation: rare picking.', rw: [harvest(25), attr(MC('generic.luck'), 1)] },
    n: { id: 'fishing_master', t: 'Master Angler', ic: 'pixelmon:dive_ball', cost: 2, fr: 'goal',
      d: [['-12% wait time and empty catches while fishing', C.eff2]], fl: 'Specialisation: fishing.', rw: [fishing(12)] },
    o: { id: 'fishing_deep', t: 'Call of the Deep', ic: 'pixelmon:nest_ball', cost: 2, fr: 'goal',
      d: [['-8% wait time and empty catches while fishing', C.eff2], ['+10% Poké Loot duplication', C.eff2]],
      fl: 'Specialisation: sea floor.', rw: [fishing(8), lootLuck(10)] },

    z: { id: 'harvest_legend', t: 'Lord of Harvests', ic: 'pixelmon:black_apricorn', cost: 3, fr: 'challenge', size: 2,
      d: [['+50% apricorns and berries per harvest'], ['-8% fishing wait time', C.eff2]],
      fl: 'Your Poké Balls literally grow on trees.',
      rw: [harvest(50), fishing(8)], sp: 45 },
  },
});

// =========================================================
// 6. DIGGING & EXPLORATION
// =========================================================
branches.push({
  key: 'dig', angle: 150, color: C.dig,
  slots: {
    g: { id: 'dig_root', t: 'Digger’s Instinct', ic: 'pixelmon:helix_fossil',
      d: [['+5 in 10,000 chance of a fossil per stone block mined']], fl: 'A rock unlike the others.', rw: [fossil(5)] },

    a: { id: 'dig_fossil_1', t: 'Attentive Pickaxe', ic: 'pixelmon:dome_fossil',
      d: [['+5 in 10,000 chance to dig up a fossil']], fl: 'You learn to listen to the rock.', rw: [fossil(5)] },
    b: { id: 'dig_mine_1', t: 'Seasoned Miner', ic: 'minecraft:iron_pickaxe',
      d: [['+10% mining speed', C.eff2]], fl: 'The arm finally keeps up.',
      rw: [attr(MC('player.block_break_speed'), 0.10, 'add_multiplied_base')] },
    c: { id: 'dig_step_1', t: 'Light Step', ic: 'minecraft:leather_boots',
      d: [['+5% movement speed', C.eff2]], fl: 'Boots that finally fit.',
      rw: [attr(MC('generic.movement_speed'), 0.05, 'add_multiplied_base')] },

    d: { id: 'dig_fossil_2', t: 'Fossil Sense', ic: 'pixelmon:old_amber',
      d: [['+6 in 10,000 chance to dig up a fossil']], fl: 'It sounds hollow, so it is good.', rw: [fossil(6)] },
    e: { id: 'dig_mine_2', t: 'Mining Efficiency', ic: 'minecraft:diamond_pickaxe',
      d: [['+10% mining speed', C.eff2]], fl: 'Fewer swings, more blocks.',
      rw: [attr(MC('player.block_break_speed'), 0.10, 'add_multiplied_base')] },
    f: { id: 'dig_step_2', t: 'Nimble Stride', ic: 'minecraft:feather',
      d: [['+5% movement speed', C.eff2]], fl: 'The road feels shorter.',
      rw: [attr(MC('generic.movement_speed'), 0.05, 'add_multiplied_base')] },

    h: { id: 'dig_archaeologist', t: 'Archaeologist', ic: 'pixelmon:fossil_cleaner',
      d: [['+7 in 10,000 chance to dig up a fossil']], fl: 'Brush in one hand, pickaxe in the other.', rw: [fossil(7)] },
    i: { id: 'dig_climber', t: 'Climber', ic: 'minecraft:ladder',
      d: [['+0.5 step height', C.eff2]], fl: 'Single blocks no longer stop you.',
      rw: [attr(MC('generic.step_height'), 0.5)] },
    j: { id: 'dig_landing', t: 'Soft Landing', ic: 'minecraft:hay_block',
      d: [['+3 blocks of safe fall distance', C.eff2], ['-20% fall damage', C.eff2]],
      fl: 'Handy, on a floating island.',
      rw: [attr(MC('generic.safe_fall_distance'), 3), attr(MC('generic.fall_damage_multiplier'), -0.2)] },
    k: { id: 'dig_sneak', t: 'Muffled Footsteps', ic: 'minecraft:white_wool',
      d: [['+30% sneaking speed', C.eff2]], fl: 'Getting close without scaring them off.',
      rw: [attr(MC('player.sneaking_speed'), 0.3)] },

    l: { id: 'dig_paleontologist', t: 'Master Palaeontologist', ic: 'pixelmon:fossil_display', cost: 2, fr: 'goal',
      d: [['+15 in 10,000 chance to dig up a fossil']], fl: 'Specialisation: fossils.', rw: [fossil(15)] },
    m: { id: 'dig_driller', t: 'Human Drill', ic: 'minecraft:netherite_pickaxe', cost: 2, fr: 'goal',
      d: [['+25% mining speed', C.eff2]], fl: 'Specialisation: mining.',
      rw: [attr(MC('player.block_break_speed'), 0.25, 'add_multiplied_base')] },
    n: { id: 'dig_runner', t: 'Running Wind', ic: 'minecraft:sugar', cost: 2, fr: 'goal',
      d: [['+10% movement speed', C.eff2], ['+20% movement efficiency', C.eff2]],
      fl: 'Specialisation: mobility.',
      rw: [attr(MC('generic.movement_speed'), 0.10, 'add_multiplied_base'), attr(MC('generic.movement_efficiency'), 0.2)] },
    o: { id: 'dig_spelunker', t: 'Spelunker', ic: 'minecraft:torch', cost: 2, fr: 'goal',
      d: [['+30% submerged mining speed', C.eff2], ['+8 in 10,000 fossil chance']],
      fl: 'Specialisation: flooded caves.',
      rw: [attr(MC('player.submerged_mining_speed'), 0.3), fossil(8)] },

    z: { id: 'dig_legend', t: 'Fossil Awakener', ic: 'pixelmon:infuser', cost: 3, fr: 'challenge', size: 2,
      d: [['+20 in 10,000 chance to dig up a fossil'], ['+20% mining speed', C.eff2], ['+2 max health', C.eff2]],
      fl: 'What slept inside the stone now answers to you.',
      rw: [fossil(20), attr(MC('player.block_break_speed'), 0.20, 'add_multiplied_base'), attr(MC('generic.max_health'), 2)], sp: 45 },
  },
});

// ---------- build ----------
const definitions = {};
const skills = {};
const normalUni = [];
const exclusiveBi = [];

definitions['origin'] = {
  title: title('Trainer’s Awakening', C.root),
  description: desc([
    ['+3% catch bonus'],
    ['+5% Pokémon experience'],
    ['+1 friendship per aura pulse', C.eff2],
  ]),
  extra_description: flavor('The day you realised all of this could actually be learned.'),
  icon: item('pixelmon:pokedex'),
  frame: frame('challenge'),
  size: 2,
  cost: 1,
  rewards: [catchRate(3), pkxp(5), friend(1)],
};
skills['origin'] = { definition: 'origin', x: 0, y: 0, root: true };

const deg2rad = (d) => (d * Math.PI) / 180;

for (const br of branches) {
  const ids = {};
  for (const [slot, s] of Object.entries(br.slots)) {
    const ang = deg2rad(br.angle + SLOT_ANGLE[slot]);
    const r = SLOT_RADIUS[slot];
    const x = Math.round(Math.cos(ang) * r);
    const y = Math.round(-Math.sin(ang) * r);

    const def = {
      title: title(s.t, br.color),
      description: desc(s.d),
      icon: item(s.ic),
      frame: frame(s.fr || 'task'),
      cost: s.cost || 1,
      rewards: s.rw,
    };
    if (s.fl) def.extra_description = flavor(s.fl);
    if (s.size) def.size = s.size;
    if (s.sp) def.required_spent_points = s.sp;

    definitions[s.id] = def;
    skills[s.id] = { definition: s.id, x, y };
    ids[slot] = s.id;
  }

  normalUni.push(['origin', ids.g]);
  for (const [from, to] of EDGES) normalUni.push([ids[from], ids[to]]);
  for (const [a, b] of EXCLUSIVE) exclusiveBi.push([ids[a], ids[b]]);
}

// ---------- category files ----------
const category = {
  title: { text: 'Trainer’s Path', color: C.root, bold: true },
  icon: item('pixelmon:poke_ball'),
  background: {
    texture: 'minecraft:textures/block/polished_deepslate.png',
    width: 16,
    height: 16,
    position: 'tile',
  },
  starting_points: 1,
  unlocked_by_default: true,
  erase_on_death: false,
  exclusive_root: false,
};

const experience = {
  level_limit: 100,
  reset_on_death: false,
  experience_per_level: {
    type: 'expression',
    data: { expression: '120 + 34 * level + 1.6 * level ^ 2' },
  },
  sources: [
    {
      type: 'puffish_skills:kill_entity',
      data: {
        variables: {
          is_pokemon: {
            operations: [
              { type: 'puffish_skills:get_killed_living_entity' },
              { type: 'get_type' },
              { type: 'puffish_skills:test', data: { entity_type: 'pixelmon:pixelmon' } },
            ],
            fallback: 0,
          },
          max_health: {
            operations: [
              { type: 'puffish_skills:get_killed_living_entity' },
              { type: 'get_max_health' },
            ],
            fallback: 0,
          },
        },
        experience: [
          { condition: 'is_pokemon', expression: 'clamp(8 + max_health * 0.45, 8, 120)' },
          { expression: '0' },
        ],
      },
    },
    {
      type: 'puffish_skills:mine_block',
      data: {
        variables: {
          is_ore: {
            operations: [
              { type: 'puffish_skills:get_mined_block_state' },
              { type: 'puffish_skills:test', data: { block: '#c:ores' } },
            ],
            fallback: 0,
          },
          is_stone: {
            operations: [
              { type: 'puffish_skills:get_mined_block_state' },
              { type: 'puffish_skills:test', data: { block: '#minecraft:base_stone_overworld' } },
            ],
            fallback: 0,
          },
          is_cobble: {
            operations: [
              { type: 'puffish_skills:get_mined_block_state' },
              { type: 'puffish_skills:test', data: { block: 'minecraft:cobblestone' } },
            ],
            fallback: 0,
          },
        },
        experience: [
          { condition: 'is_ore', expression: '12' },
          { condition: 'is_stone', expression: '2' },
          { condition: 'is_cobble', expression: '1' },
          { expression: '0' },
        ],
      },
    },
    {
      type: 'puffish_skills:craft_item',
      data: {
        variables: {
          is_ball: {
            operations: [
              { type: 'puffish_skills:get_crafted_item_stack' },
              { type: 'puffish_skills:test', data: { item: '#pixelgo:poke_balls' } },
            ],
            fallback: 0,
          },
          count: {
            operations: [
              { type: 'puffish_skills:get_crafted_item_stack' },
              { type: 'get_count' },
            ],
            fallback: 0,
          },
        },
        experience: [
          { condition: 'is_ball', expression: 'clamp(count * 6, 0, 96)' },
          { expression: '0' },
        ],
      },
    },
    {
      type: 'puffish_skills:fish_item',
      data: { experience: '12' },
    },
  ],
};

const connections = {
  normal: { unidirectional: normalUni },
  exclusive: { bidirectional: exclusiveBi },
};

fs.mkdirSync(OUT, { recursive: true });
const w = (name, obj) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + '\n', 'utf8');
w('category.json', category);
w('definitions.json', definitions);
w('skills.json', skills);
w('connections.json', connections);
w('experience.json', experience);

console.log('skills:', Object.keys(skills).length, '| definitions:', Object.keys(definitions).length);
console.log('connections normal:', normalUni.length, '| exclusive:', exclusiveBi.length);

const pts = Object.entries(skills).map(([k, v]) => [k, v.x, v.y]);
let minD = Infinity, pair = null;
for (let i = 0; i < pts.length; i++) {
  for (let j = i + 1; j < pts.length; j++) {
    const d = Math.hypot(pts[i][1] - pts[j][1], pts[i][2] - pts[j][2]);
    if (d < minD) { minD = d; pair = [pts[i][0], pts[j][0]]; }
  }
}
console.log('smallest distance between two nodes:', minD.toFixed(1), '(' + pair.join(' <-> ') + ')');

const totalCost = Object.values(definitions).reduce((a, d) => a + (d.cost || 1), 0);
console.log('total tree cost:', totalCost, 'points');
