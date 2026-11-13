/**
 * PixelGO — To the Sky : catalogue des marchands de DÉCORATION et prix au coût du craft.
 *
 * Sources : Handcrafted, Another Furniture, Factory Blocks, Pixelmon, Minecraft.
 * Chaque objet coûte ce que coûtent ses ingrédients au prix d'achat des marchands du pack
 * (bûche 80 $ -> planche 20 $, laine 8 $, fer 12 $…), calculé depuis les recettes des jars.
 * Acheter un meuble revient donc au même prix que l'acheter en pièces détachées : le marchand
 * fait gagner du temps, pas de l'argent. Achat seul (revente 0 $) : la déco est un puits
 * d'argent, jamais une source.
 *
 * Écrit tools/pixelgo-economy/deco.json, lu ensuite par apply.mjs (prix, ajout aux boutiques)
 * et shops.mjs (rangement dans les rayons « Décoration »).
 *
 * Usage :  node tools/pixelgo-economy/deco.mjs      (à relancer si un mod déco change de version)
 * Ordre complet : deco.mjs -> apply.mjs -> shops.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { readZip } from './zip.mjs';

const ROOT = process.cwd();
const MODS = path.join(ROOT, 'mods');
const KDATA = path.join(ROOT, 'kubejs', 'data');
const jar = (re) => { const f = fs.readdirSync(MODS).find(n => re.test(n)); if (!f) throw new Error('jar introuvable : ' + re); return path.join(MODS, f); };
const MC_JAR = process.env.MCJAR || path.join(ROOT, '..', '..', 'Install', 'versions', '1.21.1', '1.21.1.jar');
const NEO_JAR = process.env.NEOJAR || path.join(ROOT, '..', '..', 'Install', 'libraries', 'net', 'neoforged', 'neoforge', '21.1.250', 'neoforge-21.1.250-universal.jar');
const JARS = {
  minecraft: MC_JAR, neoforge: NEO_JAR,
  handcrafted: jar(/^handcrafted-/), another_furniture: jar(/^another_furniture-/),
  factory_blocks: jar(/^factory_blocks-/), pixelmon: jar(/^Pixelmon-.*universal\.jar$/)
};

/* ============================================================================
 *  1. LECTURE : recettes, tags, identifiants d'objets, noms (lang)
 * ========================================================================== */
