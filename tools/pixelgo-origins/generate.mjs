// PixelGO — Origines Pixelmon (NeoOrigins + PixelGO Enchant + Pufferfish's Skills + neofishcompat)
//
//   node tools/pixelgo-origins/generate.mjs
//
// Écrit (et nettoie avant d'écrire) :
//   kubejs/data/neoorigins/origins/origin_layers/{origin,class}.json  calques remplacés
//   kubejs/data/pixelgo_origins/origins/origins/*.json                les origines
//   kubejs/data/pixelgo_origins/origins/powers/*.json                 leurs pouvoirs
//   kubejs/assets/pixelgo_origins/lang/{en_us,fr_fr}.json             textes
//   config/puffish_skills/categories/origin_<id>/*.json               un arbre par origine
//   config/puffish_skills/config.json                                 liste des catégories
//
// Voir README.md à côté pour les règles et les pièges.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NS = 'pixelgo_origins';
const DATA = path.join(ROOT, 'kubejs/data');
const ASSETS = path.join(ROOT, 'kubejs/assets', NS, 'lang');
const PUFF = path.join(ROOT, 'config/puffish_skills');

// ---------------------------------------------------------------------------
// Langues : chaque texte est une paire [en, fr]
// ---------------------------------------------------------------------------
const LANG = { en_us: {}, fr_fr: {} };
const tr = (key, pair) => { LANG.en_us[key] = pair[0]; LANG.fr_fr[key] = pair[1]; return key; };
// Les textes Puffish sont des composants « translate » : le moteur de format de
// Minecraft lit les %, donc un % littéral s'écrit %% (dans le lang ET le fallback).
const pct = (s) => s.replace(/%/g, '%%');
const tText = (key, pair, extra = {}) => {
  LANG.en_us[key] = pct(pair[0]); LANG.fr_fr[key] = pct(pair[1]);
  return { translate: key, fallback: pct(pair[0]), ...extra };
};

// ---------------------------------------------------------------------------
// Attributs → texte des effets (gabarits traduisibles avec %s)
// ---------------------------------------------------------------------------
const FX = {
  'pixelgo:catch_rate':         ['+%s%% catch bonus', '+%s %% de bonus de capture'],
  'pixelgo:shiny_odds':         ['+%s shiny roll(s) on wild spawns', '+%s jet(s) chromatique(s) sur les apparitions'],
  'pixelgo:pokemon_experience': ['+%s%% Pokémon experience', '+%s %% d\'expérience Pokémon'],
  'pixelgo:ev_gain':            ['+%s%% EVs after battle', '+%s %% d\'EV après un combat'],
  'pixelgo:friendship_gain':    ['+%s friendship per aura pulse', '+%s d\'amitié par impulsion'],
  'pixelgo:party_vitality':     ['+%s%% party HP per pulse', '+%s %% des PV de l\'équipe par impulsion'],
  'pixelgo:egg_hatch_speed':    ['+%s egg steps per pulse', '+%s pas d\'œuf par impulsion'],
  'pixelgo:pokemon_drop_luck':  ['+%s%% chance to double Pokémon drops', '+%s %% de chance de doubler le butin Pokémon'],
  'pixelgo:pokeloot_luck':      ['+%s%% chance to double Poké Loot', '+%s %% de chance de doubler un Poké Loot'],
  'pixelgo:harvest_yield':      ['+%s%% apricorns and berries', '+%s %% d\'apricornes et de baies'],
  'pixelgo:fossil_luck':        ['+%s in 10,000 fossil chance per stone', '+%s sur 10 000 de chance de fossile par pierre'],
  'pixelgo:fishing_luck':       ['-%s%% fishing wait', '-%s %% d\'attente à la pêche'],
  'minecraft:generic.movement_speed':   ['+%s%% movement speed', '+%s %% de vitesse'],
  'minecraft:generic.max_health':       ['+%s max health', '+%s PV max'],
  'minecraft:generic.attack_damage':    ['+%s attack damage', '+%s dégâts d\'attaque'],
  'minecraft:generic.armor':            ['+%s armor', '+%s armure'],
  'minecraft:generic.luck':             ['+%s luck', '+%s chance'],
  'minecraft:generic.knockback_resistance': ['+%s%% knockback resistance', '+%s %% de résistance au recul'],
  'minecraft:generic.safe_fall_distance':   ['+%s blocks of safe fall', '+%s blocs de chute sans dégâts'],
  'minecraft:generic.step_height':      ['+%s step height', '+%s hauteur de pas'],
  'minecraft:player.block_break_speed': ['+%s%% mining speed', '+%s %% de vitesse de minage'],
  'minecraft:player.sneaking_speed':    ['+%s%% sneaking speed', '+%s %% de vitesse accroupi'],
  'minecraft:player.submerged_mining_speed': ['+%s%% underwater mining speed', '+%s %% de minage sous l\'eau'],
  'neoforge:swim_speed':                ['+%s%% swim speed', '+%s %% de vitesse de nage'],
};
// valeurs en fraction affichées en %
const AS_PERCENT = new Set([
  'minecraft:generic.movement_speed', 'minecraft:generic.knockback_resistance',
  'minecraft:player.block_break_speed', 'minecraft:player.sneaking_speed',
  'minecraft:player.submerged_mining_speed', 'neoforge:swim_speed',
]);
const fmt = (attr, v) => {
  const n = AS_PERCENT.has(attr) ? Math.round(v * 1000) / 10 : v;
  return String(n);
};
for (const [a, pair] of Object.entries(FX)) {
  const k = `${NS}.fx.${a.replace(/[:.]/g, '_')}`;
  LANG.en_us[k] = pair[0]; LANG.fr_fr[k] = pair[1];
}
const fxLine = (attr, v, color) => ({
  translate: `${NS}.fx.${attr.replace(/[:.]/g, '_')}`,
  with: [fmt(attr, v)],
  fallback: FX[attr][0].replace('%s', fmt(attr, v)),
  color, italic: false,
});

// ---------------------------------------------------------------------------
// Rewards Puffish
// ---------------------------------------------------------------------------
const MULT_BASE = new Set(['minecraft:generic.movement_speed', 'minecraft:player.block_break_speed',
  'minecraft:player.sneaking_speed']);
const A = (attribute, value) => ({ kind: 'attr', attribute, value });
const P = (power) => ({ kind: 'power', power });
const PG = (n) => `pixelgo:${n}`;
const catchR = (v) => A(PG('catch_rate'), v);
const shiny = (v) => A(PG('shiny_odds'), v);
const pkxp = (v) => A(PG('pokemon_experience'), v);
const ev = (v) => A(PG('ev_gain'), v);
const friend = (v) => A(PG('friendship_gain'), v);
const vital = (v) => A(PG('party_vitality'), v);
const egg = (v) => A(PG('egg_hatch_speed'), v);
const drop = (v) => A(PG('pokemon_drop_luck'), v);
const loot = (v) => A(PG('pokeloot_luck'), v);
const harvest = (v) => A(PG('harvest_yield'), v);
const fossil = (v) => A(PG('fossil_luck'), v);
const fishing = (v) => A(PG('fishing_luck'), v);
const speed = (v) => A('minecraft:generic.movement_speed', v);
const hp = (v) => A('minecraft:generic.max_health', v);
const atk = (v) => A('minecraft:generic.attack_damage', v);
const armor = (v) => A('minecraft:generic.armor', v);
const luck = (v) => A('minecraft:generic.luck', v);
const kbres = (v) => A('minecraft:generic.knockback_resistance', v);
const safeFall = (v) => A('minecraft:generic.safe_fall_distance', v);
const step = (v) => A('minecraft:generic.step_height', v);
const mining = (v) => A('minecraft:player.block_break_speed', v);
const sneak = (v) => A('minecraft:player.sneaking_speed', v);
const wetMining = (v) => A('minecraft:player.submerged_mining_speed', v);
const swim = (v) => A('neoforge:swim_speed', v);

