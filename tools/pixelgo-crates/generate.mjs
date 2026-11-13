/**
 * HelsCrates reward generator.
 *
 * Rewrites only the `rewards` / `guaranteed_rewards` / `reward_count` of
 * config/helscrates/crates/*.json. GUI, key item, block and animation are read back from the
 * existing file and left untouched.
 *
 * What the mod actually supports on a `pokemon` reward (read from PokemonRewardType):
 *   species, level, weight, display_name (becomes the NICKNAME), guaranteed,
 *   data: { shiny, palette, ability, held_item, moves[] }
 * So every Pokemon here is a real set — nickname, ability, four moves, often a held item —
 * instead of a bare species name.
 *
 * Everything is validated against the pack's own data before writing:
 *   - species name + legendary/mythical/ultra-beast status -> kubejs/data/pixelmon/species
 *   - ability                                              -> that species' abilities + hidden
 *   - moves                                                -> that species' full move pools
 *   - palette                                              -> Pixelmon's texture folders
 *   - item ids / ball variants                             -> ids proven to load in this pack
 *
 * Moves are curated but self-healing: an illegal pick is dropped and replaced from the
 * species' own level-up pool, and the substitution is printed. Nothing invalid can ship.
 *
 * Usage:  node tools/pixelgo-crates/generate.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const CRATES = path.join(ROOT, 'config', 'helscrates', 'crates');
const SPECIES_DIR = path.join(ROOT, 'kubejs', 'data', 'pixelmon', 'species');
const DATA = path.join(ROOT, 'kubejs', 'data');
const DRY = process.argv.includes('--dry');
const PIXELMON_JAR = process.env.PIXELMON_JAR
  || path.join(ROOT, 'mods', 'Pixelmon-1.21.1-9.4.1-universal.jar');

const notes = [];
const problems = [];

// ---------------------------------------------------------------- species index
/* Les données d'espèce venaient de kubejs/data/pixelmon/species, qui était un
 * override complet du datapack de Pixelmon. Ce dossier a été retiré depuis ; on
 * lit donc directement dans le jar, qui est de toute façon la source de vérité.
 * Si le dossier revient un jour, il reprend la priorité. */
