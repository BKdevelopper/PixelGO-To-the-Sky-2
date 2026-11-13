/**
 * PixelGO — To the Sky : catalogue des marchands (shopkeepers), trié par catégorie.
 *
 * Rassemble TOUS les articles des marchands propres au pack (namespace `pixelgo` et l'ancien
 * dossier `pixelmon:shopkeeper/pixelgo/`), les répartit en 13 catégories selon les règles
 * ci-dessous, puis régénère un preset par marchand au même gabarit : même dialogue, même
 * nom de catégorie en couleur au-dessus de la tête, même style de nom dans la Boutique
 * Portable (« Catégorie · Marchand »), en anglais et en français.
 *
 * Les marchands de Pixelmon (Poké Mart, Pension, Maniaque des reliques) ne sont PAS déplacés :
 * les structures du jar (villages, arènes, tours) les appellent par leur chemin. Ils sont
 * seulement renommés dans la Boutique Portable, et leurs doublons y sont masqués.
 *
 * Idempotent : relancer l'outil relit les presets qu'il a lui-même écrits et reproduit
 * exactement les mêmes fichiers.
 *
 * Usage :  node tools/pixelgo-economy/shops.mjs [--dry]
 * À lancer APRÈS apply.mjs (qui fixe les prix) : cet outil ne touche à aucun prix.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const KDATA = path.join(ROOT, 'kubejs', 'data');
const OUT = path.join(KDATA, 'pixelgo', 'pixelmon', 'npc', 'preset', 'shopkeeper');
const OLD_PIXELMON = path.join(KDATA, 'pixelmon', 'pixelmon', 'npc', 'preset', 'shopkeeper', 'pixelgo');
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];

/* ============================================================================
 *  1. LES CATÉGORIES — l'ordre des dossiers (01_, 02_…) est l'ordre d'affichage dans la
 *  Boutique Portable, qui trie par chemin. Couleur = nom au-dessus de la tête du PNJ.
 * ========================================================================== */
const CATEGORIES = {
  '01_island': { en: 'Island', fr: 'Île', color: '#FFAA00' },
  '02_farm': { en: 'Farm', fr: 'Ferme', color: '#55FF55' },
  '03_materials': { en: 'Materials', fr: 'Matériaux', color: '#AAAAAA' },
  '04_equipment': { en: 'Equipment', fr: 'Équipement', color: '#55FFFF' },
  '05_poke_balls': { en: 'Poké Balls', fr: 'Poké Balls', color: '#FF5555' },
  '06_training': { en: 'Training', fr: 'Entraînement', color: '#FF55FF' },
  '07_battle': { en: 'Battle', fr: 'Combat', color: '#5555FF' },
  '08_evolution': { en: 'Evolution', fr: 'Évolution', color: '#FFFF55' },
  '09_cosmetics': { en: 'Cosmetics', fr: 'Cosmétiques', color: '#E0A0FF' },
  '10_berries': { en: 'Berries', fr: 'Baies', color: '#FF7F50' },
  '11_rewards': { en: 'Rewards', fr: 'Récompenses', color: '#FFD700' },
  '12_minions': { en: 'Minions', fr: 'Minions', color: '#00AA00' },
  '13_endgame': { en: 'Endgame', fr: 'Fin de partie', color: '#AA00AA' },
  '14_decoration': { en: 'Decoration', fr: 'Décoration', color: '#D2A679' }
};

/* ============================================================================
 *  2. LES MARCHANDS — nom, accueil, au revoir (EN / FR), et tri des articles.
 *     sort: 'price' = par prix croissant ; 'keep' = ordre d'origine (CT/DT numérotées)
 * ========================================================================== */
