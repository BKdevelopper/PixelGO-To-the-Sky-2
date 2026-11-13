/**
 * PixelGO loot-table generator.
 *
 * Mirrors the architecture of the Cobblemon example pack ("loottable exemple"):
 *   - category tables  -> pixelgo:pixelmon/<cat>, pixelgo:gimmicks/<cat>, pixelgo:special/<cat>
 *   - tier ladders     -> pixelgo:basic/tN, pixelgo:basic_underground/tN, pixelgo:basic_trials/*
 *   - every structure chest table gets ONE extra pool that rolls a tier, keeping its own loot.
 *
 * Every pixelmon id is checked against a catalogue of ids proven to load in this pack
 * (harvested from loot tables the pack already ships) before it is written out.
 *
 * Usage:  node tools/pixelgo-loot/generate.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
// les Poké Balls du loot deviennent des couvercles (2026-11-08), voir lids.mjs
import { toLids } from './lids.mjs';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'kubejs', 'data');
const EXAMPLE = path.join(ROOT, 'loottable exemple', 'data');
const OUT_NS = path.join(DATA, 'pixelgo', 'loot_table');
const DRY = process.argv.includes('--dry');

const walk = (d) => (fs.existsSync(d)
  ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
  : []);
const rel = (base, f) => path.relative(base, f).split(path.sep).join('/');
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

// ---------------------------------------------------------------- catalogue
// ids proven to work: every item referenced by a loot table the pack already ships,
// plus items referenced by Pixelmon's own species files (mega stones, legendary keys).
const CATALOG = new Set();
const BALL_VARIANTS = new Set();
{
  const srcs = ['dungeons_arise', 'minecraft', 'pixelgo_dungeon', 'loot', 'pixelmon'].map((n) => path.join(DATA, n));
  for (const d of srcs) {
    for (const f of walk(d).filter((x) => x.endsWith('.json'))) {
      const j = readJson(f); if (!j) continue;
      const w = (o) => {
        if (Array.isArray(o)) return o.forEach(w);
        if (o && typeof o === 'object') {
          if (o.type && String(o.type).endsWith('item') && typeof o.name === 'string') {
            CATALOG.add(o.name);
            for (const fn of o.functions || []) {
              const v = fn.components && fn.components['pixelmon:poke_ball'];
              if (v) BALL_VARIANTS.add(v);
            }
          }
          Object.values(o).forEach(w);
        }
      };
      w(j);
    }
  }
  // mega stones & legendary keys: referenced by Pixelmon species files, not by loot tables
  const spec = path.join(DATA, 'pixelmon', 'species');
  for (const f of walk(spec).filter((x) => x.endsWith('.json'))) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(/"(pixelmon:[a-z0-9_]+)"/g)) CATALOG.add(m[1]);
  }
}

const DROPPED = [];
/** keep only ids the catalogue knows; anything else is reported and skipped */
const keep = (cat, ids) => {
  const ok = [];
  for (const id of ids) {
    if (CATALOG.has(id) || !id.startsWith('pixelmon:')) ok.push(id);
    else DROPPED.push(`${cat}: ${id}`);
  }
  return ok;
};

// ---------------------------------------------------------------- json helpers
const px = (n) => `pixelmon:${n}`;
const cnt = (min, max) => ({ function: 'minecraft:set_count', count: { type: 'minecraft:uniform', min, max } });
const item = (name, weight = 1, functions) => {
  const e = { type: 'minecraft:item', name, weight };
  if (functions && functions.length) e.functions = functions;
  return e;
};
const ball = (variant, weight, min = 1, max = 1) => ({
  type: 'minecraft:item',
  name: 'pixelmon:poke_ball',
  weight,
  functions: [
    { function: 'minecraft:set_components', components: { 'pixelmon:poke_ball': variant } },
    ...(max > 1 || min > 1 ? [cnt(min, max)] : []),
  ],
});
const ref = (table, weight = 1) => ({ type: 'minecraft:loot_table', value: table, weight });
/** The "nothing" entry used to dilute a pool.
 *
 *  This MUST be `minecraft:empty`, not an item entry for `minecraft:air`.
 *  `EmptyLootItem.createItemStack` is a bare `return;` - it emits no ItemStack at
 *  all - whereas an air item entry emits an ItemStack that is empty.
 *
 *  Vanilla chest filling strips empty stacks on its way in, so air looks
 *  harmless there. Anything that calls `LootTable.getRandomItems` and uses the
 *  list directly gets handed the empty stack, and Pixelmon's Poke Stop does
 *  exactly that:
 *      CustomDropScreenFactory$Builder.addItems -> Preconditions.checkArgument
 *      java.lang.IllegalArgumentException: Item stack cannot be empty
 *  which threw on most Poke Stop uses until this was changed. The rarity maths
 *  is identical either way - only the emitted stack differs. */
const air = (weight) => ({ type: 'minecraft:empty', weight });
const pool = (rolls, entries) => ({ rolls, entries });
const uni = (min, max) => ({ type: 'minecraft:uniform', min, max });
const table = (pools) => ({ type: 'minecraft:generic', pools });
/** one pool that rolls a sub-table, diluted with air exactly like the example does */
const chance = (sub, airWeight, min = 1, max = 2) => pool(uni(min, max), [ref(sub, 1), air(airWeight)]);

const files = new Map(); // relative path under pixelgo/loot_table -> json
const put = (p, json) => files.set(p, json);

// ---------------------------------------------------------------- categories
const P = 'pixelgo:pixelmon/';
const G = 'pixelgo:gimmicks/';
const S = 'pixelgo:special/';

// --- exp candies: one table per tier, mirroring the example's ladder
const CANDY = [
  ['t0', [['xs_exp_candy', 1, 1, 2, 1]], 2],
  ['t1', [['xs_exp_candy', 1, 1, 3, 1]], 1],
  ['t2', [['xs_exp_candy', 3, 1, 3, 1], ['s_exp_candy', 1, 1, 1, 1]], 4],
  ['t3', [['xs_exp_candy', 3, 1, 3, 1], ['s_exp_candy', 2, 1, 2, 1]], 4],
  ['t4', [['s_exp_candy', 3, 1, 3, 1], ['rare_candy', 1, 1, 1, 1]], 4],
  ['t5', [['s_exp_candy', 3, 1, 3, 1], ['rare_candy', 1, 1, 2, 1]], 4],
  ['t6', [['m_exp_candy', 3, 1, 2, 1], ['rare_candy', 1, 1, 3, 1]], 3],
  ['t7', [['m_exp_candy', 3, 1, 3, 1], ['l_exp_candy', 1, 1, 1, 1], ['rare_candy', 1, 1, 4, 1]], 2],
  ['t8', [['l_exp_candy', 5, 1, 2, 1], ['rare_candy', 5, 1, 6, 1]], 1],
  ['t9', [['xl_exp_candy', 5, 1, 1, 1], ['rare_candy', 10, 1, 8, 1]], 0],
];
for (const [t, entries, airW] of CANDY) {
  const es = entries
    .filter(([n]) => CATALOG.has(px(n)))
    .map(([n, w, mn, mx]) => item(px(n), w, mx > 1 ? [cnt(mn, mx)] : undefined));
  if (airW > 0) es.push(air(airW));
  put(`pixelmon/candy_${t}.json`, table([pool(1, es)]));
}

