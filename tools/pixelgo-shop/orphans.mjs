/**
 * PixelGO — To the Sky : nouveau prix des objets qui n'ont plus de marchand depuis la refonte
 * du 2026-11-02 (anciens shops sauvegardés dans backups/shops-2026-11-02).
 *
 * Méthode, par ordre de priorité :
 *   1. recette  : coût de fabrication au barème du guide (craftcost.mjs) — toute la chaîne ;
 *   2. minion   : item enchanté = 160 × son item de base, « super » item = 160 × l'enchanté
 *                 (compaction du minion, règle d'ECONOMIE.md) ;
 *   3. matière  : matière brute absente du guide, alignée sur son équivalent vanilla (BASE) ;
 *   4. échelle  : objet sans recette (CT, objets tenus, menthes…) : ancien prix × facteur Pixelmon,
 *                 le rapport médian « coût de fabrication / ancien prix » mesuré sur les objets
 *                 Pixelmon qui ont une recette. Garde les écarts entre objets que le pack avait.
 * Revente = 30 % de l'achat (sell_margin du guide).
 *
 * Écrit tools/pixelgo-shop/orphans-prices.json.   Usage : node tools/pixelgo-shop/orphans.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadCosts, key } from './craftcost.mjs';

const ROOT = process.cwd();
const OLD = path.join(ROOT, 'backups', 'shops-2026-11-02', 'shopkeeper');
const NOW = path.join(ROOT, 'kubejs', 'data', 'pixelgo', 'pixelmon', 'npc', 'preset', 'shopkeeper');
const SELL = 0.3;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const shopItems = (dir) => {
  const m = new Map();
  for (const f of walk(dir).filter(f => f.endsWith('.json'))) {
    const shop = path.relative(dir, f).split(path.sep).join('/').replace(/\.json$/, '');
    const scan = (o) => { if (Array.isArray(o)) return o.forEach(scan); if (!o || typeof o !== 'object') return;
      if (o.type === 'pixelmon:open_shop') { for (const e of o.items) { const it = typeof e.item === 'string' ? { id: e.item } : e.item;
        const k = key(it.id, it.components); if (!m.has(k)) m.set(k, { k, id: it.id, components: it.components, shop, oldBuy: e.buyPrice, oldSell: e.sellPrice }); } return; }
      Object.values(o).forEach(scan); };
    scan(JSON.parse(fs.readFileSync(f, 'utf8')));
  }
  return m;
};
const old = shopItems(OLD);
// « sans marchand » = absent des catégories du guide (les shops actuels contiennent aussi ces objets, depuis le 2026-11-08)
const guideFile = fs.readdirSync(ROOT).filter(f => /^prices_1_21_.*\.json$/.test(f)).sort().pop();
const guideIds = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, guideFile), 'utf8'))).map(k => 'minecraft:' + k));
const orphans = [...old.values()].filter(x => !guideIds.has(x.id));

/* Toutes les Poké Balls de Pixelmon (data/pixelmon/pokeballs), sauf celles qui capturent à coup sûr
 * (bonus de capture 255 : Master, Parc, Origine). Sans recette, leur prix de référence est celui
 * du Poké Mart de Pixelmon (1 000 pour celles qu'il ne vend pas, le prix de ses balls spéciales). */
const BALLS = ['poke_ball', 'great_ball', 'ultra_ball', 'premier_ball', 'heal_ball', 'safari_ball', 'level_ball', 'lure_ball',
  'moon_ball', 'friend_ball', 'love_ball', 'heavy_ball', 'fast_ball', 'sport_ball', 'net_ball', 'dive_ball', 'nest_ball',
  'repeat_ball', 'timer_ball', 'luxury_ball', 'dusk_ball', 'quick_ball', 'dream_ball', 'beast_ball', 'cherish_ball',
  'christmas_ball', 'gs_ball', 'strange_ball', 'ancient_poke_ball', 'ancient_great_ball', 'ancient_ultra_ball',
  'ancient_heavy_ball', 'leaden_ball', 'gigaton_ball', 'feather_ball', 'wing_ball', 'jet_ball'];