const SHOPS = {
  '01_island/general_store': { en: 'General Store', fr: 'Bazar',
    hi: ['Everything a new island needs to grow.', 'Tout ce qu\'il faut pour faire grandir une île.'],
    bye: ['Build well out there.', 'Bonne construction !'] },
  '02_farm/farm_market': { en: 'Farm Market', fr: 'Marché fermier',
    hi: ['Crops in, PokéDollars out. This is where a farm pays.', 'Des récoltes contre des PokéDollars : c\'est ici que la ferme paie.'],
    bye: ['Keep those fields green.', 'Que vos champs restent verts !'] },
  '02_farm/butcher': { en: 'Butcher', fr: 'Boucherie',
    hi: ['Meat, fish and eggs, fresh or cooked.', 'Viande, poisson et œufs, crus ou cuits.'],
    bye: ['Enjoy your meal.', 'Bon appétit !'] },
  '03_materials/building_blocks': { en: 'Building Blocks', fr: 'Blocs de construction',
    hi: ['Stone, wood, sand and ice by the stack.', 'Pierre, bois, sable et glace à la pile.'],
    bye: ['Happy building.', 'Bonne construction !'] },
  '03_materials/mob_drops': { en: 'Mob Drops', fr: 'Butin de monstres',
    hi: ['Bones, pearls, rods and shells — no fighting required.', 'Os, perles, bâtons et carapaces, sans combattre.'],
    bye: ['Stay safe at night.', 'Prudence la nuit.'] },
  '03_materials/ores_and_metals': { en: 'Ores & Metals', fr: 'Minerais et métaux',
    hi: ['Ingots, gems and blocks for every recipe.', 'Lingots, gemmes et blocs pour toutes vos recettes.'],
    bye: ['Mind the lava.', 'Attention à la lave.'] },
  '04_equipment/utilities': { en: 'Redstone & Utilities', fr: 'Redstone et utilitaires',
    hi: ['Pistons, hoppers, anvils and all the machinery.', 'Pistons, entonnoirs, enclumes et toute la mécanique.'],
    bye: ['May your circuits never short.', 'Que vos circuits tiennent bon.'] },
  '04_equipment/rare_goods': { en: 'Rare Goods', fr: 'Objets rares',
    hi: ['Things you will not find on an island. At a price.', 'Ce qu\'on ne trouve pas sur une île. À un certain prix.'],
    bye: ['Treasure them.', 'Prenez-en soin.'] },
  '05_poke_balls/special_balls': { en: 'Special Balls', fr: 'Balls spéciales',
    hi: ['Balls that do more than catch: levels, stats, skins, shinies.', 'Des balls qui font plus que capturer : niveaux, stats, skins, chromatiques.'],
    bye: ['Good luck out there.', 'Bonne chasse !'] },
  '06_training/stats_and_levels': { en: 'Stats & Levels', fr: 'Stats et niveaux',
    hi: ['EVs, IVs, vitamins and experience for your team.', 'EV, IV, vitamines et expérience pour votre équipe.'],
    bye: ['Train hard.', 'Entraînez-vous bien.'] },
  '06_training/natures_and_abilities': { en: 'Natures & Abilities', fr: 'Natures et talents',
    hi: ['Mints to change a nature, capsules to change a talent.', 'Des menthes pour la nature, des capsules pour le talent.'],
    bye: ['Find the right fit.', 'Trouvez la bonne combinaison.'] },
  '06_training/tms_gen7': { en: 'TMs (Gen 7)', fr: 'CT (7e génération)',
    hi: ['Every Alola TM. They never break.', 'Toutes les CT d\'Alola. Elles ne s\'usent jamais.'],
    bye: ['Teach well.', 'Bon apprentissage.'] },
  '06_training/trs_gen8': { en: 'TRs (Gen 8)', fr: 'DT (8e génération)',
    hi: ['Galar TRs: one use each, stronger moves.', 'DT de Galar : un seul usage, des capacités plus fortes.'],
    bye: ['Teach well.', 'Bon apprentissage.'] },
  '07_battle/held_items': { en: 'Held Items', fr: 'Objets tenus',
    hi: ['Everything a competitive team holds.', 'Tout ce que tient une équipe de compétition.'],
    bye: ['Win your next fight.', 'Gagnez votre prochain combat.'] },
  '08_evolution/evolution': { en: 'Stones & Items', fr: 'Pierres et objets',
    hi: ['Stones, trade items and fossils for every evolution.', 'Pierres, objets d\'échange et fossiles pour chaque évolution.'],
    bye: ['Watch them grow.', 'Regardez-les grandir.'] },
  '09_cosmetics/cosmetics': { en: 'Shiny & Skins', fr: 'Chromatiques et skins',
    hi: ['Change how your Pokémon look, not how they fight.', 'Changez l\'apparence de vos Pokémon, pas leur force.'],
    bye: ['Looking good.', 'Très réussi.'] },
  '10_berries/berries': { en: 'Berry Stand', fr: 'Étal de baies',
    hi: ['Every berry, bought and sold.', 'Toutes les baies, à l\'achat comme à la vente.'],
    bye: ['Plant a few.', 'Plantez-en quelques-unes.'] },
  '11_rewards/mystery': { en: 'Mystery Bags & Cards', fr: 'Sacs mystère et cartes',
    hi: ['Try your luck: bags and card packs.', 'Tentez votre chance : sacs et paquets de cartes.'],
    bye: ['May the odds be with you.', 'Que la chance vous sourie.'] },
  // Plus de marchand « Minions » depuis le 2026-10-14 : les minions se craftent uniquement
  // (apply.mjs les retire de toutes les boutiques, REMOVE_MATCH).
  '12_minions/minion_gear': { en: 'Minion Gear', fr: 'Équipement de minion',
    hi: ['Upgrades, compactors and rare materials.', 'Améliorations, compacteurs et matériaux rares.'],
    bye: ['Come back with a full bag.', 'Revenez les poches pleines.'] },
  '12_minions/minion_tools': { en: 'Minion Tools', fr: 'Outils de minion',
    hi: ['Farming tools are no longer crafted. Pick one here.', 'Les outils agricoles ne se fabriquent plus. Choisissez ici.'],
    bye: ['Good harvests.', 'Bonnes récoltes.'] },
  '12_minions/minion_buyer': { en: 'Enchanted Goods Buyer', fr: 'Rachat d\'items enchantés',
    hi: ['I buy what your minions compact — farm goods and mob drops.', 'Je rachète ce que compactent vos minions : récoltes et butin.'],
    bye: ['Keep them running.', 'Faites-les tourner.'] },
  '13_endgame/endgame': { en: 'Ultimate Goods', fr: 'Objets ultimes',
    hi: ['For those who have built everything else.', 'Pour ceux qui ont déjà tout construit.'],
    bye: ['There is always a next goal.', 'Il y a toujours un objectif suivant.'] },
  '14_decoration/handcrafted_wood': { en: 'Wooden Furniture', fr: 'Meubles en bois',
    hi: ['Chairs, tables, beds and cupboards in every wood.', 'Chaises, tables, lits et placards dans tous les bois.'],
    bye: ['Make yourself at home.', 'Faites comme chez vous.'] },
  '14_decoration/handcrafted_decor': { en: 'Home Decor', fr: 'Déco de la maison',
    hi: ['Cushions, sheets, pots, crockery, trims and trophies.', 'Coussins, draps, pots, vaisselle, moulures et trophées.'],
    bye: ['It is the details that count.', 'Ce sont les détails qui comptent.'] },
  '14_decoration/another_furniture': { en: 'Cozy Furniture', fr: 'Mobilier douillet',
    hi: ['Sofas, stools, lamps, curtains and flower boxes.', 'Canapés, tabourets, lampes, rideaux et jardinières.'],
    bye: ['Enjoy the comfort.', 'Profitez du confort.'] },
  '14_decoration/factory_blocks': { en: 'Industrial Blocks', fr: 'Blocs industriels',
    hi: ['Plates, pipes, vents and fans for a factory look.', 'Plaques, tuyaux, grilles et ventilateurs pour un style usine.'],
    bye: ['Keep it running.', 'Que ça tourne !'] },
  '14_decoration/pixelmon_furniture': { en: 'Pokémon Furniture', fr: 'Mobilier Pokémon',
    hi: ['Couches, rugs, clocks, TVs and more, Pokémon style.', 'Canapés, tapis, horloges, télés et plus, style Pokémon.'],
    bye: ['A home fit for a Champion.', 'Une maison digne d\'un Maître.'] },
  '14_decoration/pixelmon_blocks': { en: 'Pokémon Blocks', fr: 'Blocs Pokémon',
    hi: ['Berry wood, temple stone, Unown letters and Poké Center signs.', 'Bois de baie, pierre de temple, lettres Zarbi et enseignes.'],
    bye: ['Build something legendary.', 'Construisez quelque chose de légendaire.'] },
  '14_decoration/minecraft_decor': { en: 'Colors & Decor', fr: 'Couleurs et déco',
    hi: ['Concrete, glass, terracotta, wool, candles, lanterns and more.', 'Béton, verre, terre cuite, laine, bougies, lanternes et plus.'],
    bye: ['Paint the island.', 'Colorez votre île !'] }
};
const KEEP_ORDER = new Set(['06_training/tms_gen7', '06_training/trs_gen8', '10_berries/berries']);

