/**
 * PixelGO — To the Sky : équilibrage de l'économie (données)
 *
 * Applique, de façon IDEMPOTENTE, toutes les corrections économiques qui vivent dans des
 * fichiers de données (JSON). Les réglages de config (.yml / .toml) et les scripts KubeJS
 * sont modifiés à la main et documentés dans ECONOMIE.md.
 *
 *   1. Prix de revente/achat des presets de boutique (overrides kubejs/data/**)
 *   2. Articles ajoutés aux boutiques (objets d'évolution, Master Ball)
 *   3. Boutique des items enchantés des Minions (retrait des matières de générateur)
 *   4. Distributeur (Recycler / Vending Machine) : config/guinimospixelmon/shoplist.json
 *   5. Poke Hunter : config/guinimospixelmon/rarity.json (espèces qui donnaient une Master Ball)
 *   6. Botany Pots : cultures rentables deux fois plus lentes en pot
 *   7. Mystical Agriculture : essence de nature -> cultures ramenée à 1 culture par essence
 *   8. ProjectE : EMC à 0 pour tout objet revendable (l'EMC de fin de partie est illimité)
 *   9. Dresseurs sauvages Pixelmon : gain de victoire plafonné à 200 $
 *
 * Usage :  node tools/pixelgo-economy/apply.mjs [--dry]
 * Une seconde exécution ne change rien (« 0 fichier modifié »).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const KDATA = path.join(ROOT, 'kubejs', 'data');
const changed = new Set();
const log = [];

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
// Conserve la fin de ligne du fichier existant (la plupart des fichiers du pack sont en CRLF).
const eol = (f, txt) => fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes('\r\n') ? txt.replace(/\r?\n/g, '\r\n') : txt;
const put = (f, txt) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, eol(f, txt)); };
// N'écrit que si le CONTENU change (un fichier seulement reformaté — 150.0 contre 150 — est laissé tel quel).
const writeJson = (f, obj, indent = 2) => {
  const txt = JSON.stringify(obj, null, indent) + '\n';
  if (fs.existsSync(f) && JSON.stringify(readJson(f)) === JSON.stringify(obj)) return;
  changed.add(path.relative(ROOT, f));
  if (!DRY) put(f, txt);
};
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];

/* ============================================================================
 *  1. PRIX DE REVENTE — règle : seules les CULTURES et les TRÉSORS Pixelmon paient.
 *  Les sous-produits de générateur (tamis, mob farm, golem de neige, solidificateur
 *  Cyclic, infuseur Mekanism...) valaient 40 $ pièce : un tamis automatique sur de la
 *  terre rapportait ~500 000 $/h. Ils tombent à 0-2 $.
 * ========================================================================== */
const SELL = {
  // (sous-produits, fleurs, bois, minerais : barème RAW du §4)
  // --- transformations qui multipliaient la valeur -----------------------------
  'minecraft:sugar': 12,         // broyeur Cyclic : 1 canne -> 3 sucres (3 x 45 = 135 $ pour une canne à 40 $)
  'minecraft:green_dye': 18,     // broyeur Cyclic / enrichisseur Mekanism : 1 cactus -> 2 teintures
  // --- champignons : la poudre d'os fait pousser un champignon géant de 25 à 45 blocs
  'minecraft:brown_mushroom': 3,
  'minecraft:red_mushroom': 3,
  'minecraft:brown_mushroom_block': 1, // Toucher de soie sur champignon géant : 400 $ x 45 blocs par poudre d'os
  'minecraft:red_mushroom_block': 1,
  // --- melon : bonus de compactage aligné sur la botte de foin (+11 %)
  'minecraft:melon': 80,
  // --- TRÉSORS (pièces, reliques, pépites, perles…) : prix Pixelmon d'origine / 5.
  // Ils tombent partout : la table pixelgo:special/money est appelée par ~490 coffres de
  // structures (Lootr : un butin par joueur), et Miaouss / Persian / Mordudor / Gromago les
  // lâchent à CHAQUE victoire (100 %). Au prix d'origine, un Nickel valait 10 diamants, les
  // pièces faisaient 60-70 % de la valeur d'un coffre (~300 $ sur ~670 $) et un Miaouss
  // rapportait 190 $ par combat (~40 000 $/h en auto-combat, plus qu'une ferme). Les rapports
  // entre trésors sont conservés ; aucun ne s'achète nulle part (pas de boucle possible).
  'pokeblocks:nickel': 20, 'pokeblocks:dime': 40, 'pokeblocks:poke_coin': 120,
  'pixelmon:relic_copper': 4, 'pixelmon:relic_silver': 20, 'pixelmon:relic_gold': 120,
  'pixelmon:relic_vase': 200, 'pixelmon:relic_band': 400, 'pixelmon:relic_statue': 800, 'pixelmon:relic_crown': 1200,
  'pixelmon:nugget': 20, 'pixelmon:big_nugget': 80, 'pixelmon:pearl': 4, 'pixelmon:big_pearl': 16,
  'pixelmon:pearl_string': 40, 'pixelmon:stardust': 6, 'pixelmon:star_piece': 24, 'pixelmon:comet_shard': 50,
  'pixelmon:tiny_mushroom': 1, 'pixelmon:big_mushroom': 10, 'pixelmon:balm_mushroom': 30, 'pixelmon:rare_bone': 10
};
const BERRY_SELL = 40;           // baies : arbres renouvelables, alignées sur une culture (150 -> 40)

/* ============================================================================
 *  2. PRIX D'ACHAT — incohérences de la boutique PixelGO
 * ========================================================================== */