// --- poke balls, by rarity of the ball itself (all one item + a data component)
const BALLS_T1 = ['poke_ball', 'premier_ball', 'heal_ball', 'net_ball', 'nest_ball', 'friend_ball'];
const BALLS_T2 = ['great_ball', 'dive_ball', 'dusk_ball', 'repeat_ball', 'timer_ball', 'luxury_ball', 'level_ball', 'lure_ball', 'moon_ball', 'love_ball', 'fast_ball', 'heavy_ball'];
const BALLS_T3 = ['ultra_ball', 'quick_ball', 'safari_ball', 'sport_ball', 'dream_ball'];
const BALLS_T4 = ['beast_ball', 'cherish_ball', 'gs_ball', 'origin_ball'];
const BALLS_ANCIENT = ['ancient_poke_ball', 'ancient_great_ball', 'ancient_ultra_ball', 'ancient_heavy_ball', 'feather_ball', 'wing_ball', 'jet_ball', 'leaden_ball', 'gigaton_ball'];
// PixelGO Balls (pixelballs-*.jar) registers 20 more variants of the same component.
// Names taken from its data/pixelmon/pokeballs/*.json ("name" field), so they are exact.
// They are not in any loot table yet, hence not in BALL_VARIANTS — declare them here.
const PIXELGO_BALLS = [
  'exp_xs_ball', 'exp_s_ball', 'exp_m_ball', 'exp_l_ball', 'exp_xl_ball',
  'ev_hp_ball', 'ev_atk_ball', 'ev_def_ball', 'ev_spatk_ball', 'ev_spdef_ball', 'ev_spd_ball',
  'iv_hp_ball', 'iv_atk_ball', 'iv_def_ball', 'iv_spatk_ball', 'iv_spdef_ball', 'iv_spd_ball',
  'iv_all_ball', 'shiny_ball', 'skin_ball',
];
for (const v of PIXELGO_BALLS) BALL_VARIANTS.add(v);

const ballTable = (list, min, max) => table([pool(1, list.filter((v) => BALL_VARIANTS.has(v)).map((v) => ball(v, 1, min, max)))]);
put('pixelmon/pokeballs_t1.json', ballTable(BALLS_T1, 2, 5));
put('pixelmon/pokeballs_t2.json', ballTable(BALLS_T2, 2, 4));
put('pixelmon/pokeballs_t3.json', ballTable(BALLS_T3, 1, 3));
put('pixelmon/pokeballs_t4.json', ballTable(BALLS_T4, 1, 2));
put('pixelmon/pokeballsancient_t1.json', ballTable(BALLS_ANCIENT, 1, 3));

// --- PixelGO Balls, split by how much they actually change the game
// EXP balls grant 4 / 8 / 12 / 16 / 20 levels on capture: useful, not decisive.
put('pixelmon/pokeballs_exp.json', table([pool(1, [
  ball('exp_xs_ball', 10, 2, 4),
  ball('exp_s_ball', 7, 1, 3),
  ball('exp_m_ball', 4, 1, 2),
  ball('exp_l_ball', 2, 1, 2),
  ball('exp_xl_ball', 1, 1, 1),
])]));
// EV balls max one stat (252), single-stat IV balls lock one stat to 31: strong, so rarer.
put('pixelmon/pokeballs_training.json', table([pool(1, [
  ...['ev_hp_ball', 'ev_atk_ball', 'ev_def_ball', 'ev_spatk_ball', 'ev_spdef_ball', 'ev_spd_ball'].map((v) => ball(v, 6, 1, 2)),
  ...['iv_hp_ball', 'iv_atk_ball', 'iv_def_ball', 'iv_spatk_ball', 'iv_spdef_ball', 'iv_spd_ball'].map((v) => ball(v, 2, 1, 1)),
])]));
// The decisive three: a free skin, a guaranteed shiny, a 6x31 IV Pokemon (catchBonus 20).
// Kept at the same order of rarity as the SSR ticket.
put('pixelmon/pokeballs_prime.json', table([pool(1, [
  ball('skin_ball', 8, 1, 1),
  ball('shiny_ball', 2, 1, 1),
  ball('iv_all_ball', 1, 1, 1),
])]));

// --- ball crafting materials
put('pixelmon/pokeballmaterials_t1.json', table([pool(uni(1, 2), keep('ballmat1', [
  'red_apricorn', 'yellow_apricorn', 'green_apricorn', 'blue_apricorn', 'pink_apricorn', 'white_apricorn', 'black_apricorn',
].map(px)).map((n) => item(n, 1, [cnt(2, 6)])))]));
put('pixelmon/pokeballmaterials_t2.json', table([pool(1, [
  ...keep('ballmat2', ['aluminum_ingot', 'silver_ingot'].map(px)).map((n) => item(n, 4, [cnt(2, 5)])),
  ...keep('ballmat2', ['poke_ball_lid'].map(px)).map((n) => item(n, 2, [cnt(1, 3)])),
  ...keep('ballmat2', ['platinum_ingot'].map(px)).map((n) => item(n, 1, [cnt(1, 2)])),
])]));

// --- medicine: everyday heals common, full restores rare (same shape as the example)
const MEDICINE = [
  ['potion', 10], ['super_potion', 6], ['hyper_potion', 3], ['max_potion', 2], ['full_restore', 1],
  ['antidote', 10], ['awakening', 10], ['burn_heal', 10], ['ice_heal', 10], ['paralyze_heal', 10], ['full_heal', 2],
  ['revive', 4], ['max_revive', 1],
  ['ether', 5], ['max_ether', 2], ['elixir', 3], ['max_elixir', 1],
  ['energy_powder', 10], ['energy_root', 8], ['heal_powder', 8], ['moomoo_milk', 6],
];
put('pixelmon/medicine.json', table([pool(1, MEDICINE.filter(([n]) => CATALOG.has(px(n))).map(([n, w]) => item(px(n), w)))]));

// --- battle items
put('pixelmon/xitems.json', table([pool(1, keep('xitems', [
  'dire_hit', 'guard_spec', 'x_accuracy', 'x_attack', 'x_special_attack', 'x_speed', 'x_defense',
].map(px)).map((n) => item(n, 1)))]));

// --- vitamins: PP Max clearly rarer than the rest
put('pixelmon/vitamins.json', table([pool(1, [
  ...keep('vitamins', ['calcium', 'carbos', 'hp_up', 'iron', 'protein', 'zinc'].map(px)).map((n) => item(n, 4)),
  ...keep('vitamins', ['pp_up'].map(px)).map((n) => item(n, 2)),
  ...keep('vitamins', ['pp_max'].map(px)).map((n) => item(n, 1)),
])]));

