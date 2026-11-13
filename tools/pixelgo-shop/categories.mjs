/**
 * PixelGO — To the Sky : marchands par catégorie, reconstruits depuis zéro.
 *
 * Source des prix : l'export « Verzion's Economy Price Guide » (minecraft-economy-price-guide.net)
 * posé à la racine de l'instance (`prices_1_21_*.json`, le plus récent). Seuls `unit_buy` et
 * `unit_sell` sont repris (prix à l'unité) ; `stack_buy` / `stack_sell` sont ignorés.
 * Les prix de Pixelmon sont des `double` (ShopItem) : ils sont repris tels quels, sans arrondi.
 *
 * L'export ne porte pas les catégories, mais il est trié par catégorie (ordre alphabétique des
 * catégories du site, items en ordre « curated »). Chaque catégorie est repérée par son premier
 * item et son nombre d'items (vérifié : l'outil ÉCHOUE si l'export ne colle plus).
 *
 * Écartés automatiquement :
 *   - les items absents de Minecraft 1.21.1 (cuivre 1.21.9, pale oak, lances, harnais…) ;
 *   - les livres enchantés : un livre enchanté dans une boutique Pixelmon déconnecte le joueur
 *     (ShopOpenPacket encode sans registres du monde).
 *
 * Ajoute les objets des anciens shops au prix calculé par orphans.mjs (orphans-prices.json, §3).
 *
 * Remplace TOUT le dossier `kubejs/data/pixelgo/pixelmon/npc/preset/shopkeeper` et les noms
 * `pixelgo.npc.*` / `shop.pixelgo_shop.shopkeeper.NN_*` des fichiers de langue.
 * Idempotent.  Usage :  node tools/pixelgo-shop/categories.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const OUT = path.join(ROOT, 'kubejs', 'data', 'pixelgo', 'pixelmon', 'npc', 'preset', 'shopkeeper');
// items de Minecraft 1.21.1 = noms des fichiers assets/minecraft/models/item/ du jar vanilla
const MC_ITEMS = path.join(ROOT, 'tools', 'pixelgo-shop', 'mc-1.21.1-items.txt');
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];

/* ============================================================================
 *  1. LES CATÉGORIES — ordre d'affichage du site (= ordre des dossiers, que la Boutique
 *  Portable trie par chemin). `first` / `count` : repère dans l'export.
 *  Utility n'est pas dans l'export (0 item) : son marchand ne reçoit que des objets des anciens shops (§3).
 * ========================================================================== */