const BALL = (v) => `pixelmon:poke_ball|{"pixelmon:poke_ball":"${v}"}`;
const BAG = (t) => `treasurebags:treasure_bag|{"treasurebags:bag_type":"pixelgo:${t}"}`;
const BUY = {
  /* ------------------------------------------------------------------------
   *  RÈGLE : un prix d'achat = un TEMPS DE FARM.
   *  Référence : ferme manuelle ≈ 32 000 $/h ≈ 530 $ la minute (PROGRESSION-TRAME.md).
   *  Plus tard, une île automatisée fait 70 000 à 300 000 $/h (ECONOMIE.md §2) :
   *  le même objet coûte alors 5 à 10 fois moins de temps.
   *
   *    consommable d'entraînement     1 à 5 min      (EV, niveaux, vitamines)
   *    amélioration ciblée            5 à 15 min     (IV d'une stat, nature, objet tenu)
   *    objet puissant                 30 min à 2 h   (IV ALL, Patch Talent, Pièce Rune)
   *    objet décisif / de prestige    5 à 15 h       (Master Ball, Shiny, sac légendaire)
   *
   *  Les objets PixelGO (+EV, +IV, niveau, IV/EV aléatoires) tombent de CHAQUE Pokémon
   *  sauvage vaincu (PokemonDrops, 100 %) : ils sont bon marché, la boutique ne sert qu'à
   *  cibler une stat précise.
   * ---------------------------------------------------------------------- */

  // --- Poké Balls spéciales -------------------------------------------------
  [BALL('exp_xs_ball')]: 500, [BALL('exp_s_ball')]: 1000, [BALL('exp_m_ball')]: 2000,     // 1 à 4 min
  [BALL('exp_l_ball')]: 4000, [BALL('exp_xl_ball')]: 8000,                                 // 8 à 15 min
  ...Object.fromEntries(['atk', 'def', 'hp', 'spatk', 'spd', 'spdef'].map(s => [BALL(`ev_${s}_ball`), 1500])),  // 252 EV : 3 min
  ...Object.fromEntries(['atk', 'def', 'hp', 'spatk', 'spd', 'spdef'].map(s => [BALL(`iv_${s}_ball`), 5000])),  // 31 IV : 10 min
  [BALL('iv_all_ball')]: 40000,        // 6 x 31 IV + bonus de capture : 1 h 15
  [BALL('skin_ball')]: 30000,          // cosmétique : 1 h
  [BALL('shiny_ball')]: 350000,        // prestige : ~11 h de ferme manuelle, ~1 h 30 en fin de partie
  [BALL('master_ball')]: 150000,       // décisif : ~5 h ; ingrédient du Ticket SSR et de la Capsule d'Or

  // --- Entraînement ---------------------------------------------------------
  ...Object.fromEntries(['atk', 'def', 'hp', 'spatk', 'spd', 'spdef'].map(s => ['pixelgoitems:add_ev_' + s, 150])),  // +20 EV
  ...Object.fromEntries(['atk', 'def', 'hp', 'spatk', 'spd', 'spdef'].map(s => ['pixelgoitems:add_iv_' + s, 400])),  // +1 IV
  ...Object.fromEntries(['hp_up', 'protein', 'iron', 'calcium', 'zinc', 'carbos'].map(i => ['pixelmon:' + i, 100])), // +10 EV
  'pixelgoitems:random_ev': 500, 'pixelgoitems:random_iv': 3000, 'pixelgoitems:random_level': 3000,
  ...Object.fromEntries(['power_weight', 'power_bracer', 'power_belt', 'power_lens', 'power_band', 'power_anklet', 'macho_brace']
    .map(i => ['pixelmon:' + i, 5000])),
  'pixelmon:exp_share': 10000, 'pixelmon:lucky_egg': 15000,
  'pixelmon:silver_bottle_cap': 8000,   // une stat à 31 : un peu plus qu'une IV Ball, mais sur un Pokémon déjà capturé
  'pixelmon:gold_bottle_cap': 200000,   // six stats : au-dessus de sa recette (Master Ball + Capsule d'Argent)
  'pixelmon:ability_capsule': 15000,    // 30 min
  'pixelmon:ability_patch': 100000,     // talent caché : ~3 h (l'Upgrade Orb, lui, le met en jeu)

  // --- Combat : objets tenus ------------------------------------------------
  ...Object.fromEntries(['leftovers', 'choice_band', 'choice_scarf', 'choice_specs', 'life_orb', 'focus_sash',
    'assault_vest', 'booster_energy', 'loaded_dice'].map(i => ['pixelmon:' + i, 12000])),   // 20 min
  ...Object.fromEntries(['rocky_helmet', 'expert_belt', 'eviolite', 'weakness_policy', 'air_balloon', 'heavy_duty_boots',
    'black_sludge', 'flame_orb', 'toxic_orb', 'light_clay', 'quick_claw', 'scope_lens', 'shell_bell', 'muscle_band',
    'wise_glasses', 'safety_goggles', 'covert_cloak', 'mirror_herb', 'clear_amulet', 'punching_glove', 'white_herb',
    'mental_herb', 'big_root', 'binding_band', 'sticky_barb', 'red_card', 'eject_button'].map(i => ['pixelmon:' + i, 6000])), // 10 min
  'pixelmon:amulet_coin': 25000, 'pixelmon:destiny_knot': 20000,

  // --- Évolution ------------------------------------------------------------
  ...Object.fromEntries(['metal_coat', 'kings_rock', 'dragon_scale', 'up_grade', 'protector', 'electirizer', 'magmarizer',
    'reaper_cloth', 'razor_claw', 'razor_fang', 'prism_scale', 'deep_sea_tooth', 'deep_sea_scale', 'whipped_dream',
    'sachet', 'oval_stone', 'dubious_disc', 'linking_cord', 'tart_apple', 'sweet_apple', 'syrupy_apple', 'cracked_pot',
    'chipped_pot', 'unremarkable_teacup', 'galarica_cuff', 'galarica_wreath', 'peat_block', 'metal_alloy',
    'black_augurite', 'auspicious_armor', 'malicious_armor', 'leaders_crest'].map(i => ['pixelmon:' + i, 5000])), // ≈ 2 pierres
  'pixelmon:masterpiece_teacup': 10000,
  'pixelmon:scroll_of_darkness': 25000, 'pixelmon:scroll_of_waters': 25000,   // évolution d'un légendaire
  ...Object.fromEntries(['sweet_strawberry', 'sweet_love', 'sweet_berry', 'sweet_clover', 'sweet_flower', 'sweet_star',
    'sweet_ribbon'].map(i => ['pixelmon:' + i, 2000])),
  'pixelgoitems:random_fossil': 5000,

  // --- Cosmétiques ----------------------------------------------------------
  'pixelgoitems:size_randomizer': 2000,
  'pixelgoitems:skin_swapper': 30000,
  'pixelgoitems:shiny_swapper': 500000, // n'importe quel Pokémon déjà possédé, sans risque : ~15 h / 2 h en fin de partie

  // --- Récompenses ----------------------------------------------------------
  [BAG('tier1')]: 2500, [BAG('tier2')]: 7500, [BAG('tier3')]: 25000, [BAG('tier4')]: 200000,

  // --- Divers ---------------------------------------------------------------
  'minecraft:totem_of_undying': 45000
};

/* ------------------------------------------------------------------------
 *  MARGE UNIQUE — tout matériau (culture, bois, minerai, butin) s'achète 4 fois son prix de
 *  revente, comme sur les serveurs à plugins (EssentialsX / ShopGUI+ : achat = 2 à 5 x la
 *  revente). Avant : diamant acheté 5 000 $ et revendu 1 $ (x 5 000). Minimum 1 $.
 *  Appliqué en §4, une fois le barème RAW / CROP connu (voir MAT_BUY).
 * ---------------------------------------------------------------------- */
const MARKUP = 4;

/* Utilitaires : prix des ingrédients au même marchand, arrondis (fer 12, or 16, diamant 40,
 * obsidienne 12, redstone 4, quartz 12, perle 16, bâton de blaze 8, planches 1). */
Object.assign(BUY, {
  'minecraft:brewing_stand': 20, 'minecraft:dispenser': 15, 'minecraft:piston': 25, 'minecraft:sticky_piston': 30,
  'minecraft:observer': 30, 'minecraft:repeater': 20, 'minecraft:comparator': 40, 'minecraft:hopper': 80,
  'minecraft:ender_chest': 150, 'minecraft:enchanting_table': 350, 'minecraft:anvil': 500,
  'minecraft:golden_apple': 200, 'minecraft:netherite_ingot': 700, 'minecraft:ancient_debris': 120,
  'minecraft:arrow': 20, 'minecraft:lava_bucket': 50, 'minecraft:gold_nugget': 2, 'minecraft:stick': 1,
  'minecraft:glass_bottle': 2
});

/* Règles d'achat par famille (boutiques PixelGO uniquement). Les tables de conversion sont
 * choisies pour être IDEMPOTENTES : aucun nouveau prix n'est aussi un ancien prix. */
const TM7 = { 2500: 1000, 5000: 1500, 7500: 2250, 10000: 3000, 12500: 3500, 15000: 4500 };
const TR8 = { 2000: 750, 4000: 1250, 6000: 1750, 10000: 3000, 16000: 4500 };
const BUY_RULES = [
  // CT de 7e génération : ramenées dans la fourchette des CT de 9e génération du Poké Mart (750 à 4 500 $)
  [(id) => id === 'pixelmon:tm_gen7', (b) => TM7[b] ?? b],
  // DT : à usage unique, même fourchette
  [(id) => id === 'pixelmon:tr_gen8', (b) => TR8[b] ?? b],
  // baies : 5 cultures, pas 10
  [(id) => /^pixelmon:[a-z_]+_berry$/.test(id), (b) => (b === 400 ? 200 : b)],
  // menthes : 6 min
  [(id) => /^pixelmon:mint_/.test(id), (b) => (b === 6000 ? 3000 : b)],
  // paquets de cartes TCG : cosmétique
  [(id) => id === 'tcg:pack', (b) => (b === 5000 ? 1500 : b)]
];

/* ============================================================================
 *  3. ARTICLES AJOUTÉS (objets existants, sans autre source fiable en skyblock)
 * ========================================================================== */