const MART = { poke_ball: 200, great_ball: 600, ultra_ball: 1200, heal_ball: 300 }; // les autres : 1 000
for (const b of BALLS) {
  const components = { 'pixelmon:poke_ball': b }; const k = key('pixelmon:poke_ball', components);
  if (!orphans.some(o => o.k === k)) orphans.push({ k, id: 'pixelmon:poke_ball', components, shop: '05_poke_balls/special_balls', oldBuy: 0, oldSell: 0, ref: MART[b] ?? 1000 });
}

/* ============================================================================
 *  MATIÈRES BRUTES absentes du guide — alignées sur l'équivalent vanilla du guide
 * ========================================================================== */
const COLORS = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
/* Chaque matière : [prix, justification affichée dans le tableau]. */
const RAW = {
  ...Object.fromEntries(['red', 'yellow', 'blue', 'green', 'pink', 'white', 'black'].map(c => ['pixelmon:' + c + '_apricorn', [10, 'fruit d’arbre, comme la pomme (10 $)']])),
  ...Object.fromEntries(['health', 'muscle', 'resist', 'genius', 'clever', 'swift', 'pretty'].map(f => ['pixelmon:' + f + '_feather', [5, 'comme la plume (5 $)']])),
  'pixelmon:bauxite_ore': [19, 'comme le minerai de fer (19 $)'], 'pixelmon:deepslate_bauxite_ore': [19, 'comme le minerai de fer (19 $)'],
  'pixelmon:raw_bauxite': [15, 'comme le fer brut (15 $)'],
  'pixelmon:raw_platinum': [60, 'métal rare de Pixelmon, comme l’or brut (60 $)'],
  'pixelmon:shoal_salt': [30, 'butin de plage, comme l’éclat de prismarine (30 $)'], 'pixelmon:shoal_shell': [30, 'butin de plage, comme l’éclat de prismarine (30 $)'],
  ...Object.fromEntries(['blue', 'green', 'pink', 'purple', 'red', 'yellow'].map(c => ['pixelmon:' + c + '_berry_wood_planks', [2, 'comme la planche de chêne (2 $)']])),
  'pixelmon:pixelmon_sprite': [5, 'image de Pokémon, comme un papier teint (~5 $)'],
  'mysticalagriculture:inferium_essence': [2, 'récolte d’une culture, comme le blé (2 $)'],
  'mysticalagriculture:prosperity_shard': [5, 'tiré d’un minerai comme le lapis-lazuli (5 $)'],
  'mysticalagriculture:infusion_crystal': [1, 'outil réutilisable, non consommé : usure amortie (1 $)'],
  'mysticalagriculture:master_infusion_crystal': [1, 'outil réutilisable, non consommé : usure amortie (1 $)'],
  'minecraft:water_bucket': [45, 'seau (3 fer = 45 $) + eau gratuite'],
  'minecraft:lava_bucket': [50, 'seau (45 $) + lave'],
  'minecraft:experience_bottle': [15, 'fiole (2 $) + ~7 points d’XP, aussi convertis en XP de compétence'],
  'minecraft:rabbit_foot': [10, 'drop rare du lapin (peau 2 $, viande 4 $)'],
  'minecraft:totem_of_undying': [1000, 'butin d’Évocateur : entre cœur de la mer (500 $) et étoile du Nether (3 000 $)'],
  'minecraft:name_tag': [40, 'butin de coffre, comme la selle (39 $)'],
  'minecraft:bell': [120, 'butin de village, ~2 lingots d’or'],
  'minecraft:flint': [2, 'tamisé du gravier (2 $)'],
  'excompressum:chicken_stick': [10, 'un bâton frappé sur un poulet'],
  'minecraft:tipped_arrow|{"minecraft:potion_contents":{"potion":"minecraft:slowness"}}': [6.5, '(8 flèches à 2,75 $ + potion persistante ~30 $) / 8'],
  'minecraft:tipped_arrow|{"minecraft:potion_contents":{"potion":"minecraft:poison"}}': [6.5, '(8 flèches à 2,75 $ + potion persistante ~30 $) / 8'],
  // minions : pierre dure = produit de générateur comme le cobble ; mithril = minerai de minion de rang « or »
  'pixelgo_minions:hard_stone': [1, 'produit au rythme du générateur, comme la pierre taillée (1 $)'],
  'pixelgo_minions:mithril': [60, 'minerai de minion de rang « or », comme le lingot d’or (60 $)']
};
const BASE = {}; const NOTE = {};
for (const [k, [p, n]] of Object.entries(RAW)) { BASE[k] = p; NOTE[k] = n; }
/* Ingrédients Pixelmon sans recette et absents des anciens shops : prix Pixelmon d’origine,
 * mis à l’échelle comme les CT et objets tenus (même facteur). */