const toPuffReward = (r) => r.kind === 'attr'
  ? { type: 'puffish_skills:attribute',
      data: { attribute: r.attribute, value: r.value,
        operation: MULT_BASE.has(r.attribute) ? 'add_multiplied_base' : 'add_value' } }
  : { type: 'neofishcompat:unlock_power', data: { power: `${NS}:${r.power}` } };

// ---------------------------------------------------------------------------
// Icônes Puffish (les Poké Balls sont un seul item + composant, cf. pixelgo-skilltree)
// ---------------------------------------------------------------------------
const BALLS = new Set(['poke_ball', 'great_ball', 'ultra_ball', 'master_ball', 'beast_ball', 'net_ball',
  'quick_ball', 'repeat_ball', 'timer_ball', 'dusk_ball', 'luxury_ball', 'premier_ball', 'dive_ball']);
const icon = (id) => {
  const m = /^pixelmon:(.+)$/.exec(id);
  if (m && BALLS.has(m[1])) return { type: 'item', data: { item: 'pixelmon:poke_ball', components: { 'pixelmon:poke_ball': m[1] } } };
  return { type: 'item', data: { item: id } };
};

// ---------------------------------------------------------------------------
// Pouvoirs NeoOrigins
// ---------------------------------------------------------------------------
const pAttr = (attribute, amount, operation = 'add_value', extra = {}) =>
  ({ type: 'neoorigins:attribute_modifier', attribute, amount, operation, ...extra });
const pEffect = (effects, extra = {}) => ({
  type: 'neoorigins:persistent_effect', toggleable: false, ambient: true, show_particles: false, show_icon: true,
  effects: effects.map(([effect, amplifier = 0]) => ({ effect, amplifier })), ...extra,
});
const isOrigin = (o) => ({ type: 'neoorigins:origin', origin: `${NS}:${o}` });
// Les pouvoirs donnés par un arbre Puffish (récompense unlock_power) sont des
// « dynamic grants » NeoOrigins : ils survivent à un changement d'origine. On les
// verrouille donc sur l'origine, pour qu'un joueur qui change d'origine ne les garde pas.
const lockToOrigin = (o, json) => ({ ...json, power_condition: isOrigin(o), power_condition_mode: 'ALLOW' });