/* ============================================================================
 *  3. RÉPARTITION DES ARTICLES
 *     Par identifiant d'abord (listes ci-dessous), puis par fichier d'origine.
 *     Un article qu'aucune règle ne place fait ÉCHOUER l'outil : rien ne se perd.
 * ========================================================================== */
const mc = (...ids) => ids.map(i => 'minecraft:' + i);
const pm = (...ids) => ids.map(i => 'pixelmon:' + i);
const pg = (...ids) => ids.map(i => 'pixelgoitems:' + i);
const BY_ID = {
  '01_island/general_store': ['botanypots:yellow_terracotta_hopper_botany_pot', 'waystones:waystone',
    'pixelgo_dimension:time_capsule'],
  '02_farm/farm_market': mc('wheat', 'wheat_seeds', 'carrot', 'potato', 'baked_potato', 'poisonous_potato', 'pumpkin',
    'melon', 'melon_slice', 'sugar_cane', 'sugar', 'cactus', 'green_dye', 'cocoa_beans', 'nether_wart',
    'brown_mushroom', 'red_mushroom', 'brown_mushroom_block', 'red_mushroom_block', 'hay_block', 'bread',
    'poppy', 'dandelion', 'golden_carrot', 'allium', 'azure_bluet', 'blue_orchid', 'oxeye_daisy',
    'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'lilac', 'peony', 'rose_bush', 'sunflower'),
  '02_farm/butcher': mc('beef', 'chicken', 'mutton', 'porkchop', 'rabbit', 'cod', 'salmon', 'pufferfish',
    'tropical_fish', 'cooked_beef', 'cooked_cod', 'cooked_mutton', 'cooked_porkchop', 'cooked_rabbit',
    'cooked_salmon', 'egg'),
  '03_materials/building_blocks': [...mc('oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log',
    'cobblestone', 'blackstone', 'sand', 'red_sand', 'gravel', 'end_stone', 'ice', 'packed_ice', 'snow_block',
    'mycelium', 'white_wool', 'sponge', 'wet_sponge', 'slime_block', 'glass_bottle', 'stick',
    'ochre_froglight', 'pearlescent_froglight', 'verdant_froglight', 'sculk_catalyst', 'lily_pad')],
  '03_materials/mob_drops': [...mc('blaze_rod', 'blaze_powder', 'bone', 'ender_pearl', 'feather', 'gunpowder', 'leather',
    'magma_cream', 'rotten_flesh', 'spider_eye', 'string', 'slime_ball', 'snowball', 'clay_ball', 'flint',
    'rabbit_foot', 'rabbit_hide', 'ghast_tear', 'prismarine_shard', 'prismarine_crystals', 'phantom_membrane',
    'breeze_rod', 'shulker_shell', 'nautilus_shell'), 'excompressum:chicken_stick'],
  '03_materials/ores_and_metals': mc('coal', 'charcoal', 'coal_block', 'copper_ingot', 'copper_block', 'iron_ingot',
    'iron_block', 'gold_nugget', 'gold_ingot', 'gold_block', 'lapis_lazuli', 'lapis_block', 'redstone',
    'redstone_block', 'glowstone_dust', 'glowstone', 'quartz', 'quartz_block', 'diamond', 'diamond_block',
    'emerald', 'emerald_block', 'netherite_scrap', 'ancient_debris', 'netherite_ingot', 'obsidian', 'lava_bucket'),
  '04_equipment/utilities': mc('arrow', 'tipped_arrow', 'saddle', 'name_tag', 'experience_bottle', 'ominous_bottle',
    'brewing_stand', 'dispenser', 'piston', 'sticky_piston', 'observer', 'repeater', 'comparator', 'hopper',
    'ender_chest', 'shulker_box', 'enchanting_table', 'anvil', 'tide_armor_trim_smithing_template'),
  // Pas de marchand Enchanteur : un livre enchanté ne peut pas passer dans une boutique Pixelmon
  // (ShopOpenPacket encode sans registres du monde -> déconnexion). apply.mjs les retire.
  '04_equipment/rare_goods': mc('golden_apple', 'enchanted_golden_apple', 'totem_of_undying', 'wither_skeleton_skull',
    'nether_star', 'beacon', 'elytra', 'trident', 'heart_of_the_sea', 'dragon_egg'),
  '05_poke_balls/special_balls': pm('poke_ball'),
  '06_training/stats_and_levels': [...pg('add_ev_atk', 'add_ev_def', 'add_ev_hp', 'add_ev_spatk', 'add_ev_spd',
    'add_ev_spdef', 'add_iv_atk', 'add_iv_def', 'add_iv_hp', 'add_iv_spatk', 'add_iv_spd', 'add_iv_spdef',
    'random_ev', 'random_iv', 'random_level'),
  ...pm('hp_up', 'protein', 'iron', 'calcium', 'zinc', 'carbos', 'power_weight', 'power_bracer', 'power_belt',
    'power_lens', 'power_band', 'power_anklet', 'macho_brace', 'exp_share', 'lucky_egg', 'silver_bottle_cap',
    'gold_bottle_cap')],
  '06_training/natures_and_abilities': pm('ability_capsule', 'ability_patch'),
  '06_training/tms_gen7': pm('tm_gen7'),
  '06_training/trs_gen8': pm('tr_gen8'),
  '07_battle/held_items': pm('leftovers', 'choice_band', 'choice_scarf', 'choice_specs', 'life_orb', 'focus_sash',
    'assault_vest', 'booster_energy', 'loaded_dice', 'rocky_helmet', 'expert_belt', 'eviolite', 'weakness_policy',
    'air_balloon', 'heavy_duty_boots', 'black_sludge', 'flame_orb', 'toxic_orb', 'light_clay', 'quick_claw',
    'scope_lens', 'shell_bell', 'muscle_band', 'wise_glasses', 'safety_goggles', 'covert_cloak', 'mirror_herb',
    'clear_amulet', 'punching_glove', 'white_herb', 'mental_herb', 'big_root', 'binding_band', 'sticky_barb',
    'red_card', 'eject_button', 'amulet_coin', 'destiny_knot'),
  '08_evolution/evolution': [...pm('ever_stone'), ...pg('random_fossil')],
  '09_cosmetics/cosmetics': pg('shiny_swapper', 'skin_swapper', 'size_randomizer'),
  '11_rewards/mystery': ['treasurebags:treasure_bag', 'tcg:pack'],
  '13_endgame/endgame': ['mysticalagradditions:creative_essence', 'extendedcrafting:singularity',
    'extendedcrafting:the_ultimate_component', 'extendedcrafting:ultimate_singularity', 'cyclic:battery_infinite']
};
const ID_TO_SHOP = new Map();
for (const [shop, ids] of Object.entries(BY_ID)) for (const id of ids) ID_TO_SHOP.set(id, shop);
// Décoration : répartition calculée par deco.mjs
for (const [shop, list] of Object.entries(JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'pixelgo-economy', 'deco.json'), 'utf8')).shops))
  for (const [id] of list) ID_TO_SHOP.set(id, shop);