const CATEGORIES = [
  { dir: '01_ores', en: 'Ores', fr: 'Minerais', color: '#55FFFF', first: 'amethyst_cluster', count: 48,
    hi: ['Raw ores, ingots, gems and their blocks.', 'Minerais bruts, lingots, gemmes et leurs blocs.'], bye: ['Mind the lava.', 'Attention à la lave.'] },
  { dir: '02_stone', en: 'Stone', fr: 'Pierre', color: '#AAAAAA', first: 'calcite', count: 83,
    hi: ['Stone, deepslate, tuff and every cut of them.', 'Pierre, ardoise, tuf et toutes leurs tailles.'], bye: ['Build it solid.', 'Construisez solide.'] },
  { dir: '03_copper', en: 'Copper', fr: 'Cuivre', color: '#E07A45', first: 'copper_block', count: 72,
    hi: ['Copper at every stage of weathering, waxed or not.', 'Du cuivre à chaque stade d\'oxydation, ciré ou non.'], bye: ['Keep it shiny.', 'Gardez-le brillant.'] },
  { dir: '04_earth', en: 'Earth', fr: 'Terre', color: '#B5835A', first: 'coarse_dirt', count: 13,
    hi: ['Dirt, grass, gravel and mud.', 'Terre, herbe, gravier et boue.'], bye: ['Grow something.', 'Faites pousser quelque chose.'] },
  { dir: '05_sand', en: 'Sand', fr: 'Sable', color: '#F0E68C', first: 'chiseled_red_sandstone', count: 22,
    hi: ['Sand and sandstone, yellow and red.', 'Sable et grès, jaunes et rouges.'], bye: ['Mind the gravity.', 'Gare à la gravité.'] },
  { dir: '06_wood', en: 'Wood', fr: 'Bois', color: '#C8964B', first: 'acacia_planks', count: 85,
    hi: ['Logs, planks, slabs and stairs of every tree.', 'Bûches, planches, dalles et escaliers de chaque arbre.'], bye: ['Happy building.', 'Bonne construction !'] },
  { dir: '07_drops', en: 'Drops', fr: 'Butin', color: '#FF5555', first: 'armadillo_scute', count: 41,
    hi: ['Bones, pearls, rods and skulls — no fighting required.', 'Os, perles, bâtons et crânes, sans combattre.'], bye: ['Stay safe at night.', 'Prudence la nuit.'] },
  { dir: '08_food', en: 'Food', fr: 'Nourriture', color: '#FFAA00', first: 'beetroot', count: 49,
    hi: ['Crops, meat, fish and meals.', 'Récoltes, viande, poisson et plats.'], bye: ['Enjoy your meal.', 'Bon appétit !'] },
  null, // 09_utility — pas dans l'export
  { dir: '10_transport', en: 'Transport', fr: 'Transport', color: '#5555FF', first: 'elytra', count: 47,
    hi: ['Boats, minecarts, rails and saddles.', 'Bateaux, wagonnets, rails et selles.'], bye: ['Safe travels.', 'Bon voyage !'] },
  { dir: '11_light', en: 'Light', fr: 'Lumière', color: '#FFFF55', first: 'candle', count: 35,
    hi: ['Torches, lanterns, lamps and froglights.', 'Torches, lanternes, lampes et grenoblocs.'], bye: ['Keep the dark away.', 'Chassez l\'obscurité.'] },
  { dir: '12_plants', en: 'Plants', fr: 'Plantes', color: '#55FF55', first: 'bamboo', count: 91,
    hi: ['Flowers, saplings, leaves and seeds.', 'Fleurs, pousses, feuilles et graines.'], bye: ['Plant a few.', 'Plantez-en quelques-unes.'] },
  { dir: '13_redstone', en: 'Redstone', fr: 'Redstone', color: '#FF4040', first: 'daylight_detector', count: 85,
    hi: ['Pistons, doors, buttons and all the circuitry.', 'Pistons, portes, boutons et toute la mécanique.'], bye: ['May your circuits never short.', 'Que vos circuits tiennent bon.'] },
  { dir: '14_tools', en: 'Tools', fr: 'Outils', color: '#A0A0FF', first: 'fishing_rod', count: 32,
    hi: ['Pickaxes, axes, shovels and hoes.', 'Pioches, haches, pelles et houes.'], bye: ['Work well.', 'Bon travail.'] },
  { dir: '15_weapons', en: 'Weapons', fr: 'Armes', color: '#FF7F50', first: 'arrow', count: 20,
    hi: ['Swords, bows, arrows and more.', 'Épées, arcs, flèches et plus.'], bye: ['Fight well.', 'Bon combat.'] },
  { dir: '16_armor', en: 'Armor', fr: 'Armures', color: '#00AAAA', first: 'armor_stand', count: 61,
    hi: ['Armor for you and your horse, and trim templates.', 'Armures pour vous et votre cheval, et modèles d\'ornement.'], bye: ['Stay protected.', 'Restez protégé.'] },
  { dir: '17_enchantments', en: 'Enchantments', fr: 'Enchantements', color: '#AA00AA', first: 'enchanted_book_aqua_affinity_1', count: 121, skip: true },
  { dir: '18_ocean', en: 'Ocean', fr: 'Océan', color: '#3FA9F5', first: 'conduit', count: 50,
    hi: ['Coral, prismarine, kelp and sponges.', 'Corail, prismarine, varech et éponges.'], bye: ['Mind the Guardians.', 'Gare aux Gardiens.'] },
  { dir: '19_nether', en: 'Nether', fr: 'Nether', color: '#C0392B', first: 'dried_ghast', count: 48,
    hi: ['Netherrack, blackstone, quartz and fungi.', 'Netherrack, roche noire, quartz et champignons.'], bye: ['Do not fall in the lava.', 'Ne tombez pas dans la lave.'] },
  { dir: '20_end', en: 'End', fr: 'End', color: '#E0A0FF', first: 'dragon_egg', count: 16,
    hi: ['End stone, purpur and shulker goods.', 'Pierre de l\'End, purpur et objets de shulker.'], bye: ['Watch the void.', 'Attention au vide.'] },
  { dir: '21_deep_dark', en: 'Deep Dark', fr: 'Abîme', color: '#2CB6B6', first: 'calibrated_sculk_sensor', count: 7,
    hi: ['Sculk and echo shards. Quietly.', 'Sculk et éclats d\'écho. En silence.'], bye: ['Do not wake the Warden.', 'Ne réveillez pas le Warden.'] },
  { dir: '22_ice', en: 'Ice', fr: 'Glace', color: '#A0E0FF', first: 'blue_ice', count: 6,
    hi: ['Ice, packed ice, blue ice and snow.', 'Glace, glace compactée, glace bleue et neige.'], bye: ['Stay cool.', 'Restez au frais.'] },
  { dir: '23_discs', en: 'Discs', fr: 'Disques', color: '#FF55FF', first: 'music_disc_11', count: 22,
    hi: ['Every music disc for your jukebox.', 'Tous les disques pour votre juke-box.'], bye: ['Enjoy the music.', 'Bonne écoute !'] }
].filter(Boolean);