// ---------------------------------------------------------------------------
// LES ORIGINES
// ---------------------------------------------------------------------------
// Chaque arbre a la même forme (voir README) :
//   racine → A1→A2→A3→keyA ┐
//          → C1→C2→C3 ─────┼→ capstone      keyA ⟷ keyB exclusifs
//          → B1→B2→B3→keyB ┘
// n = { id, t:[en,fr], ic, rw:[...], fl?:[en,fr] }
const ORIGINS = [
  // ======================================================== RANGER (Normal / Vol)
  {
    id: 'ranger', icon: 'pixelmon:poke_ball', impact: 'medium', color: '#FF6B6B',
    name: ['Ranger', 'Ranger'],
    desc: ['A field trainer who lives outdoors and throws faster than anyone. Type affinity: Normal / Flying.',
      'Dresseur de terrain qui vit au grand air et lance plus vite que quiconque. Affinité : Normal / Vol.'],
    powers: [
      { id: 'ranger_sure_throw', name: ['Sure Throw', 'Lancer Assuré'],
        desc: ['+8% catch bonus on every Poké Ball.', '+8 % de bonus de capture sur chaque Poké Ball.'],
        json: pAttr(PG('catch_rate'), 8) },
      { id: 'ranger_light_stride', name: ['Light Stride', 'Foulée Légère'],
        desc: ['+5% movement speed.', '+5 % de vitesse de déplacement.'],
        json: pAttr('minecraft:generic.movement_speed', 0.05, 'add_multiplied_base') },
      { id: 'ranger_feather_landing', name: ['Feather Landing', 'Atterrissage Plumeux'],
        desc: ['Takes half damage from falls.', 'Subit moitié moins de dégâts de chute.'],
        json: { type: 'neoorigins:modify_damage', direction: 'in', multiplier: 0.5, damage_type: '#minecraft:is_fall' } },
      { id: 'ranger_light_gear', weak: true, name: ['Light Gear', 'Équipement Léger'],
        desc: ['-2 armor: rangers travel light.', '-2 d\'armure : un ranger voyage léger.'],
        json: pAttr('minecraft:generic.armor', -2) },
    ],
    evo: [PG('catch_rate'), [4, 8, 12]],
    tree: {
      title: ['Ranger\'s Path', 'Voie du Ranger'], icon: 'pixelmon:great_ball',
      bg: 'minecraft:textures/block/moss_block.png',
      root: { id: 'root', t: ['Field Instinct', 'Instinct de Terrain'], ic: 'pixelmon:poke_ball', rw: [catchR(3), speed(0.02)],
        fl: ['Every bush hides something.', 'Chaque buisson cache quelque chose.'] },
      A: [
        { id: 'quick_draw', t: ['Quick Draw', 'Dégainé Rapide'], ic: 'pixelmon:great_ball', rw: [catchR(4)] },
        { id: 'curveball', t: ['Curveball', 'Balle Courbe'], ic: 'pixelmon:ultra_ball', rw: [catchR(5)] },
        { id: 'pinpoint', t: ['Pinpoint', 'Précision'], ic: 'pixelmon:quick_ball', rw: [catchR(6)] },
      ],
      keyA: { id: 'master_throw', t: ['Master Throw', 'Lancer de Maître'], ic: 'pixelmon:beast_ball', rw: [catchR(12)],
        fl: ['Specialisation: capture.', 'Spécialisation : capture.'] },
      B: [
        { id: 'sharp_eyes', t: ['Sharp Eyes', 'Œil Vif'], ic: 'pixelmon:stardust', rw: [shiny(1)] },
        { id: 'tracker', t: ['Tracker', 'Pisteur'], ic: 'pixelmon:net_ball', rw: [catchR(4)] },
        { id: 'glint_spotter', t: ['Glint Spotter', 'Repère-Éclat'], ic: 'pixelmon:star_piece', rw: [shiny(1)] },
      ],
      keyB: { id: 'shiny_tracker', t: ['Shiny Tracker', 'Traqueur Chromatique'], ic: 'pixelmon:shiny_charm', rw: [shiny(2)],
        fl: ['Specialisation: shiny hunting.', 'Spécialisation : chasse aux chromatiques.'] },
      C: [
        { id: 'trail_runner', t: ['Trail Runner', 'Coureur des Sentiers'], ic: 'minecraft:leather_boots', rw: [speed(0.03)] },
        { id: 'cliff_hopper', t: ['Cliff Hopper', 'Saute-Falaise'], ic: 'minecraft:feather', rw: [safeFall(3)] },
        { id: 'sure_footing', t: ['Sure Footing', 'Pied Sûr'], ic: 'minecraft:ladder', rw: [step(0.5), speed(0.03)] },
      ],
      cap: { id: 'tailwind', t: ['Tailwind', 'Vent Arrière'], ic: 'pixelmon:escape_rope', rw: [P('ranger_tailwind'), catchR(5)],
        fl: ['The wind always blows your way.', 'Le vent souffle toujours dans ton sens.'] },
    },
    capPower: { id: 'ranger_tailwind', name: ['Tailwind', 'Vent Arrière'],
      desc: ['Permanent Speed I.', 'Vitesse I permanente.'], json: pEffect([['minecraft:speed']]) },
  },

  // ======================================================== CHERCHEUR (Psy)
  {
    id: 'researcher', icon: 'pixelmon:pokedex', impact: 'medium', color: '#C38BFF',
    name: ['Researcher', 'Chercheur'],
    desc: ['Studies Pokémon rather than fighting them: spots rare colours and turns every battle into a lesson. Type affinity: Psychic.',
      'Étudie les Pokémon plutôt que de les combattre : repère les couleurs rares et fait de chaque combat une leçon. Affinité : Psy.'],
    powers: [
      { id: 'researcher_trained_eye', name: ['Trained Eye', 'Œil Exercé'],
        desc: ['+1 shiny roll on wild spawns around you.', '+1 jet chromatique sur les Pokémon sauvages autour de vous.'],
        json: pAttr(PG('shiny_odds'), 1) },
      { id: 'researcher_field_notes', name: ['Field Notes', 'Notes de Terrain'],
        desc: ['+8% Pokémon experience.', '+8 % d\'expérience pour vos Pokémon.'],
        json: pAttr(PG('pokemon_experience'), 8) },
      { id: 'researcher_serendipity', name: ['Serendipity', 'Sérendipité'],
        desc: ['+1 luck (better loot tables).', '+1 de chance (meilleur butin).'],
        json: pAttr('minecraft:generic.luck', 1) },
      { id: 'researcher_lab_hands', weak: true, name: ['Lab Hands', 'Mains de Laborantin'],
        desc: ['-15% melee damage.', '-15 % de dégâts au corps à corps.'],
        json: pAttr('minecraft:generic.attack_damage', -0.15, 'add_multiplied_total') },
    ],
    evo: [PG('pokemon_experience'), [5, 10, 15]],
    tree: {
      title: ['Research Lab', 'Laboratoire'], icon: 'pixelmon:pokedex',
      bg: 'minecraft:textures/block/white_concrete.png',
      root: { id: 'root', t: ['Hypothesis', 'Hypothèse'], ic: 'pixelmon:pokedex', rw: [pkxp(5)],
        fl: ['Observe first. Throw later.', 'Observer d\'abord. Lancer ensuite.'] },
      A: [
        { id: 'spectrometer', t: ['Spectrometer', 'Spectromètre'], ic: 'pixelmon:stardust', rw: [shiny(1)] },
        { id: 'colour_theory', t: ['Colour Theory', 'Théorie des Couleurs'], ic: 'pixelmon:star_piece', rw: [shiny(1)] },
        { id: 'prism_lens', t: ['Prism Lens', 'Lentille Prisme'], ic: 'pixelmon:comet_shard', rw: [shiny(1)] },
      ],
      keyA: { id: 'shiny_thesis', t: ['Shiny Thesis', 'Thèse Chromatique'], ic: 'pixelmon:shiny_charm', rw: [shiny(2)],
        fl: ['Specialisation: shinies.', 'Spécialisation : chromatiques.'] },
      B: [
        { id: 'lecture', t: ['Lecture', 'Cours Magistral'], ic: 'pixelmon:xs_exp_candy', rw: [pkxp(6)] },
        { id: 'seminar', t: ['Seminar', 'Séminaire'], ic: 'pixelmon:s_exp_candy', rw: [pkxp(8)] },
        { id: 'peer_review', t: ['Peer Review', 'Relecture'], ic: 'pixelmon:m_exp_candy', rw: [pkxp(10)] },
      ],
      keyB: { id: 'doctorate', t: ['Doctorate', 'Doctorat'], ic: 'pixelmon:xl_exp_candy', rw: [pkxp(20)],
        fl: ['Specialisation: experience.', 'Spécialisation : expérience.'] },
      C: [
        { id: 'lucky_sample', t: ['Lucky Sample', 'Échantillon Chanceux'], ic: 'pixelmon:lucky_egg', rw: [luck(1)] },
        { id: 'biometrics', t: ['Biometrics', 'Biométrie'], ic: 'pixelmon:power_weight', rw: [ev(8)] },
        { id: 'research_grant', t: ['Research Grant', 'Subvention'], ic: 'pixelmon:nugget', rw: [luck(1), pkxp(4)] },
      ],
      cap: { id: 'eureka', t: ['Eureka!', 'Eurêka !'], ic: 'pixelmon:ability_capsule', rw: [P('researcher_eureka'), pkxp(10)],
        fl: ['So THAT is why it sparkles.', 'Voilà donc pourquoi il brille.'] },
    },
    capPower: { id: 'researcher_eureka', name: ['Eureka!', 'Eurêka !'],
      desc: ['+2 shiny rolls on wild spawns.', '+2 jets chromatiques sur les apparitions.'], json: pAttr(PG('shiny_odds'), 2) },
  },

  // ======================================================== COMBATTANT (Combat)
  {
    id: 'battler', icon: 'pixelmon:macho_brace', impact: 'medium', color: '#FFB347',
    name: ['Battler', 'Combattant'],
    desc: ['Lives for battle. Their Pokémon grow faster, but they lack the patience to capture. Type affinity: Fighting.',
      'Vit pour le combat. Ses Pokémon progressent plus vite, mais la patience pour capturer lui manque. Affinité : Combat.'],
    powers: [
      { id: 'battler_drills', name: ['Battle Drills', 'Exercices de Combat'],
        desc: ['+12% Pokémon experience.', '+12 % d\'expérience pour vos Pokémon.'], json: pAttr(PG('pokemon_experience'), 12) },
      { id: 'battler_intense_training', name: ['Intense Training', 'Entraînement Intense'],
        desc: ['+15% EVs gained after a battle.', '+15 % d\'EV gagnés après un combat.'], json: pAttr(PG('ev_gain'), 15) },
      { id: 'battler_iron_fists', name: ['Iron Fists', 'Poings de Fer'],
        desc: ['+1 attack damage.', '+1 dégât d\'attaque.'], json: pAttr('minecraft:generic.attack_damage', 1) },
      { id: 'battler_impatient', weak: true, name: ['Impatient', 'Impatient'],
        desc: ['-6% catch bonus.', '-6 % de bonus de capture.'], json: pAttr(PG('catch_rate'), -6) },
    ],
    evo: [PG('ev_gain'), [8, 16, 25]],
    tree: {
      title: ['Dojo', 'Dojo'], icon: 'pixelmon:power_weight',
      bg: 'minecraft:textures/block/stripped_spruce_log.png',
      root: { id: 'root', t: ['Warm-Up', 'Échauffement'], ic: 'pixelmon:macho_brace', rw: [pkxp(4), ev(4)],
        fl: ['Ten laps before breakfast.', 'Dix tours avant le petit-déjeuner.'] },
      A: [
        { id: 'sparring', t: ['Sparring', 'Entraînement Libre'], ic: 'pixelmon:xs_exp_candy', rw: [pkxp(6)] },
        { id: 'gauntlet', t: ['Gauntlet', 'Enchaînement'], ic: 'pixelmon:s_exp_candy', rw: [pkxp(8)] },
        { id: 'champion_pace', t: ['Champion\'s Pace', 'Rythme de Champion'], ic: 'pixelmon:l_exp_candy', rw: [pkxp(10)] },
      ],
      keyA: { id: 'exp_mastery', t: ['Exp. Mastery', 'Maîtrise de l\'Expérience'], ic: 'pixelmon:exp_share', rw: [pkxp(20)],
        fl: ['Specialisation: experience.', 'Spécialisation : expérience.'] },
      B: [
        { id: 'protein_diet', t: ['Protein Diet', 'Régime Protéiné'], ic: 'pixelmon:protein', rw: [ev(8)] },
        { id: 'iron_regimen', t: ['Iron Regimen', 'Programme de Fer'], ic: 'pixelmon:iron', rw: [ev(10)] },
        { id: 'heavy_load', t: ['Heavy Load', 'Charge Lourde'], ic: 'pixelmon:macho_brace', rw: [ev(12)] },
      ],
      keyB: { id: 'effort_specialist', t: ['Effort Specialist', 'Spécialiste des EV'], ic: 'pixelmon:power_weight', rw: [ev(25)],
        fl: ['Specialisation: EVs.', 'Spécialisation : EV.'] },
      C: [
        { id: 'tough_skin', t: ['Tough Skin', 'Peau Dure'], ic: 'minecraft:iron_chestplate', rw: [hp(2)] },
        { id: 'hard_hitter', t: ['Hard Hitter', 'Frappeur'], ic: 'minecraft:iron_sword', rw: [atk(1)] },
        { id: 'unshakable', t: ['Unshakable', 'Inébranlable'], ic: 'minecraft:shield', rw: [kbres(0.15), hp(2)] },
      ],
      cap: { id: 'fighting_spirit', t: ['Fighting Spirit', 'Esprit Combatif'], ic: 'pixelmon:xl_exp_candy', rw: [P('battler_spirit'), ev(10)],
        fl: ['Never back down.', 'Ne jamais reculer.'] },
    },
    capPower: { id: 'battler_spirit', name: ['Fighting Spirit', 'Esprit Combatif'],
      desc: ['Permanent Strength I.', 'Force I permanente.'], json: pEffect([['minecraft:strength']]) },
  },

  // ======================================================== ÉLEVEUR (Normal)
  {
    id: 'breeder', icon: 'pixelmon:oval_charm', impact: 'low', color: '#FF8FC7',
    name: ['Breeder', 'Éleveur'],
    desc: ['Raised among eggs and nests. Hatches eggs faster and bonds with every Pokémon. Type affinity: Normal.',
      'A grandi entre œufs et nids. Fait éclore plus vite et se lie à chaque Pokémon. Affinité : Normal.'],
    powers: [
      { id: 'breeder_warm_hands', name: ['Warm Hands', 'Mains Chaudes'],
        desc: ['+20 steps for every egg in your party, each pulse.', '+20 pas à chaque œuf de votre équipe, à chaque impulsion.'],
        json: pAttr(PG('egg_hatch_speed'), 20) },
      { id: 'breeder_kind_words', name: ['Kind Words', 'Mots Doux'],
        desc: ['+2 friendship for each party member, each pulse.', '+2 d\'amitié à chaque membre de l\'équipe, à chaque impulsion.'],
        json: pAttr(PG('friendship_gain'), 2) },
      { id: 'breeder_twin_births', name: ['Twin Births', 'Naissances Jumelles'],
        desc: ['25% chance of an extra baby when breeding animals.', '25 % de chance d\'un petit en plus quand vous faites se reproduire des animaux.'],
        json: { type: 'neoorigins:twin_breeding', chance: 0.25 } },
      { id: 'breeder_gentle_soul', weak: true, name: ['Gentle Soul', 'Âme Douce'],
        desc: ['-15% melee damage.', '-15 % de dégâts au corps à corps.'],
        json: pAttr('minecraft:generic.attack_damage', -0.15, 'add_multiplied_total') },
    ],
    evo: [PG('egg_hatch_speed'), [15, 30, 50]],
    tree: {
      title: ['Daycare', 'Pension'], icon: 'pixelmon:destiny_knot',
      bg: 'minecraft:textures/block/hay_block_side.png',
      root: { id: 'root', t: ['First Nest', 'Premier Nid'], ic: 'minecraft:egg', rw: [egg(10), friend(1)],
        fl: ['It moved! It definitely moved!', 'Il a bougé ! Il a bougé, c\'est sûr !'] },
      A: [
        { id: 'incubation', t: ['Incubation', 'Incubation'], ic: 'minecraft:egg', rw: [egg(15)] },
        { id: 'brooding', t: ['Brooding', 'Couvaison'], ic: 'pixelmon:oval_charm', rw: [egg(20)] },
        { id: 'nursery', t: ['Nursery', 'Nurserie'], ic: 'pixelmon:destiny_knot', rw: [egg(30)] },
      ],
      keyA: { id: 'hatchery_master', t: ['Hatchery Master', 'Maître Couveur'], ic: 'pixelmon:oval_charm', rw: [egg(60)],
        fl: ['Specialisation: eggs.', 'Spécialisation : œufs.'] },
      B: [
        { id: 'lullaby', t: ['Lullaby', 'Berceuse'], ic: 'pixelmon:soothe_bell', rw: [friend(1)] },
        { id: 'gentle_touch', t: ['Gentle Touch', 'Toucher Délicat'], ic: 'pixelmon:heart_scale', rw: [friend(1)] },
        { id: 'comfort_food', t: ['Comfort Food', 'Petits Plats'], ic: 'pixelmon:moomoo_milk', rw: [friend(2)] },
      ],
      keyB: { id: 'best_friends', t: ['Best Friends', 'Meilleurs Amis'], ic: 'pixelmon:soothe_bell', rw: [friend(4)],
        fl: ['Specialisation: friendship.', 'Spécialisation : amitié.'] },
      C: [
        { id: 'clean_pens', t: ['Clean Pens', 'Enclos Propres'], ic: 'pixelmon:potion', rw: [vital(1)] },
        { id: 'family_ties', t: ['Family Ties', 'Liens Familiaux'], ic: 'minecraft:white_wool', rw: [egg(10), friend(1)] },
        { id: 'busy_days', t: ['Busy Days', 'Journées Chargées'], ic: 'minecraft:sugar', rw: [speed(0.03)] },
      ],
      cap: { id: 'twin_clutch', t: ['Twin Clutch', 'Couvée Double'], ic: 'pixelmon:lucky_egg', rw: [P('breeder_twin_clutch'), egg(40)],
        fl: ['Two is better than one.', 'Deux valent mieux qu\'un.'] },
    },
    capPower: { id: 'breeder_twin_clutch', name: ['Twin Clutch', 'Couvée Double'],
      desc: ['Another 50% chance of an extra baby when breeding animals.', '50 % de chance supplémentaire d\'un petit en plus à la reproduction.'],
      json: { type: 'neoorigins:twin_breeding', chance: 0.5 } },
  },

  // ======================================================== SOIGNEUR (Fée)
  {
    id: 'medic', icon: 'pixelmon:hyper_potion', impact: 'low', color: '#7FE0C8',
    name: ['Medic', 'Soigneur'],
    desc: ['Trained at the Pokémon Centre. Keeps the whole team on its feet, but hates to fight. Type affinity: Fairy.',
      'Formé au Centre Pokémon. Garde toute l\'équipe sur pied, mais déteste se battre. Affinité : Fée.'],
    powers: [
      { id: 'medic_field_medicine', name: ['Field Medicine', 'Médecine de Terrain'],
        desc: ['Restores 3% of max HP to your whole party, each pulse.', 'Rend 3 % des PV max à toute votre équipe, à chaque impulsion.'],
        json: pAttr(PG('party_vitality'), 3) },
      { id: 'medic_bedside_manner', name: ['Bedside Manner', 'Douceur'],
        desc: ['+1 friendship for each party member, each pulse.', '+1 d\'amitié à chaque membre de l\'équipe, à chaque impulsion.'],
        json: pAttr(PG('friendship_gain'), 1) },
      { id: 'medic_quick_recovery', name: ['Quick Recovery', 'Récupération Rapide'],
        desc: ['Natural health regeneration is 50% faster.', 'Régénération naturelle 50 % plus rapide.'],
        json: { type: 'neoorigins:natural_regen_modifier', multiplier: 1.5 } },
      { id: 'medic_pacifist', weak: true, name: ['Pacifist', 'Pacifiste'],
        desc: ['-20% melee damage.', '-20 % de dégâts au corps à corps.'],
        json: pAttr('minecraft:generic.attack_damage', -0.2, 'add_multiplied_total') },
    ],
    evo: [PG('party_vitality'), [1, 2, 3]],
    tree: {
      title: ['Pokémon Centre', 'Centre Pokémon'], icon: 'pixelmon:full_restore',
      bg: 'minecraft:textures/block/pink_concrete.png',
      root: { id: 'root', t: ['Triage', 'Triage'], ic: 'pixelmon:potion', rw: [vital(1), friend(1)],
        fl: ['Your Pokémon are fighting fit!', 'Vos Pokémon sont en pleine forme !'] },
      A: [
        { id: 'first_aid', t: ['First Aid', 'Premiers Soins'], ic: 'pixelmon:potion', rw: [vital(1)] },
        { id: 'field_dressing', t: ['Field Dressing', 'Pansements'], ic: 'pixelmon:hyper_potion', rw: [vital(2)] },
        { id: 'intensive_care', t: ['Intensive Care', 'Soins Intensifs'], ic: 'pixelmon:full_restore', rw: [vital(2)] },
      ],
      keyA: { id: 'chief_medic', t: ['Chief Medic', 'Médecin-Chef'], ic: 'pixelmon:leftovers', rw: [vital(4)],
        fl: ['Specialisation: healing.', 'Spécialisation : soins.'] },
      B: [
        { id: 'comfort', t: ['Comfort', 'Réconfort'], ic: 'pixelmon:oran_berry', rw: [friend(1)] },
        { id: 'kind_care', t: ['Kind Care', 'Soins Attentifs'], ic: 'pixelmon:sitrus_berry', rw: [friend(1)] },
        { id: 'trust', t: ['Trust', 'Confiance'], ic: 'pixelmon:soothe_bell', rw: [friend(2)] },
      ],
      keyB: { id: 'heart_of_gold', t: ['Heart of Gold', 'Cœur d\'Or'], ic: 'pixelmon:lum_berry', rw: [friend(3), vital(1)],
        fl: ['Specialisation: friendship.', 'Spécialisation : amitié.'] },
      C: [
        { id: 'healthy_habits', t: ['Healthy Habits', 'Hygiène de Vie'], ic: 'minecraft:golden_apple', rw: [hp(2)] },
        { id: 'protective_gear', t: ['Protective Gear', 'Tenue de Protection'], ic: 'minecraft:iron_chestplate', rw: [armor(2)] },
        { id: 'fresh_milk', t: ['Fresh Milk', 'Lait Frais'], ic: 'pixelmon:moomoo_milk', rw: [hp(2)] },
      ],
      cap: { id: 'healing_aura', t: ['Healing Aura', 'Aura Curative'], ic: 'pixelmon:leftovers', rw: [P('medic_healing_aura'), vital(2)],
        fl: ['Nobody faints on your watch.', 'Personne ne tombe K.O. sous ta garde.'] },
    },
    capPower: { id: 'medic_healing_aura', name: ['Healing Aura', 'Aura Curative'],
      desc: ['Permanent Regeneration I.', 'Régénération I permanente.'], json: pEffect([['minecraft:regeneration']]) },
  },

  // ======================================================== PÊCHEUR (Eau)
  {
    id: 'angler', icon: 'pixelmon:super_rod', impact: 'medium', color: '#5AB8FF',
    name: ['Angler', 'Pêcheur'],
    desc: ['At home on the water: breathes underwater, swims fast and rarely waits for a bite, but is slow on dry land. Type affinity: Water.',
      'Chez lui sur l\'eau : respire sous l\'eau, nage vite et attend rarement une touche, mais il est lent sur la terre ferme. Affinité : Eau.'],
    powers: [
      { id: 'angler_patient_line', name: ['Patient Line', 'Ligne Patiente'],
        desc: ['-10% fishing wait time and empty catches.', '-10 % de temps d\'attente et de prises vides à la pêche.'],
        json: pAttr(PG('fishing_luck'), 10) },
      { id: 'angler_gills', name: ['Gills', 'Branchies'],
        desc: ['Can breathe underwater.', 'Peut respirer sous l\'eau.'], json: { type: 'neoorigins:water_breathing' } },
      { id: 'angler_strong_stroke', name: ['Strong Stroke', 'Brasse Puissante'],
        desc: ['+30% swim speed.', '+30 % de vitesse de nage.'], json: pAttr('neoforge:swim_speed', 0.3) },
      { id: 'angler_sea_legs', weak: true, name: ['Sea Legs', 'Pied Marin'],
        desc: ['-6% movement speed on land.', '-6 % de vitesse sur la terre ferme.'],
        json: pAttr('minecraft:generic.movement_speed', -0.06, 'add_multiplied_base', { condition: 'on_land' }) },
    ],
    evo: [PG('fishing_luck'), [3, 6, 10]],
    tree: {
      title: ['Deep Blue', 'Grand Bleu'], icon: 'pixelmon:good_rod',
      bg: 'minecraft:textures/block/prismarine_bricks.png',
      root: { id: 'root', t: ['Cast Off', 'Premier Lancer'], ic: 'pixelmon:old_rod', rw: [fishing(3)],
        fl: ['Patience is a kind of bait.', 'La patience est une sorte d\'appât.'] },
      A: [
        { id: 'bait_box', t: ['Bait Box', 'Boîte à Appâts'], ic: 'pixelmon:old_rod', rw: [fishing(3)] },
        { id: 'lucky_lure', t: ['Lucky Lure', 'Leurre Porte-Bonheur'], ic: 'pixelmon:good_rod', rw: [fishing(4)] },
        { id: 'reel_master', t: ['Reel Master', 'Moulinet Expert'], ic: 'pixelmon:super_rod', rw: [fishing(5)] },
      ],
      keyA: { id: 'old_salt', t: ['Old Salt', 'Vieux Loup de Mer'], ic: 'pixelmon:super_rod', rw: [fishing(8), drop(6)],
        fl: ['Specialisation: fishing.', 'Spécialisation : pêche.'] },
      B: [
        { id: 'beachcomber', t: ['Beachcomber', 'Écumeur de Plages'], ic: 'pixelmon:pearl', rw: [loot(6)] },
        { id: 'net_haul', t: ['Net Haul', 'Coup de Filet'], ic: 'pixelmon:dive_ball', rw: [drop(6)] },
        { id: 'sunken_treasure', t: ['Sunken Treasure', 'Trésor Englouti'], ic: 'pixelmon:heart_scale', rw: [loot(8)] },
      ],
      keyB: { id: 'pearl_diver', t: ['Pearl Diver', 'Pêcheur de Perles'], ic: 'pixelmon:big_pearl', rw: [loot(10), drop(10)],
        fl: ['Specialisation: treasures.', 'Spécialisation : trésors.'] },
      C: [
        { id: 'current_rider', t: ['Current Rider', 'Surfeur de Courant'], ic: 'minecraft:kelp', rw: [swim(0.15)] },
        { id: 'divers_grip', t: ['Diver\'s Grip', 'Prise de Plongeur'], ic: 'minecraft:prismarine_shard', rw: [wetMining(0.5)] },
        { id: 'tidal_rush', t: ['Tidal Rush', 'Ruée des Marées'], ic: 'minecraft:heart_of_the_sea', rw: [swim(0.15)] },
      ],
      cap: { id: 'ocean_blessing', t: ['Ocean\'s Blessing', 'Bénédiction de l\'Océan'], ic: 'minecraft:conduit',
        rw: [P('angler_ocean_blessing'), fishing(5)],
        fl: ['The sea gives back to those who respect it.', 'La mer rend à ceux qui la respectent.'] },
    },
    capPower: { id: 'angler_ocean_blessing', name: ['Ocean\'s Blessing', 'Bénédiction de l\'Océan'],
      desc: ['Dolphin\'s Grace and Night Vision while in water.', 'Grâce du dauphin et Vision nocturne dans l\'eau.'],
      json: pEffect([['minecraft:dolphins_grace'], ['minecraft:night_vision']], { condition: { type: 'neoorigins:in_water' } }) },
  },

  // ======================================================== BOTANISTE (Plante)
  {
    id: 'botanist', icon: 'pixelmon:green_apricorn', impact: 'low', color: '#7ED77E',
    name: ['Botanist', 'Botaniste'],
    desc: ['Grows apricorns and berries like no one else, and crops ripen around them. Like plants, they fear fire. Type affinity: Grass.',
      'Cultive apricornes et baies comme personne, et les cultures mûrissent autour de lui. Comme les plantes, il craint le feu. Affinité : Plante.'],
    powers: [
      { id: 'botanist_gardener_touch', name: ['Gardener\'s Touch', 'Toucher du Jardinier'],
        desc: ['+12% apricorns and berries per harvest.', '+12 % d\'apricornes et de baies par récolte.'],
        json: pAttr(PG('harvest_yield'), 12) },
      { id: 'botanist_growth_aura', name: ['Growth Aura', 'Aura de Croissance'],
        desc: ['Crops within 4 blocks grow faster.', 'Les cultures à moins de 4 blocs poussent plus vite.'],
        json: { type: 'neoorigins:crop_growth_accelerator', radius: 4, tick_interval: 100, growths_per_interval: 1 } },
      { id: 'botanist_flammable', weak: true, name: ['Flammable', 'Inflammable'],
        desc: ['Takes 50% more fire damage.', 'Subit 50 % de dégâts de feu en plus.'],
        json: { type: 'neoorigins:modify_damage', direction: 'in', multiplier: 1.5, damage_type: '#minecraft:is_fire' } },
    ],
    evo: [PG('harvest_yield'), [5, 10, 15]],
    tree: {
      title: ['Greenhouse', 'Serre'], icon: 'pixelmon:apricorn_log',
      bg: 'minecraft:textures/block/moss_block.png',
      root: { id: 'root', t: ['Seedling', 'Jeune Pousse'], ic: 'pixelmon:green_apricorn', rw: [harvest(5)],
        fl: ['Talk to your plants. They listen.', 'Parle à tes plantes. Elles écoutent.'] },
      A: [
        { id: 'orchard_care', t: ['Orchard Care', 'Soin du Verger'], ic: 'pixelmon:red_apricorn', rw: [harvest(6)] },
        { id: 'pollinator', t: ['Pollinator', 'Pollinisateur'], ic: 'pixelmon:yellow_apricorn', rw: [harvest(8)] },
        { id: 'bumper_crop', t: ['Bumper Crop', 'Récolte Abondante'], ic: 'pixelmon:black_apricorn', rw: [harvest(10)] },
      ],
      keyA: { id: 'master_grower', t: ['Master Grower', 'Maître Cultivateur'], ic: 'pixelmon:white_apricorn', rw: [harvest(20)],
        fl: ['Specialisation: harvest.', 'Spécialisation : récolte.'] },
      B: [
        { id: 'berry_treats', t: ['Berry Treats', 'Friandises aux Baies'], ic: 'pixelmon:oran_berry', rw: [friend(1)] },
        { id: 'herbal_remedy', t: ['Herbal Remedy', 'Remède aux Plantes'], ic: 'pixelmon:sitrus_berry', rw: [vital(1)] },
        { id: 'berry_farmer', t: ['Berry Farmer', 'Fermier des Baies'], ic: 'pixelmon:leppa_berry', rw: [friend(1), harvest(4)] },
      ],
      keyB: { id: 'herbalist', t: ['Herbalist', 'Herboriste'], ic: 'pixelmon:lum_berry', rw: [friend(2), vital(2)],
        fl: ['Specialisation: berries and care.', 'Spécialisation : baies et soins.'] },
      C: [
        { id: 'sap_blood', t: ['Sap Blood', 'Sève Vive'], ic: 'minecraft:oak_sapling', rw: [hp(2)] },
        { id: 'four_leaf', t: ['Four-Leaf', 'Trèfle à Quatre Feuilles'], ic: 'minecraft:fern', rw: [luck(1)] },
        { id: 'woodcutter', t: ['Woodcutter', 'Bûcheron'], ic: 'minecraft:iron_axe', rw: [mining(0.15)] },
      ],
      cap: { id: 'bountiful_harvest', t: ['Bountiful Harvest', 'Moisson Généreuse'], ic: 'pixelmon:honey',
        rw: [P('botanist_bounty'), harvest(10)],
        fl: ['The soil remembers your kindness.', 'La terre se souvient de ta bonté.'] },
    },
    capPower: { id: 'botanist_bounty', name: ['Bountiful Harvest', 'Moisson Généreuse'],
      desc: ['Crops and logs drop one extra copy of their loot.', 'Les cultures et les bûches donnent un exemplaire de butin en plus.'],
      json: { type: 'neoorigins:crop_harvest_bonus', extra_drops: 1 } },
  },

  // ======================================================== MONTAGNARD (Roche / Sol)
  {
    id: 'hiker', icon: 'pixelmon:helix_fossil', impact: 'medium', color: '#C9A66B',
    name: ['Hiker', 'Montagnard'],
    desc: ['Grew up in caves and quarries: digs faster and unearths fossils, but sinks like a stone. Type affinity: Rock / Ground.',
      'A grandi dans les grottes et les carrières : creuse plus vite et déterre des fossiles, mais coule comme une pierre. Affinité : Roche / Sol.'],
    powers: [
      { id: 'hiker_fossil_nose', name: ['Fossil Nose', 'Flair Fossile'],
        desc: ['+5 in 10,000 chance to dig up a fossil per stone block.', '+5 chances sur 10 000 de déterrer un fossile par bloc de pierre.'],
        json: pAttr(PG('fossil_luck'), 5) },
      { id: 'hiker_rock_breaker', name: ['Rock Breaker', 'Brise-Roc'],
        desc: ['Mines pickaxe blocks 25% faster.', 'Mine 25 % plus vite les blocs à la pioche.'],
        json: { type: 'neoorigins:break_speed_modifier', multiplier: 1.25, block_tag: '#minecraft:mineable/pickaxe' } },
      { id: 'hiker_sturdy', name: ['Sturdy', 'Robuste'],
        desc: ['+20% knockback resistance.', '+20 % de résistance au recul.'], json: pAttr('minecraft:generic.knockback_resistance', 0.2) },
      { id: 'hiker_heavy_bones', weak: true, name: ['Heavy Bones', 'Os Lourds'],
        desc: ['-30% swim speed.', '-30 % de vitesse de nage.'], json: pAttr('neoforge:swim_speed', -0.3) },
    ],
    evo: [PG('fossil_luck'), [2, 4, 6]],
    tree: {
      title: ['Quarry', 'Carrière'], icon: 'pixelmon:fossil_cleaner',
      bg: 'minecraft:textures/block/stone_bricks.png',
      root: { id: 'root', t: ['Pickaxe Calluses', 'Cals de Pioche'], ic: 'minecraft:iron_pickaxe', rw: [fossil(3)],
        fl: ['Rocks have stories. You just listen.', 'Les pierres racontent des histoires. Il suffit d\'écouter.'] },
      A: [
        { id: 'amber_hunter', t: ['Amber Hunter', 'Chasseur d\'Ambre'], ic: 'pixelmon:old_amber', rw: [fossil(3)] },
        { id: 'strata_reading', t: ['Strata Reading', 'Lecture des Strates'], ic: 'pixelmon:dome_fossil', rw: [fossil(4)] },
        { id: 'paleontologist', t: ['Paleontologist', 'Paléontologue'], ic: 'pixelmon:helix_fossil', rw: [fossil(5)] },
      ],
      keyA: { id: 'fossil_expert', t: ['Fossil Expert', 'Expert en Fossiles'], ic: 'pixelmon:fossil_display', rw: [fossil(10)],
        fl: ['Specialisation: fossils.', 'Spécialisation : fossiles.'] },
      B: [
        { id: 'prospector', t: ['Prospector', 'Prospecteur'], ic: 'pixelmon:nugget', rw: [loot(6)] },
        { id: 'rock_sifter', t: ['Rock Sifter', 'Tamiseur'], ic: 'pixelmon:big_nugget', rw: [drop(6)] },
        { id: 'relic_seeker', t: ['Relic Seeker', 'Chercheur de Reliques'], ic: 'pixelmon:relic_gold', rw: [loot(8)] },
      ],
      keyB: { id: 'treasure_delver', t: ['Treasure Delver', 'Fouilleur de Trésors'], ic: 'pixelmon:star_piece', rw: [loot(12), drop(8)],
        fl: ['Specialisation: treasures.', 'Spécialisation : trésors.'] },
      C: [
        { id: 'strong_arms', t: ['Strong Arms', 'Bras Solides'], ic: 'minecraft:iron_pickaxe', rw: [mining(0.1)] },
        { id: 'rock_climber', t: ['Rock Climber', 'Grimpeur'], ic: 'minecraft:ladder', rw: [step(0.5)] },
        { id: 'tunneler', t: ['Tunneler', 'Tunnelier'], ic: 'minecraft:netherite_pickaxe', rw: [mining(0.15)] },
      ],
      cap: { id: 'stone_heart', t: ['Stone Heart', 'Cœur de Pierre'], ic: 'minecraft:diamond_pickaxe', rw: [P('hiker_stone_heart'), fossil(5)],
        fl: ['The mountain made you. Now you shape it.', 'La montagne t\'a forgé. À ton tour de la façonner.'] },
    },
    capPower: { id: 'hiker_stone_heart', name: ['Stone Heart', 'Cœur de Pierre'],
      desc: ['Permanent Haste I.', 'Célérité I permanente.'], json: pEffect([['minecraft:haste']]) },
  },

  // ======================================================== FOUINEUR (Ténèbres)
  {
    id: 'scavenger', icon: 'pixelmon:amulet_coin', impact: 'medium', color: '#8C7AE6',
    name: ['Scavenger', 'Fouineur'],
    desc: ['Moves at night and leaves nothing behind: more loot from Pokémon and Poké Loot. Fragile in a fair fight. Type affinity: Dark.',
      'Se déplace de nuit et ne laisse rien derrière lui : plus de butin des Pokémon et des Poké Loot. Fragile dans un combat loyal. Affinité : Ténèbres.'],
    powers: [
      { id: 'scavenger_sticky_fingers', name: ['Sticky Fingers', 'Doigts Agiles'],
        desc: ['+8% chance to double an item dropped by a defeated Pokémon.', '+8 % de chance de doubler un objet lâché par un Pokémon vaincu.'],
        json: pAttr(PG('pokemon_drop_luck'), 8) },
      { id: 'scavenger_lock_picker', name: ['Lock Picker', 'Crocheteur'],
        desc: ['+8% chance to double an item from a Poké Loot.', '+8 % de chance de doubler un objet d\'un Poké Loot.'],
        json: pAttr(PG('pokeloot_luck'), 8) },
      { id: 'scavenger_night_eyes', name: ['Night Eyes', 'Yeux de Nuit'],
        desc: ['Permanent night vision.', 'Vision nocturne permanente.'], json: { type: 'neoorigins:night_vision' } },
      { id: 'scavenger_frail', weak: true, name: ['Frail', 'Frêle'],
        desc: ['-4 max health (2 hearts).', '-4 PV max (2 cœurs).'], json: pAttr('minecraft:generic.max_health', -4) },
    ],
    evo: [PG('pokemon_drop_luck'), [4, 8, 12]],
    tree: {
      title: ['Black Market', 'Marché Noir'], icon: 'pixelmon:amulet_coin',
      bg: 'minecraft:textures/block/blackstone.png',
      root: { id: 'root', t: ['Pickpocket', 'Pickpocket'], ic: 'pixelmon:nugget', rw: [drop(3), loot(3)],
        fl: ['Finders keepers.', 'Qui trouve garde.'] },
      A: [
        { id: 'spoils', t: ['Spoils', 'Dépouilles'], ic: 'pixelmon:nugget', rw: [drop(5)] },
        { id: 'scrounger', t: ['Scrounger', 'Récupérateur'], ic: 'pixelmon:big_nugget', rw: [drop(6)] },
        { id: 'looter', t: ['Looter', 'Pillard'], ic: 'pixelmon:amulet_coin', rw: [drop(8)] },
      ],
      keyA: { id: 'master_thief', t: ['Master Thief', 'Maître Voleur'], ic: 'pixelmon:relic_gold', rw: [drop(16)],
        fl: ['Specialisation: Pokémon drops.', 'Spécialisation : butin Pokémon.'] },
      B: [
        { id: 'lock_sense', t: ['Lock Sense', 'Sens des Serrures'], ic: 'minecraft:tripwire_hook', rw: [loot(5)] },
        { id: 'hidden_stash', t: ['Hidden Stash', 'Cachette'], ic: 'pixelmon:star_piece', rw: [loot(6)] },
        { id: 'vault_breaker', t: ['Vault Breaker', 'Perce-Coffre'], ic: 'pixelmon:comet_shard', rw: [loot(8)] },
      ],
      keyB: { id: 'loot_baron', t: ['Loot Baron', 'Baron du Butin'], ic: 'pixelmon:rare_pokestop', rw: [loot(16)],
        fl: ['Specialisation: Poké Loot.', 'Spécialisation : Poké Loot.'] },
      C: [
        { id: 'soft_steps', t: ['Soft Steps', 'Pas Feutrés'], ic: 'minecraft:leather_boots', rw: [sneak(0.15)] },
        { id: 'quick_escape', t: ['Quick Escape', 'Fuite Rapide'], ic: 'minecraft:sugar', rw: [speed(0.04)] },
        { id: 'lucky_charm', t: ['Lucky Charm', 'Porte-Bonheur'], ic: 'minecraft:rabbit_foot', rw: [luck(1)] },
      ],
      cap: { id: 'shadow_cloak', t: ['Shadow Cloak', 'Cape d\'Ombre'], ic: 'minecraft:ender_eye',
        rw: [P('scavenger_shadow_cloak'), drop(6), loot(6)],
        fl: ['Now you see me...', 'Tu me vois... ou pas.'] },
    },
    capPower: { id: 'scavenger_shadow_cloak', name: ['Shadow Cloak', 'Cape d\'Ombre'],
      desc: ['Invisible while standing in darkness (light 4 or less).', 'Invisible dans l\'obscurité (lumière 4 ou moins).'],
      json: { type: 'neoorigins:light_level_effect', max_light_level: 4, effect: 'minecraft:invisibility', amplifier: 0,
        ambient: true, show_particles: false, show_icon: false } },
  },
];