const ADD = {
  // Boutique PixelGO — la Master Ball entre dans les recettes du Ticket SSR et de la
  // Capsule d'Or ; ses seules sources étaient aléatoires (Poke Hunter, caisse Master, butin t8+).
  'pixelgo/pixelmon/npc/preset/shopkeeper/pixelgo_shop.json': [
    { id: 'pixelmon:poke_ball', components: { 'pixelmon:poke_ball': 'master_ball' }, buy: 500000 },
    /* Objets tenus — le rayon « compétitif » de tout serveur Pixelmon. Aucun n'était vendu :
     * ils ne tombaient qu'au hasard d'un coffre ou d'un drop, alors que l'équipe des Portes
     * de rang S en a besoin. Les six objets qui définissent une stratégie à 40 000 $, le
     * reste à 20 000 $ ; aucun ne se revend. */
    ...['leftovers', 'choice_band', 'choice_scarf', 'choice_specs', 'life_orb', 'focus_sash',
      'assault_vest', 'booster_energy', 'loaded_dice'].map(i => ({ id: 'pixelmon:' + i, buy: 40000 })),
    ...['rocky_helmet', 'expert_belt', 'eviolite', 'weakness_policy', 'air_balloon', 'heavy_duty_boots',
      'black_sludge', 'flame_orb', 'toxic_orb', 'light_clay', 'quick_claw', 'scope_lens', 'shell_bell',
      'muscle_band', 'wise_glasses', 'safety_goggles', 'covert_cloak', 'mirror_herb', 'clear_amulet',
      'punching_glove', 'white_herb', 'mental_herb', 'big_root', 'binding_band', 'sticky_barb', 'red_card',
      'eject_button'].map(i => ({ id: 'pixelmon:' + i, buy: 20000 })),
    // Entraînement : vitamines (+10 EV) au prorata de l'objet PixelGO (+20 EV = 1 000 $),
    // objets de puissance et Bracelet Macho (également craftables dans le pack).
    ...['hp_up', 'protein', 'iron', 'calcium', 'zinc', 'carbos'].map(i => ({ id: 'pixelmon:' + i, buy: 500 })),
    ...['power_weight', 'power_bracer', 'power_belt', 'power_lens', 'power_band', 'power_anklet', 'macho_brace']
      .map(i => ({ id: 'pixelmon:' + i, buy: 10000 })),
    { id: 'pixelmon:lucky_egg', buy: 30000 },
    { id: 'pixelmon:amulet_coin', buy: 50000 },   // Pay Day est plafonné ; sert aussi à fabriquer le distributeur
    { id: 'pixelmon:destiny_knot', buy: 50000 },
    // Talents et IV. Talent caché : l'Upgrade Orb le vend ~700 000 $ en espérance (12 % de
    // base + 25 % pour 250 000 $) ; le Patch est à 500 000 $. La Capsule d'Or se fabrique
    // avec une Master Ball (500 000 $) : elle ne doit pas être moins chère que sa recette.
    { id: 'pixelmon:ability_capsule', buy: 50000 },
    { id: 'pixelmon:ability_patch', buy: 500000 },
    { id: 'pixelmon:silver_bottle_cap', buy: 25000 },
    { id: 'pixelmon:gold_bottle_cap', buy: 600000 }
  ],
  /* Marchand de blocs — le rayon « utilitaire » des serveurs. Chaque prix est au moins le
   * coût de ses ingrédients au même marchand (fer 600 $, diamant 5 000 $, or 1 200 $…) :
   * acheter l'objet fini ne permet jamais de sauter une étape que le craft imposerait. */
  'pixelmon/pixelmon/npc/preset/shopkeeper/pixelgo/minecraft_blocks_1_2.json': [
    { id: 'minecraft:experience_bottle', buy: 500 },
    { id: 'minecraft:cooked_beef', buy: 200 },
    { id: 'minecraft:brewing_stand', buy: 1000 },
    { id: 'minecraft:dispenser', buy: 1000 },
    { id: 'minecraft:piston', buy: 1500 },
    { id: 'minecraft:sticky_piston', buy: 1700 },
    { id: 'minecraft:observer', buy: 1900 },
    { id: 'minecraft:repeater', buy: 2000 },
    { id: 'minecraft:name_tag', buy: 2000 },
    { id: 'minecraft:comparator', buy: 3000 },
    { id: 'minecraft:hopper', buy: 3500 },          // 5 fers + coffre
    { id: 'minecraft:nautilus_shell', buy: 5000 },
    { id: 'minecraft:ancient_debris', buy: 5000 },   // = débris de netherite
    { id: 'minecraft:ender_chest', buy: 6000 },      // 8 obsidiennes + œil
    { id: 'minecraft:golden_apple', buy: 10000 },    // 8 lingots d'or = 9 600 $
    { id: 'minecraft:shulker_box', buy: 12000 },     // 2 carapaces à 5 000 $
    { id: 'minecraft:enchanting_table', buy: 13000 },// 2 diamants + 4 obsidiennes
    { id: 'minecraft:anvil', buy: 19000 },           // 3 blocs + 4 lingots de fer
    { id: 'minecraft:netherite_ingot', buy: 26000 }, // 4 débris + 4 or
    { id: 'minecraft:trident', buy: 50000 },
    { id: 'minecraft:heart_of_the_sea', buy: 50000 },
    { id: 'minecraft:enchanted_golden_apple', buy: 100000 },
    { id: 'minecraft:nether_star', buy: 100000 },    // 3 crânes de wither à 25 000 $ + le combat
    { id: 'minecraft:beacon', buy: 150000 },
    { id: 'minecraft:elytra', buy: 250000 },
    // L'œuf du dragon est UNIQUE par monde : sur un serveur, un seul joueur peut fabriquer la
    // Breeder Bottle et le Dynamax Quest Giver (guinimospixelmon) qui l'exigent.
    { id: 'minecraft:dragon_egg', buy: 500000 },
    // Livres enchantés : IMPOSSIBLES dans une boutique Pixelmon. Le paquet qui ouvre la
    // boutique (ShopOpenPacket) encode les articles sans accès aux registres du monde ; un
    // enchantement en est un, l'encodage échoue et le joueur est déconnecté (crash du
    // 27/09/2026). Voir REMOVE_EVERYWHERE plus bas.
  ],
  // Marchand d'EXP / évolution — objets d'évolution par échange ou par objet, qui ne
  // tombaient qu'au hasard d'un coffre ou d'un drop. Sans eux les chapitres Pokédex et
  // « Items of Evolution » restent bloqués sur une île.
  'pixelmon/pixelmon/npc/preset/shopkeeper/pixelgo/exp_dealer.json': [
    ...['metal_coat', 'kings_rock', 'dragon_scale', 'up_grade', 'protector', 'electirizer', 'magmarizer',
      'reaper_cloth', 'razor_claw', 'razor_fang', 'prism_scale', 'deep_sea_tooth', 'deep_sea_scale',
      'whipped_dream', 'sachet', 'oval_stone'].map(i => ({ id: 'pixelmon:' + i, buy: 10000 })),
    { id: 'pixelmon:dubious_disc', buy: 15000 },   // second échelon de Porygon
    { id: 'pixelmon:linking_cord', buy: 15000 },    // évolutions par échange sans partenaire
    ...['tart_apple', 'sweet_apple', 'syrupy_apple', 'cracked_pot', 'chipped_pot', 'unremarkable_teacup',
      'galarica_cuff', 'galarica_wreath', 'peat_block', 'metal_alloy', 'black_augurite',
      'auspicious_armor', 'malicious_armor', 'leaders_crest'].map(i => ({ id: 'pixelmon:' + i, buy: 15000 })),
    { id: 'pixelmon:masterpiece_teacup', buy: 25000 }, // forme rare de Poltchageist
    { id: 'pixelmon:scroll_of_darkness', buy: 50000 },  // Kubfu est légendaire
    { id: 'pixelmon:scroll_of_waters', buy: 50000 },
    ...['sweet_strawberry', 'sweet_love', 'sweet_berry', 'sweet_clover', 'sweet_flower', 'sweet_star', 'sweet_ribbon']
      .map(i => ({ id: 'pixelmon:' + i, buy: 5000 }))
  ]
};