const classify = (id, origin) => {
  if (ID_TO_SHOP.has(id)) return ID_TO_SHOP.get(id);
  if (/^pixelmon:mint_/.test(id)) return '06_training/natures_and_abilities';
  if (/^pixelmon:[a-z_]+_berry$/.test(id)) return '10_berries/berries';
  if (/^pixelmon:[a-z]+_stone$/.test(id)) return '08_evolution/evolution';
  if (/^pixelgo_minions:/.test(id)) {
    if (/minions_gear|minion_gear/.test(origin)) return '12_minions/minion_gear';
    if (/minions_tools|minion_tools/.test(origin)) return '12_minions/minion_tools';
    if (/minions_enchanted|minion_buyer/.test(origin)) return '12_minions/minion_buyer';
  }
  // objets d'évolution ajoutés par apply.mjs au marchand EXP / au marchand d'évolution
  if (/exp_dealer|08_evolution/.test(origin) && /^pixelmon:/.test(id)) return '08_evolution/evolution';
  return null;
};

/* ============================================================================
 *  4. GABARIT COMMUN — dialogue, apparence, IA
 * ========================================================================== */
const NAMES = ['Yuki', 'Basile', 'Nadia', 'Tom', 'Hrann', 'Zinnia', 'Pinea', 'Bargas', 'Lou', 'Maëlle', 'Sacha', 'Inès'];
const SKINS = ['shopman', 'shopman2', 'shopman3', 'shopman4', 'shopman5', 'shoplady', 'shoplady2', 'shoplady3',
  'shoplady4', 'shoplady5', 'shopgirl', 'shopsecondman'];