// --- held items: type boosters common, competitive staples rare
const HELD_COMMON = ['charcoal', 'magnet', 'mystic_water', 'miracle_seed', 'never_melt_ice', 'sharp_beak', 'poison_barb', 'hard_stone', 'silver_powder', 'dragon_fang', 'silk_scarf', 'black_belt', 'metal_coat', 'pixie_plate', 'snowball', 'cell_battery', 'eject_button', 'metronome'];
const HELD_UNCOMMON = ['rocky_helmet', 'safety_goggles', 'shell_bell', 'light_clay', 'heat_rock', 'icy_rock', 'smooth_rock', 'black_sludge', 'destiny_knot', 'power_bracer', 'power_belt', 'power_lens', 'power_band', 'power_anklet', 'power_weight'];
const HELD_RARE = ['leftovers', 'assault_vest', 'focus_sash', 'focus_band', 'expert_belt', 'exp_share', 'lucky_egg'];
put('pixelmon/helditems.json', table([pool(1, [
  ...keep('held', HELD_COMMON.map(px)).map((n) => item(n, 6)),
  ...keep('held', HELD_UNCOMMON.map(px)).map((n) => item(n, 3)),
  ...keep('held', HELD_RARE.map(px)).map((n) => item(n, 1)),
])]));

// --- evolution
put('pixelmon/evostones.json', table([pool(1, keep('evostones', [
  'fire_stone', 'thunder_stone', 'water_stone', 'leaf_stone', 'moon_stone', 'sun_stone', 'dawn_stone', 'dusk_stone', 'shiny_stone', 'ice_stone',
].map(px)).map((n) => item(n, 1)))]));
put('pixelmon/evoitems.json', table([pool(1, keep('evoitems', [
  'dragon_scale', 'kings_rock', 'metal_coat', 'dubious_disc', 'deep_sea_scale', 'deep_sea_tooth', 'electirizer', 'magmarizer',
  'oval_stone', 'protector', 'reaper_cloth', 'prism_scale', 'sachet', 'whipped_dream', 'chipped_pot', 'cracked_pot',
  'sweet_apple', 'tart_apple', 'galarica_cuff', 'galarica_wreath', 'razor_claw', 'razor_fang',
].map(px)).map((n) => item(n, 1)))]));

// --- EV training (Pixelmon feathers)
// NO PIXELGO ITEMS (2026-11-08, on request): no `pixelgoitems:*` item is in a structure
// chest. Gone: the +EV items and random_ev from evfeathers, random_fossil from fossils, and
// the two tables that held nothing else, pixelmon/ivcandy (+IV items, random_iv) and
// special/gimmick_items (random_level, size_randomizer, skin_swapper, shiny_swapper),
// with every ladder pool that rolled them.
put('pixelmon/evfeathers.json', table([pool(1, [
  ...keep('evfeathers', ['muscle_feather', 'resist_feather', 'genius_feather', 'swift_feather', 'health_feather', 'clever_feather'].map(px)).map((n) => item(n, 6, [cnt(3, 8)])),
])]));

// --- mints, gems, fossils
put('pixelmon/mints.json', table([pool(1, keep('mints', [
  'adamant', 'bashful', 'bold', 'brave', 'calm', 'careful', 'docile', 'gentle', 'hardy', 'hasty', 'impish', 'jolly', 'lax',
  'lonely', 'mild', 'modest', 'naive', 'naughty', 'quiet', 'quirky', 'rash', 'relaxed', 'sassy', 'serious', 'timid',
].map((n) => px(`mint_${n}`))).map((n) => item(n, 1)))]));
put('pixelmon/gems.json', table([pool(1, keep('gems', [
  'psychic', 'steel', 'poison', 'bug', 'ground', 'fighting', 'grass', 'normal', 'flying', 'rock', 'ice', 'fairy', 'dragon', 'fire', 'dark', 'electric', 'ghost', 'water',
].map((n) => px(`${n}_gem`))).map((n) => item(n, 1)))]));
put('pixelmon/fossils.json', table([pool(1, [
  ...keep('fossils', ['sail_fossil', 'dome_fossil', 'claw_fossil', 'plume_fossil', 'root_fossil', 'jaw_fossil', 'old_amber', 'skull_fossil', 'armor_fossil', 'helix_fossil'].map(px)).map((n) => item(n, 3)),
])]));

// --- apricorns & berries
put('pixelmon/apricorns.json', table([pool(uni(1, 2), keep('apricorns', [
  'red_apricorn', 'yellow_apricorn', 'green_apricorn', 'blue_apricorn', 'pink_apricorn', 'white_apricorn', 'black_apricorn',
].map(px)).map((n) => item(n, 1, [cnt(1, 4)])))]));
const BERRY_COMMON = ['oran', 'pecha', 'cheri', 'chesto', 'rawst', 'aspear', 'leppa', 'persim', 'lum', 'sitrus'];
const BERRY_STAT = ['kelpsy', 'hondew', 'grepa', 'qualot', 'pomeg', 'tamato'];
const BERRY_RESIST = ['occa', 'passho', 'wacan', 'rindo', 'yache', 'chople', 'kebia', 'shuca', 'coba', 'payapa', 'tanga', 'charti', 'kasib', 'haban', 'colbur', 'babiri', 'chilan', 'roseli'];
const BERRY_RARE = ['liechi', 'ganlon', 'salac', 'petaya', 'apicot', 'lansat', 'starf', 'micle', 'custap', 'jaboca', 'rowap', 'enigma', 'kee', 'maranga'];
put('pixelmon/berries.json', table([pool(uni(1, 2), [
  ...keep('berries', BERRY_COMMON.map((n) => px(`${n}_berry`))).map((n) => item(n, 8, [cnt(1, 3)])),
  ...keep('berries', BERRY_STAT.map((n) => px(`${n}_berry`))).map((n) => item(n, 4, [cnt(1, 2)])),
  ...keep('berries', BERRY_RESIST.map((n) => px(`${n}_berry`))).map((n) => item(n, 2)),
  ...keep('berries', BERRY_RARE.map((n) => px(`${n}_berry`))).map((n) => item(n, 1)),
])]));