/* ============================================================================
 *  2. LECTURE DE L'EXPORT ET DÉCOUPAGE
 * ========================================================================== */
const exportFile = fs.readdirSync(ROOT).filter(f => /^prices_1_21_.*\.json$/.test(f)).sort().pop();
if (!exportFile) { console.error('Aucun prices_1_21_*.json à la racine.'); process.exit(1); }
const prices = JSON.parse(fs.readFileSync(path.join(ROOT, exportFile), 'utf8'));
delete prices._export_metadata;
const keys = Object.keys(prices);
const exists = new Set(fs.readFileSync(MC_ITEMS, 'utf8').split(/\r?\n/).filter(Boolean));

const bad = [];
const ranges = CATEGORIES.map(c => ({ c, start: keys.indexOf(c.first) })).sort((a, b) => a.start - b.start);
ranges.forEach((r, i) => {
  const end = i + 1 < ranges.length ? ranges[i + 1].start : keys.length;
  r.c.ids = keys.slice(r.start, end);
  if (r.start < 0 || r.c.ids.length !== r.c.count) bad.push(`${r.c.en} : ${r.start < 0 ? 'repère introuvable' : r.c.ids.length + ' items au lieu de ' + r.c.count}`);
});
if (bad.length) { console.error('L\'export ne colle plus aux catégories :\n  ' + bad.join('\n  ')); process.exit(1); }

const shopName = (c) => c.dir.replace(/^\d+_/, '');

/* ============================================================================
 *  3. LES OBJETS DES ANCIENS SHOPS — prix calculés par orphans.mjs (coût de fabrication au
 *  barème du guide, ou ancien prix × facteur Pixelmon), revente 30 %. Les catégories du guide
 *  reçoivent les objets vanilla qui leur reviennent ; le reste va dans des rayons dédiés, après.
 *  PixelGO Items (pixelgoitems:*) : jamais en boutique, ils viennent des recettes et des quêtes.
 * ========================================================================== */