const SCALED_LEAVES = {
  'pixelmon:xs_exp_candy': 100, 'pixelmon:s_exp_candy': 400, 'pixelmon:m_exp_candy': 1000,
  'pixelmon:l_exp_candy': 3000, 'pixelmon:xl_exp_candy': 6000, 'pixelmon:rare_candy': 4800
};
// baies Pixelmon : poussent sur un arbre comme une culture, comme les baies sucrées (3 $)
const pixelmonBerry = (id) => /^pixelmon:[a-z_]+_berry$/.test(id);

/* ============================================================================
 *  MINIONS : compaction ×160 (aucune recette : le minion compacte lui-même)
 * ========================================================================== */
const ENCH_BASE = { cactus_green: 'minecraft:green_dye', raw_beef: 'minecraft:beef', raw_chicken: 'minecraft:chicken',
  raw_cod: 'minecraft:cod', raw_mutton: 'minecraft:mutton', raw_porkchop: 'minecraft:porkchop', raw_rabbit: 'minecraft:rabbit',
  raw_salmon: 'minecraft:salmon', seeds: 'minecraft:wheat_seeds', wool: 'minecraft:white_wool', slimeball: 'minecraft:slime_ball',
  hay_bale: 'minecraft:hay_block', redstone_dust: 'minecraft:redstone', lapis_lazuli_block: 'minecraft:lapis_block',
  nether_quartz: 'minecraft:quartz', mithril: 'pixelgo_minions:mithril', hard_stone: 'pixelgo_minions:hard_stone',
  red_sand_cube: 'pixelgo_minions:enchanted_red_sand', mycelium_cube: 'pixelgo_minions:enchanted_mycelium' };
const SUPER = { // « super » items : 160 items enchantés
  'pixelgo_minions:box_of_seeds': 'pixelgo_minions:enchanted_seeds', 'pixelgo_minions:polished_pumpkin': 'pixelgo_minions:enchanted_pumpkin',
  'pixelgo_minions:mutant_nether_wart': 'pixelgo_minions:enchanted_nether_wart', 'pixelgo_minions:super_enchanted_egg': 'pixelgo_minions:enchanted_egg',
  'pixelgo_minions:absolute_ender_pearl': 'pixelgo_minions:enchanted_ender_pearl', 'pixelgo_minions:concentrated_stone': 'pixelgo_minions:enchanted_hard_stone'
};
const extraRecipes = [];
const minionOf = {};
for (const o of orphans) {
  const m = o.id.match(/^pixelgo_minions:enchanted_(.+)$/); if (!m) continue;
  const b = ENCH_BASE[m[1]] || 'minecraft:' + m[1];
  minionOf[o.id] = b;
}
for (const [s, e] of Object.entries(SUPER)) minionOf[s] = e;
for (const [out, b] of Object.entries(minionOf)) extraRecipes.push({ type: 'pixelgo_minions:compaction', out, count: 1, ins: [{ ing: b, n: 160 }], step: 0 });

const MINION_TOOLS = new Set(['rookie_hoe', 'basic_gardening_hoe', 'advanced_gardening_hoe', 'greatest_tilling_hoe',
  'rookie_farming_axe', 'basic_gardening_axe', 'advanced_gardening_axe', 'sculptor_axe', 'wheat_sickle', 'carrot_shovel',
  'potato_shovel', 'sugar_cane_cutter', 'nether_wart_cutter', 'pumpkin_dicer', 'melon_dicer', 'cactus_knife', 'fungi_cutter',
  'sunflower_scythe', 'cocoa_chopper'].map(t => 'pixelgo_minions:' + t));