// --- gimmicks
// 58 stones = Pixelmon 9.4.2 ItemRegistration MEGA_STONES (Rayquaza needs none). The five 9.4.2
// stones (chimechite, clefablite, drampanite, eelektrossite, zeraorite) were added to
// gimmicks/megastones.json by hand on 2026-10-24. WARNING: kubejs/data/pixelmon/species no longer
// exists, so CATALOG does not know any mega stone and a run would empty that table: check
// the DROPPED report before writing.
const MEGASTONES = ['abomasite', 'absolite', 'aerodactylite', 'aggronite', 'alakazite', 'altarianite', 'ampharosite', 'audinite', 'banettite', 'beedrillite', 'blastoisinite', 'blazikenite', 'cameruptite', 'chandelurite', 'charizardite_x', 'charizardite_y', 'chimechite', 'clefablite', 'darkranite', 'diancite', 'dragoninite', 'drampanite', 'eelektrossite', 'galladite', 'garchompite', 'gardevoirite', 'gengarite', 'glalitite', 'gyaradosite', 'heracronite', 'houndoominite', 'kangaskhanite', 'latiasite', 'latiosite', 'lopunnite', 'lucarionite', 'manectite', 'mawilite', 'medichamite', 'metagrossite', 'mewtwonite_x', 'mewtwonite_y', 'pidgeotite', 'pinsirite', 'raichunite_x', 'raichunite_y', 'sablenite', 'salamencite', 'sceptilite', 'scizorite', 'sharpedonite', 'slowbronite', 'starminite', 'steelixite', 'swampertite', 'tyranitarite', 'venusaurite', 'zeraorite'];
put('gimmicks/megastones.json', table([pool(1, keep('megastones', MEGASTONES.map(px)).map((n) => item(n, 1)))]));
const LEGENDARY = ['adamant_orb', 'lustrous_orb', 'griseous_orb', 'red_orb', 'blue_orb', 'jade_orb', 'light_stone', 'dark_stone', 'gracidea', 'wishing_star', 'meteorite', 'silver_wing', 'rainbow_wing', 'rusted_sword', 'rusted_shield', 'zygarde_cube', 'dna_splicers', 'prison_bottle'];
put('gimmicks/legendaries.json', table([pool(1, keep('legendaries', LEGENDARY.map(px)).map((n) => item(n, 1)))]));

// --- special: Pokeblocks currency & vouchers, cosmetics
put('special/money.json', table([pool(uni(1, 2), [
  item('pokeblocks:nickel', 8, [cnt(2, 8)]),
  item('pokeblocks:dime', 4, [cnt(1, 5)]),
  item('pokeblocks:poke_coin', 1, [cnt(1, 3)]),
])]));
put('special/vouchers.json', table([pool(1, [
  item('pokeblocks:raid_pass', 8),
  item('pokeblocks:poke_egg', 4),
  item('pokeblocks:raid_voucher', 2),
  item('pokeblocks:radiant_voucher', 1),
])]));
// checked against assets/pokeblocks/models/item/ — there is no pokedoll_pikachu in this mod
const POKEDOLLS = ['pokedoll_bulbasaur', 'pokedoll_charmander', 'pokedoll_squirtle', 'pokedoll_eevee', 'pokedoll_happiny', 'pokedoll_snorlax', 'pokedoll_gengar', 'pokedoll_mimikyu', 'pokedoll_jigglypuff', 'pokedoll_lechonk', 'pokedoll_wooper', 'pokedoll_riolu', 'pokedoll_rowlet', 'pokedoll_cyndaquil', 'pokedoll_treecko', 'pokedoll_mareep', 'pokedoll_furret', 'pokedoll_sableye', 'pokedoll_drifloon', 'pokedoll_absol', 'pokedoll_munchlax'];
const COSPLAY = ['pkmn_trainer_red_helmet', 'pkmn_trainer_red_chestplate', 'pkmn_trainer_blue_helmet', 'pkmn_trainer_blue_chestplate', 'pkmn_trainer_green_helmet', 'pkmn_trainer_green_chestplate', 'pkmn_trainer_yellow_helmet', 'pkmn_trainer_yellow_chestplate', 'pkmn_trainer_black_helmet', 'pkmn_trainer_black_chestplate', 'pkmn_trainer_pink_helmet', 'pkmn_trainer_pink_chestplate'];
const POKEMANIAC = ['pokemaniac_pikachu_helmet', 'pokemaniac_gengar_helmet', 'pokemaniac_magikarp_helmet', 'pokemaniac_wooper_helmet', 'pokemaniac_greninja_helmet'];
const POKEMANIAC_SHINY = ['pokemaniac_pikachu_shiny_helmet', 'pokemaniac_gengar_shiny_helmet', 'pokemaniac_magikarp_shiny_helmet', 'pokemaniac_wooper_shiny_helmet', 'pokemaniac_greninja_shiny_helmet'];
put('special/cosmetics.json', table([pool(1, [
  ...POKEDOLLS.map((n) => item(`pokeblocks:${n}`, 6)),
  ...COSPLAY.map((n) => item(`weavers_cosmetics_cosplay:${n}`, 3)),
  ...POKEMANIAC.map((n) => item(`weavers_cosmetics_cosplay:${n}`, 2)),
  ...POKEMANIAC_SHINY.map((n) => item(`weavers_cosmetics_cosplay:${n}`, 1)),
])]));
// --- KubeJS summon items (kubejs/startup_scripts/main.js)
// Rarity comes straight from their recipes:
//   random_egg  = egg + 8 fertilized essences            -> rare('rare')
//   mega_key    = key_stone (= 8 random_egg + a ticket)  -> ~8x a random egg
//   ssr_ticket  = 4 fading compressed collectors         -> rarity('epic'), far above both
put('special/summons.json', table([pool(1, [
  item('kubejs:random_egg', 12),
  item('kubejs:mega_key', 3),
])]));
put('special/ssr_ticket.json', table([pool(1, [item('kubejs:ssr_ticket', 1)])]));

// --- PixelGO Dungeon gate beacons
// The nine ranks are E < D < C < B < A < S < SS < SSS < Demon. All nine are proven by
// assets/pixelgo_dungeon/models/item/gate_beacon_*.json in pixelgo_dungeon-3.0.jar; the top
// four also appear in the mod's own gate chests, so CATALOG knows them and they double as a
// canary that the id scheme has not changed.
//
// A beacon is not a way to *reach* a Gate — Gates open on their own every few minutes. What it
// buys is the RANK, so the low ranks are a convenience and the top ranks are the prize. Four
// bands instead of one table, so a t4 chest can never cough up a Demon beacon.
const GB = (r) => `pixelgo_dungeon:gate_beacon_${r}`;
for (const r of ['s', 'ss', 'sss', 'demon']) {
  if (!CATALOG.has(GB(r))) DROPPED.push(`gate_beacons: ${GB(r)} is no longer referenced by the mod's own gate chests`);
}
put('special/gate_beacons_t1.json', table([pool(1, [item(GB('e'), 6), item(GB('d'), 3), item(GB('c'), 1)])]));
put('special/gate_beacons_t2.json', table([pool(1, [item(GB('c'), 6), item(GB('b'), 3), item(GB('a'), 1)])]));
put('special/gate_beacons_t3.json', table([pool(1, [item(GB('s'), 6), item(GB('ss'), 2), item(GB('sss'), 1)])]));
put('special/gate_beacons_t4.json', table([pool(1, [item(GB('sss'), 3), item(GB('demon'), 1)])]));