const npcKey = (shop) => 'pixelgo.npc.' + shop.split('/')[1];
const preset = (shop, cat, items, sellable) => ({
  interactions: {
    values: [{
      interactions: [
        { event: 'pixelmon:right_click', conditions: { type: 'pixelmon:true' },
          results: { value: [{ title: npcKey(shop), message: npcKey(shop) + '.greeting', type: 'pixelmon:open_dialogue' }], type: 'pixelmon:constant' } },
        { event: 'pixelmon:close_dialogue', conditions: { type: 'pixelmon:true' },
          results: { value: [{ items, sellable, type: 'pixelmon:open_shop' }], type: 'pixelmon:constant' } },
        { event: 'pixelmon:close_shop', conditions: { type: 'pixelmon:true' },
          results: { value: [{ title: npcKey(shop), message: npcKey(shop) + '.goodbye', fire_close_event: false, type: 'pixelmon:open_dialogue' }], type: 'pixelmon:constant' } }
      ]
    }],
    type: 'pixelmon:uniformly_random'
  },
  properties: {
    value: {
      health: 20, eyeHeight: 1, dimensions: { width: 1, height: 2 },
      title: { translate: npcKey(shop), color: cat.color, bold: true, italic: false, underlined: false },
      pushable: false, child: false, invulnerable: true, immovable: true, nameplate: true
    },
    type: 'pixelmon:constant'
  },
  party: { value: { type: 'pixelmon:empty' }, type: 'pixelmon:constant' },
  names: { values: NAMES, type: 'pixelmon:uniformly_random' },
  models: {
    values: SKINS.map(s => ({ slim: false, texture: { resource: { resource: `pixelmon:textures/steve/${s}.png`, fallback: `pixelmon:textures/steve/${s}.png` }, type: 'pixelmon:fallback' }, type: 'pixelmon:player' })),
    type: 'pixelmon:uniformly_random'
  },
  ai_provider: { type: 'pixelmon:constant', value: { type: 'pixelmon:stand_and_look', look_distance: 5, swim: false } }
});