/* ============================================================================
 *  CALCUL
 * ========================================================================== */
// un sprite de Pokémon vaut le même prix quelle que soit l'espèce dessinée
const run = () => loadCosts({ extraBase: BASE, extraRecipes, revive: (id) => MINION_TOOLS.has(id), anyComponents: new Set(['pixelmon:pixelmon_sprite']) });
let C = run();
for (const id of C.items) if (pixelmonBerry(id) && !(id in BASE)) { BASE[id] = 3; NOTE[id] = 'pousse sur un arbre comme une culture, comme les baies sucrées (3 $)'; }
// Poké Ball « sans type » (meubles Pixelmon) : prix de la Poké Ball standard
BASE['pixelmon:poke_ball'] = C.cost[key('pixelmon:poke_ball', { 'pixelmon:poke_ball': 'poke_ball' })]; NOTE['pixelmon:poke_ball'] = 'Poké Ball standard';
C = run();

// Décoration sans recette (taillée à l'établi Chipped, variantes de blocs) : prix du bloc d'origine
const SAME_AS = {
  'pixelmon:shingles_corner1': 'pixelmon:shingles', 'pixelmon:shingles_corner2': 'pixelmon:shingles',
  ...Object.fromEntries(['corner1', 'corner2', 'corner3', 'corner4', 'side1', 'side2', 'side3', 'side4'].map(k => ['pixelmon:poke_sand_' + k, 'pixelmon:poke_sand'])),
  'pixelmon:braille_block_underscore': 'pixelmon:braille_block_blank', 'pixelmon:sandy_grass': 'pixelmon:poke_sand',
  'pixelmon:poke_grass': 'minecraft:grass_block', 'pixelmon:poke_dirt': 'minecraft:dirt',
  'pixelmon:cross_tombstone': 'minecraft:stone_bricks', 'pixelmon:tall_tombstone': 'minecraft:stone_bricks',
  'pixelmon:vertical_tombstone': 'minecraft:stone_bricks', 'pixelmon:mug_pika': 'pixelmon:mug_ball'
};
const sameAs = (id) => {
  if (SAME_AS[id]) return SAME_AS[id];
  if (id.startsWith('factory_blocks:') && id !== 'factory_blocks:factory') return 'factory_blocks:factory';
  // dalles / escaliers / portes… de bois de baie : la planche correspondante, au barème vanilla
  const m = id.match(/^pixelmon:([a-z]+)_berry_wood_(slab|stairs|fence|fence_gate|door|trapdoor|button|pressure_plate)$/);
  if (m) return { slab: 'minecraft:oak_slab', stairs: 'minecraft:oak_stairs', fence: 'minecraft:oak_fence', fence_gate: 'minecraft:oak_fence_gate',
    door: 'minecraft:oak_door', trapdoor: 'minecraft:oak_trapdoor', button: 'minecraft:oak_button', pressure_plate: 'minecraft:oak_pressure_plate' }[m[2]];
  // couleurs : la variante la moins chère qui a un prix
  for (const c of COLORS) if (id.includes(c + '_') || id.endsWith('_' + c)) {
    for (const d of COLORS) { const v = id.replace(c, d); if (v !== id && C.cost[v] != null && isFinite(C.cost[v])) return v; }
  }
  return null;
};