// --- HelsCrates keys
// The mod registers one block and one key PER CONFIG FILE, at startup:
// config/helscrates/crates/<id>.json -> helscrates:<id>_crate + helscrates:<id>_key.
// This pack ships poke / great / ultra / master, so those four keys exist and
// helscrates:common_key DOES NOT - it has a model, a texture and a lang entry but
// no config file, so it is never registered. Same trap as the Poke Ball variants:
// assets are not a registry.
//
// A key is a plain item with no data component, consumed on use, and the crate
// refuses a key that does not match it. So the key IS the loot, with nothing else
// to carry. One table per key rather than one banded table, because each key wants
// its own curve: a Poke Key should be common early and fade at the top, a Master
// Key should only ever appear at the top.
const CK = (n) => `helscrates:${n}_key`;
for (const n of ['poke', 'great', 'ultra', 'master']) {
  const cfg = path.join(ROOT, 'config', 'helscrates', 'crates', `${n}.json`);
  if (!fs.existsSync(cfg)) DROPPED.push(`crate_keys: no config/helscrates/crates/${n}.json, so ${CK(n)} is never registered`);
}
put('special/crate_key_poke.json', table([pool(1, [item(CK('poke'), 1)])]));
put('special/crate_key_great.json', table([pool(1, [item(CK('great'), 1)])]));
put('special/crate_key_ultra.json', table([pool(1, [item(CK('ultra'), 1)])]));
put('special/crate_key_master.json', table([pool(1, [item(CK('master'), 1)])]));

const ARMOR_SETS = ['charizard', 'gyarados', 'groudon'];
const ARMOR_PIECES = { charizard: ['helmet', 'chestplate', 'leggings', 'boots'], gyarados: ['helmet', 'chestplate'], groudon: ['helmet', 'chestplate', 'leggings', 'boots'] };
put('special/legendary_armor.json', table([pool(1, [
  ...ARMOR_SETS.flatMap((s) => ARMOR_PIECES[s].map((p) => item(`pokemon_armor:${s}_${p}`, 4))),
  ...ARMOR_SETS.flatMap((s) => ARMOR_PIECES[s].map((p) => item(`pokemon_armor:${s}_shiny_${p}`, 1))),
])]));

// ---------------------------------------------------------------- tier ladders
// Same shape as academy:basic/tN — a stack of "chance" pools, each diluted with air.
const BASIC = {
  t0: [[P + 'candy_t0', 3]],
  t1: [[P + 'candy_t1', 3], [P + 'pokeballs_t1', 3], [S + 'money', 6]],
  t2: [[P + 'candy_t2', 3], [P + 'pokeballs_t1', 3], [P + 'medicine', 10], [S + 'money', 5], [P + 'apricorns', 8], [P + 'pokeballmaterials_t1', 6]],
  t3: [[P + 'candy_t3', 3], [P + 'pokeballs_t1', 2], [P + 'evfeathers', 6], [P + 'medicine', 4], [P + 'mints', 100],
       [P + 'xitems', 6], [P + 'evostones', 20], [P + 'berries', 6], [S + 'money', 4], [S + 'vouchers', 400],
       [P + 'pokeballmaterials_t1', 5], [P + 'pokeballmaterials_t2', 10],
       [G + 'legendaries', 3000], [G + 'megastones', 3000],
       [S + 'crate_key_poke', 12]],
  t4: [[P + 'candy_t4', 3], [P + 'pokeballs_t2', 4], [P + 'xitems', 4], [P + 'medicine', 2], [P + 'mints', 80],
       [P + 'helditems', 9], [P + 'evostones', 10], [P + 'berries', 4], [S + 'money', 3], [S + 'vouchers', 200], [P + 'pokeballmaterials_t2', 8],
       [P + 'pokeballs_exp', 30],
       [S + 'cosmetics', 120], [G + 'legendaries', 2000], [G + 'megastones', 1000],
       [S + 'gate_beacons_t1', 90],
       [S + 'crate_key_poke', 12], [S + 'crate_key_great', 70]],
  t5: [[P + 'candy_t5', 3], [P + 'pokeballs_t2', 3], [P + 'xitems', 3], [P + 'medicine', 3], [P + 'helditems', 4],
       [P + 'berries', 4], [P + 'vitamins', 3], [P + 'evoitems', 3], [P + 'mints', 60], [S + 'money', 2],
       [S + 'vouchers', 100], [S + 'cosmetics', 80], [S + 'summons', 800],
       [P + 'pokeballs_exp', 15], [P + 'pokeballs_training', 80],
       [G + 'legendaries', 600], [G + 'megastones', 300],
       [S + 'gate_beacons_t1', 60],
       [S + 'crate_key_poke', 16], [S + 'crate_key_great', 26]],
  t6: [[P + 'candy_t6', 3], [P + 'pokeballs_t3', 4], [P + 'medicine', 3], [P + 'helditems', 1], [P + 'vitamins', 1],
       [P + 'evoitems', 1], [S + 'vouchers', 40], [S + 'cosmetics', 40], [S + 'summons', 300],
       [P + 'pokeballs_exp', 8], [P + 'pokeballs_training', 40],
       [G + 'legendaries', 200], [G + 'megastones', 100],
       [S + 'gate_beacons_t1', 40], [S + 'gate_beacons_t2', 300],
       [S + 'crate_key_poke', 28], [S + 'crate_key_great', 18], [S + 'crate_key_ultra', 90]],
  t7: [[P + 'candy_t7', 3], [P + 'pokeballs_t3', 2], [P + 'helditems', 1], [P + 'vitamins', 1], [P + 'evoitems', 1],
       [S + 'vouchers', 20], [S + 'cosmetics', 20],
       [S + 'summons', 120], [S + 'ssr_ticket', 600],
       [P + 'pokeballs_exp', 5], [P + 'pokeballs_training', 20], [P + 'pokeballs_prime', 700],
       [S + 'legendary_armor', 600], [G + 'legendaries', 60], [G + 'megastones', 40],
       [S + 'gate_beacons_t1', 30], [S + 'gate_beacons_t2', 150], [S + 'gate_beacons_t3', 900],
       [S + 'crate_key_poke', 50], [S + 'crate_key_great', 18], [S + 'crate_key_ultra', 45], [S + 'crate_key_master', 900]],
  t8: [[P + 'candy_t8', 3], [P + 'pokeballs_t4', 3], [P + 'helditems', 0], [P + 'vitamins', 1], [P + 'evoitems', 0],
       [S + 'vouchers', 4], [S + 'cosmetics', 10],
       [S + 'summons', 40], [S + 'ssr_ticket', 200],
       [P + 'pokeballs_exp', 3], [P + 'pokeballs_training', 10], [P + 'pokeballs_prime', 200],
       [S + 'legendary_armor', 200], [G + 'legendaries', 20], [G + 'megastones', 20],
       [S + 'gate_beacons_t2', 80], [S + 'gate_beacons_t3', 400], [S + 'gate_beacons_t4', 800],
       [S + 'crate_key_great', 30], [S + 'crate_key_ultra', 25], [S + 'crate_key_master', 300]],
  t9: [[P + 'candy_t9', 3], [P + 'pokeballs_t4', 1], [P + 'helditems', 0], [P + 'vitamins', 1], [P + 'evoitems', 0],
       [S + 'vouchers', 3], [S + 'cosmetics', 6],
       [S + 'summons', 15], [S + 'ssr_ticket', 60],
       [P + 'pokeballs_exp', 2], [P + 'pokeballs_training', 5], [P + 'pokeballs_prime', 60],
       [S + 'legendary_armor', 60], [G + 'legendaries', 10], [G + 'megastones', 6],
       [S + 'gate_beacons_t2', 40], [S + 'gate_beacons_t3', 200], [S + 'gate_beacons_t4', 150],
       [S + 'crate_key_great', 40], [S + 'crate_key_ultra', 20], [S + 'crate_key_master', 120]],
};
// vitamin rolls widen at the top, exactly like the example
const VITAMIN_ROLLS = { t5: [1, 3], t6: [1, 4], t7: [1, 4], t8: [1, 6], t9: [1, 8] };
for (const [t, entries] of Object.entries(BASIC)) {
  const pools = entries.map(([sub, airW]) => {
    const isVit = sub.endsWith('/vitamins');
    const [mn, mx] = isVit && VITAMIN_ROLLS[t] ? VITAMIN_ROLLS[t] : [1, 2];
    return airW === 0 ? pool(uni(mn, mx), [ref(sub, 1)]) : chance(sub, airW, mn, mx);
  });
  put(`basic/${t}.json`, table(pools));
}