/* ============================================================================
 *  5. LECTURE, RÉPARTITION, ÉCRITURE
 * ========================================================================== */
const sources = [...walk(OUT), ...walk(OLD_PIXELMON)].filter(f => f.endsWith('.json'));
const itemKey = (it) => (typeof it === 'string' ? it : it.id) + (it.components ? '|' + JSON.stringify(it.components) : '');
const pool = new Map(); // clé -> { entry, shop, order }
const unplaced = [];
let order = 0;
for (const f of sources) {
  const origin = path.relative(KDATA, f).split(path.sep).join('/');
  const scan = (o) => { if (Array.isArray(o)) return o.forEach(scan); if (!o || typeof o !== 'object') return;
    if (o.type === 'pixelmon:open_shop' && Array.isArray(o.items)) {
      for (const e of o.items) {
        const id = typeof e.item === 'string' ? e.item : e.item.id;
        const k = itemKey(e.item);
        if (pool.has(k)) continue; // doublon (menthes, baies d'entraînement, CT d'« electronics »…)
        const shop = classify(id, origin);
        if (!shop) { unplaced.push(id + ' (' + origin + ')'); continue; }
        pool.set(k, { entry: e, shop, order: order++ });
      }
      return;
    }
    Object.values(o).forEach(scan); };
  scan(JSON.parse(fs.readFileSync(f, 'utf8')));
}
if (unplaced.length) { console.error('Articles sans rayon (ajoute une règle) :\n  ' + [...new Set(unplaced)].join('\n  ')); process.exit(1); }