const depth = {}; // nombre d'étapes de fabrication
const stepsOf = (k, seen = new Set()) => {
  if (depth[k] != null) return depth[k]; if (seen.has(k)) return 0; seen.add(k);
  const r = C.how[k]; if (!r || r.base) return (depth[k] = 0);
  let d = 0; for (const { ing } of r.ins) { const ids = typeof ing === 'string' && !ing.startsWith('#') ? [ing] : ing?.item ? [ing.item] : []; for (const i of ids) d = Math.max(d, stepsOf(i.includes(':') ? i : 'minecraft:' + i, seen)); }
  return (depth[k] = d + 1);
};
const label = (ing) => {
  if (typeof ing === 'string') return ing.replace(/^minecraft:/, '');
  if (ing?.fluidlike) return `${ing.amount} mB ${ing.fluidlike.replace(/^minecraft:/, '')}`;
  if (ing?.type === 'neoforge:components') return [ing.items].flat()[0].replace(/^[a-z_]+:/, '') + ' ' + Object.values(ing.components).filter(v => typeof v !== 'object').join('');
  if (ing?.tag) return '#' + ing.tag;
  if (ing?.item) return ing.item.replace(/^minecraft:/, '');
  if (Array.isArray(ing)) return label(ing[0]) + (ing.length > 1 ? '…' : '');
  if (ing?.ingredient) return label(ing.ingredient);
  if (ing?.base) return label(ing.base);
  if (ing?.children) return label(ing.children[0]);
  return '?';
};
const TYPE_FR = { 'minecraft:crafting_shaped': 'craft', 'minecraft:crafting_shapeless': 'craft', 'minecraft:smelting': 'four',
  'minecraft:blasting': 'haut fourneau', 'minecraft:smoking': 'fumoir', 'minecraft:campfire_cooking': 'feu de camp',
  'minecraft:stonecutting': 'tailleur de pierre', 'minecraft:smithing_transform': 'table de forgeron', 'pixelgo_minions:compaction': 'compaction minion ×160' };
const describe = (r) => {
  const parts = {}; for (const { ing, n } of r.ins) { const l = label(ing); parts[l] = (parts[l] || 0) + n; }
  return `${TYPE_FR[r.type] || r.type.replace(/^[a-z_]+:/, '')}${r.count > 1 ? ` (×${r.count})` : ''} : ` +
    Object.entries(parts).map(([l, n]) => (n > 1 ? n + ' × ' : '') + l).join(' + ');
};

// facteur Pixelmon : coût de fabrication / ancien prix, sur les objets Pixelmon des anciens shops qui ont une recette.
// Sans les balls PixelGO : leur ancien prix suivait la chaîne Mekanism retirée le 2026-11-07, pas leur recette actuelle.
const ratios = [];
for (const o of orphans) {
  if (!/^(pixelmon|pixelgoitems):/.test(o.id) || /^14_decoration/.test(o.shop) || o.id === 'pixelmon:poke_ball'
    || !(o.oldBuy > 0) || o.k in NOTE || pixelmonBerry(o.id)) continue;
  const c = C.cost[o.k]; if (c != null && isFinite(c) && C.how[o.k] && !C.how[o.k].base) ratios.push({ k: o.k, r: c / o.oldBuy });
}
ratios.sort((a, b) => a.r - b.r);
const FACTOR = ratios.length ? ratios[ratios.length >> 1].r : null;

/* 2e passe : les objets sans recette chiffrée (ou sans recette du tout) reçoivent leur prix
 * « à l'échelle » comme prix de base, puis tout est recalculé — un objet fabriqué à partir
 * d'eux (Random Level <- Bonbon Rare, Shiny Swapper <- tickets…) passe alors par sa recette. */
const SCALED = new Set();
const scaleOf = (o) => o.oldBuy > 0 ? o.oldBuy * FACTOR : o.ref > 0 ? o.ref * FACTOR : o.oldSell > 0 ? o.oldSell / SELL * FACTOR : null;
for (const [k, p] of Object.entries(SCALED_LEAVES)) { BASE[k] = p * FACTOR; SCALED.add(k); }
C = run(); // d'abord les ingrédients : les balls EXP (bonbons EXP), Random Level (Bonbon Rare)… passent par leur recette
for (const o of orphans) {
  if (/^14_decoration/.test(o.shop)) continue; // la déco reste au coût de ses blocs, jamais à l'échelle Pixelmon
  if (isFinite(C.cost[o.k] ?? Infinity) || (sameAs(o.id) && isFinite(C.cost[sameAs(o.id)] ?? Infinity))) continue;
  const s = scaleOf(o); if (s != null) { BASE[o.k] = s; SCALED.add(o.k); }
}
C = run();
if (process.argv.includes('--why')) {
  for (const k of process.argv.slice(process.argv.indexOf('--why') + 1)) { console.log('##', k, C.cost[k]); for (const l of C.why(k).slice(0, 4)) console.log('   ', l.slice(0, 700)); }
  process.exit(0);
}