// underground: no poke balls or money, ancient balls + stones/gems/fossils instead
const UNDER = {
  t0: [[P + 'candy_t0', 3]],
  t1: [[P + 'candy_t1', 3], [P + 'pokeballsancient_t1', 4]],
  t2: [[P + 'candy_t2', 3], [P + 'pokeballsancient_t1', 4], [P + 'evostones', 20]],
  t3: [[P + 'candy_t3', 3], [P + 'pokeballsancient_t1', 3], [P + 'evostones', 10], [P + 'gems', 10], [P + 'fossils', 20],
       [G + 'legendaries', 10000], [G + 'megastones', 10000]],
  t4: [[P + 'candy_t4', 3], [P + 'pokeballsancient_t1', 3], [P + 'evostones', 6], [P + 'gems', 8], [P + 'fossils', 12],
       [P + 'helditems', 9], [G + 'legendaries', 4000], [G + 'megastones', 4000]],
  t5: [[P + 'candy_t5', 3], [P + 'evostones', 3], [P + 'gems', 6], [P + 'fossils', 8], [P + 'helditems', 4],
       [P + 'evoitems', 3], [G + 'legendaries', 1000], [G + 'megastones', 1000]],
  t6: [[P + 'candy_t6', 3], [P + 'evostones', 1], [P + 'gems', 1], [P + 'fossils', 4], [P + 'helditems', 1],
       [P + 'evoitems', 1], [S + 'summons', 900],
       [P + 'pokeballs_training', 50],
       [G + 'legendaries', 600], [G + 'megastones', 600],
       [S + 'gate_beacons_t1', 60]],
  t7: [[P + 'candy_t7', 3], [P + 'helditems', 1], [P + 'evostones', 1], [P + 'gems', 1], [P + 'fossils', 2],
       [P + 'evoitems', 1], [S + 'summons', 400],
       [P + 'pokeballs_training', 25], [P + 'pokeballs_prime', 900],
       [G + 'legendaries', 80], [G + 'megastones', 80],
       [S + 'gate_beacons_t1', 45], [S + 'gate_beacons_t2', 250]],
  t8: [[P + 'candy_t8', 3], [P + 'helditems', 0], [P + 'evostones', 1], [P + 'gems', 1], [P + 'fossils', 1],
       [P + 'evoitems', 0],
       [S + 'summons', 120], [S + 'ssr_ticket', 700],
       [P + 'pokeballs_training', 12], [P + 'pokeballs_prime', 250],
       [S + 'legendary_armor', 300], [G + 'legendaries', 30], [G + 'megastones', 30],
       [S + 'gate_beacons_t2', 120], [S + 'gate_beacons_t3', 700]],
  t9: [[P + 'candy_t9', 3], [P + 'helditems', 0], [P + 'evostones', 1], [P + 'gems', 1], [P + 'fossils', 1],
       [P + 'evoitems', 0],
       [S + 'summons', 45], [S + 'ssr_ticket', 220],
       [P + 'pokeballs_training', 6], [P + 'pokeballs_prime', 80],
       [S + 'legendary_armor', 80], [G + 'legendaries', 15], [G + 'megastones', 10],
       [S + 'gate_beacons_t2', 60], [S + 'gate_beacons_t3', 280]],
};
for (const [t, entries] of Object.entries(UNDER)) {
  put(`basic_underground/${t}.json`, table(entries.map(([sub, airW]) => (airW === 0 ? pool(uni(1, 2), [ref(sub, 1)]) : chance(sub, airW)))));
}

// trial chambers
put('basic_trials/common_t1.json', table([
  pool(uni(1, 2), [item(px('xs_exp_candy'), 3, [cnt(1, 3)]), item(px('rare_candy'), 1)]),
  pool(1, [ref(P + 'evostones', 8), ref(P + 'evoitems', 1)]),
  pool(uni(1, 2), [ref(P + 'vitamins', 4), ref(P + 'xitems', 4), ref(P + 'medicine', 4), ref(P + 'helditems', 1)]),
]));
put('basic_trials/rare_t1.json', table([
  pool(uni(1, 2), [item(px('s_exp_candy'), 3, [cnt(1, 3)]), item(px('rare_candy'), 1, [cnt(1, 2)])]),
  pool(1, [ref(P + 'evoitems', 1)]),
  pool(1, [ref(S + 'vouchers', 1), ref(P + 'mints', 1), ref(P + 'helditems', 3)]),
]));
put('basic_trials/unique_t1.json', table([
  pool(1, [ref(S + 'money', 4), ref(S + 'cosmetics', 3)]),
]));
put('basic_trials/ominous_common_t1.json', table([
  pool(uni(1, 2), [item(px('s_exp_candy'), 3, [cnt(1, 3)]), item(px('rare_candy'), 1, [cnt(1, 2)])]),
  pool(uni(1, 2), [ref(P + 'evostones', 6), ref(P + 'evoitems', 2)]),
  pool(uni(1, 2), [ref(P + 'evfeathers', 2), ref(P + 'vitamins', 2), ref(P + 'xitems', 2), ref(P + 'medicine', 2), ref(P + 'helditems', 2)]),
  pool(1, [ref(P + 'gems', 4), ref(P + 'fossils', 1)]),
]));
put('basic_trials/ominous_rare_t1.json', table([
  pool(uni(1, 2), [item(px('m_exp_candy'), 3, [cnt(1, 2)]), item(px('rare_candy'), 1, [cnt(1, 3)])]),
  pool(1, [ref(P + 'evoitems', 1)]),
  pool(1, [ref(S + 'vouchers', 1), ref(P + 'mints', 1), ref(P + 'helditems', 3)]),
  pool(1, [ref(G + 'megastones', 1), ref(P + 'gems', 12), ref(P + 'fossils', 7)]),
  chance(S + 'summons', 250),
]));
put('basic_trials/ominous_unique_t1.json', table([
  pool(1, [ref(S + 'money', 4)]),
  chance(S + 'ssr_ticket', 900),
]));

// ---------------------------------------------------------------- write categories
let written = 0;
for (const [p, json] of files) {
  const f = path.join(OUT_NS, p);
  if (!DRY) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify((toLids(json), json), null, 2) + '\n', 'utf8'); }
  written++;
}