// ---------------------------------------------------------------------------
// Géométrie et économie de l'arbre
// ---------------------------------------------------------------------------
const POS = {
  root: [0, 0],
  A: [[-72, -42], [-72, -88], [-72, -134]], keyA: [-72, -184],
  C: [[0, -50], [0, -96], [0, -142]],
  B: [[72, -42], [72, -88], [72, -134]], keyB: [72, -184],
  cap: [0, -214],
};
const LEVEL_LIMIT = 14;          // 1 point de départ + 14 niveaux = 15 points
const CAP_REQUIRED_SPENT = 12;   // le capstone exige d'avoir exploré l'arbre
const CURVE = '300 + 120 * level + 8 * level ^ 2';

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------
const writeJson = (file, obj) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
};
const rmrf = (p) => fs.rmSync(p, { recursive: true, force: true });

// nettoyage des anciennes sorties
rmrf(path.join(DATA, NS));
rmrf(ASSETS);
for (const d of fs.existsSync(path.join(PUFF, 'categories')) ? fs.readdirSync(path.join(PUFF, 'categories')) : []) {
  if (d.startsWith('origin_')) rmrf(path.join(PUFF, 'categories', d));
}

const ORIGIN_DIR = path.join(DATA, NS, 'origins/origins');
const POWER_DIR = path.join(DATA, NS, 'origins/powers');
const ROMAN = ['I', 'II', 'III'];
const stats = [];