const byShop = {};
for (const { entry, shop, order: o } of pool.values()) (byShop[shop] ||= []).push({ entry, o });
const written = new Set();
const changed = [];
const report = [];
for (const shop of Object.keys(SHOPS)) {
  const list = byShop[shop] || [];
  if (!list.length) { report.push(`  ! ${shop} : vide`); continue; }
  list.sort((a, b) => KEEP_ORDER.has(shop) ? a.o - b.o
    : (a.entry.buyPrice || Infinity) - (b.entry.buyPrice || Infinity) || a.o - b.o);
  const items = list.map(x => ({ item: x.entry.item, buyPrice: x.entry.buyPrice, sellPrice: x.entry.sellPrice }));
  const sellable = items.some(i => i.sellPrice > 0);
  const cat = CATEGORIES[shop.split('/')[0]];
  const file = path.join(OUT, ...shop.split('/')) + '.json';
  const txt = JSON.stringify(preset(shop, cat, items, sellable), null, 2) + '\n';
  written.add(path.resolve(file));
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== txt) { changed.push(path.relative(ROOT, file)); if (!DRY) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, txt); } }
  report.push(`  ${cat.en} · ${SHOPS[shop].en}`.padEnd(46) + `${items.length} article(s)${sellable ? ', rachète' : ''}`);
}
// anciens presets remplacés
for (const f of sources) if (!written.has(path.resolve(f))) { changed.push('supprimé ' + path.relative(ROOT, f)); if (!DRY) fs.unlinkSync(f); }
if (!DRY) for (const d of [OLD_PIXELMON]) if (fs.existsSync(d) && !fs.readdirSync(d).length) fs.rmdirSync(d);

/* ============================================================================
 *  6. NOMS — PNJ (dialogues) et Boutique Portable, en anglais et en français.
 *  Les clés `pixelgo.npc.*` et `shop.pixelgo_shop.*` sont régénérées à chaque passage.
 * ========================================================================== */