const ORPHANS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'pixelgo-shop', 'orphans-prices.json'), 'utf8')).items;
const T = (en, fr, hi, bye) => ({ en, fr, hi, bye });
const EXTRA = [ // dir, file, catégorie (en, fr), couleur, marchand, ordre ('keep' = ordre d'origine, sinon prix croissant)
  { dir: '09_utility', file: 'utility', cat: ['Utility', 'Utilitaires'], color: '#C9A227',
    ...T('Utility', 'Utilitaires', ['Workstations, storage, anvils and enchanting.', 'Établis, rangement, enclumes et enchantement.'], ['Put it to good use.', 'Faites-en bon usage.']) },
  { dir: '24_brick', file: 'brick', cat: ['Brick', 'Briques'], color: '#C0604A',
    ...T('Brick', 'Briques', ['Bricks and Nether bricks, cut every way.', 'Briques et briques du Nether, sous toutes leurs formes.'], ['Build it solid.', 'Construisez solide.']) },
  { dir: '25_dyed', file: 'dyed', cat: ['Dyed', 'Teintures'], color: '#FF77CC',
    ...T('Dyed', 'Teintures', ['Concrete, wool, glass and terracotta in every color.', 'Béton, laine, verre et terre cuite de toutes les couleurs.'], ['Paint the island.', 'Colorez votre île !']) },
  { dir: '26_island', file: 'island', cat: ['Island', 'Île'], color: '#FFAA00',
    ...T('Island', 'Île', ['Everything a new island needs to grow.', 'Tout ce qu\'il faut pour faire grandir une île.'], ['Build well out there.', 'Bonne construction !']) },
  { dir: '28_training', file: 'stats_and_levels', cat: ['Training', 'Entraînement'], color: '#FF55FF',
    ...T('Stats & Levels', 'Stats et niveaux', ['Vitamins, power items and experience for your team.', 'Vitamines, objets Puissance et expérience pour votre équipe.'], ['Train hard.', 'Entraînez-vous bien.']) },
  { dir: '28_training', file: 'natures_and_abilities', cat: ['Training', 'Entraînement'], color: '#FF55FF',
    ...T('Natures & Abilities', 'Natures et talents', ['Mints to change a nature, capsules to change a talent.', 'Des menthes pour la nature, des capsules pour le talent.'], ['Find the right fit.', 'Trouvez la bonne combinaison.']) },
  { dir: '28_training', file: 'tms_gen7', cat: ['Training', 'Entraînement'], color: '#FF55FF', keep: true,
    ...T('TMs (Gen 7)', 'CT (7e génération)', ['Every Alola TM. They never break.', 'Toutes les CT d\'Alola. Elles ne s\'usent jamais.'], ['Teach well.', 'Bon apprentissage.']) },
  { dir: '28_training', file: 'trs_gen8', cat: ['Training', 'Entraînement'], color: '#FF55FF', keep: true,
    ...T('TRs (Gen 8)', 'DT (8e génération)', ['Galar TRs: one use each, stronger moves.', 'DT de Galar : un seul usage, des capacités plus fortes.'], ['Teach well.', 'Bon apprentissage.']) },
  { dir: '29_battle', file: 'held_items', cat: ['Battle', 'Combat'], color: '#5555FF',
    ...T('Held Items', 'Objets tenus', ['Everything a competitive team holds.', 'Tout ce que tient une équipe de compétition.'], ['Win your next fight.', 'Gagnez votre prochain combat.']) },
  { dir: '30_evolution', file: 'evolution', cat: ['Evolution', 'Évolution'], color: '#FFFF55',
    ...T('Evolution', 'Évolution', ['Stones and trade items for every evolution.', 'Pierres et objets d\'échange pour chaque évolution.'], ['Watch them grow.', 'Regardez-les grandir.']) },
  { dir: '31_berries', file: 'berries', cat: ['Berries', 'Baies'], color: '#FF7F50', keep: true,
    ...T('Berries', 'Baies', ['Every berry, bought and sold.', 'Toutes les baies, à l\'achat comme à la vente.'], ['Plant a few.', 'Plantez-en quelques-unes.']) },
  { dir: '33_minions', file: 'enchanted_goods', cat: ['Minions', 'Minions'], color: '#00AA00',
    ...T('Enchanted Goods', 'Items enchantés', ['Everything a minion compacts, bought and sold.', 'Tout ce que compacte un minion, à l\'achat comme à la vente.'], ['Keep them running.', 'Faites-les tourner.']) },
  { dir: '33_minions', file: 'minion_gear', cat: ['Minions', 'Minions'], color: '#00AA00',
    ...T('Minion Gear', 'Équipement de minion', ['Compactors, smelters and rare materials.', 'Compacteurs, fours et matériaux rares.'], ['Come back with a full bag.', 'Revenez les poches pleines.']) },
  { dir: '33_minions', file: 'minion_tools', cat: ['Minions', 'Minions'], color: '#00AA00',
    ...T('Minion Tools', 'Outils de minion', ['Farming tools are no longer crafted. Pick one here.', 'Les outils agricoles ne se fabriquent plus. Choisissez ici.'], ['Good harvests.', 'Bonnes récoltes.']) },
  { dir: '34_endgame', file: 'endgame', cat: ['Endgame', 'Fin de partie'], color: '#AA00AA',
    ...T('Endgame', 'Fin de partie', ['For those who have built everything else.', 'Pour ceux qui ont déjà tout construit.'], ['There is always a next goal.', 'Il y a toujours un objectif suivant.']) },
  { dir: '35_decoration', file: 'handcrafted_wood', cat: ['Decoration', 'Décoration'], color: '#D2A679',
    ...T('Wooden Furniture', 'Meubles en bois', ['Chairs, tables, beds and cupboards in every wood.', 'Chaises, tables, lits et placards dans tous les bois.'], ['Make yourself at home.', 'Faites comme chez vous.']) },
  { dir: '35_decoration', file: 'handcrafted_decor', cat: ['Decoration', 'Décoration'], color: '#D2A679',
    ...T('Home Decor', 'Déco de la maison', ['Cushions, sheets, pots, crockery, trims and trophies.', 'Coussins, draps, pots, vaisselle, moulures et trophées.'], ['It is the details that count.', 'Ce sont les détails qui comptent.']) },
  { dir: '35_decoration', file: 'another_furniture', cat: ['Decoration', 'Décoration'], color: '#D2A679',
    ...T('Cozy Furniture', 'Mobilier douillet', ['Sofas, stools, lamps, curtains and flower boxes.', 'Canapés, tabourets, lampes, rideaux et jardinières.'], ['Enjoy the comfort.', 'Profitez du confort.']) },
  { dir: '35_decoration', file: 'factory_blocks', cat: ['Decoration', 'Décoration'], color: '#D2A679',
    ...T('Industrial Blocks', 'Blocs industriels', ['Plates, pipes, vents and fans for a factory look.', 'Plaques, tuyaux, grilles et ventilateurs pour un style usine.'], ['Keep it running.', 'Que ça tourne !']) },
  { dir: '35_decoration', file: 'pixelmon_furniture', cat: ['Decoration', 'Décoration'], color: '#D2A679',
    ...T('Pokémon Furniture', 'Mobilier Pokémon', ['Couches, rugs, clocks, TVs and more, Pokémon style.', 'Canapés, tapis, horloges, télés et plus, style Pokémon.'], ['A home fit for a Champion.', 'Une maison digne d\'un Maître.']) },
  { dir: '35_decoration', file: 'pixelmon_blocks', cat: ['Decoration', 'Décoration'], color: '#D2A679',
    ...T('Pokémon Blocks', 'Blocs Pokémon', ['Berry wood, temple stone, Unown letters and Poké Center signs.', 'Bois de baie, pierre de temple, lettres Zarbi et enseignes.'], ['Build something legendary.', 'Construisez quelque chose de légendaire.']) }
];
// objets vanilla des anciens rayons « Ferme / Matériaux / Équipement » : leur catégorie du guide
const VANILLA = {
  green_dye: '25_dyed/dyed', white_wool: '25_dyed/dyed', stick: '06_wood/wood', flint: '04_earth/earth',
  rabbit_foot: '07_drops/drops', totem_of_undying: '07_drops/drops', charcoal: '01_ores/ores', tipped_arrow: '15_weapons/weapons',
  glass_bottle: '09_utility/utility', lava_bucket: '09_utility/utility', beacon: '09_utility/utility', brewing_stand: '09_utility/utility',
  hopper: '09_utility/utility', enchanting_table: '09_utility/utility', experience_bottle: '09_utility/utility', anvil: '09_utility/utility',
  name_tag: '09_utility/utility'
};
const COLOR_RE = /^(white|orange|magenta|light_blue|yellow|lime|pink|gray|light_gray|cyan|purple|blue|brown|green|red|black)_/;
/* Retirés à la demande (2026-11-08) : capsules d'argent et d'or, vitamines, et toutes les Poké Balls
 * (plus de shop Balls : les balls se fabriquent, le loot donne des couvercles, voir pixelgo-loot/lids.mjs),
 * puis les Mystery Bags et les boosters TCG (plus de shop « Sacs mystère et cartes »). */