ORIGINS.forEach((o, index) => {
  const cat = `origin_${o.id}`;
  const powerIds = [];

  // --- pouvoirs de base
  for (const p of o.powers) {
    writeJson(path.join(POWER_DIR, `${p.id}.json`), p.json);
    tr(`power.${NS}.${p.id}.name`, p.weak ? [`✗ ${p.name[0]}`, `✗ ${p.name[1]}`] : p.name);
    tr(`power.${NS}.${p.id}.description`, p.desc);
    powerIds.push(`${NS}:${p.id}`);
  }

  // --- pouvoir pont : débloque la catégorie Puffish de l'origine (neofishcompat)
  const treeId = `${o.id}_skill_tree`;
  writeJson(path.join(POWER_DIR, `${treeId}.json`), { type: 'neofishcompat:unlock_puffish_category', category: cat });
  tr(`power.${NS}.${treeId}.name`, [`★ ${o.tree.title[0]}`, `★ ${o.tree.title[1]}`]);
  tr(`power.${NS}.${treeId}.description`, [
    `Unlocks the "${o.tree.title[0]}" skill tree (Skills menu). It levels up with your vanilla XP.`,
    `Débloque l'arbre de compétences « ${o.tree.title[1]} » (menu Compétences). Il progresse avec votre XP vanilla.`]);
  powerIds.push(`${NS}:${treeId}`);

  // --- pouvoir du capstone (donné par la récompense unlock_power de Puffish)
  const cp = o.capPower;
  writeJson(path.join(POWER_DIR, `${cp.id}.json`), lockToOrigin(o.id, { ...cp.json, hidden: true }));
  tr(`power.${NS}.${cp.id}.name`, cp.name);
  tr(`power.${NS}.${cp.id}.description`, cp.desc);

  // --- évolution NeoOrigins (paliers de victimes, config/neoorigins/gameplay.toml)
  const [evoAttr, evoVals] = o.evo;
  const tiers = evoVals.map((v, i) => {
    const id = `${o.id}_evolution_${i + 1}`;
    writeJson(path.join(POWER_DIR, `${id}.json`), pAttr(evoAttr, v));
    const fx = FX[evoAttr];
    tr(`power.${NS}.${id}.name`, [`Evolution ${ROMAN[i]}`, `Évolution ${ROMAN[i]}`]);
    tr(`power.${NS}.${id}.description`, [fx[0].replace('%s', v).replace('%%', '%') + '.',
      fx[1].replace('%s', v).replace('%%', '%') + '.']);
    return { tier: i + 1, add: [`${NS}:${id}`], remove: i ? [`${NS}:${o.id}_evolution_${i}`] : [] };
  });

  // --- l'origine
  writeJson(path.join(ORIGIN_DIR, `${o.id}.json`), {
    name: tr(`origins.${NS}.${o.id}.name`, o.name),
    description: tr(`origins.${NS}.${o.id}.description`, o.desc),
    icon: o.icon,
    impact: o.impact,
    order: index + 1,
    powers: powerIds,
    upgrades: [],
    tier_powers: tiers,
  });

  // --- arbre Puffish
  const t = o.tree;
  const defs = {}; const skills = {}; const uni = [];
  const L = (k, pair) => `${NS}.tree.${o.id}.${k}`;
  const node = (n, slot, xy, opts = {}) => {
    const key = n.id === 'root' ? 'root' : n.id;
    const lines = n.rw.map((r) => r.kind === 'attr'
      ? fxLine(r.attribute, r.value, opts.color || '#9BE7FF')
      // NeoOrigins lit power.*.description en brut, Puffish le formaterait : clé dédiée, % échappés.
      : tText(L(`${key}.power`), o.capPower.desc, { color: '#FFE9A3', italic: false }));
    const desc = { text: '', italic: false, extra: lines.flatMap((l, i) => i ? [{ text: '\n' }, l] : [l]) };
    defs[key] = {
      title: tText(L(`${key}.title`), n.t, { color: opts.titleColor || o.color, bold: true, italic: false }),
      description: desc,
      ...(n.fl ? { extra_description: tText(L(`${key}.flavor`), n.fl, { color: '#8A8A8A', italic: true }) } : {}),
      icon: icon(n.ic),
      frame: { type: 'advancement', data: { frame: opts.frame || 'task' } },
      size: opts.size || 1,
      cost: opts.cost || 1,
      ...(opts.required ? { required_spent_points: opts.required } : {}),
      rewards: n.rw.map(toPuffReward),
    };
    skills[key] = { definition: key, x: xy[0], y: xy[1], ...(slot === 'root' ? { root: true } : {}) };
    return key;
  };
  const root = node(t.root, 'root', POS.root, { frame: 'challenge', size: 2 });
  const column = (nodes, posList, key, keyPos) => {
    let prev = root;
    nodes.forEach((n, i) => { const k = node(n, 'n', posList[i]); uni.push([prev, k]); prev = k; });
    if (key) { const k = node(key, 'k', keyPos, { frame: 'goal', cost: 2, color: '#FFE9A3' }); uni.push([prev, k]); prev = k; }
    return prev;
  };
  const endA = column(t.A, POS.A, t.keyA, POS.keyA);
  const endB = column(t.B, POS.B, t.keyB, POS.keyB);
  const endC = column(t.C, POS.C);
  const cap = node(t.cap, 'cap', POS.cap, { frame: 'challenge', size: 2, cost: 3, required: CAP_REQUIRED_SPENT, color: '#FFE9A3' });
  uni.push([endA, cap], [endB, cap], [endC, cap]);

  const catDir = path.join(PUFF, 'categories', cat);
  writeJson(path.join(catDir, 'category.json'), {
    title: tText(L('title'), t.title, { color: o.color, bold: true }),
    icon: icon(t.icon),
    background: { texture: t.bg, width: 16, height: 16, position: 'tile' },
    starting_points: 1,
    unlocked_by_default: false,
    erase_on_death: false,
    exclusive_root: false,
  });
  writeJson(path.join(catDir, 'definitions.json'), defs);
  writeJson(path.join(catDir, 'skills.json'), skills);
  writeJson(path.join(catDir, 'connections.json'), {
    normal: { unidirectional: uni },
    exclusive: { bidirectional: [[endA, endB]] },
  });
  // Pas de source Puffish : l'XP vient de l'XP vanilla via kubejs 59_skill_xp_vanilla.js
  writeJson(path.join(catDir, 'experience.json'), {
    level_limit: LEVEL_LIMIT,
    reset_on_death: false,
    experience_per_level: { type: 'expression', data: { expression: CURVE } },
    sources: [],
  });

  const cost = Object.values(defs).reduce((a, d) => a + d.cost, 0);
  stats.push(`${o.id.padEnd(11)} ${Object.keys(defs).length} skills, coût ${cost} (atteignable ${cost - 2}), ${powerIds.length} pouvoirs`);
});