const PIXELMON_NAMES = { // marchands de Pixelmon, laissés en place (appelés par les structures du jar)
  'shopkeeper.pokemart.main_1': ['Poké Mart · Potions & Care', 'Poké Mart · Soins et potions'],
  'shopkeeper.pokemart.main_2': ['Poké Mart · Poké Balls', 'Poké Mart · Poké Balls'],
  'shopkeeper.pokemart.main_3': ['Poké Mart · Battle Items', 'Poké Mart · Objets de combat'],
  'shopkeeper.pokemart.tm_1': ['Poké Mart · TMs (Gen 9)', 'Poké Mart · CT (9e génération)'],
  'shopkeeper.pokemart.curry_1': ['Poké Mart · Curry', 'Poké Mart · Curry'],
  'shopkeeper.pokemart.mail_1': ['Poké Mart · Mail', 'Poké Mart · Courrier'],
  'shopkeeper.daycare.general_1': ['Day Care · Day Care Blocks', 'Pension · Blocs de pension'],
  'shopkeeper.daycare.evostones_1': ['Day Care · Evolution Stones', 'Pension · Pierres d\'évolution'],
  'shopkeeper.utility.water.maniac_relic': ['Buyers · Relic Maniac', 'Rachat · Maniaque des reliques'],
  'shopkeeper.wild.spawn_1': ['Wandering Trader · Evolution Stones', 'Marchand ambulant · Pierres d\'évolution'],
  'shopkeeper.wild.spawn_2_1': ['Wandering Trader · Day Care Blocks', 'Marchand ambulant · Blocs de pension'],
  'shopkeeper.wild.spawn_2_2': ['Wandering Trader · Day Care Blocks', 'Marchand ambulant · Blocs de pension']
};
const lang = { en: {}, fr: {} };
for (const [shop, s] of Object.entries(SHOPS)) {
  const cat = CATEGORIES[shop.split('/')[0]];
  const k = npcKey(shop);
  lang.en[k] = `${cat.en} · ${s.en}`; lang.fr[k] = `${cat.fr} · ${s.fr}`;
  lang.en[k + '.greeting'] = s.hi[0]; lang.fr[k + '.greeting'] = s.hi[1];
  lang.en[k + '.goodbye'] = s.bye[0]; lang.fr[k + '.goodbye'] = s.bye[1];
  const pk = 'shop.pixelgo_shop.shopkeeper.' + shop.replace('/', '.');
  lang.en[pk] = lang.en[k]; lang.fr[pk] = lang.fr[k];
}
for (const [k, [en, fr]] of Object.entries(PIXELMON_NAMES)) { lang.en['shop.pixelgo_shop.' + k] = en; lang.fr['shop.pixelgo_shop.' + k] = fr; }

const LANG_DIR = path.join(ROOT, 'kubejs', 'assets', 'kubejs', 'lang');
for (const [code, file] of [['en', 'en_us.json'], ['fr', 'fr_fr.json']]) {
  const f = path.join(LANG_DIR, file);
  const cur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  const next = {};
  for (const [k, v] of Object.entries(cur)) if (!/^(pixelgo\.npc\.|shop\.pixelgo_shop\.)/.test(k)) next[k] = v;
  Object.assign(next, lang[code]);
  const crlf = fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes('\r\n');
  let txt = JSON.stringify(next, null, 2) + '\n';
  if (crlf) txt = txt.replace(/\n/g, '\r\n');
  if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== txt) { changed.push(path.relative(ROOT, f)); if (!DRY) fs.writeFileSync(f, txt); }
}

/* ============================================================================
 *  7. BOUTIQUE PORTABLE — masquer les doublons de Pixelmon
 *  Pierres d'évolution de la Pension et des marchands ambulants : même stock que
 *  « Evolution · Stones & Items ». Blocs de pension des ambulants : même stock que la Pension.
 *  (Les PNJ restent en jeu dans leurs structures ; seul le menu de la Boutique Portable change.)
 * ========================================================================== */
{
  const f = path.join(ROOT, 'config', 'pixelgo_shop-common.toml');
  const t = fs.readFileSync(f, 'utf8');
  const filter = 'filter = ["pixelmon:shopkeeper/daycare/evostones_1", "pixelmon:shopkeeper/wild/*"]';
  const n = t.replace(/^filter = .*$/m, filter);
  if (n !== t) { changed.push(path.relative(ROOT, f)); if (!DRY) fs.writeFileSync(f, n); }
}

console.log(`${pool.size} articles répartis dans ${Object.keys(byShop).length} marchands :`);
console.log(report.join('\n'));
console.log(`${changed.length} changement(s) ${DRY ? 'à faire' : 'faits'}`);
for (const c of changed) console.log('  ' + c);