// ---------------------------------------------------------------- injection
const PROFILE = {
  junk: [['t1', 1]],
  poor: [['t2', 9], ['t3', 3], ['t4', 1]],
  common: [['t3', 10], ['t4', 2], ['t5', 1]],
  uncommon: [['t4', 15], ['t5', 3], ['t6', 1]],
  rare: [['t5', 15], ['t6', 3], ['t7', 1]],
  veryrare: [['t6', 33], ['t7', 2], ['t8', 1]],
  treasure: [['t7', 30], ['t8', 1]],
  epic: [['t7', 6], ['t8', 3], ['t9', 1]],
};
const UNDERGROUND_NS = /^(chests\/)?(abandoned_mineshaft|ancient_city|stronghold|trial_chambers)/;

/**
 * Explicit profiles for tables whose rarity the filename heuristic cannot infer.
 * PixelGO Dungeon gates are ranked E < D < C < B < A < S < SS < SSS < Demon; nothing in the
 * name says so, and the mod ships a new set on every update, so they are pinned here.
 * Keyed by "<namespace>/<path under loot_table>".
 */
const PROFILE_OVERRIDE = {
  'pixelgo_dungeon/chests/gate_e.json': [['t3', 10], ['t4', 2], ['t5', 1]],
  'pixelgo_dungeon/chests/gate_d.json': [['t4', 15], ['t5', 3], ['t6', 1]],
  'pixelgo_dungeon/chests/gate_c.json': [['t4', 8], ['t5', 8], ['t6', 1]],
  'pixelgo_dungeon/chests/gate_b.json': [['t5', 15], ['t6', 3], ['t7', 1]],
  'pixelgo_dungeon/chests/gate_a.json': [['t5', 8], ['t6', 8], ['t7', 2], ['t8', 1]],
  'pixelgo_dungeon/chests/gate_s.json': [['t6', 12], ['t7', 5], ['t8', 2]],
  'pixelgo_dungeon/chests/gate_ss.json': [['t6', 10], ['t7', 10], ['t8', 3], ['t9', 1]],
  'pixelgo_dungeon/chests/gate_sss.json': [['t7', 10], ['t8', 6], ['t9', 2]],
  'pixelgo_dungeon/chests/gate_demon.json': [['t7', 6], ['t8', 8], ['t9', 4]],

  /* ---------------------------------------------------------------- pixelmon
   * Pixelmon's own chests. The filename heuristic reads these badly — "arena"
   * looks rare but holds a camera and some film, "galactic" looks generic but
   * holds the Adamant Crystal and the Griseous Core — so every one is pinned by
   * what it actually contains (see README, "Pixelmon's own tables").
   */
  'pixelmon/chests/junk.json': PROFILE.junk,
  'pixelmon/chests/waypoint.json': PROFILE.poor,
  'pixelmon/chests/brewing.json': PROFILE.poor,
  'pixelmon/chests/arena.json': PROFILE.poor,
  'pixelmon/chests/fridge.json': PROFILE.poor,
  'pixelmon/chests/fridge_full.json': PROFILE.common,
  'pixelmon/chests/boat.json': PROFILE.common,
  'pixelmon/chests/day_care.json': PROFILE.common,
  'pixelmon/chests/christmas.json': PROFILE.common,
  'pixelmon/chests/valentines.json': PROFILE.common,
  'pixelmon/chests/graveyard.json': PROFILE.common,
  'pixelmon/chests/haunted_home.json': PROFILE.common,
  'pixelmon/chests/haunted_tower.json': PROFILE.uncommon,
  'pixelmon/chests/dark_tower.json': PROFILE.uncommon,
  'pixelmon/chests/water_tower.json': PROFILE.uncommon,
  'pixelmon/chests/galactic.json': PROFILE.rare,
  'pixelmon/chests/plasma.json': PROFILE.rare,
  'pixelmon/chests/teams/aqua.json': PROFILE.rare,
  'pixelmon/chests/teams/magma.json': PROFILE.rare,
  'pixelmon/chests/teams/galactic.json': PROFILE.rare,
  'pixelmon/chests/teams/plasma.json': PROFILE.rare,
  'pixelmon/chests/ultra_ruin.json': PROFILE.rare,
  'pixelmon/chests/ultraspace/ultra_ruin.json': PROFILE.veryrare,
  'pixelmon/chests/ultraspace/crater_geyser.json': PROFILE.veryrare,
  'pixelmon/chests/ultraspace/plant_monolith.json': PROFILE.veryrare,

  /* Poke Stops respawn on a timer, so they are a renewable faucet rather than
   * one-shot structure loot. They are deliberately capped below the rest:
   * `common` tops out at t5, which keeps the SSR ticket, the prime balls and
   * the mega keys (t7+) out of anything a player can simply wait for. */
  'pixelmon/special/common_pokestop.json': PROFILE.junk,
  'pixelmon/special/rare_pokestop.json': PROFILE.poor,
  'pixelmon/special/legendary_pokestop.json': PROFILE.common,
};

/* Tables inside the pixelmon namespace that must never be injected.
 *   intermediate/*  sub-tables the chests above already roll — injecting here
 *                   would fire the ladder a second time per chest;
 *   crater_pipe     a pure redirect to abandoned_mineshaft / crater_geyser,
 *                   both of which are injected in their own right.
 * blocks/ and the raid dens are already excluded by the isChest test. */
const PIXELMON_SKIP = /^(intermediate\/|chests\/ultraspace\/crater_pipe\.json$)/;

/* Raid dens are gated by `pixelmon:star_level`, so one pool per star gives the
 * ladder a difficulty curve instead of one flat roll. Raid dens respawn too, so
 * this stops short of the treasure tiers except at 6-7 stars, which only Tera
 * raids reach. raids.json has stars 1-5, tera.json 1-7. */
const RAID_BY_STAR = {
  1: PROFILE.poor,
  2: PROFILE.common,
  3: PROFILE.uncommon,
  4: PROFILE.rare,
  5: PROFILE.veryrare,
  6: [['t6', 12], ['t7', 5], ['t8', 2]],
  7: [['t6', 10], ['t7', 10], ['t8', 3], ['t9', 1]],
};

/** read the example's own injection for this exact file, so shared tables keep their calibration */
const profileFromExample = (ns, relPath) => {
  const f = path.join(EXAMPLE, ns, 'loot_table', relPath);
  const j = readJson(f); if (!j) return null;
  const found = [];
  const w = (o) => {
    if (Array.isArray(o)) return o.forEach(w);
    if (o && typeof o === 'object') {
      if (o.type && String(o.type).endsWith('loot_table') && typeof o.value === 'string') {
        const m = /^academy:(basic|basic_underground|basic_trials)\/(.+)$/.exec(o.value);
        if (m) found.push([m[1], m[2], o.weight ?? 1]);
      }
      Object.values(o).forEach(w);
    }
  };
  w(j);
  if (!found.length) return null;
  const ladder = found[0][0];
  return { ladder, entries: found.map(([, t, wt]) => [t, wt]) };
};