const recipes = [];           // { out, count, ins: [ingrédient…] }
const tags = {};              // 'ns:chemin' -> [valeurs]
const items = {};             // ns -> Set(ids) (modèles d'objet)
const lang = {};
const addTag = (name, body) => { const t = (tags[name] ||= []); for (const v of body.values || []) t.push(typeof v === 'string' ? v : v.id); };
const addRecipe = (r) => {
  if (!r || typeof r !== 'object') return;
  const res = r.result; const out = typeof res === 'string' ? res : res?.id ?? res?.item; if (!out) return;
  const count = (typeof res === 'object' && res.count) || 1;
  let ins;
  if (r.type === 'minecraft:crafting_shaped') ins = r.pattern.join('').split('').filter(c => c !== ' ').map(c => r.key[c]);
  else if (r.type === 'minecraft:crafting_shapeless') ins = r.ingredients;
  else if (['minecraft:stonecutting', 'minecraft:smelting', 'minecraft:blasting', 'minecraft:smoking', 'minecraft:campfire_cooking'].includes(r.type)) ins = [r.ingredient];
  else return;
  if (ins.some(i => i == null)) return;
  recipes.push({ out, count, ins });
};
for (const [ns, file] of Object.entries(JARS)) {
  const z = readZip(file, n => n.includes('/recipe/') || n.includes('/tags/item') || /^assets\/[a-z_]+\/(items|models\/item)\//.test(n) || /^assets\/[a-z_]+\/lang\/(en_us|fr_fr)\.json$/.test(n));
  for (const [n, b] of z) {
    let j; try { j = JSON.parse(b); } catch { continue; }
    let m;
    if ((m = n.match(/^data\/([a-z0-9_.-]+)\/tags\/items?\/(.+)\.json$/))) addTag(m[1] + ':' + m[2], j);
    else if (n.includes('/recipe/')) addRecipe(j);
    else if ((m = n.match(/^assets\/([a-z0-9_]+)\/(?:items|models\/item)\/([a-z0-9_]+)\.json$/))) (items[m[1]] ||= new Set()).add(m[1] + ':' + m[2]);
    else if ((m = n.match(/^assets\/[a-z_]+\/lang\/(en_us|fr_fr)\.json$/))) Object.assign((lang[m[1]] ||= {}), j);
  }
}
// Surcharges KubeJS (recettes et tags du pack)
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
for (const f of walk(KDATA).filter(f => f.endsWith('.json'))) {
  const rel = path.relative(KDATA, f).split(path.sep).join('/'); let m;
  if ((m = rel.match(/^([a-z0-9_.-]+)\/tags\/items?\/(.+)\.json$/))) { try { addTag(m[1] + ':' + m[2], JSON.parse(fs.readFileSync(f, 'utf8'))); } catch { } }
}
const hasLang = (id) => { const [ns, p] = id.split(':'); return !!(lang.en_us?.[`block.${ns}.${p}`] || lang.en_us?.[`item.${ns}.${p}`]); };
/* Modèle + nom ne suffisent pas : certains blocs n'ont pas d'objet enregistré, et un seul
 * identifiant inconnu fait rejeter tout le preset par Pixelmon, ce qui bloque le chargement du
 * monde (« Unknown registry key … minecraft:item »). Relevés dans latest.log : */
const NOT_ITEMS = new Set([
  ...['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple',
    'blue', 'brown', 'green', 'red', 'black'].map(c => 'another_furniture:' + c + '_awning'),
  'pixelmon:fancy_pillar'
]);
const exists = (id) => !NOT_ITEMS.has(id) && items[id.split(':')[0]]?.has(id) && hasLang(id);

/* ============================================================================
 *  2. PRIX DE BASE : prix d'achat des marchands du pack (après apply.mjs), plus quelques
 *     matières que personne ne vend et qu'aucune recette ne produit.
 * ========================================================================== */
const base = {};
for (const f of walk(KDATA).filter(f => /[\\/]npc[\\/]preset[\\/]/.test(f) && f.endsWith('.json'))) {
  if (/[\\/]14_decoration[\\/]/.test(f)) continue; // nos propres prix ne servent pas de base
  const scan = (o) => { if (Array.isArray(o)) return o.forEach(scan); if (!o || typeof o !== 'object') return;
    if ('item' in o && 'buyPrice' in o) { const id = typeof o.item === 'string' ? o.item : o.item.id;
      if (o.buyPrice > 0 && !o.item.components) base[id] = Math.min(base[id] ?? Infinity, o.buyPrice); return; }
    Object.values(o).forEach(scan); };
  scan(JSON.parse(fs.readFileSync(f, 'utf8')));
}
Object.assign(base, {
  'minecraft:ink_sac': 4, 'minecraft:glow_ink_sac': 8, 'minecraft:honeycomb': 4, 'minecraft:water_bucket': 2,
  'minecraft:bucket': 36, 'minecraft:dirt': 1, 'minecraft:clay': 4, 'minecraft:bamboo': 2, 'minecraft:kelp': 2,
  'minecraft:vine': 2, 'minecraft:moss_block': 4, 'minecraft:mud': 2, 'minecraft:pointed_dripstone': 2,
  'minecraft:dripstone_block': 4, 'minecraft:calcite': 2, 'minecraft:tuff': 2, 'minecraft:deepslate': 2,
  'minecraft:cobbled_deepslate': 2, 'minecraft:netherrack': 1, 'minecraft:soul_sand': 2, 'minecraft:soul_soil': 2,
  'minecraft:basalt': 2, 'minecraft:crimson_stem': 80, 'minecraft:warped_stem': 80, 'minecraft:mangrove_log': 80,
  'minecraft:cherry_log': 80, 'minecraft:bamboo_block': 18, 'minecraft:amethyst_shard': 4, 'minecraft:copper_ingot': 8,
  // obtenus à la hache (pas de recette) : prix de la bûche
  ...Object.fromEntries(['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry'].map(w => ['minecraft:stripped_' + w + '_log', 80])),
  'minecraft:stripped_crimson_stem': 80, 'minecraft:stripped_warped_stem': 80,
  'minecraft:sweet_berries': 40, 'minecraft:tall_grass': 2, 'minecraft:short_grass': 1, 'minecraft:chorus_fruit': 8,
  'minecraft:popped_chorus_fruit': 8, 'minecraft:creeper_head': 500, 'minecraft:skeleton_skull': 500,
  'minecraft:zombie_head': 500, 'minecraft:goat_horn': 200,
  // Pixelmon : aluminium (bauxite, comme le fer), bois d'Noigrume (comme une bûche), Poké Ball (Poké Mart)
  'pixelmon:aluminum_ingot': 12, 'pixelmon:raw_bauxite': 12, 'pixelmon:apricorn_log': 80, 'pixelmon:poke_ball': 200,
  'pixelmon:light_ball': 2000, 'pixelmon:pixelmon_sprite': 50
});
for (const [id, p] of Object.entries(base)) if (!Number.isFinite(p)) delete base[id];

/* ============================================================================
 *  3. COÛT DU CRAFT : relaxation sur toutes les recettes (le chemin le moins cher gagne)
 * ========================================================================== */
SAME_AS = {
  ...Object.fromEntries(COLORS().map(c => ['another_furniture:' + c + '_awning', 'another_furniture:' + c + '_curtain'])),
  'pixelmon:shingles_corner1': 'pixelmon:shingles', 'pixelmon:shingles_corner2': 'pixelmon:shingles',
  ...Object.fromEntries(['corner1', 'corner2', 'corner3', 'corner4', 'side1', 'side2', 'side3', 'side4'].map(k => ['pixelmon:poke_sand_' + k, 'pixelmon:poke_sand'])),
  'pixelmon:fancy_pillar': 'minecraft:quartz_pillar', 'pixelmon:cross_tombstone': 'minecraft:stone_bricks',
  'pixelmon:tall_tombstone': 'minecraft:stone_bricks', 'pixelmon:vertical_tombstone': 'minecraft:stone_bricks',
  'pixelmon:braille_block_underscore': 'pixelmon:braille_block_blank', 'pixelmon:sandy_grass': 'pixelmon:poke_sand',
  'minecraft:carved_pumpkin': 'minecraft:pumpkin', 'minecraft:bell': 500, 'minecraft:shroomlight': 20,
  'minecraft:purpur_block': 8, 'minecraft:purpur_pillar': 8, 'minecraft:end_rod': 20
};
const cost = { ...base };
const tagCache = {};
const tagMembers = (t, seen = new Set()) => {
  if (tagCache[t]) return tagCache[t]; if (seen.has(t)) return []; seen.add(t);
  const out = []; for (const v of tags[t] || []) { if (v.startsWith('#')) out.push(...tagMembers(v.slice(1), seen)); else out.push(v); }
  return (tagCache[t] = out);
};
const ingCost = (ing) => {
  if (Array.isArray(ing)) return Math.min(...ing.map(ingCost));
  if (typeof ing === 'string' && !ing.startsWith('#') && !ing.includes(':')) ing = 'minecraft:' + ing;
  if (ing?.type === 'neoforge:components') return ingCost(ing.items);
  if (typeof ing === 'string') return ing.startsWith('#') ? Math.min(...tagMembers(ing.slice(1)).map(i => cost[i] ?? Infinity)) : cost[ing] ?? Infinity;
  if (ing.item) return ingCost(ing.item);
  if (ing.tag) return Math.min(Infinity, ...tagMembers(ing.tag).map(i => cost[i] ?? Infinity));
  return Infinity;
};
for (let pass = 0; pass < 12; pass++) {
  let moved = 0;
  for (const r of recipes) {
    if (r.out in base) continue; // un prix de marchand fait foi
    const c = r.ins.reduce((s, i) => s + ingCost(i), 0) / r.count;
    if (c < (cost[r.out] ?? Infinity)) { cost[r.out] = c; moved++; }
  }
  // béton = poudre de béton + eau (pas de recette de craft)
  for (const col of COLORS()) { const p = cost[`minecraft:${col}_concrete_powder`]; if (p && !(cost[`minecraft:${col}_concrete`] <= p)) { cost[`minecraft:${col}_concrete`] = p; moved++; } }
  // Factory Blocks : tout se taille à l'établi Chipped depuis le bloc « factory »
  for (const id of items.factory_blocks || []) if (cost['factory_blocks:factory'] && !(cost[id] <= cost['factory_blocks:factory'])) { cost[id] = cost['factory_blocks:factory']; moved++; }
  for (const [id, like] of Object.entries(SAME_AS)) { const p = typeof like === 'number' ? like : cost[like]; if (p && !(cost[id] <= p)) { cost[id] = p; moved++; } }
  if (!moved) break;
}
function COLORS() { return ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']; }

/* Objets sans recette (structures, butin) : prix de leur plus proche équivalent, ou fixe. */
var SAME_AS;
/* Couleurs : un meuble coûte le prix de sa variante la moins chère. Les colorants marron (fèves
 * de cacao) et vert (cactus) valent une culture, 160 $, contre ~8 $ pour une fleur : sans ce
 * lissage un canapé marron coûterait 9 fois le rouge. Sans risque : un objet teint ne se revend
 * nulle part et on ne peut pas en retirer le colorant. */
const COLOR_RE = new RegExp('(^|_|:)(' + COLORS().slice().sort((a, b) => b.length - a.length).join('|') + ')(?=_|$)');
const family = (id) => id.replace(COLOR_RE, '$1*');
const colorMin = (id) => {
  const fam = family(id); if (fam === id) return cost[id];
  return Math.min(...COLORS().map(c => cost[fam.replace('*', c)] ?? Infinity));
};
/* Arrondi : jamais sous le coût du craft. 2 $ minimum ; 5 $ près au-delà de 50 $. */
const price = (c) => { const v = Math.max(2, Math.ceil(c)); return v > 50 ? Math.ceil(v / 5) * 5 : v; };

/* ============================================================================
 *  4. LES RAYONS
 * ========================================================================== */
const C = COLORS();
const all = (ns) => [...(items[ns] || [])].sort();
const WOODS = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'bamboo', 'crimson', 'warped'];
const hcWood = new RegExp(`^handcrafted:(${WOODS.join('|')})_`);
const mc = (...a) => a.flat().map(i => 'minecraft:' + i);
const pm = (...a) => a.flat().map(i => 'pixelmon:' + i);
const byColor = (...kinds) => kinds.flatMap(k => C.map(c => k.replace('*', c)));

// Pixelmon : uniquement l'ameublement. Exclus : blocs à fonction (soigneur, PC, machine
// d'échange, distributeur, pension, boîtes aux lettres), minerais, blocs de structures.
const PIXELMON_FURNITURE = pm(
  byColor('*_armchair', '*_chair', '*_couch', '*_cushion_chair', '*_folding_chair', '*_rug', '*_clock',
    '*_umbrella', '*_water_float', '*_cash_register'),
  'bench', 'acacia_bench', 'birch_bench', 'dark_oak_bench', 'jungle_bench', 'spruce_bench', 'froggy_chair',
  'end_table', 'glass_table', 'fridge', 'oven', 'washing_machine', 'fan', 'tv', 'tv2', 'tv3', 'trash_can', 'box',
  'cluttered_box', 'mug_ball', 'mug_base', 'mug_pika', 'street_light', 'window1', 'window2',
  'cross_tombstone', 'tall_tombstone', 'vertical_tombstone'
);
const PIXELMON_BLOCKS = pm(
  'poke_center_sign', 'poke_mart_sign',
  ['blue', 'green', 'pink', 'purple', 'red', 'yellow'].flatMap(c => ['planks', 'slab', 'stairs', 'fence', 'fence_gate', 'door',
    'trapdoor', 'button', 'pressure_plate'].map(k => `${c}_berry_wood_${k}`)),
  'inside_wall', 'inside_wall_moulding', 'outside_wall', 'wooden_flooring', 'fancy_pillar', 'shingles',
  'shingles_corner1', 'shingles_corner2', 'ruins_wall', 'dusty_ruins_wall', 'temple_block', 'temple_brick',
  'temple_brick_slab', 'temple_brick_stairs', 'temple_pillar', 'temple_pillar_fractured', 'temple_slab', 'temple_stairs',
  'poke_sand', 'poke_sand_corner1', 'poke_sand_corner2', 'poke_sand_corner3', 'poke_sand_corner4', 'poke_sand_side1',
  'poke_sand_side2', 'poke_sand_side3', 'poke_sand_side4', 'poke_grass', 'poke_dirt', 'sandy_grass',
  [...'abcdefghijklmnopqrstuvwxyz'].map(l => 'unown_block_' + l), 'unown_block_blank', 'unown_block_exclaim', 'unown_block_question',
  [...'abcdefghijklmnopqrstuvwxyz'].map(l => 'braille_block_' + l), 'braille_block_blank', 'braille_block_comma',
  'braille_block_stop', 'braille_block_underscore'
);
// Minecraft : blocs et objets purement décoratifs, qui ne se revendent nulle part.
const MINECRAFT = mc(
  byColor('*_terracotta', '*_glazed_terracotta', '*_concrete', '*_concrete_powder', '*_stained_glass',
    '*_stained_glass_pane', '*_carpet', '*_bed', '*_banner', '*_candle').concat(byColor('*_wool').filter(i => i !== 'white_wool')),
  'terracotta', 'glass', 'glass_pane', 'tinted_glass', 'candle', 'flower_pot', 'decorated_pot', 'painting', 'item_frame',
  'glow_item_frame', 'armor_stand', 'lantern', 'soul_lantern', 'chain', 'torch', 'soul_torch', 'end_rod', 'campfire',
  'soul_campfire', 'bookshelf', 'chiseled_bookshelf', 'lectern', 'bell', 'sea_lantern', 'shroomlight', 'redstone_lamp',
  'jack_o_lantern', 'carved_pumpkin', 'bricks', 'brick_stairs', 'brick_slab', 'brick_wall', 'mud_bricks', 'stone_bricks',
  'mossy_stone_bricks', 'cracked_stone_bricks', 'chiseled_stone_bricks', 'polished_andesite', 'polished_diorite',
  'polished_granite', 'smooth_stone', 'smooth_quartz', 'quartz_bricks', 'quartz_pillar', 'chiseled_quartz_block',
  'deepslate_bricks', 'deepslate_tiles', 'polished_blackstone_bricks', 'nether_bricks', 'red_nether_bricks',
  'purpur_block', 'purpur_pillar', 'end_stone_bricks', 'prismarine_bricks', 'dark_prismarine', 'calcite', 'tuff_bricks',
  'amethyst_block', 'moss_carpet', 'scaffolding', 'ladder', 'iron_bars', 'oak_sign', 'oak_hanging_sign',
  'white_banner', 'loom', 'cartography_table', 'fletching_table', 'smithing_table', 'barrel', 'composter', 'grindstone',
  'stonecutter', 'cauldron'
);
const SHOPS = {
  '14_decoration/handcrafted_wood': all('handcrafted').filter(i => hcWood.test(i)),
  '14_decoration/handcrafted_decor': all('handcrafted').filter(i => !hcWood.test(i)),
  '14_decoration/another_furniture': all('another_furniture'),
  '14_decoration/factory_blocks': all('factory_blocks'),
  '14_decoration/pixelmon_furniture': PIXELMON_FURNITURE,
  '14_decoration/pixelmon_blocks': PIXELMON_BLOCKS,
  '14_decoration/minecraft_decor': MINECRAFT
};

/* ============================================================================
 *  5. SORTIE
 * ========================================================================== */
const out = { generated: 'node tools/pixelgo-economy/deco.mjs', notItems: [...NOT_ITEMS].sort(), shops: {} };
const missing = [], unpriced = [], seen = new Set();
for (const [shop, list] of Object.entries(SHOPS)) {
  out.shops[shop] = [];
  for (const id of [...new Set(list)]) {
    if (seen.has(id)) continue;
    if (!exists(id)) { missing.push(id); continue; }
    if (!Number.isFinite(cost[id])) { unpriced.push(id); continue; }
    seen.add(id);
    out.shops[shop].push([id, price(colorMin(id))]);
  }
  out.shops[shop].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
}
const file = path.join(ROOT, 'tools', 'pixelgo-economy', 'deco.json');
const txt = JSON.stringify(out, null, 1).replace(/\[\n\s+"([^"]+)",\n\s+(\d+)\n\s+\]/g, '["$1", $2]') + '\n';
const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
if (prev !== txt) fs.writeFileSync(file, txt);
for (const [s, l] of Object.entries(out.shops)) {
  const ps = l.map(x => x[1]);
  console.log(`  ${s.padEnd(34)} ${String(l.length).padStart(4)} objets   ${Math.min(...ps)} – ${Math.max(...ps)} $`);
}
if (missing.length) console.log(`absents du jeu (ignorés) : ${missing.length}\n  ${missing.join(' ')}`);
if (unpriced.length) console.log(`SANS PRIX (recette introuvable) : ${unpriced.length}\n  ${unpriced.join(' ')}`);
console.log(prev === txt ? 'deco.json inchangé' : 'deco.json écrit');