// --- calques NeoOrigins : uniquement les origines Pixelmon
writeJson(path.join(DATA, 'neoorigins/origins/origin_layers/origin.json'), {
  replace: true,
  order: 1,
  name: 'origins.layer.origin',
  origins: ORIGINS.map((o) => `${NS}:${o.id}`),
  allow_random: true,
  auto_choose: false,
  hidden: false,
  enabled: true,
});
// Le calque « Classe » (20 classes génériques) est désactivé.
writeJson(path.join(DATA, 'neoorigins/origins/origin_layers/class.json'), {
  replace: true,
  order: 2,
  name: 'origins.layer.class',
  origins: [],
  allow_random: false,
  auto_choose: false,
  hidden: true,
  enabled: false,
});
tr('origins.layer.origin', ['Pixelmon Origin', 'Origine Pixelmon']);
tr('screen.neoorigins.choose.origins.layer.origin', ['Choose your Pixelmon Origin', 'Choisissez votre origine Pixelmon']);

// --- langues
for (const [lang, obj] of Object.entries(LANG)) writeJson(path.join(ASSETS, `${lang}.json`), obj);

// --- config Puffish : garder les catégories non-origines, ajouter les nôtres
const cfgFile = path.join(PUFF, 'config.json');
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
cfg.categories = [...cfg.categories.filter((c) => !c.startsWith('origin_')), ...ORIGINS.map((o) => `origin_${o.id}`)];
fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, '\t') + '\n', 'utf8');

console.log(`${ORIGINS.length} origines générées :`);
for (const s of stats) console.log('  ' + s);
console.log(`points disponibles par arbre : ${1 + LEVEL_LIMIT}`);
console.log('catégories Puffish :', cfg.categories.join(', '));