const round2 = (v) => Math.round(v * 100) / 100;
// CT / DT / balls / sacs : le nom de l'objet seul ne dit pas lequel c'est
const displayName = (o) => {
  const cd = o.components?.['minecraft:custom_data'];
  if (o.id === 'pixelmon:tm_gen7') return `CT ${cd?.tm} (7G)`;
  if (o.id === 'pixelmon:tr_gen8') return `DT ${String(cd?.tm).padStart(2, '0')} (8G)`;
  if (o.id === 'pixelmon:poke_ball' && o.components) return C.name('pixelmon:' + o.components['pixelmon:poke_ball']) || o.components['pixelmon:poke_ball'];
  if (o.id === 'treasurebags:treasure_bag') return 'Sac mystère ' + o.components['treasurebags:bag_type'].replace(/^pixelgo:/, '');
  if (o.id === 'tcg:pack') return 'Booster TCG, série ' + cd?.SetID;
  if (o.id === 'extendedcrafting:singularity') return 'Singularité ' + o.components['extendedcrafting:singularity_id'].split(':')[1];
  if (o.id === 'minecraft:tipped_arrow') return 'Flèche (' + o.components['minecraft:potion_contents'].potion.split(':')[1] + ')';
  return C.name(o.k) || o.id;
};
const out = [];
for (const o of orphans) {
  let c = C.cost[o.k], method, detail;
  const r = C.how[o.k];
  if (c != null && isFinite(c) && r && !r.base) {
    method = r.type === 'pixelgo_minions:compaction' ? 'minion' : 'recette'; detail = describe(r);
  } else if (SCALED.has(o.k)) {
    method = 'échelle'; detail = `pas de recette : ${o.oldBuy > 0 ? 'ancien prix ' + o.oldBuy : o.ref > 0 ? 'prix Poké Mart ' + o.ref : 'ancienne revente ' + o.oldSell} × facteur Pixelmon`;
  } else if (c != null && isFinite(c)) {
    method = 'matière'; detail = NOTE[o.k] || 'matière brute sans recette';
  } else if (sameAs(o.id) && isFinite(C.cost[sameAs(o.id)] ?? Infinity)) {
    c = C.cost[sameAs(o.id)]; method = 'variante'; detail = 'même prix que ' + sameAs(o.id).replace(/^minecraft:/, '');
  } else { method = 'à fixer'; detail = 'aucune base'; c = null; }
  const buy = c == null ? null : Math.max(0.01, round2(c));
  out.push({ id: o.id, components: o.components, shop: o.shop, name: displayName(o), oldBuy: o.oldBuy, oldSell: o.oldSell,
    buy, sell: buy == null ? null : round2(buy * SELL), method, steps: method === 'recette' ? stepsOf(o.k) : null, detail,
    exists: C.items.has(o.id) && !!C.name(o.id.split('|')[0]) || /^pixelmon:(tm_gen7|tr_gen8|poke_ball)$|^(tcg:pack|treasurebags:treasure_bag)$/.test(o.id) });
}
fs.writeFileSync(path.join(ROOT, 'tools', 'pixelgo-shop', 'orphans-prices.json'), JSON.stringify({ factor: FACTOR, factorSample: ratios.length, items: out }, null, 1) + '\n');
const by = {}; for (const x of out) by[x.method] = (by[x.method] || 0) + 1;
console.log(`${out.length} objets sans marchand. Facteur Pixelmon ${FACTOR?.toFixed(4)} (sur ${ratios.length} objets)`);
console.log(by);
if (process.argv.includes('--ratios')) for (const r of ratios) console.log(r.r.toFixed(4), r.k);
if (process.argv.includes('--types')) {
  const used = {}; const seen = new Set();
  const visit = (k) => { if (seen.has(k)) return; seen.add(k); const r = C.how[k]; if (!r || r.base) return;
    used[r.type] = (used[r.type] || 0) + 1;
    for (const { ing } of r.ins) { const ids = typeof ing === 'string' && !ing.startsWith('#') ? [ing] : ing?.item ? [ing.item] : [];
      for (const i of ids) visit(i.includes(':') ? i : 'minecraft:' + i); } };
  for (const o of orphans) visit(o.k);
  console.log(Object.entries(used).sort((a, b) => b[1] - a[1]));
}