/* ============================================================================
 *  4. PRODUITS DES MINIONS — TOUT ce qu'un minion produit se revend.
 *
 *  Barème par unité BRUTE (RAW), calé sur la machine automatique la plus rapide qui
 *  produit le même objet, pour qu'aucune ne dépasse quelques milliers de $/h :
 *    générateur de cobble netherite (768 blocs/s)  -> pierre, pierre noire, pierre de l'End : 0,003 $
 *    tamis / marteaux (3 600 à 30 000 objets/h)    -> sable, argile, neige, glace : 0,05 $ ; charbon, fer, cuivre, quartz… : 0,1 $
 *    arbres en pot                                 -> bûches : 0,1 $
 *    diamant, émeraude / débris de netherite       -> 1 $ / 2 $ (le marchand les VEND 5 000 $)
 *  Les cultures gardent leur prix (40 $ : c'est l'ancre) et leur item enchanté reste un puits.
 *
 *  RÈGLE DES ITEMS ENCHANTÉS : un item enchanté vaut EXACTEMENT ses unités brutes
 *  (160, ou 1 440 pour un bloc de 9, ou 25 600 pour un « cube »). Compacter ne crée pas
 *  d'argent, cela fait gagner de la place. Minimum 0,5 $.
 * ========================================================================== */
const RAW = {
  /* ---- CLASSE 1 : ce qui POUSSE ou se RÉCOLTE sur une bête (croissance, reproduction, spawn)
   * Débit borné par le vivant, comme les cultures : prix dans les proportions des plugins
   * (EssentialsX worth.yml, ShopGUI+, Hypixel SkyBlock), ancrés sur 1 culture = 40 $. */
  // bois : 1 bûche = une demi-culture (un arbre en pot donne 1 à 4 bûches par pousse ; minion de
  // chêne 200 bûches/h = 4 000 $/h, contre 6 400 $/h pour un minion de blé)
  'minecraft:oak_log': 20, 'minecraft:spruce_log': 20, 'minecraft:birch_log': 20, 'minecraft:jungle_log': 20,
  'minecraft:acacia_log': 20, 'minecraft:dark_oak_log': 20,
  // animaux (élevage, pêche)
  'minecraft:beef': 5, 'minecraft:chicken': 5, 'minecraft:mutton': 5, 'minecraft:porkchop': 5, 'minecraft:rabbit': 5,
  'minecraft:cooked_porkchop': 6, 'minecraft:cooked_mutton': 6, 'minecraft:cooked_rabbit': 6, 'minecraft:cooked_beef': 6,
  'minecraft:cod': 5, 'minecraft:salmon': 5, 'minecraft:cooked_cod': 6, 'minecraft:cooked_salmon': 6,
  'minecraft:pufferfish': 5, 'minecraft:tropical_fish': 5,
  'minecraft:leather': 5, 'minecraft:feather': 3, 'minecraft:egg': 3, 'minecraft:rabbit_hide': 3, 'minecraft:rabbit_foot': 10,
  'minecraft:white_wool': 2, 'minecraft:string': 0.5, // 4 ficelles = 1 laine
  // fleurs et nénuphar : la poudre d'os en fait pousser des dizaines d'un coup (comme les champignons)
  ...Object.fromEntries(['dandelion', 'poppy', 'allium', 'azure_bluet', 'blue_orchid', 'oxeye_daisy', 'red_tulip',
    'orange_tulip', 'white_tulip', 'pink_tulip', 'lilac', 'peony', 'rose_bush', 'sunflower', 'lily_pad']
    .map(i => ['minecraft:' + i, 2])),

  /* ---- CLASSE 2 : ce qui sort d'une MACHINE (tamis, générateur, broyeur, infuseur)
   * Un seul tamis compressé automatique rend par heure ~2 500 diamants, ~5 000 charbons,
   * ~4 300 perles de l'Ender (voir ECONOMIE.md). Prix = plafond pour qu'une machine ne
   * rapporte pas plus qu'un minion de palier I (~6 000 $/h). L'ORDRE reste celui des
   * plugins : pierre < sable < fer < or < charbon, redstone, quartz < diamant, émeraude. */
  // générateur netherite : 768 blocs/s. 1/320 $ = 0,5 $ les 160, soit le prix de la version enchantée :
  // brut ou enchanté, la pierre rapporte pareil (pixelgosell paie en décimal, 64 pierres = 0,20 $).
  'minecraft:cobblestone': 0.003125, 'minecraft:blackstone': 0.003125, 'minecraft:end_stone': 0.003125,
  'pixelgo_minions:hard_stone': 0.003125,
  'minecraft:sand': 0.05, 'minecraft:red_sand': 0.05, 'minecraft:gravel': 0.05, 'minecraft:mycelium': 0.05,
  'minecraft:ice': 0.05, 'minecraft:snowball': 0.05, 'minecraft:clay_ball': 0.05, 'minecraft:flint': 0.05,
  'minecraft:slime_ball': 0.1,   // infuseur Mekanism : 1 boule d'argile -> 1 slime
  'minecraft:lava_bucket': 0.1,
  // MINERAIS — depuis le ralentissement des tamis (auto x4 plus lents, tamisage simultané 3x3
  // au lieu de 7x7, compressé non simultané), un tamis compressé automatique rend ~630 diamants
  // et ~1 260 charbons par heure : les minerais peuvent valoir quelque chose.
  'minecraft:iron_ingot': 3, 'minecraft:copper_ingot': 2, 'minecraft:gold_ingot': 4,
  'minecraft:coal': 2, 'minecraft:redstone': 1, 'minecraft:lapis_lazuli': 1, 'minecraft:quartz': 3,
  'minecraft:glowstone_dust': 2, 'minecraft:obsidian': 3,
  'minecraft:gunpowder': 0.2,    // broyeur Mekanism : 1 silex (0,05 $) -> 1 poudre
  'minecraft:charcoal': 0.5,     // pierre philosophale : 1 charbon (2 $) -> 4 charbons de bois
  'minecraft:magma_cream': 0.5, 'minecraft:blaze_powder': 0.5,
  'minecraft:ender_pearl': 4, 'minecraft:bone': 1, 'minecraft:spider_eye': 1,
  'minecraft:rotten_flesh': 0.5, 'minecraft:prismarine_crystals': 0.5, 'minecraft:prismarine_shard': 0.5,
  'minecraft:sponge': 0.5, 'minecraft:wet_sponge': 0.5,
  'minecraft:diamond': 10, 'minecraft:emerald': 8, 'minecraft:ghast_tear': 2, 'minecraft:blaze_rod': 2,
  'minecraft:netherite_scrap': 30,
  'pixelgo_minions:mithril': 50 // minion de mithril uniquement, ~30 par heure : la ressource la plus rare des minions
};
// blocs = 9 (ou 4) unités brutes
const BLOCK = {
  'minecraft:coal_block': ['minecraft:coal', 9], 'minecraft:iron_block': ['minecraft:iron_ingot', 9],
  'minecraft:gold_block': ['minecraft:gold_ingot', 9], 'minecraft:copper_block': ['minecraft:copper_ingot', 9],
  'minecraft:lapis_block': ['minecraft:lapis_lazuli', 9], 'minecraft:redstone_block': ['minecraft:redstone', 9],
  'minecraft:diamond_block': ['minecraft:diamond', 9], 'minecraft:emerald_block': ['minecraft:emerald', 9],
  'minecraft:quartz_block': ['minecraft:quartz', 4], 'minecraft:glowstone': ['minecraft:glowstone_dust', 4],
  'minecraft:snow_block': ['minecraft:snowball', 4], 'minecraft:packed_ice': ['minecraft:ice', 9],
  'minecraft:slime_block': ['minecraft:slime_ball', 9]
};
// Cultures et produits de ferme : prix de revente des marchands (l'ancre, 1 culture = 40 $).
// Ils servent ici à calculer la valeur de leurs items enchantés.
const CROP = {
  'minecraft:wheat': 40, 'minecraft:carrot': 40, 'minecraft:potato': 40, 'minecraft:pumpkin': 40,
  'minecraft:sugar_cane': 40, 'minecraft:cactus': 40, 'minecraft:cocoa_beans': 40, 'minecraft:nether_wart': 40,
  'minecraft:melon_slice': 8, 'minecraft:melon': 80, 'minecraft:wheat_seeds': 10, 'minecraft:poisonous_potato': 5,
  'minecraft:baked_potato': 50, 'minecraft:bread': 140, 'minecraft:hay_block': 400, 'minecraft:sugar': 12,
  'minecraft:green_dye': 18, 'minecraft:brown_mushroom': 3, 'minecraft:red_mushroom': 3,
  'minecraft:brown_mushroom_block': 1, 'minecraft:red_mushroom_block': 1,
  'minecraft:golden_carrot': 40 // carotte + 8 pépites d'or (0,4 $) ; pas revendue brute
};
const unitValue = (id) => RAW[id] ?? CROP[id] ?? (BLOCK[id] ? RAW[BLOCK[id][0]] * BLOCK[id][1] : undefined);
// item enchanté -> [base, quantité] (table ENCHANTED_OF du mod, CraftingCosts.java)
const E = (s) => 'pixelgo_minions:enchanted_' + s;
const ENCHANTED = {
  ...Object.fromEntries(['cobblestone', 'blackstone', 'end_stone', 'sand', 'red_sand', 'mycelium', 'ice',
    'packed_ice', 'snow_block', 'clay_ball', 'flint', 'coal', 'charcoal', 'coal_block', 'iron_ingot', 'iron_block',
    'gold_ingot', 'gold_block', 'copper_ingot', 'copper_block', 'lapis_lazuli', 'glowstone_dust', 'glowstone',
    'obsidian', 'diamond', 'diamond_block', 'emerald', 'emerald_block', 'netherite_scrap', 'lava_bucket', 'quartz_block',
    'redstone_block', 'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log',
    'dandelion', 'poppy', 'rotten_flesh', 'string', 'slime_block', 'bone', 'gunpowder', 'spider_eye', 'feather',
    'magma_cream', 'ender_pearl', 'blaze_powder', 'blaze_rod', 'ghast_tear', 'leather', 'egg', 'rabbit_foot',
    'rabbit_hide', 'cooked_porkchop', 'cooked_mutton', 'cooked_rabbit', 'cooked_cod', 'cooked_salmon',
    'pufferfish', 'tropical_fish', 'prismarine_crystals', 'prismarine_shard', 'sponge', 'wet_sponge']
    .map(s => [E(s), ['minecraft:' + s, 160]])),
  [E('hard_stone')]: ['pixelgo_minions:hard_stone', 160], [E('mithril')]: ['pixelgo_minions:mithril', 160],
  [E('nether_quartz')]: ['minecraft:quartz', 160], [E('redstone_dust')]: ['minecraft:redstone', 160],
  [E('lapis_lazuli_block')]: ['minecraft:lapis_block', 160], [E('slimeball')]: ['minecraft:slime_ball', 160],
  [E('wool')]: ['minecraft:white_wool', 160],
  // cultures et produits de ferme : 160 unités, sans exception (le blé enchanté vaut 160 blés)
  ...Object.fromEntries(['wheat', 'carrot', 'potato', 'pumpkin', 'sugar_cane', 'cactus', 'cocoa_beans', 'nether_wart',
    'melon_slice', 'melon', 'poisonous_potato', 'baked_potato', 'bread', 'sugar', 'brown_mushroom', 'red_mushroom',
    'brown_mushroom_block', 'red_mushroom_block', 'golden_carrot'].map(x => [E(x), ['minecraft:' + x, 160]])),
  [E('seeds')]: ['minecraft:wheat_seeds', 160], [E('hay_bale')]: ['minecraft:hay_block', 160],
  [E('cactus_green')]: ['minecraft:green_dye', 160],
  [E('raw_beef')]: ['minecraft:beef', 160], [E('raw_chicken')]: ['minecraft:chicken', 160],
  [E('raw_porkchop')]: ['minecraft:porkchop', 160], [E('raw_rabbit')]: ['minecraft:rabbit', 160],
  [E('raw_mutton')]: ['minecraft:mutton', 160], [E('raw_cod')]: ['minecraft:cod', 160], [E('raw_salmon')]: ['minecraft:salmon', 160]
};
const round = (v) => Math.max(0.5, v >= 10 ? Math.round(v) : Math.round(v * 100) / 100);
const ENCH_SELL = {};
for (const [id, [base, n]] of Object.entries(ENCHANTED)) { const u = unitValue(base); if (u !== undefined) ENCH_SELL[id] = round(u * n); }
// « cubes » : 160 items enchantés
ENCH_SELL[E('red_sand_cube')] = round(ENCH_SELL[E('red_sand')] * 160);
ENCH_SELL[E('mycelium_cube')] = round(ENCH_SELL[E('mycelium')] * 160);
// « Super » items des minions : 160 items enchantés. Revente = contenu exact ;
// achat au Minion Gear = contenu + 25 % (comme tout marchand, il vend plus cher qu'il ne rachète).
const SUPER = {
  'pixelgo_minions:box_of_seeds': E('seeds'), 'pixelgo_minions:polished_pumpkin': E('pumpkin'),
  'pixelgo_minions:mutant_nether_wart': E('nether_wart'), 'pixelgo_minions:super_enchanted_egg': E('egg'),
  'pixelgo_minions:absolute_ender_pearl': E('ender_pearl'), 'pixelgo_minions:concentrated_stone': E('hard_stone')
};
for (const [id, base] of Object.entries(SUPER)) {
  ENCH_SELL[id] = round(ENCH_SELL[base] * 160);
  BUY[id] = Math.round(ENCH_SELL[id] * 1.25);
}