const REMOVED = new Set([...['silver_bottle_cap', 'gold_bottle_cap', 'hp_up', 'protein', 'iron', 'calcium', 'zinc', 'carbos'].map(i => 'pixelmon:' + i),
  'treasurebags:treasure_bag', 'tcg:pack', 'inventorypets:pet_meta']);
const placeOf = (o) => {
  if (/^pixelgoitems:/.test(o.id) || REMOVED.has(o.id) || o.id === 'pixelmon:poke_ball') return null;
  const [ns, p] = o.id.split(':');
  if (ns === 'minecraft' && VANILLA[p]) return VANILLA[p];
  if (o.shop === '14_decoration/minecraft_decor') {
    if (/(^|_)bricks?(_|$)|nether_bricks/.test(p)) return '24_brick/brick';
    if (COLOR_RE.test(p) || p === 'terracotta') return '25_dyed/dyed';
    return '09_utility/utility';
  }
  const [oldCat, oldShop] = o.shop.split('/');
  const bySame = EXTRA.find(s => s.file === oldShop);
  if (bySame) return bySame.dir + '/' + bySame.file;
  if (oldShop === 'general_store' || o.id === 'excompressum:chicken_stick') return '26_island/island';
  if (oldShop === 'minion_buyer') return '33_minions/enchanted_goods';
  if (oldShop === 'cosmetics') return null; // seulement des PixelGO Items
  throw new Error('Objet sans rayon : ' + o.id + ' (' + o.shop + ')');
};