const heuristic = (relPath) => {
  const n = relPath.toLowerCase();
  if (/empty|_base$/.test(n)) return 'junk';
  if (/barrel|supply|tent|cart|junk|kitchen|wool|food|coal|stone_storage|wood_storage/.test(n)) return 'poor';
  if (/treasure|elite|vault|hoard/.test(n)) return 'veryrare';
  if (/rare|secret|arena|epic|boss|shrine|altar/.test(n)) return 'rare';
  if (/uncommon|armory|map|library|smith|enchant|potion|crystal|mineral|gold|redstone/.test(n)) return 'uncommon';
  return 'common';
};

// The example overrides 71 vanilla chest tables; this pack only ships 25 of them.
// For the missing ones, copy the untouched vanilla table out of the client jar first —
// a datapack override REPLACES the table, so the vanilla loot has to be carried over.
{
  const VANILLA_JAR = process.env.MC_JAR
    || 'C:/Users/User/curseforge/minecraft/Install/versions/1.21.1/1.21.1.jar';
  const exChests = walk(path.join(EXAMPLE, 'minecraft', 'loot_table'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => rel(path.join(EXAMPLE, 'minecraft', 'loot_table'), f))
    .filter((f) => f.startsWith('chests/'));
  const { execFileSync } = await import('node:child_process');
  let copied = 0, failed = [];
  for (const r of exChests) {
    const dest = path.join(DATA, 'minecraft', 'loot_table', r);
    if (fs.existsSync(dest)) continue;
    try {
      const buf = execFileSync('unzip', ['-p', VANILLA_JAR, `data/minecraft/loot_table/${r}`], { maxBuffer: 1 << 24 });
      if (!buf || !buf.length) { failed.push(r); continue; }
      JSON.parse(buf.toString('utf8')); // refuse anything that is not valid json
      if (!DRY) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf); }
      copied++;
    } catch { failed.push(r); }
  }
  console.log(`vanilla chest tables copied: ${copied}${failed.length ? ` (not in jar: ${failed.join(', ')})` : ''}`);
}

const TARGET_NS = ['ati_structures', 'mes', 'mns', 'mss', 'mtr', 'mvs', 'totw_modded', 'dungeons_arise', 'dungeons_arise_seven_seas', 'minecraft', 'pixelgo_dungeon', 'pixelmon'];
const report = { injected: 0, already: 0, skipped: 0, byProfile: {}, fromExample: 0, raidPools: 0 };

for (const ns of TARGET_NS) {
  const base = path.join(DATA, ns, 'loot_table');
  for (const f of walk(base).filter((x) => x.endsWith('.json'))) {
    const r = rel(base, f);
    const j = readJson(f);
    if (!j) { report.skipped++; continue; }
    if (ns === 'pixelmon' && PIXELMON_SKIP.test(r)) { report.skipped++; continue; }
    // only chest-style tables: never touch block drops or entity drops
    const isChest = String(j.type || '').endsWith('chest') || /^chests?\//.test(r) || (ns !== 'minecraft' && !/^(blocks|entities)\//.test(r) && String(j.type || '').endsWith('generic'));
    if (!isChest) { report.skipped++; continue; }
    if (!Array.isArray(j.pools)) j.pools = [];
    if (j.pools.some((p) => p && p.name === 'pixelgo_tier')) { report.already++; continue; }

    const override = PROFILE_OVERRIDE[`${ns}/${r}`];
    const ex = override ? null : profileFromExample(ns, r);
    let ladder, entries, label;
    if (override) { ladder = 'basic'; entries = override; label = 'override'; }
    else if (ex) { ladder = ex.ladder; entries = ex.entries; label = 'exemple'; report.fromExample++; }
    else {
      const prof = heuristic(r);
      ladder = UNDERGROUND_NS.test(r) ? 'basic_underground' : 'basic';
      entries = PROFILE[prof];
      label = prof;
    }
    report.byProfile[label] = (report.byProfile[label] || 0) + 1;

    j.pools.unshift({
      name: 'pixelgo_tier',
      rolls: 1,
      bonus_rolls: 0,
      entries: entries.map(([t, w]) => ref(`pixelgo:${ladder}/${t}`, w)),
    });
    if (!DRY) fs.writeFileSync(f, JSON.stringify((toLids(j), j), null, 2) + '\n', 'utf8');
    report.injected++;
  }
}

// ------------------------------------------------------- pixelmon raid dens
// `pixelmon:raid_den` tables are not chests, so the loop above leaves them
// alone. They are gated by star level, which is a ready-made difficulty curve:
// one pool per star instead of a single flat roll, so a 5-star raid cannot pay
// the same as a 1-star. The star values are read from the table's own pools
// rather than assumed, so a Pixelmon update that adds a star level is picked up.
{
  const denBase = path.join(DATA, 'pixelmon', 'loot_table', 'raid_den');
  for (const f of walk(denBase).filter((x) => x.endsWith('.json'))) {
    const j = readJson(f);
    if (!j || !Array.isArray(j.pools)) continue;

    const stars = new Set();
    const findStars = (o) => {
      if (Array.isArray(o)) return o.forEach(findStars);
      if (o && typeof o === 'object') {
        if (o.condition === 'pixelmon:star_level' && Number.isInteger(o.stars)) stars.add(o.stars);
        Object.values(o).forEach(findStars);
      }
    };
    j.pools.forEach((p) => findStars(p.conditions));
    if (!stars.size) continue;

    let added = 0;
    for (const s of [...stars].sort((a, b) => a - b)) {
      const name = `pixelgo_tier_${s}star`;
      if (j.pools.some((p) => p && p.name === name)) continue;
      const entries = RAID_BY_STAR[s];
      if (!entries) { DROPPED.push(`raid_den ${rel(denBase, f)}: no profile for ${s}-star`); continue; }
      j.pools.unshift({
        name,
        rolls: 1,
        bonus_rolls: 0,
        conditions: [{ condition: 'pixelmon:star_level', stars: s }],
        entries: entries.map(([t, w]) => ref(`pixelgo:basic/${t}`, w)),
      });
      added++;
    }
    if (added) {
      if (!DRY) fs.writeFileSync(f, JSON.stringify((toLids(j), j), null, 2) + '\n', 'utf8');
      report.raidPools += added;
      report.byProfile[`raid_den/${rel(denBase, f)}`] = added;
    } else {
      report.already++;
    }
  }
}

// ---------------------------------------------------------------- report
console.log(`categories + tiers written : ${written}`);
console.log(`tables injected            : ${report.injected}  (already done: ${report.already}, skipped non-chest: ${report.skipped})`);
console.log(`raid-den star pools added  : ${report.raidPools}`);
console.log(`  profile taken from example: ${report.fromExample}`);
console.log('  profile breakdown        :', report.byProfile);
if (DROPPED.length) {
  console.log(`\nitems dropped (not in catalogue): ${DROPPED.length}`);
  for (const d of DROPPED) console.log('  - ' + d);
} else {
  console.log('\nitems dropped: none — every pixelmon id resolved.');
}
if (DRY) console.log('\n[dry run] nothing written.');