const speciesFiles = () => {
  if (fs.existsSync(SPECIES_DIR)) {
    return fs.readdirSync(SPECIES_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f, fs.readFileSync(path.join(SPECIES_DIR, f), 'utf8')]);
  }
  const noms = execFileSync('unzip', ['-Z1', PIXELMON_JAR, 'data/pixelmon/species/*.json'],
    { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').filter(Boolean);
  // Une seule extraction, sinon c'est un unzip par espèce (1029 processus).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pxspecies-'));
  execFileSync('unzip', ['-o', '-q', PIXELMON_JAR, 'data/pixelmon/species/*.json', '-d', tmp],
    { maxBuffer: 1 << 28 });
  const dir = path.join(tmp, 'data', 'pixelmon', 'species');
  const out = noms.map((n) => {
    const base = n.split('/').pop();
    return [base, fs.readFileSync(path.join(dir, base), 'utf8')];
  });
  fs.rmSync(tmp, { recursive: true, force: true });
  return out;
};

const SPECIES = new Map(); // lowercase -> { name, restricted, abilities:Set, moves:Set, levelUp:[] }
for (const [, raw] of speciesFiles()) {
  const j = JSON.parse(raw);
  const abilities = new Set();
  const moves = new Set();
  const levelUp = [];
  let restricted = false;
  for (const form of j.forms || []) {
    for (const t of form.tags || []) if (/legendary|mythical|ultrabeast/i.test(t)) restricted = true;
    const ab = form.abilities || {};
    for (const a of [...(ab.abilities || []), ...(ab.hiddenAbilities || [])]) abilities.add(a);
    const mv = form.moves || {};
    for (const entry of mv.levelUpMoves || []) {
      for (const a of entry.attacks || []) { moves.add(a); levelUp.push([entry.level ?? 0, a]); }
    }
    for (const key of Object.keys(mv)) {
      if (key === 'levelUpMoves') continue;
      const list = mv[key];
      if (Array.isArray(list)) for (const a of list) if (typeof a === 'string') moves.add(a);
    }
  }
  levelUp.sort((a, b) => b[0] - a[0]); // strongest (highest level) first
  SPECIES.set(j.name.toLowerCase(), { name: j.name, restricted, abilities, moves, levelUp });
}

// ------------------------------------------------- palette + held-item index
const PALETTES = new Map(); // species lowercase -> Set of palette names
const HELD_ITEMS = new Set(); // normalised names of real Pokemon held items
const PIXELMON_ITEMS = new Set(); // normalised names of every pixelmon item model
const normKey = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
try {
  const out = execFileSync('unzip', ['-l', PIXELMON_JAR], { maxBuffer: 1 << 28 }).toString('utf8');
  for (const m of out.matchAll(/textures\/pokemon\/\d+_([a-z0-9_.-]+)\/all\/base\/([a-z0-9_-]+)\//g)) {
    if (!PALETTES.has(m[1])) PALETTES.set(m[1], new Set());
    PALETTES.get(m[1]).add(m[2]);
  }
  // A held item is what a Pokemon can actually carry into battle. Pixelmon keeps their
  // sprites under textures/item/helditems/ (Leftovers, Choice Band, Muscle Band, plates,
  // gems, mega stones...). Berries live in their own folder but are held items too.
  for (const m of out.matchAll(/textures\/item\/(helditems|berries)\/(?:[a-z0-9_-]+\/)?([a-z0-9_-]+)\.png/g)) {
    HELD_ITEMS.add(normKey(m[2]));
  }
  for (const m of out.matchAll(/models\/item\/([a-z0-9_]+)\.json/g)) PIXELMON_ITEMS.add(normKey(m[1]));
} catch {
  problems.push('Pixelmon jar unreadable — palettes and held items cannot be verified.');
}

/** Resolve a held item id, refusing anything that is not a real Pokemon held item. */
const resolveHeld = (who, id) => {
  if (!id.startsWith('pixelmon:')) {
    problems.push(`${who}: held item "${id}" is not a Pokemon item — a held item must be something a Pokemon can carry in battle (Leftovers, Choice Band, a berry...), never a Minecraft item`);
    return null;
  }
  const key = normKey(id.slice('pixelmon:'.length));
  if (!HELD_ITEMS.has(key)) {
    problems.push(`${who}: "${id}" is not a held item (no sprite under textures/item/helditems or berries)`);
    return null;
  }
  if (!PIXELMON_ITEMS.has(key)) {
    problems.push(`${who}: "${id}" has no item model — does not exist as an item`);
    return null;
  }
  if (!CATALOG.has(id)) notes.push(`${who}: "${id}" is a valid held item but is not yet used anywhere else in the pack`);
  return id;
};

// ---------------------------------------------------------------- item catalogue
const CATALOG = new Set();
const BALL_VARIANTS = new Set();
{
  const walk = (d) => (fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
    : []);
  for (const ns of ['dungeons_arise', 'minecraft', 'pixelgo_dungeon', 'loot', 'pixelmon', 'pixelgo']) {
    for (const f of walk(path.join(DATA, ns)).filter((x) => x.endsWith('.json'))) {
      let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
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
}
for (const v of ['exp_xs_ball', 'exp_s_ball', 'exp_m_ball', 'exp_l_ball', 'exp_xl_ball',
  'ev_hp_ball', 'ev_atk_ball', 'ev_def_ball', 'ev_spatk_ball', 'ev_spdef_ball', 'ev_spd_ball',
  'iv_hp_ball', 'iv_atk_ball', 'iv_def_ball', 'iv_spatk_ball', 'iv_spdef_ball', 'iv_spd_ball',
  'iv_all_ball', 'shiny_ball', 'skin_ball']) BALL_VARIANTS.add(v);

// ---------------------------------------------------------------- builders
const txt = (text, color, bold = true) => ({ text, color, bold });

const I = (id, count, weight, display) => {
  const m = /^([a-z0-9_]+:[a-z0-9_]+)(?:\[pixelmon:poke_ball=([a-z0-9_]+)\])?$/.exec(id);
  if (!m) problems.push(`malformed item id "${id}"`);
  else if (m[2]) { if (!BALL_VARIANTS.has(m[2])) problems.push(`unknown ball variant "${m[2]}"`); }
  else if (m[1].startsWith('pixelmon:') && !CATALOG.has(m[1])) problems.push(`unknown item "${m[1]}"`);
  const e = { type: 'item', id, count, weight };
  if (display) e.display_name = display;
  return e;
};
const B = (variant, count, weight, display) =>
  I(`pixelmon:poke_ball[pixelmon:poke_ball=${variant}]`, count, weight, display);

/**
 * A full Pokemon set. `moves` are preferences: illegal ones are dropped and topped up from
 * the species' own level-up pool so the entry is always legal and always has four moves.
 */
const P = (speciesRaw, nickname, level, weight, opts = {}) => {
  const sp = SPECIES.get(speciesRaw.toLowerCase());
  if (!sp) { problems.push(`unknown species "${speciesRaw}"`); return null; }
  if (sp.restricted) { problems.push(`LEGENDARY/MYTHICAL "${sp.name}" must not be in a crate`); return null; }

  const data = {};
  if (opts.shiny) data.shiny = true;

  if (opts.palette) {
    const pool = PALETTES.get(sp.name.toLowerCase().replace(/[^a-z0-9_.-]/g, ''));
    if (pool && pool.has(opts.palette)) data.palette = opts.palette;
    else notes.push(`${sp.name}: palette "${opts.palette}" not available, dropped`);
  }

  if (opts.ability) {
    // Pixelmon spells abilities CamelCase with no spaces ("InnerFocus", "SandStream"), so match
    // on a normalised key and write back Pixelmon's own spelling.
    const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hit = [...sp.abilities].find((a) => norm(a) === norm(opts.ability));
    if (hit) data.ability = hit;
    else notes.push(`${sp.name}: ability "${opts.ability}" not legal (has: ${[...sp.abilities].join(', ')}) — dropped`);
  }

  if (opts.held) {
    const h = resolveHeld(sp.name, opts.held);
    if (h) data.held_item = h;
  }

  const picked = [];
  for (const mv of opts.moves || []) {
    if (sp.moves.has(mv)) { if (!picked.includes(mv)) picked.push(mv); }
    else notes.push(`${sp.name}: move "${mv}" not in its pool — replaced`);
  }
  for (const [lvl, mv] of sp.levelUp) {
    if (picked.length >= 4) break;
    if (lvl <= level && !picked.includes(mv)) picked.push(mv);
  }
  for (const [, mv] of sp.levelUp) { // very low level mons: allow anything they ever learn
    if (picked.length >= 4) break;
    if (!picked.includes(mv)) picked.push(mv);
  }
  if (picked.length) data.moves = picked.slice(0, 4);

  const e = { type: 'pokemon', species: sp.name, level, weight };
  if (nickname) e.display_name = nickname;
  if (Object.keys(data).length) e.data = data;
  return e;
};
const CMD = (command, display, weight) => ({ type: 'command', command, display, weight });

// ================================================================ crate contents
const CRATE = {};

// ---------------------------------------------------------------- POKE
CRATE.poke = {
  reward_count: { min: 2, max: 3 },
  guaranteed: [B('poke_ball', 16, 1, txt('Starter Pack', 'red'))],
  items: [
    B('poke_ball', 12, 130, 'Poké Balls'),
    B('great_ball', 5, 95, 'Great Balls'),
    B('exp_xs_ball', 2, 40, txt('EXP XS Ball', 'aqua')),
    I('pixelmon:potion', 8, 105),
    I('pixelmon:xs_exp_candy', 8, 95),
    I('pixelmon:oran_berry', 10, 85),
    I('pixelmon:red_apricorn', 8, 80),
    I('pixelmon:revive', 2, 55),
    I('pixelmon:fire_stone', 1, 35, txt('Evolution Stone', 'gold')),
    I('minecraft:iron_ingot', 24, 100),
    I('pixelmon:rare_candy', 3, 50),
    I('pixelmon:exp_share', 1, 25, txt('Exp. Share', 'green')),
  ],
  pokemon: [
    P('Bulbasaur', 'Seed Sentinel', 14, 30, { ability: 'Overgrow', held: 'pixelmon:oran_berry', moves: ['Vine Whip', 'Leech Seed', 'Sleep Powder', 'Take Down'] }),
    P('Charmander', 'Ember Cub', 14, 30, { ability: 'Blaze', held: 'pixelmon:oran_berry', moves: ['Ember', 'Dragon Breath', 'Smokescreen', 'Scary Face'] }),
    P('Squirtle', 'Shell Scout', 14, 30, { ability: 'Torrent', held: 'pixelmon:oran_berry', moves: ['Water Gun', 'Bite', 'Withdraw', 'Rapid Spin'] }),
    P('Pikachu', 'Sparkplug', 16, 22, { ability: 'Static', held: 'pixelmon:sitrus_berry', moves: ['Thunderbolt', 'Quick Attack', 'Iron Tail', 'Double Team'] }),
    P('Eevee', 'Wildcard', 15, 20, { ability: 'Adaptability', moves: ['Quick Attack', 'Bite', 'Swift', 'Baby-Doll Eyes'] }),
    P('Growlithe', 'Coalfang', 14, 26, { ability: 'Intimidate', moves: ['Flame Wheel', 'Bite', 'Roar', 'Take Down'] }),
    P('Machop', 'Gym Rat', 14, 26, { ability: 'Guts', held: 'pixelmon:muscle_band', moves: ['Karate Chop', 'Low Kick', 'Seismic Toss', 'Foresight'] }),
    P('Gastly', 'Whisper', 14, 22, { ability: 'Levitate', moves: ['Lick', 'Hypnosis', 'Night Shade', 'Confuse Ray'] }),
    P('Zubat', 'Echo', 12, 28, { ability: 'Inner Focus', moves: ['Wing Attack', 'Bite', 'Supersonic', 'Confuse Ray'] }),
    P('Pidgey', 'Gale', 12, 28, { ability: 'Keen Eye', moves: ['Gust', 'Quick Attack', 'Sand Attack', 'Twister'] }),
    P('Magikarp', 'Future Tyrant', 10, 18, { ability: 'Rattled', held: 'pixelmon:focus_band', moves: ['Splash', 'Tackle', 'Flail'] }),
    /* --- une génération par ligne, surnoms de personnages de films / animés /
     * séries. Poids volontairement bas : on veut plus de VARIÉTÉ, pas des
     * coffres qui crachent des Pokémon deux fois plus souvent. */
    P('Meowth', 'Garfield', 13, 12, { ability: 'Pickup', moves: ['Pay Day', 'Bite', 'Fake Out', 'Screech'] }),          // gen 1
    P('Psyduck', 'Daffy', 13, 12, { ability: 'Damp', moves: ['Confusion', 'Water Gun', 'Disable', 'Zen Headbutt'] }),   // gen 1
    P('Cyndaquil', 'Calcifer', 14, 11, { ability: 'Blaze', moves: ['Ember', 'Quick Attack', 'Smokescreen', 'Flame Wheel'] }), // gen 2
    P('Totodile', 'Tick-Tock', 14, 11, { ability: 'Torrent', moves: ['Water Gun', 'Bite', 'Scary Face', 'Crunch'] }),   // gen 2
    P('Torchic', 'Chicken Little', 14, 11, { ability: 'Blaze', moves: ['Ember', 'Peck', 'Quick Attack', 'Sand Attack'] }), // gen 3
    P('Mudkip', 'Gill', 14, 11, { ability: 'Torrent', moves: ['Water Gun', 'Mud-Slap', 'Bide', 'Foresight'] }),         // gen 3
    P('Turtwig', 'Master Oogway', 14, 11, { ability: 'Overgrow', moves: ['Razor Leaf', 'Withdraw', 'Curse', 'Bite'] }), // gen 4
    P('Piplup', 'Mumble', 14, 11, { ability: 'Torrent', moves: ['Bubble Beam', 'Peck', 'Whirlpool', 'Charm'] }),        // gen 4
    P('Tepig', 'Babe', 14, 11, { ability: 'Blaze', moves: ['Ember', 'Odor Sleuth', 'Defense Curl', 'Flame Charge'] }),  // gen 5
    P('Oshawott', 'Rango', 14, 11, { ability: 'Torrent', moves: ['Water Gun', 'Razor Shell', 'Focus Energy', 'Fury Cutter'] }), // gen 5
    P('Fennekin', 'Robin Hood', 14, 11, { ability: 'Blaze', moves: ['Ember', 'Howl', 'Flame Charge', 'Psybeam'] }),     // gen 6
    P('Froakie', 'Kermit', 14, 11, { ability: 'Torrent', moves: ['Water Pulse', 'Quick Attack', 'Lick', 'Smokescreen'] }), // gen 6
    P('Rowlet', 'Hedwig', 14, 11, { ability: 'Overgrow', moves: ['Leafage', 'Peck', 'Astonish', 'Foresight'] }),        // gen 7
    P('Litten', 'Simba', 14, 11, { ability: 'Blaze', moves: ['Ember', 'Lick', 'Fire Fang', 'Bite'] }),                  // gen 7
    P('Scorbunny', 'Roger Rabbit', 14, 11, { ability: 'Blaze', moves: ['Ember', 'Quick Attack', 'Double Kick', 'Flame Charge'] }), // gen 8
    P('Sobble', 'Bubbles', 14, 11, { ability: 'Torrent', moves: ['Water Gun', 'Bind', 'Water Pulse', 'Growl'] }),       // gen 8
    P('Sprigatito', 'Puss in Boots', 14, 11, { ability: 'Overgrow', moves: ['Leafage', 'Bite', 'Quick Attack', 'Magical Leaf'] }), // gen 9
    P('Fuecoco', 'Louis', 14, 11, { ability: 'Blaze', moves: ['Ember', 'Bite', 'Incinerate', 'Round'] }),               // gen 9
    P('Quaxly', 'Donald', 14, 11, { ability: 'Torrent', moves: ['Water Gun', 'Wing Attack', 'Aqua Jet', 'Double Hit'] }), // gen 9
    P('Charizard', 'Inferno King', 50, 4, { palette: 'zombie', ability: 'Blaze', held: 'pixelmon:charcoal', moves: ['Flamethrower', 'Air Slash', 'Dragon Claw', 'Roost'] }),
  ],
  commands: [
    CMD('experience add %player% 80 points', '80 XP', 70),
    CMD('give %player% minecraft:emerald 3', '3 Emeralds', 45),
  ],
};

// ---------------------------------------------------------------- GREAT
CRATE.great = {
  reward_count: { min: 2, max: 4 },
  guaranteed: [B('great_ball', 12, 1, txt('Great Ball Bundle', 'blue'))],
  items: [
    B('great_ball', 10, 115, 'Great Balls'),
    B('ultra_ball', 4, 80, 'Ultra Balls'),
    B('exp_s_ball', 2, 45, txt('EXP S Ball', 'aqua')),
    I('pixelmon:super_potion', 8, 90),
    I('pixelmon:s_exp_candy', 8, 85),
    I('pixelmon:sitrus_berry', 8, 75),
    I('pixelmon:protein', 2, 50, txt('Vitamin', 'light_purple')),
    I('pixelmon:thunder_stone', 1, 40, txt('Evolution Stone', 'gold')),
    I('pixelmon:full_heal', 4, 60),
    I('minecraft:gold_ingot', 18, 85),
    I('pixelmon:rare_candy', 6, 65),
    I('pixelmon:destiny_knot', 1, 22, txt('Destiny Knot', 'light_purple')),
  ],
  pokemon: [
    P('Eevee', 'Prism', 22, 24, { ability: 'Adaptability', held: 'pixelmon:sitrus_berry', moves: ['Swift', 'Bite', 'Quick Attack', 'Copycat'] }),
    P('Growlithe', 'Blazehound', 22, 24, { ability: 'Flash Fire', moves: ['Flame Wheel', 'Crunch', 'Agility', 'Roar'] }),
    P('Machoke', 'Ironhand', 24, 20, { ability: 'No Guard', held: 'pixelmon:muscle_band', moves: ['Karate Chop', 'Seismic Toss', 'Cross Chop', 'Bulk Up'] }),
    P('Kadabra', 'Mindbender', 22, 20, { ability: 'Magic Guard', held: 'pixelmon:twisted_spoon', moves: ['Psybeam', 'Confusion', 'Recover', 'Reflect'] }),
    P('Haunter', 'Nightveil', 24, 18, { ability: 'Levitate', moves: ['Shadow Ball', 'Hypnosis', 'Dream Eater', 'Confuse Ray'] }),
    P('Shinx', 'Voltfang', 18, 26, { ability: 'Intimidate', moves: ['Spark', 'Bite', 'Roar', 'Charge'] }),
    P('Riolu', 'Apprentice', 20, 18, { ability: 'Inner Focus', moves: ['Force Palm', 'Quick Attack', 'Counter', 'Screech'] }),
    P('Dratini', 'Stormling', 22, 12, { ability: 'Marvel Scale', held: 'pixelmon:dragon_scale', moves: ['Dragon Breath', 'Twister', 'Aqua Tail', 'Agility'] }),
    P('Larvitar', 'Bedrock', 22, 12, { ability: 'Guts', held: 'pixelmon:muscle_band', moves: ['Rock Slide', 'Bite', 'Screech', 'Sandstorm'] }),
    P('Gyarados', 'Tidewrath', 35, 6, { palette: 'zombie', ability: 'Intimidate', held: 'pixelmon:mystic_water', moves: ['Waterfall', 'Crunch', 'Dragon Dance', 'Ice Fang'] }),
    P('Scyther', 'Bladewing', 28, 10, { ability: 'Technician', held: 'pixelmon:metal_coat', moves: ['X-Scissor', 'Aerial Ace', 'Swords Dance', 'Quick Attack'] }),
    P('Snorlax', 'Nap King', 30, 8, { ability: 'Thick Fat', held: 'pixelmon:leftovers', moves: ['Body Slam', 'Rest', 'Crunch', 'Yawn'] }),
    /* --- gen 1 à 9, surnoms de personnages de films / animés / séries --- */
    P('Primeape', 'King Kong', 28, 12, { ability: 'Vital Spirit', held: 'pixelmon:muscle_band', moves: ['Cross Chop', 'Thrash', 'Rage', 'Screech'] }),       // gen 1
    P('Hitmonlee', 'Bruce Lee', 28, 11, { ability: 'Limber', held: 'pixelmon:black_belt', moves: ['High Jump Kick', 'Mega Kick', 'Meditate', 'Double Kick'] }), // gen 1
    P('Umbreon', 'Bagheera', 28, 10, { ability: 'Synchronize', held: 'pixelmon:leftovers', moves: ['Dark Pulse', 'Moonlight', 'Confuse Ray', 'Feint Attack'] }), // gen 2
    P('Espeon', 'Luna', 28, 10, { ability: 'Synchronize', held: 'pixelmon:twisted_spoon', moves: ['Psybeam', 'Morning Sun', 'Swift', 'Confusion'] }),        // gen 2
    P('Sableye', 'Gollum', 26, 11, { ability: 'Keen Eye', moves: ['Shadow Sneak', 'Fake Out', 'Night Shade', 'Detect'] }),                                   // gen 3
    P('Hariyama', 'Andre the Giant', 28, 10, { ability: 'Thick Fat', held: 'pixelmon:muscle_band', moves: ['Arm Thrust', 'Belly Drum', 'Vital Throw', 'Whirlwind'] }), // gen 3
    P('Luxray', 'Scar', 28, 11, { ability: 'Intimidate', moves: ['Spark', 'Crunch', 'Roar', 'Swagger'] }),                                                   // gen 4
    P('Staraptor', 'Hawkeye', 28, 10, { ability: 'Intimidate', moves: ['Aerial Ace', 'Close Combat', 'Double-Edge', 'Whirlwind'] }),                          // gen 4
    P('Zoroark', 'Loki', 30, 9, { ability: 'Illusion', moves: ['Night Daze', 'Foul Play', 'Agility', 'Taunt'] }),                                             // gen 5
    P('Krookodile', 'Dundee', 30, 9, { ability: 'Intimidate', moves: ['Crunch', 'Earthquake', 'Dragon Claw', 'Torment'] }),                                   // gen 5
    P('Talonflame', 'Falcon', 30, 10, { ability: 'Flame Body', held: 'pixelmon:charcoal', moves: ['Flame Charge', 'Aerial Ace', 'Roost', 'Tailwind'] }),      // gen 6
    P('Aegislash', 'Excalibur', 30, 8, { ability: 'Stance Change', moves: ['Sacred Sword', 'Shadow Sneak', 'Iron Head', "King's Shield"] }),                   // gen 6
    P('Mimikyu', 'Michael Myers', 28, 9, { ability: 'Disguise', moves: ['Shadow Claw', 'Play Rough', 'Shadow Sneak', 'Slash'] }),                             // gen 7
    P('Lycanroc', 'Teen Wolf', 28, 10, { ability: 'Keen Eye', moves: ['Rock Slide', 'Crunch', 'Accelerock', 'Howl'] }),                                       // gen 7
    P('Corviknight', 'Diablo', 30, 9, { ability: 'Pressure', held: 'pixelmon:leftovers', moves: ['Brave Bird', 'Iron Head', 'Roost', 'Bulk Up'] }),           // gen 8
    P('Grimmsnarl', 'Shrek', 30, 9, { ability: 'Prankster', moves: ['Spirit Break', 'Darkest Lariat', 'Bulk Up', 'Fake Out'] }),                              // gen 8
    P('Ceruledge', 'Ghost Rider', 30, 8, { ability: 'Flash Fire', moves: ['Bitter Blade', 'Shadow Claw', 'Swords Dance', 'Night Slash'] }),                   // gen 9
    P('Pawmot', 'Jerry', 28, 10, { ability: 'Iron Fist', moves: ['Thunder Punch', 'Mach Punch', 'Nuzzle', 'Double Shock'] }),                                    // gen 9
  ],
  commands: [
    CMD('experience add %player% 200 points', '200 XP', 60),
    CMD('give %player% minecraft:emerald 8', '8 Emeralds', 55),
  ],
};

// ---------------------------------------------------------------- ULTRA
CRATE.ultra = {
  reward_count: { min: 3, max: 4 },
  guaranteed: [B('ultra_ball', 12, 1, txt('Ultra Ball Bundle', 'yellow'))],
  items: [
    B('ultra_ball', 12, 105, 'Ultra Balls'),
    B('dusk_ball', 6, 70, 'Dusk Balls'),
    B('exp_m_ball', 2, 45, txt('EXP M Ball', 'aqua')),
    B('ev_hp_ball', 1, 30, txt('EV Ball', 'light_purple')),
    I('pixelmon:hyper_potion', 6, 80),
    I('pixelmon:m_exp_candy', 6, 75),
    I('pixelmon:max_revive', 2, 55),
    I('pixelmon:protein', 4, 55, txt('Vitamins', 'light_purple')),
    I('pixelmon:ability_capsule', 1, 25, txt('Ability Capsule', 'gold')),
    I('pixelmon:silver_bottle_cap', 1, 30, txt('Silver Bottle Cap', 'gray')),
    I('pixelmon:rare_candy', 10, 70),
    I('minecraft:netherite_scrap', 3, 35),
  ],
  pokemon: [
    P('Gible', 'Sandshark', 30, 22, { ability: 'Rough Skin', moves: ['Dragon Claw', 'Dig', 'Dragon Rage', 'Sandstorm'] }),
    P('Absol', 'Omen', 32, 20, { ability: 'Super Luck', held: 'pixelmon:scope_lens', moves: ['Night Slash', 'Psycho Cut', 'Swords Dance', 'Sucker Punch'] }),
    P('Bagon', 'Skyhope', 32, 18, { ability: 'Rock Head', moves: ['Dragon Claw', 'Headbutt', 'Crunch', 'Dragon Dance'] }),
    P('Beldum', 'Magnet Core', 32, 18, { ability: 'Clear Body', held: 'pixelmon:metal_coat', moves: ['Take Down', 'Iron Head', 'Zen Headbutt'] }),
    P('Deino', 'Three Fangs', 32, 16, { ability: 'Hustle', held: 'pixelmon:wide_lens', moves: ['Dragon Breath', 'Crunch', 'Bite', 'Roar'] }),
    P('Lucario', 'Aura Blade', 36, 14, { ability: 'Inner Focus', held: 'pixelmon:black_belt', moves: ['Aura Sphere', 'Close Combat', 'Extreme Speed', 'Swords Dance'] }),
    P('Metang', 'Ironclad', 36, 14, { ability: 'Light Metal', moves: ['Meteor Mash', 'Zen Headbutt', 'Iron Defense', 'Bullet Punch'] }),
    P('Gengar', 'Shadowplay', 38, 12, { palette: 'ashen', ability: 'CursedBody', held: 'pixelmon:spell_tag', moves: ['Shadow Ball', 'Sludge Bomb', 'Hypnosis', 'Dream Eater'] }),
    P('Milotic', 'Serenity', 38, 10, { ability: 'Marvel Scale', held: 'pixelmon:leftovers', moves: ['Surf', 'Recover', 'Ice Beam', 'Dragon Tail'] }),
    P('Togekiss', 'Blessing', 38, 10, { ability: 'Serene Grace', held: 'pixelmon:sitrus_berry', moves: ['Air Slash', 'Dazzling Gleam', 'Roost', 'Thunder Wave'] }),
    P('Gardevoir', 'Silk Mind', 38, 10, { ability: 'Trace', held: 'pixelmon:wise_glasses', moves: ['Psychic', 'Moonblast', 'Calm Mind', 'Shadow Ball'] }),
    P('Dragonite', 'Skywarden', 45, 5, { shiny: true, ability: 'Multiscale', held: 'pixelmon:leftovers', moves: ['Outrage', 'Extreme Speed', 'Dragon Dance', 'Roost'] }),
    /* --- gen 1 à 9, surnoms de personnages de films / animés / séries --- */
    P('Alakazam', 'Professor X', 40, 10, { ability: 'Synchronize', held: 'pixelmon:twisted_spoon', moves: ['Psychic', 'Shadow Ball', 'Recover', 'Calm Mind'] }),   // gen 1
    P('Machamp', 'Goro', 40, 10, { ability: 'Guts', held: 'pixelmon:muscle_band', moves: ['Dynamic Punch', 'Cross Chop', 'Bulk Up', 'Earthquake'] }),              // gen 1
    P('Scizor', 'Edward', 40, 9, { ability: 'Technician', held: 'pixelmon:metal_coat', moves: ['Bullet Punch', 'X-Scissor', 'Swords Dance', 'Iron Head'] }),       // gen 2
    P('Houndoom', 'Zuul', 40, 9, { ability: 'Flash Fire', held: 'pixelmon:charcoal', moves: ['Flamethrower', 'Dark Pulse', 'Nasty Plot', 'Crunch'] }),             // gen 2
    P('Aggron', 'Ultron', 40, 9, { ability: 'Sturdy', moves: ['Iron Head', 'Rock Slide', 'Earthquake', 'Metal Burst'] }),                                          // gen 3
    P('Flygon', 'Mirage', 40, 9, { ability: 'Levitate', moves: ['Dragon Claw', 'Earthquake', 'Crunch', 'Dragon Dance'] }),                                         // gen 3
    P('Rhyperior', 'Rhino', 42, 8, { ability: 'Solid Rock', moves: ['Rock Wrecker', 'Earthquake', 'Megahorn', 'Hammer Arm'] }),                                    // gen 4
    P('Magnezone', 'Wall-E', 42, 8, { ability: 'Sturdy', moves: ['Thunderbolt', 'Flash Cannon', 'Thunder Wave', 'Magnet Rise'] }),                                 // gen 4
    P('Chandelure', 'Lumiere', 42, 8, { ability: 'Flash Fire', moves: ['Shadow Ball', 'Flamethrower', 'Energy Ball', 'Will-O-Wisp'] }),                            // gen 5
    P('Haxorus', 'Ripper', 42, 8, { ability: 'Mold Breaker', moves: ['Outrage', 'Dragon Dance', 'Earthquake', 'Dragon Claw'] }),                                   // gen 5
    P('Tyrantrum', 'Rexy', 42, 8, { ability: 'Strong Jaw', moves: ['Head Smash', 'Crunch', 'Dragon Claw', 'Earthquake'] }),                                        // gen 6
    P('Gourgeist', 'Jack Skellington', 40, 9, { ability: 'Frisk', moves: ['Shadow Ball', 'Seed Bomb', 'Will-O-Wisp', 'Leech Seed'] }),                             // gen 6
    P('Golisopod', 'Xenomorph', 42, 8, { ability: 'Emergency Exit', moves: ['First Impression', 'Liquidation', 'Leech Life', 'Sucker Punch'] }),                   // gen 7
    P('Toucannon', 'Zazu', 40, 9, { ability: 'Keen Eye', moves: ['Beak Blast', 'Brave Bird', 'Bullet Seed', 'Roost'] }),                                           // gen 7
    P('Dragapult', 'Nazgul', 45, 7, { ability: 'Clear Body', moves: ['Dragon Darts', 'Phantom Force', 'Dragon Dance', 'U-turn'] }),                                // gen 8
    P('Duraludon', 'Optimus Prime', 42, 8, { ability: 'Light Metal', moves: ['Flash Cannon', 'Dragon Pulse', 'Thunderbolt', 'Metal Sound'] }),                     // gen 8
    P('Baxcalibur', 'Sub-Zero', 45, 7, { ability: 'Thermal Exchange', moves: ['Glaive Rush', 'Icicle Crash', 'Dragon Dance', 'Earthquake'] }),                     // gen 9
    P('Meowscarada', 'Zorro', 42, 8, { ability: 'Overgrow', moves: ['Flower Trick', 'Night Slash', 'U-turn', 'Play Rough'] }),                                     // gen 9
  ],
  commands: [
    CMD('experience add %player% 400 points', '400 XP', 55),
    CMD('give %player% minecraft:diamond 8', '8 Diamonds', 45),
  ],
};

// ---------------------------------------------------------------- MASTER
CRATE.master = {
  reward_count: { min: 3, max: 5 },
  guaranteed: [
    B('master_ball', 1, 1, txt('Master Ball', 'light_purple')),
    I('pixelmon:rare_candy', 16, 1, txt('Candy Hoard', 'light_purple')),
  ],
  items: [
    B('master_ball', 2, 30, txt('Twin Master Balls', 'light_purple')),
    B('ultra_ball', 20, 85, 'Ultra Balls'),
    B('beast_ball', 3, 45, txt('Beast Balls', 'dark_purple')),
    B('shiny_ball', 1, 10, txt('Shiny Ball', 'gold')),
    B('iv_all_ball', 1, 6, txt('IV ALL Ball', 'gold')),
    B('exp_xl_ball', 2, 35, txt('EXP XL Ball', 'aqua')),
    I('pixelmon:max_revive', 6, 60),
    I('pixelmon:xl_exp_candy', 6, 55),
    I('pixelmon:gold_bottle_cap', 2, 28, txt('Gold Bottle Cap', 'gold')),
    I('pixelmon:ability_capsule', 2, 30, txt('Ability Capsules', 'gold')),
    I('pixelmon:rare_candy', 16, 60),
    I('minecraft:nether_star', 2, 20),
  ],
  pokemon: [
    P('Dragonite', 'Ardent Sovereign', 75, 7, { shiny: true, ability: 'Multiscale', held: 'pixelmon:leftovers', moves: ['Outrage', 'Extreme Speed', 'Dragon Dance', 'Roost'] }),
    P('Tyranitar', 'Sandstorm Tyrant', 75, 9, { ability: 'Sand Stream', held: 'pixelmon:choice_band', moves: ['Stone Edge', 'Crunch', 'Earthquake', 'Dragon Dance'] }),
    P('Garchomp', 'Mach Fang', 75, 9, { ability: 'Rough Skin', held: 'pixelmon:leftovers', moves: ['Earthquake', 'Dragon Claw', 'Swords Dance', 'Fire Fang'] }),
    P('Salamence', 'Skyrender', 75, 9, { ability: 'Intimidate', held: 'pixelmon:life_orb', moves: ['Dragon Claw', 'Fly', 'Dragon Dance', 'Crunch'] }),
    P('Metagross', 'Iron Colossus', 75, 8, { ability: 'Clear Body', held: 'pixelmon:metal_coat', moves: ['Meteor Mash', 'Zen Headbutt', 'Earthquake', 'Bullet Punch'] }),
    P('Hydreigon', 'Triple Ruin', 75, 8, { ability: 'Levitate', held: 'pixelmon:choice_specs', moves: ['Dark Pulse', 'Dragon Pulse', 'Flamethrower', 'Earth Power'] }),
    P('Goodra', 'Dewshell', 72, 9, { ability: 'Sap Sipper', held: 'pixelmon:leftovers', moves: ['Dragon Pulse', 'Thunderbolt', 'Sludge Bomb', 'Rest'] }),
    P('Kommo-o', 'Scale Warlord', 72, 9, { ability: 'Bulletproof', held: 'pixelmon:black_belt', moves: ['Close Combat', 'Dragon Claw', 'Iron Head', 'Dragon Dance'] }),
    P('Gyarados', 'Abyss Warden', 70, 7, { shiny: true, ability: 'Intimidate', held: 'pixelmon:mystic_water', moves: ['Waterfall', 'Crunch', 'Dragon Dance', 'Ice Fang'] }),
    P('Gengar', 'Hollow Grin', 70, 7, { palette: 'ashen', ability: 'CursedBody', held: 'pixelmon:spell_tag', moves: ['Shadow Ball', 'Sludge Bomb', 'Focus Blast', 'Destiny Bond'] }),
    P('Charizard', 'Inferno King', 70, 7, { palette: 'zombie', ability: 'Solar Power', held: 'pixelmon:life_orb', moves: ['Flamethrower', 'Air Slash', 'Dragon Claw', 'Roost'] }),
    P('Lucario', 'Steel Saint', 70, 7, { shiny: true, ability: 'Justified', held: 'pixelmon:black_belt', moves: ['Aura Sphere', 'Close Combat', 'Extreme Speed', 'Swords Dance'] }),
    /* --- gen 1 à 9, surnoms de personnages de films / animés / séries --- */
    P('Arcanine', 'Hachiko', 70, 7, { ability: 'Intimidate', held: 'pixelmon:charcoal', moves: ['Flare Blitz', 'Extreme Speed', 'Wild Charge', 'Morning Sun'] }),      // gen 1
    P('Snorlax', 'Totoro', 70, 7, { ability: 'Thick Fat', held: 'pixelmon:leftovers', moves: ['Body Slam', 'Curse', 'Crunch', 'Rest'] }),                              // gen 1
    P('Blastoise', 'Gamera', 70, 7, { ability: 'Torrent', held: 'pixelmon:mystic_water', moves: ['Hydro Pump', 'Ice Beam', 'Flash Cannon', 'Rapid Spin'] }),           // gen 1
    P('Feraligatr', 'Killer Croc', 70, 7, { ability: 'Sheer Force', moves: ['Liquidation', 'Crunch', 'Dragon Dance', 'Ice Punch'] }),                                  // gen 2
    P('Blissey', 'Mary Poppins', 68, 6, { ability: 'Natural Cure', held: 'pixelmon:leftovers', moves: ['Soft-Boiled', 'Seismic Toss', 'Toxic', 'Light Screen'] }),     // gen 2
    P('Sceptile', 'Yoda', 70, 7, { ability: 'Overgrow', moves: ['Leaf Blade', 'Dragon Claw', 'Swords Dance', 'Quick Attack'] }),                                       // gen 3
    P('Swampert', 'Swamp Thing', 70, 7, { ability: 'Torrent', moves: ['Earthquake', 'Waterfall', 'Ice Punch', 'Curse'] }),                                             // gen 3
    P('Electivire', 'Thor', 70, 7, { ability: 'Motor Drive', moves: ['Wild Charge', 'Ice Punch', 'Earthquake', 'Cross Chop'] }),                                       // gen 4
    P('Porygon-Z', 'Neo', 68, 6, { ability: 'Adaptability', moves: ['Tri Attack', 'Thunderbolt', 'Ice Beam', 'Nasty Plot'] }),                                         // gen 4
    P('Volcarona', 'Mothra', 70, 6, { ability: 'Flame Body', moves: ['Fiery Dance', 'Bug Buzz', 'Quiver Dance', 'Giga Drain'] }),                                      // gen 5
    P('Kingambit', 'Darth Vader', 70, 6, { ability: 'Defiant', moves: ['Kowtow Cleave', 'Iron Head', 'Sucker Punch', 'Swords Dance'] }),                               // gen 5
    P('Noivern', 'Dracula', 70, 7, { ability: 'Infiltrator', moves: ['Boomburst', 'Dragon Pulse', 'Hurricane', 'Roost'] }),                                            // gen 6
    P('Hawlucha', 'Nacho Libre', 68, 7, { ability: 'Unburden', moves: ['Flying Press', 'Close Combat', 'Swords Dance', 'Acrobatics'] }),                               // gen 6
    P('Incineroar', 'Hulk Hogan', 70, 7, { ability: 'Intimidate', moves: ['Darkest Lariat', 'Flare Blitz', 'Bulk Up', 'Cross Chop'] }),                                // gen 7
    P('Cinderace', 'Bugs Bunny', 70, 7, { ability: 'Blaze', moves: ['Pyro Ball', 'High Jump Kick', 'Bounce', 'Court Change'] }),                                       // gen 8
    P('Copperajah', 'Dumbo', 68, 6, { ability: 'Sheer Force', moves: ['Heavy Slam', 'Play Rough', 'Earthquake', 'Iron Head'] }),                                       // gen 8
    P('Annihilape', 'Hulk', 70, 6, { ability: 'Vital Spirit', moves: ['Rage Fist', 'Drain Punch', 'Bulk Up', 'Shadow Claw'] }),                                        // gen 9
    P('Skeledirge', 'Sebastian', 70, 6, { ability: 'Blaze', moves: ['Torch Song', 'Shadow Ball', 'Slack Off', 'Hex'] }),                                               // gen 9
  ],
  commands: [
    CMD('give %player% minecraft:totem_of_undying 2', '2 Totems of Undying', 40),
    CMD('experience add %player% 1000 points', '1000 XP', 50),
  ],
};

// ================================================================ write
const summary = [];
for (const [crate, spec] of Object.entries(CRATE)) {
  const file = path.join(CRATES, `${crate}.json`);
  if (!fs.existsSync(file)) { problems.push(`${crate}: ${file} not found`); continue; }
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));

  const pokemon = spec.pokemon.filter(Boolean);

  /* La règle était « autant d'entrées objet que d'entrées Pokémon ». C'était un
   * mauvais indicateur : ce que le joueur reçoit dépend des POIDS, pas du nombre
   * de lignes. Vingt Pokémon à poids 10 sortent moins souvent que cinq objets à
   * poids 100. On contrôle donc la part réelle, ce qui laisse ajouter de la
   * variété sans déséquilibrer le coffre.
   *
   * Intention : un coffre reste majoritairement des objets, le Pokémon est le
   * moment fort. Entre 10 % et 35 %, c'est tenu. */
  const poids = (l) => l.reduce((a, e) => a + e.weight, 0);
  const total = poids(spec.items) + poids(pokemon) + poids(spec.commands);
  const partPokemon = poids(pokemon) / total;
  if (partPokemon < 0.10 || partPokemon > 0.35) {
    problems.push(`${crate}: les Pokémon pèsent ${(partPokemon * 100).toFixed(1)}% des tirages `
      + `(attendu entre 10% et 35%) — ajuster les poids, pas le nombre d'entrées`);
  }

  json.rewards = [...spec.items, ...pokemon, ...spec.commands];
  json.guaranteed_rewards = spec.guaranteed || [];
  json.reward_count = spec.reward_count;

  if (!DRY) fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');

  const sets = pokemon.filter((p) => p.data && p.data.moves).length;
  const extras = pokemon.filter((p) => p.data && (p.data.shiny || p.data.palette)).length;
  summary.push([crate, spec.items.length, pokemon.length, sets, extras,
    `${spec.reward_count.min}-${spec.reward_count.max}`, (spec.guaranteed || []).length]);
}

console.log('crate     items  pkmn  full sets  shiny/palette  draws  guaranteed');
for (const [c, i, p, s, e, r, g] of summary) {
  console.log(c.padEnd(9) + String(i).padStart(5) + String(p).padStart(6) + String(s).padStart(11)
    + String(e).padStart(15) + '  ' + r.padStart(5) + String(g).padStart(12));
}
if (notes.length) {
  console.log(`\nadjusted automatically (${notes.length}):`);
  for (const n of notes) console.log('  · ' + n);
}
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):`);
  for (const p of problems) console.log('  - ' + p);
  process.exitCode = 1;
} else {
  console.log('\nvalidation: every species, ability, move, palette and item id resolved. No legendaries.');
}
if (DRY) console.log('\n[dry run] nothing written.');