// Prix d'achat des matériaux : MARKUP x revente (cultures comprises)
const MAT_BUY = {};
for (const [id, v] of Object.entries({ ...RAW, ...CROP })) {
  if (id === 'minecraft:golden_carrot') continue; // pas revendue brute
  MAT_BUY[id] = Math.max(1, Math.round(v * MARKUP));
}
for (const [id, [base, n]] of Object.entries(BLOCK)) MAT_BUY[id] = Math.max(1, Math.round(RAW[base] * n * MARKUP));
for (const [id, b] of Object.entries(MAT_BUY)) if (!(id in BUY)) BUY[id] = b;

/* MINIONS — un minion de palier I se CRAFTE (recette du mod) : 8 x 10 de sa ressource autour
 * d'un outil en bois. Son prix en boutique = ces 80 ressources au prix d'achat + l'outil :
 * l'acheter ne coûte ni plus ni moins que d'en acheter les matériaux. Avant : 45 000 à 720 000 $
 * (minion de diamant : 720 000 $ pour 80 diamants, sans rapport avec son craft).
 * DEPUIS LE 2026-10-14 les minions ne sont plus vendus du tout (REMOVE_MATCH plus bas) : ce
 * barème ne s'applique plus qu'à un minion qu'on remettrait en boutique. */