/* ============================================================================
 *  4. GABARIT DU MARCHAND — même dialogue / apparence que l'ancien shops.mjs
 * ========================================================================== */
const NAMES = ['Yuki', 'Basile', 'Nadia', 'Tom', 'Hrann', 'Zinnia', 'Pinea', 'Bargas', 'Lou', 'Maëlle', 'Sacha', 'Inès'];
const SKINS = ['shopman', 'shopman2', 'shopman3', 'shopman4', 'shopman5', 'shoplady', 'shoplady2', 'shoplady3',
  'shoplady4', 'shoplady5', 'shopgirl', 'shopsecondman'];
const npcKey = (s) => 'pixelgo.npc.' + s.file;
const preset = (s, items, sellable) => ({
  interactions: {
    values: [{
      interactions: [
        { event: 'pixelmon:right_click', conditions: { type: 'pixelmon:true' },
          results: { value: [{ title: npcKey(s), message: npcKey(s) + '.greeting', type: 'pixelmon:open_dialogue' }], type: 'pixelmon:constant' } },
        { event: 'pixelmon:close_dialogue', conditions: { type: 'pixelmon:true' },
          results: { value: [{ items, sellable, type: 'pixelmon:open_shop' }], type: 'pixelmon:constant' } },
        { event: 'pixelmon:close_shop', conditions: { type: 'pixelmon:true' },
          results: { value: [{ title: npcKey(s), message: npcKey(s) + '.goodbye', fire_close_event: false, type: 'pixelmon:open_dialogue' }], type: 'pixelmon:constant' } }
      ]
    }],
    type: 'pixelmon:uniformly_random'
  },
  properties: {
    value: {
      health: 20, eyeHeight: 1, dimensions: { width: 1, height: 2 },
      title: { translate: npcKey(s), color: s.color, bold: true, italic: false, underlined: false },
      pushable: false, child: false, invulnerable: true, immovable: true, nameplate: true
    },
    type: 'pixelmon:constant'
  },
  party: { value: { type: 'pixelmon:empty' }, type: 'pixelmon:constant' },
  names: { values: NAMES, type: 'pixelmon:uniformly_random' },
  models: {
    values: SKINS.map(k => ({ slim: false, texture: { resource: { resource: `pixelmon:textures/steve/${k}.png`, fallback: `pixelmon:textures/steve/${k}.png` }, type: 'pixelmon:fallback' }, type: 'pixelmon:player' })),
    type: 'pixelmon:uniformly_random'
  },
  ai_provider: { type: 'pixelmon:constant', value: { type: 'pixelmon:stand_and_look', look_distance: 5, swim: false } }
});