const MINION_DROP = {
  cobblestone: 'minecraft:cobblestone', coal: 'minecraft:coal', iron: 'minecraft:iron_ingot', gold: 'minecraft:gold_ingot',
  diamond: 'minecraft:diamond', lapis: 'minecraft:lapis_lazuli', emerald: 'minecraft:emerald', redstone: 'minecraft:redstone',
  quartz: 'minecraft:quartz', obsidian: 'minecraft:obsidian', glowstone: 'minecraft:glowstone_dust', gravel: 'minecraft:gravel',
  sand: 'minecraft:sand', red_sand: 'minecraft:red_sand', mycelium: 'minecraft:mycelium', end_stone: 'minecraft:end_stone',
  hard_stone: 'pixelgo_minions:hard_stone', ice: 'minecraft:ice', snow: 'minecraft:snowball', mithril: 'pixelgo_minions:mithril',
  copper: 'minecraft:copper_ingot', blackstone: 'minecraft:blackstone', netherite: 'minecraft:netherite_scrap',
  wheat: 'minecraft:wheat', carrot: 'minecraft:carrot', potato: 'minecraft:potato', pumpkin: 'minecraft:pumpkin',
  melon: 'minecraft:melon_slice', mushroom: 'minecraft:red_mushroom', cactus: 'minecraft:cactus',
  cocoa_beans: 'minecraft:cocoa_beans', sugar_cane: 'minecraft:sugar_cane', nether_wart: 'minecraft:nether_wart',
  chicken: 'minecraft:chicken', cow: 'minecraft:beef', pig: 'minecraft:porkchop', sheep: 'minecraft:mutton',
  rabbit: 'minecraft:rabbit', sunflower: 'minecraft:sunflower', oak: 'minecraft:oak_log', spruce: 'minecraft:spruce_log',
  birch: 'minecraft:birch_log', dark_oak: 'minecraft:dark_oak_log', acacia: 'minecraft:acacia_log', jungle: 'minecraft:jungle_log',
  flower: 'minecraft:dandelion', fishing: 'minecraft:cod', clay: 'minecraft:clay_ball', lily_pad: 'minecraft:lily_pad',
  zombie: 'minecraft:rotten_flesh', skeleton: 'minecraft:bone', spider: 'minecraft:string', cave_spider: 'minecraft:string',
  creeper: 'minecraft:gunpowder', enderman: 'minecraft:ender_pearl', ghast: 'minecraft:ghast_tear', slime: 'minecraft:slime_ball',
  magma_cube: 'minecraft:magma_cream', blaze: 'minecraft:blaze_rod', revenant: 'minecraft:rotten_flesh',
  tarantula: 'minecraft:string', voidling: 'minecraft:quartz', inferno: 'minecraft:blaze_powder'
};
const WOODEN_TOOL = 10;
for (const [type, drop] of Object.entries(MINION_DROP)) {
  const cost = 80 * MAT_BUY[drop] + WOODEN_TOOL;
  BUY['pixelgo_minions:' + type + '_minion'] = Math.max(50, Math.round(cost / 50) * 50);
}

// Objets retirés de TOUTES les boutiques (voir le commentaire sur les livres enchantés).
const REMOVE_EVERYWHERE = new Set(['minecraft:enchanted_book']);
// Les minions eux-mêmes (2026-10-14) : ils se craftent, ils ne s'achètent plus. L'équipement et
// les outils de minion restent en boutique — les outils n'ont aucune recette.
const REMOVE_MATCH = [/^pixelgo_minions:[a-z_]+_minion$/];

// Produits de minion absents de toute boutique : ajoutés (achat au prix des matières
// vanilla, revente au barème). Les items enchantés manquants reviennent au Rachat.
ADD['pixelgo/pixelmon/npc/preset/shopkeeper/02_farm/farm_market.json'] =
  ['allium', 'azure_bluet', 'blue_orchid', 'oxeye_daisy', 'red_tulip', 'orange_tulip', 'white_tulip',
    'pink_tulip', 'lilac', 'peony', 'rose_bush', 'sunflower'].map(i => ({ id: 'minecraft:' + i, buy: 150, sell: RAW['minecraft:' + i] }));
ADD['pixelgo/pixelmon/npc/preset/shopkeeper/03_materials/building_blocks.json'] =
  [{ id: 'minecraft:lily_pad', buy: 150, sell: RAW['minecraft:lily_pad'] }];
ADD['pixelgo/pixelmon/npc/preset/shopkeeper/12_minions/minion_buyer.json'] =
  Object.keys(ENCH_SELL).map(id => ({ id, buy: 0, sell: ENCH_SELL[id] }));

/* DÉCORATION — Handcrafted, Another Furniture, Factory Blocks, Pixelmon, Minecraft.
 * Prix = coût du craft au prix des marchands, calculé par deco.mjs (deco.json). Achat seul :
 * la déco dépense l'argent, elle n'en crée jamais. */
{
  const deco = readJson(path.join(ROOT, 'tools', 'pixelgo-economy', 'deco.json'));
  // identifiants sans objet enregistré : un seul fait rejeter tout le preset (le monde ne charge plus)
  for (const id of deco.notItems || []) REMOVE_EVERYWHERE.add(id);
  for (const [shop, list] of Object.entries(deco.shops)) {
    ADD['pixelgo/pixelmon/npc/preset/shopkeeper/' + shop + '.json'] = list.map(([id, p]) => ({ id, buy: p, sell: 0 }));
    for (const [id, p] of list) BUY[id] = p;
  }
}

/* --------------------------------------------------------------------------
 *  Passage sur tous les presets du pack (overrides kubejs uniquement)
 * ------------------------------------------------------------------------ */
const keyOf = (it) => (typeof it === 'string' ? it : it.id) + (it.components ? '|' + JSON.stringify(it.components) : '');
const stats = { sell: 0, buy: 0, removed: 0, added: 0 };
const PRESETS = walk(KDATA).filter(f => /[\\/]pixelmon[\\/]npc[\\/]preset[\\/]/.test(f) && f.endsWith('.json'));

/* Les marchands ont été réorganisés par catégorie (shops.mjs) : les fichiers nommés dans ADD
 * n'existent plus. Un article d'ADD n'est donc ajouté que s'il n'est vendu NULLE PART, et il
 * atterrit dans le Bazar ; relancer ensuite shops.mjs le range dans son rayon. */
const INBOX = 'pixelgo/pixelmon/npc/preset/shopkeeper/01_island/general_store.json';
const everywhere = new Set();
for (const f of PRESETS) {
  const scan = (o) => { if (Array.isArray(o)) return o.forEach(scan); if (!o || typeof o !== 'object') return;
    if ('item' in o && 'buyPrice' in o) { everywhere.add(keyOf(o.item)); return; } Object.values(o).forEach(scan); };
  scan(readJson(f));
}
const pendingAdds = Object.entries(ADD).flatMap(([file, list]) => list.map(a => ({ ...a, file })))
  .filter(a => !everywhere.has(keyOf(a.components ? { id: a.id, components: a.components } : { id: a.id })));
for (const a of pendingAdds) if (!fs.existsSync(path.join(KDATA, a.file))) a.file = INBOX;

for (const f of PRESETS) {
  const rel = path.relative(KDATA, f).split(path.sep).join('/');
  const j = readJson(f);
  const shops = [];
  const find = (el) => { if (Array.isArray(el)) return el.forEach(find); if (!el || typeof el !== 'object') return;
    if (el.type === 'pixelmon:open_shop' && Array.isArray(el.items)) shops.push(el); for (const v of Object.values(el)) find(v); };
  find(j);
  for (const shop of shops) {
    shop.items = shop.items.filter(e => {
      const id = typeof e.item === 'string' ? e.item : e.item.id;
      if (REMOVE_EVERYWHERE.has(id) || REMOVE_MATCH.some(r => r.test(id))) { stats.removed++; return false; }
      return true;
    });
    for (const e of shop.items) {
      const id = typeof e.item === 'string' ? e.item : e.item.id;
      const key = keyOf(e.item);
      let s = e.sellPrice;
      if (id in SELL && e.sellPrice > 0) s = SELL[id];
      if (/^pixelmon:[a-z_]+_berry$/.test(id) && e.sellPrice > BERRY_SELL) s = BERRY_SELL;
      if (id in RAW && RAW[id] > 0) s = RAW[id];
      if (id in ENCH_SELL) s = ENCH_SELL[id];
      if (s !== e.sellPrice) { e.sellPrice = s; stats.sell++; }
      if (rel.startsWith('pixelgo/') && (key in BUY || id in BUY)) {
        const b = BUY[key] ?? BUY[id];
        if (b !== e.buyPrice) { e.buyPrice = b; stats.buy++; }
      } else if (rel.startsWith('pixelgo/') && e.buyPrice > 0) {
        for (const [match, conv] of BUY_RULES) if (match(id)) {
          const b = conv(e.buyPrice);
          if (b !== e.buyPrice) { e.buyPrice = b; stats.buy++; }
        }
      }
    }
    // ajouts (dans le premier open_shop du fichier ciblé), seulement s'ils manquent partout
    if (shop === shops[0]) {
      for (const a of pendingAdds.filter(p => p.file === rel)) {
        const item = a.components ? { id: a.id, count: 1, components: a.components } : { id: a.id, count: 1 };
        const k = keyOf(item);
        if (shop.items.some(e => keyOf(e.item) === k)) continue;
        shop.items.push({ item, buyPrice: a.buy || 0, sellPrice: a.sell || 0 }); stats.added++;
      }
    }
  }
  writeJson(f, j);
}
log.push(`presets : ${stats.sell} prix de revente, ${stats.buy} prix d'achat, ${stats.removed} retraits, ${stats.added} ajouts`);