/* ============================================================================
 *  5. RÉPARTITION ET ÉCRITURE — le dossier shopkeeper est entièrement remplacé
 * ========================================================================== */
const skipped = [];
const SHOPS = [];
for (const c of CATEGORIES) {
  if (c.skip) continue;
  const missing = c.ids.filter(id => !exists.has(id));
  if (missing.length) skipped.push(`${c.en} (${missing.length}) : ${missing.join(', ')}`);
  SHOPS.push({ ...c, file: shopName(c), cat: [c.en, c.fr], guide: true, missing: missing.length,
    items: c.ids.filter(id => exists.has(id)).map(id => ({ item: { id: 'minecraft:' + id, count: 1 }, buyPrice: prices[id].unit_buy, sellPrice: prices[id].unit_sell })) });
}
for (const s of EXTRA) SHOPS.push({ ...s, items: [] });
const byKey = new Map(SHOPS.map(s => [s.dir + '/' + s.file, s]));
let excluded = 0;
const added = new Map();
ORPHANS.forEach((o, i) => {
  const where = placeOf(o);
  if (!where || o.buy == null || !o.exists) { excluded++; return; }
  const s = byKey.get(where);
  const item = { id: o.id, count: 1 }; if (o.components) item.components = o.components;
  (added.get(s) || added.set(s, []).get(s)).push({ e: { item, buyPrice: o.buy, sellPrice: o.sell }, i });
});
/* Prix fixés à la main (pas des anciens shops). Revente = 30 % de la valeur du CRAFT, pas du prix
 * de vente : sinon crafter puis revendre rapporterait plus que revendre les ingrédients. */
const FIXED = [
  // (vide) La pierre philosophale y était vendue 3 M$ jusqu'au 2026-11-09 ; retirée à la demande :
  // elle se crafte désormais avec les objets du chapitre Creative Items (30_tech.js).
];
FIXED.forEach((x, i) => { const s = byKey.get(x.shop);
  (added.get(s) || added.set(s, []).get(s)).push({ e: { item: { id: x.id, count: 1 }, buyPrice: x.buy, sellPrice: x.sell }, i: ORPHANS.length + i }); });