/* ============================================================================
 *  4 bis. DISTRIBUTEUR (Recycler / « Vending Machine », guinimospixelmon)
 *  Le mod revend à `price` et rachète à floor(price / 2) — un seul chiffre pour les deux.
 *  Tout ce qu'il liste sort d'un générateur infini : le prix est donc fixé à 1 $ (rachat 0 $)
 *  sauf quand un prix plus haut évite de transformer un achat à 1 $ en revente ailleurs :
 *    bloc de slime 45 $ -> 9 boules à 40 $ = 360 $   (+315 $ par clic)
 *    argile 3 $        -> 4 boules à 40 $ = 160 $    (et 4 slime via Mekanism)
 *    TNT rachetée 250 $ pour 5 poudres à canon tamisées
 *  Rachat = moitié du prix d'achat, jamais au-dessus de la valeur des ingrédients.
 * ========================================================================== */
const RECYCLER = [
  // pierres et terres de générateur — achat 1 $, rachat 0 $
  ...['cobblestone', 'stone', 'granite', 'diorite', 'andesite', 'polished_granite', 'polished_diorite',
    'polished_andesite', 'dirt', 'coarse_dirt', 'sand', 'red_sand', 'gravel', 'sandstone', 'red_sandstone',
    'clay', 'terracotta', 'netherrack', 'deepslate', 'cobbled_deepslate', 'basalt', 'blackstone']
    .map(i => ['minecraft:' + i, 1]),
  // bois (arbres en pot : infini) — achat 1 $, rachat 0 $
  ...['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry'].map(w => ['minecraft:' + w + '_log', 40]), // rachat 20 $ = bûche au barème
  // laine (ficelle de ver à soie, moutons) — achat 1 $, rachat 0 $
  ...['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan',
    'purple', 'blue', 'brown', 'green', 'red', 'black'].map(c => ['minecraft:' + c + '_wool', 4]), // rachat 2 $ = laine au barème
  ['minecraft:bone_block', 2],        // rachat 1 $ < 3 os (3 $)
  ['minecraft:slime_block', 2],       // 9 boules à 0,1 $ : rachat 1 $
  ['minecraft:magma_block', 2],       // broyeur Cyclic : 2 crèmes de magma (1 $)
  ['minecraft:prismarine', 4],        // 4 éclats à 0,5 $ (broyeurs Cyclic / Mekanism) : rachat 2 $
  ['minecraft:prismarine_bricks', 9], // 9 éclats
  ['minecraft:dark_prismarine', 8],   // 8 éclats
  ['minecraft:sponge', 1],            // recette Ex Deorum, solidificateur Cyclic, réservoir EnderIO
  ['minecraft:purpur_block', 1],      // chorus, solidificateur Cyclic, essence Mystical Agriculture
  ['minecraft:bow', 1],               // ficelle (0,05 $) + bâtons : plus de rachat
  ['minecraft:crossbow', 1],
  ['minecraft:fishing_rod', 1],
  ['minecraft:lead', 1],
  ['minecraft:tnt', 1],               // 5 poudres à 0,1 $ : un rachat à 3 $ serait une boucle

  /* --- CATALOGUE DE CONSTRUCTION ET DE DÉCORATION ------------------------------
   *  Ce qu'on trouve dans la boutique « blocs » de n'importe quel serveur. Tout sort
   *  d'une source infinie du pack (sable, gravier, argile, bois, teintures de fleurs),
   *  donc prix 1 $ et rachat 0 $. Exclus volontairement : ce qui se revend chez un
   *  marchand (teinture verte, fleurs, cultures, nourriture), ce qui accélère la ferme
   *  du mur des 15 h (poudre d'os) et les matières de progression (quartz, pierre
   *  lumineuse, minerais) — celles-là sont chez les marchands, sans rachat. */
  ...['glass', 'glass_pane', 'bricks', 'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks',
    'chiseled_stone_bricks', 'smooth_stone', 'mossy_cobblestone', 'smooth_sandstone', 'cut_sandstone',
    'nether_bricks', 'red_nether_bricks', 'end_stone', 'end_stone_bricks', 'purpur_pillar',
    'polished_deepslate', 'deepslate_bricks', 'deepslate_tiles', 'polished_blackstone',
    'polished_blackstone_bricks', 'polished_basalt', 'smooth_basalt', 'tuff', 'calcite', 'mud_bricks',
    'packed_mud', 'moss_block', 'grass_block', 'podzol', 'ice', 'packed_ice', 'snow_block']
    .map(i => ['minecraft:' + i, 1]),
  ...['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'bamboo', 'crimson', 'warped']
    .map(w => ['minecraft:' + w + '_planks', 1]),
  ['minecraft:crimson_stem', 1], ['minecraft:warped_stem', 1],
  ...['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'cherry'].map(w => ['minecraft:' + w + '_sapling', 1]),
  ...['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'cherry'].map(w => ['minecraft:' + w + '_leaves', 1]),
  ...COLORS().flatMap(c => [
    ['minecraft:' + c + '_stained_glass', 1], ['minecraft:' + c + '_concrete', 1],
    ['minecraft:' + c + '_concrete_powder', 1], ['minecraft:' + c + '_terracotta', 1]
  ]),
  ...COLORS().filter(c => c !== 'green').map(c => ['minecraft:' + c + '_dye', 1]), // teinture verte revendue 18 $
  // utilitaires de base
  ['minecraft:torch', 1], ['minecraft:ladder', 1], ['minecraft:chest', 1], ['minecraft:barrel', 1],
  ['minecraft:crafting_table', 1], ['minecraft:furnace', 1], ['minecraft:scaffolding', 1],
  ['minecraft:white_bed', 1], ['minecraft:lantern', 2], ['minecraft:bookshelf', 2]
];
function COLORS () {
  return ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan',
    'purple', 'blue', 'brown', 'green', 'red', 'black'];
}
{
  const f = path.join(ROOT, 'config', 'guinimospixelmon', 'shoplist.json');
  if (!fs.existsSync(f)) log.push('distributeur : mod guinimospixelmon absent, ignoré'); else {
  // Écrit à la main pour garder une entrée par ligne, comme le fichier d'origine.
  const txt = '[\n' + RECYCLER.map(([i, p]) => `  {"item":"${i}","price":${p}}`).join(',\n') + '\n]\n';
  if (fs.readFileSync(f, 'utf8').replace(/\r/g, '') !== txt) { changed.add(path.relative(ROOT, f)); if (!DRY) put(f, txt); }
  log.push(`distributeur : ${RECYCLER.length} articles`);
  }
}

/* ============================================================================
 *  5. POKE HUNTER (guinimospixelmon) — récompenses codées en dur dans le mod :
 *     difficulté 5 = 1 Master Ball + 20 Super Bonbons + 40 grosses pépites (16 000 $)
 *     difficulté 4 = 64 Hyper Balls + 64 Rapide Balls + 10 Super Bonbons + 10 grosses pépites
 *  Des espèces communes y figuraient (Kangourex, Alakazam, Onix, Leveinard...). On ne touche
 *  qu'aux cas qui PAYAIENT TROP : difficulté 5 réservée aux légendaires / fabuleux / Ultra-Chimères
 *  / paradoxes et aux Pokémon de base-total >= 600 ; la difficulté 4 exige >= 480.
 * ========================================================================== */
{
  const f = path.join(ROOT, 'config', 'guinimospixelmon', 'rarity.json');
  if (!fs.existsSync(f)) log.push('poke hunter : mod guinimospixelmon absent, ignoré'); else {
  const cat = readJson(path.join(ROOT, 'tools', 'pixelgo-drops', 'catalog-species.json'));
  const by = {}; for (const k of Object.keys(cat)) by[k.toLowerCase()] = cat[k];
  const r = readJson(f); let n = 0;
  const RESTRICTED = /legend|myth|ultra|paradox/i;
  for (const x of r) {
    const s = by[x.name.toLowerCase()];
    if (!s) continue;
    const restricted = s.legendary || (s.tags || []).some(t => RESTRICTED.test(t));
    let d = x.difficulty;
    if (d === 5 && !restricted && s.bst < 600) d = 4;
    if (d === 4 && !restricted && s.bst < 480) d = s.bst >= 400 ? 3 : 2;
    if (d !== x.difficulty) { x.difficulty = d; n++; }
  }
  const txt = '[\n' + r.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n]\n';
  if (fs.readFileSync(f, 'utf8').replace(/\r/g, '') !== txt) { changed.add(path.relative(ROOT, f)); if (!DRY) put(f, txt); }
  log.push(`poke hunter : ${n} espèces reclassées`);
  }
}

/* ============================================================================
 *  6. BOTANY POTS — cultures REVENDABLES : 2400 ticks au lieu de 1200, et UNE culture par
 *  récolte (≈ 40 $). La table de butin vanilla donnait en plus 1 à 4 graines de blé (10 $
 *  pièce) ou 1 à 4 carottes / pommes de terre : un pot de carottes rapportait 2,7 fois un pot
 *  de blé. Les cultures techniques (Mystical Agriculture, arbres, fleurs de teinture) gardent
 *  leur vitesse et leur butin : on ne freine que ce qui se transforme en argent.
 * ========================================================================== */
{
  const SLOW = ['wheat', 'carrots', 'potatoes', 'pumpkin', 'melon', 'sugar_cane', 'cactus', 'cocoa',
    'nether_wart', 'brown_mushroom', 'red_mushroom'];
  const YIELD = {
    wheat: ['minecraft:wheat', 1], carrots: ['minecraft:carrot', 1], potatoes: ['minecraft:potato', 1],
    pumpkin: ['minecraft:pumpkin', 1], melon: ['minecraft:melon_slice', 5], sugar_cane: ['minecraft:sugar_cane', 1],
    cactus: ['minecraft:cactus', 1], cocoa: ['minecraft:cocoa_beans', 1], nether_wart: ['minecraft:nether_wart', 1],
    brown_mushroom: ['minecraft:brown_mushroom', 1], red_mushroom: ['minecraft:red_mushroom', 1]
  };
  const jar = fs.readdirSync(path.join(ROOT, 'mods')).find(f => /^botanypots-neoforge/.test(f));
  const { readZip } = await import('./zip.mjs');
  const z = readZip(path.join(ROOT, 'mods', jar), n => /^data\/botanypots\/recipe\/minecraft\/crop\/[a-z_]+\.json$/.test(n));
  let n = 0;
  for (const c of SLOW) {
    const buf = z.get(`data/botanypots/recipe/minecraft/crop/${c}.json`);
    if (!buf) { log.push('  ! culture Botany Pots introuvable : ' + c); continue; }
    const j = JSON.parse(buf.toString('utf8'));
    j.grow_time = 2400;
    const [item, count] = YIELD[c];
    j.drops = [{ type: 'botanypots:items', items: [{ result: { id: item, count } }] }];
    writeJson(path.join(KDATA, 'botanypots', 'recipe', 'minecraft', 'crop', c + '.json'), j); n++;
  }
  log.push(`botany pots : ${n} cultures ralenties`);
}

/* ============================================================================
 *  7. MYSTICAL AGRICULTURE — 3 essences de nature donnaient 8 blés (320 $), 9 donnaient
 *  16 pastèques (1 440 $) : ~107 $ l'essence, soit 2,7 x la culture qu'elles remplacent.
 *  Nouvelle règle : une essence ≈ une culture (≈ 40 $).
 * ========================================================================== */
{
  const COUNTS = { wheat: 3, carrot: 3, potato: 3, cocoa_beans: 3, nether_wart: 3, brown_mushroom: 3,
    red_mushroom: 3, sugar_cane: 7, cactus: 8, pumpkin: 8, melon: 4,
    // essence de bois : 3 essences -> 16 bûches (107 $/essence) ; 6 bûches = 40 $/essence
    oak_log: 6, spruce_log: 6, birch_log: 6, jungle_log: 6, acacia_log: 6, dark_oak_log: 6, mangrove_log: 6, cherry_log: 6 };
  const jar = fs.readdirSync(path.join(ROOT, 'mods')).find(f => /^MysticalAgriculture-/.test(f));
  const { readZip } = await import('./zip.mjs');
  const z = readZip(path.join(ROOT, 'mods', jar), n => /^data\/mysticalagriculture\/recipe\/essence\/minecraft\/[a-z_]+\.json$/.test(n));
  let n = 0;
  for (const [c, cnt] of Object.entries(COUNTS)) {
    const buf = z.get(`data/mysticalagriculture/recipe/essence/minecraft/${c}.json`);
    if (!buf) { log.push('  ! recette MA introuvable : ' + c); continue; }
    const j = JSON.parse(buf.toString('utf8'));
    j.result.count = cnt;
    writeJson(path.join(KDATA, 'mysticalagriculture', 'recipe', 'essence', 'minecraft', c + '.json'), j); n++;
  }
  log.push(`mystical agriculture : ${n} recettes d'essence ajustées`);
}

/* ============================================================================
 *  8. PROJECTE — (historique : les collecteurs ProjectExpansion produisaient des milliards d'EMC/s ;
 *     depuis 2026-11-08 ProjectE ne génère plus d'EMC, mais la règle reste une sécurité.)
 *  Tout objet revendable qui a une valeur EMC devient donc de l'argent infini par
 *  transmutation. On retire de l'EMC TOUT ce qui se revend (valeur 0 = hors système).
 *  La liste est recalculée depuis les boutiques ; les entrées déjà présentes sont conservées.
 * ========================================================================== */
{
  const f = path.join(ROOT, 'config', 'ProjectE', 'custom_emc.json');
  const j = readJson(f);
  const sellable = new Set();
  // presets (overrides kubejs + jar Pixelmon indexés par l'outil d'analyse) : on relit ce qu'on vient d'écrire
  for (const pf of walk(KDATA).filter(p => /[\\/]npc[\\/]preset[\\/]/.test(p))) {
    const t = DRY ? null : readJson(pf);
    const scan = (el) => { if (Array.isArray(el)) return el.forEach(scan); if (!el || typeof el !== 'object') return;
      if ('item' in el && 'sellPrice' in el) { if (el.sellPrice > 0) sellable.add(typeof el.item === 'string' ? el.item : el.item.id); return; }
      for (const v of Object.values(el)) scan(v); };
    if (t) scan(t);
  }
  for (const [i, p] of RECYCLER) if (Math.floor(p / 2) > 0) sellable.add(i);
  const missing = [...sellable].sort().filter(id => !(id in j.entries));
  // Insertion textuelle en fin d'objet `entries`, pour garder les regroupements du fichier.
  if (missing.length) {
    let txt = fs.readFileSync(f, 'utf8');
    const end = txt.lastIndexOf('}', txt.lastIndexOf('}') - 1);          // accolade fermante de `entries`
    const body = txt.slice(0, end).replace(/\s*$/, '');
    const add = missing.map(id => `    "${id}": 0`).join(',\n');
    txt = body + ',\n\n' + add + '\n  }\n}\n';
    JSON.parse(txt); // garde-fou : le fichier doit rester du JSON valide
    changed.add(path.relative(ROOT, f)); if (!DRY) put(f, txt);
  }
  log.push(`projecte : ${missing.length} objets revendables retirés de l'EMC (${sellable.size} revendables au total)`);
}

/* 9. DRESSEURS — déplacé dans tools/pixelgo-economy/trainers.mjs (2026-11-08 : plafond 200 $ des sauvages,
 *  puis tous les gains de dresseurs ÷ 10). Ne pas le remettre ici : il écraserait les montants. */

console.log(log.join('\n'));
console.log(`${changed.size} fichier(s) ${DRY ? 'à modifier' : 'modifié(s)'}`);
for (const c of [...changed].sort()) console.log('  ' + c);