for (const [s, list] of added) {
  if (!s.keep) list.sort((a, b) => a.e.buyPrice - b.e.buyPrice || a.i - b.i);
  s.items.push(...list.map(x => x.e));
}
// une catégorie à un seul marchand porte le nom de la catégorie ; sinon « Catégorie · Marchand »
const perDir = {}; for (const s of SHOPS) perDir[s.dir] = (perDir[s.dir] || 0) + 1;
const title = (s, L) => perDir[s.dir] > 1 ? `${s.cat[L]} · ${L ? s.fr : s.en}` : (L ? s.fr : s.en);

const written = new Set();
const changed = [];
const report = [];
for (const s of SHOPS) {
  if (!s.items.length) { report.push(`  ${title(s, 0)}`.padEnd(40) + 'vide, pas de marchand'); continue; }
  const sellable = s.items.some(i => i.sellPrice > 0);
  const file = path.join(OUT, s.dir, s.file + '.json');
  const txt = JSON.stringify(preset(s, s.items, sellable), null, 2) + '\n';
  written.add(path.resolve(file));
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== txt) { changed.push(path.relative(ROOT, file)); if (!DRY) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, txt); } }
  const extra = added.get(s)?.length || 0;
  report.push(`  ${title(s, 0)}`.padEnd(40) + `${s.items.length} article(s)` + (s.guide && extra ? ` dont ${extra} des anciens shops` : '') + (s.missing ? ` (${s.missing} absents de 1.21.1)` : ''));
}
for (const f of walk(OUT)) if (!written.has(path.resolve(f))) { changed.push('supprimé ' + path.relative(ROOT, f)); if (!DRY) fs.unlinkSync(f); }
if (!DRY) for (const d of fs.readdirSync(OUT)) { const p = path.join(OUT, d); if (fs.statSync(p).isDirectory() && !fs.readdirSync(p).length) fs.rmdirSync(p); }

/* ============================================================================
 *  6. NOMS — PNJ (dialogues) et Boutique Portable, en anglais et en français.
 *  Les noms des marchands de Pixelmon (shop.pixelgo_shop.shopkeeper.pokemart… ) sont gardés.
 * ========================================================================== */
const lang = { en: {}, fr: {} };
for (const s of SHOPS.filter(s => s.items.length)) {
  const k = npcKey(s);
  lang.en[k] = title(s, 0); lang.fr[k] = title(s, 1);
  lang.en[k + '.greeting'] = s.hi[0]; lang.fr[k + '.greeting'] = s.hi[1];
  lang.en[k + '.goodbye'] = s.bye[0]; lang.fr[k + '.goodbye'] = s.bye[1];
  const pk = 'shop.pixelgo_shop.shopkeeper.' + s.dir + '.' + s.file;
  lang.en[pk] = title(s, 0); lang.fr[pk] = title(s, 1);
}
const LANG_DIR = path.join(ROOT, 'kubejs', 'assets', 'kubejs', 'lang');
for (const [code, file] of [['en', 'en_us.json'], ['fr', 'fr_fr.json']]) {
  const f = path.join(LANG_DIR, file);
  const raw = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '{}';
  const next = {};
  for (const [k, v] of Object.entries(JSON.parse(raw))) if (!/^(pixelgo\.npc\.|shop\.pixelgo_shop\.shopkeeper\.\d\d_)/.test(k)) next[k] = v;
  Object.assign(next, lang[code]);
  let txt = JSON.stringify(next, null, 2) + '\n';
  if (raw.includes('\r\n')) txt = txt.replace(/\n/g, '\r\n');
  if (raw !== txt) { changed.push(path.relative(ROOT, f)); if (!DRY) fs.writeFileSync(f, txt); }
}

console.log(`Export : ${exportFile}`);
console.log(report.join('\n'));
if (skipped.length) console.log('Absents de Minecraft 1.21.1, écartés :\n  ' + skipped.join('\n  '));
console.log(`${changed.length} changement(s) ${DRY ? 'à faire' : 'faits'}`);
for (const ch of changed) console.log('  ' + ch);
