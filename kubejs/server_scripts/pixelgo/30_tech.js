// priority: 100
/* =============================================================================
 *  PixelGO — To the Sky : mods techniques
 * =============================================================================
 *  Portage de kubejs/server_scripts/{mekanism,mystical,projecte,extendedcrafting,
 *  refinestorage,other,minecraft,exnihilosequentia}/*.js.
 *
 *  ÉQUIVALENCES DE MODS (1.16.5 -> 1.21.1)
 *  --------------------------------------
 *    Thermal Series        -> EnderIO (alliages) + Mekanism (traitement)
 *    Emendatus Enigmatica  -> Mekanism / Pixelmon / vanilla (EE 2.x ne définit
 *                             aucun matériau tant que config/emendatusenigmatica/
 *                             material/ est vide, ce qui est le cas ici)
 *    Ex Nihilo Sequentia   -> Ex Deorum (tamis, marteaux, fragments de minerai)
 *    Storage Drawers       -> Sophisticated Storage
 *    Compressium           -> blocs vanilla / Extended Crafting
 *    Refined Storage 1.9   -> Refined Storage 2.x (IDs d'items refondus)
 * ========================================================================== */

ServerEvents.recipes(event => {
  const singIng = PIXELGO_SING_ING

  /* =========================================================================
   *  1. MEKANISM — montée en tier des usines par installateur.
   *  (Recettes identiques à la 1.16.5, les IDs Mekanism n'ont pas changé.)
   * ====================================================================== */
  const FACTORY_TYPES = [
    'smelting', 'enriching', 'crushing', 'compressing', 'combining',
    'purifying', 'injecting', 'infusing', 'sawing'
  ]
  const BASE_MACHINE = {
    smelting: 'mekanism:energized_smelter',
    enriching: 'mekanism:enrichment_chamber',
    crushing: 'mekanism:crusher',
    compressing: 'mekanism:osmium_compressor',
    combining: 'mekanism:combiner',
    purifying: 'mekanism:purification_chamber',
    injecting: 'mekanism:chemical_injection_chamber',
    infusing: 'mekanism:metallurgic_infuser',
    sawing: 'mekanism:precision_sawmill'
  }

  FACTORY_TYPES.forEach(type => {
    event.shapeless(`mekanism:basic_${type}_factory`, [
      BASE_MACHINE[type], 'mekanism:basic_tier_installer'
    ])
    event.shapeless(`mekanism:advanced_${type}_factory`, [
      `mekanism:basic_${type}_factory`, 'mekanism:advanced_tier_installer'
    ])
    event.shapeless(`mekanism:elite_${type}_factory`, [
      `mekanism:advanced_${type}_factory`, 'mekanism:elite_tier_installer'
    ])
    event.shapeless(`mekanism:ultimate_${type}_factory`, [
      `mekanism:elite_${type}_factory`, 'mekanism:ultimate_tier_installer'
    ])
  })

  /* =========================================================================
   *  2. MYSTICAL AGRICULTURE
   * ====================================================================== */
  event.shapeless('mysticalagriculture:soulium_dust', [
    'mekanism:dust_coal', 'mekanism:sawdust'
  ])

  event.shaped('4x mysticalagriculture:soulstone_cobble', ['11', '11'], {
    1: 'minecraft:cobblestone'
  })

  // Autel & piédestal d'infusion : le cadre de cellule fluide de Thermal est
  // remplacé par le lingot d'acier sombre d'EnderIO.
  event.shaped('mysticalagriculture:infusion_altar', [' D ', 'BEB', 'AFA'], {
    A: 'extendedcrafting:crystaltine_catalyst',
    B: 'extendedcrafting:black_iron_slate',
    D: 'mekanism:enriched_gold',
    E: 'extendedcrafting:black_iron_ingot',
    F: 'enderio:dark_steel_ingot'
  })

  event.shaped('mysticalagriculture:infusion_pedestal', [' D ', ' C ', 'ABA'], {
    A: 'extendedcrafting:black_iron_slate',
    B: 'enderio:dark_steel_ingot',
    C: 'extendedcrafting:black_iron_ingot',
    D: 'mekanism:enriched_gold'
  })

  event.shaped('mysticalagriculture:machine_frame', ['BAB', 'ACA', 'BAB'], {
    A: '#c:glass_blocks',
    B: 'minecraft:quartz',
    C: '#c:gears/gold'
  })

  event.shaped('extendedcrafting:luminessence', [' 2 ', '212', ' 2 '], {
    1: 'mysticalagriculture:master_infusion_crystal',
    2: 'pixelmon:yellow_apricorn'
  })

  // Boussole d'explorateur : infusion à partir de 4 boussoles naturelles
  // et 4 singularités de baies.
  event.custom({
    type: 'mysticalagriculture:infusion',
    input: { item: 'minecraft:compass' },
    ingredients: [
      singIng('berry'), { item: 'naturescompass:naturescompass' },
      singIng('berry'), { item: 'naturescompass:naturescompass' },
      singIng('berry'), { item: 'naturescompass:naturescompass' },
      singIng('berry'), { item: 'naturescompass:naturescompass' }
    ],
    result: { id: 'explorerscompass:explorerscompass' }
  })

  /* =========================================================================
   *  3. EXTENDED CRAFTING — le catalyseur ultime, cœur de la progression.
   * ====================================================================== */

  /* --- Singularité ultime (2026-11-08) ------------------------------------
   * La recette du mod (`extendedcrafting:ultimate_singularity`, retirée en
   * 00_removals.js) demande TOUTES les singularités de config/extendedcrafting/
   * singularities, dont nickel, dont le tag `c:ingots/nickel` est vide dans ce
   * pack : elle était infaisable. L'objet ne venait plus que de la boutique
   * « Fin de partie ».
   *
   * Remplacement : une de chaque singularité de MATÉRIAU fabricable
   * (minerais, gemmes, poussières), en table ultime sans forme. Restent dehors :
   *   - electrum, invar, nickel : tags vides, rien à compresser ;
   *   - rubis, saphir : drops RARES du tamis, 1 000 de chaque = trop ;
   *   - apricots, baies, balls, étoile du Nether, Master Ball, EMC : le
   *     catalyseur ultime les demande déjà à côté de cette singularité.
   * --------------------------------------------------------------------- */
  const ULTIMATE_SINGULARITY_INPUTS = [
    'coal', 'iron', 'gold', 'copper', 'redstone', 'lapis_lazuli', 'glowstone',
    'diamond', 'emerald', 'steel', 'bronze', 'osmium', 'tin', 'lead',
    'uranium', 'fluorite', 'sulfur', 'aluminum', 'silver', 'platinum'
  ]
  event.custom({
    type: 'extendedcrafting:shapeless_table',
    tier: 4,
    ingredients: ULTIMATE_SINGULARITY_INPUTS.map(singIng),
    result: { id: 'extendedcrafting:ultimate_singularity', count: 1 }
  }).id('kubejs:ultimate_singularity')

  /* --- The Ultimate Component (2026-11-08) --------------------------------
   * La recette du mod demande 2 `the_ultimate_ingot`, que rien ne produit en
   * 1.21.1 (seulement pépites <-> lingot <-> bloc) : l'objet ne sortait que de
   * la table de butin `supra_reward` et de la boutique. Nouvelle recette en
   * table avancée (5x5) : la panoplie des composants d'Extended Crafting
   * autour d'une étoile du Nether.
   * --------------------------------------------------------------------- */
  event.custom({
    type: 'extendedcrafting:shaped_table',
    tier: 2,
    pattern: [
      'ULSLU',
      'LABCL',
      'SDXES',
      'LFGHL',
      'ULSLU'
    ],
    key: {
      U: { item: 'extendedcrafting:ultimate_component' },
      L: { item: 'extendedcrafting:luminessence' },
      S: { item: 'extendedcrafting:black_iron_slate' },
      A: { item: 'extendedcrafting:basic_component' },
      B: { item: 'extendedcrafting:advanced_component' },
      C: { item: 'extendedcrafting:elite_component' },
      D: { item: 'extendedcrafting:redstone_component' },
      E: { item: 'extendedcrafting:ender_component' },
      F: { item: 'extendedcrafting:enhanced_redstone_component' },
      G: { item: 'extendedcrafting:enhanced_ender_component' },
      H: { item: 'extendedcrafting:crystaltine_component' },
      X: { item: 'minecraft:nether_star' }
    },
    result: { id: 'extendedcrafting:the_ultimate_component', count: 1 }
  }).id('kubejs:the_ultimate_component')

  /* --- The Ultimate Ingot (2026-11-09) -------------------------------------
   * Rien ne le produisait en 1.21.1 (seulement pépites <-> lingot <-> bloc) ;
   * il sortait des Mystery Bags tier 4, retiré du butin le même jour. Il prend
   * dans la Pierre philosophale la place de l'Infinity Upgrade supprimée.
   * Table avancée (5x5), uniquement des lingots enchantés PixelGO Minions :
   * 9 fer, 8 or, 8 cuivre (chacun = 160 lingots).
   * --------------------------------------------------------------------- */
  event.custom({
    type: 'extendedcrafting:shaped_table',
    tier: 2,
    pattern: [
      'GICIG',
      'ICGCI',
      'CGIGC',
      'ICGCI',
      'GICIG'
    ],
    key: {
      I: { item: 'pixelgo_minions:enchanted_iron_ingot' },
      G: { item: 'pixelgo_minions:enchanted_gold_ingot' },
      C: { item: 'pixelgo_minions:enchanted_copper_ingot' }
    },
    result: { id: 'extendedcrafting:the_ultimate_ingot', count: 1 }
  }).id('kubejs:the_ultimate_ingot')

  event.custom({
    type: 'extendedcrafting:shaped_table',
    pattern: ['123', '456', '789'],
    key: {
      1: singIng('master_ball'),
      2: { item: 'extendedcrafting:ultimate_singularity' },
      3: singIng('berry'),
      4: singIng('all_apricorn'),
      5: { item: 'extendedcrafting:the_ultimate_component' },
      6: singIng('nether_star'),
      7: singIng('hyper_ball'),
      8: singIng('poke_ball'),
      9: singIng('emc_singularity')
    },
    result: { id: 'extendedcrafting:the_ultimate_catalyst', count: 1 }
  })

  /* Étoile du Nether en table étendue tier 3 (recette de remplacement,
   * l'étoile n'étant plus obtenable par graine Mystical Agriculture).
   *
   * ATTENTION — DÉPENDANCE CIRCULAIRE (corrigée le 26/09/2026)
   * ----------------------------------------------------------
   * La première version de cette recette était infabricable : TROIS de ses
   * ingrédients ont besoin d'une étoile du Nether pour exister.
   *
   *   extendedcrafting:ender_star           <- 1 nether_star (Ender Crafter)
   *   extendedcrafting:enhanced_ender_ingot <- ender_star
   *   extendedcrafting:crystaltine_ingot    <- chaîne crystaltine, tainted
   *
   * Avec 14 ender_star en bordure, il fallait donc 14 étoiles du Nether pour
   * en produire 1. Les trois ont été remplacés par des matériaux dont AUCUNE
   * étape ne passe par une étoile (vérifié sur le graphe des 86 recettes
   * d'Extended Crafting) :
   *
   *   H bordure  ->  elite_catalyst        (safe)
   *   A colonne  ->  insanium_ingot        (safe, déjà utilisé plus bas)
   *   D colonne  ->  end_steel_ingot       (safe)
   *
   * Règle à retenir : dans Extended Crafting, tout ce qui touche à
   * `crystaltine`, `ender_star` ou `enhanced_ender` dépend d'une étoile du
   * Nether et ne peut donc JAMAIS servir à en fabriquer une.
   */
  event.custom({
    type: 'extendedcrafting:shaped_table',
    tier: 3,
    pattern: [
      'HHHHHHH',
      'ABCDEFG',
      'ABCDEFG',
      'ABCDEFG',
      'ABCDEFG',
      'ABCDEFG',
      'HHHHHHH'
    ],
    key: {
      A: { item: 'mysticalagradditions:insanium_ingot' },
      B: { item: 'extendedcrafting:black_iron_ingot' },
      C: { item: 'extendedcrafting:ender_ingot' },
      D: { item: 'enderio:end_steel_ingot' },
      E: { item: 'mekanism:ingot_refined_glowstone' },
      F: { item: 'mekanism:ingot_refined_obsidian' },
      G: { item: 'extendedcrafting:redstone_ingot' },
      H: { item: 'extendedcrafting:elite_catalyst' }
    },
    result: { id: 'minecraft:nether_star', count: 1 }
  })

  // Essence créative (Mystical Agradditions).
  event.custom({
    type: 'extendedcrafting:shaped_table',
    pattern: [
      '   A   ',
      '  AEA  ',
      ' ACDCA ',
      'AECFCEA',
      ' ACDCA ',
      '  AEA  ',
      '   A   '
    ],
    key: {
      A: { item: 'mysticalagradditions:insanium_essence' },
      C: { item: 'mysticalagradditions:insanium_ingot' },
      D: { item: 'mysticalagradditions:insanium_gemstone_block' },
      E: { item: 'mysticalagradditions:insanium_coal' },
      F: { tag: 'mysticalagriculture:infusion_crystals' }
    },
    result: { id: 'mysticalagradditions:creative_essence', count: 1 }
  })

  // Cuve créative Mekanism : les seaux Thermal, puis ceux d'Industrial
  // Foregoing, sont remplacés par des fluides encore présents (Mekanism,
  // Cyclic, vanilla).
  event.custom({
    type: 'extendedcrafting:shaped_table',
    pattern: [
      'AWVWVWVWA',
      'AIIJKJIIA',
      'AIJKLKJIA',
      'AJKLNLKJA',
      'AKLNONLKA',
      'AJKLNLKJA',
      'AIJKLKJIA',
      'AIIJKJIIA',
      'AWVWVWVWA'
    ],
    key: {
      A: { item: 'mekanism:ultimate_fluid_tank' },
      // 2026-11-09 : seaux d'eau et de lave seulement (avant : vapeur, saumure, pâte, miel, lithium)
      W: { item: 'minecraft:water_bucket' },
      V: { item: 'minecraft:lava_bucket' },
      I: { item: 'mekanism:alloy_reinforced' },
      J: { item: 'refinedstorage:4096b_fluid_storage_block' },
      K: { item: 'extendedcrafting:luminessence' },
      L: singIng('nether_star'),
      N: { item: 'rftoolsbuilder:shape_card_pump' },
      O: { item: 'pixelgo_minions:enchanted_netherite_scrap' } // 2026-11-09 : ex-singularité ultime
    },
    result: { id: 'mekanism:creative_fluid_tank', count: 1 }
  })

  /* =========================================================================
   *  4. PROJECTE
   *  (Project Expansion a été retiré du pack le 2026-11-08 : ses objets ont
   *   été remplacés par des objets ProjectE.)
   * ====================================================================== */
  /* --- Pierre philosophale : le Grand Œuvre (refaite le 2026-11-09) ------
   * Table Ultime (tier 4, 9x9). À la demande, la pierre devient l'aboutissement
   * du chapitre de quêtes « Creative Items » (other.snbt) : elle demande UN
   * exemplaire de chaque objet créatif de ce chapitre, et les trous sont
   * comblés par des Master Balls (68 Master Balls, dont celle du chapitre).
   * Plus vendue en boutique, plus d'infobulle de prix.
   *
   * RÈGLE : aucun ingrédient ne doit avoir besoin de ProjectE dans son propre
   * craft (sinon la pierre se demanderait elle-même). Restent donc DEHORS,
   * parce que leur arbre de craft passe par un objet ProjectE :
   *   - Ultimate Catalyst      : singularités Master Ball (rm_furnace) et EMC
   *                              (red_matter_block) ;
   *   - Creative Controller, Creative Wireless Grid : Ultimate Catalyst ;
   *   - Pokéstop PixelmonGo (red_matter_block) et les 3 Pokéstops Pixelmon
   *     qui en descendent (le légendaire demande aussi dark_matter_block) ;
   *   - Transmutation Tablet et les 4 pièces de Gem Armor (objets ProjectE).
   * Vérifié avec craftcost.mjs (recettes vivantes + singularités de
   * config/extendedcrafting/singularities). Si une recette de ces objets
   * change, revérifier.
   *
   *   E creative_essence (cœur)      S ultimate_singularity
   *   U the_ultimate_component       R random_egg (Œuf Mystère)
   *   D creative_storage_disk        I the_ultimate_ingot (2026-11-09, ex-survival_infinity_upgrade)
   *   P pipez:infinity_upgrade       T creative_fluid_tank
   *   G creative_cobble_gen          F million_furnace
   *   N naturescompass               W infinity_wand
   *   X explorerscompass             M Master Ball (×68)
   * ------------------------------------------------------------------- */
  event.custom({
    type: 'extendedcrafting:shaped_table',
    tier: 4,
    pattern: [
      'MMMMMMMMM',
      'MMMMMMMMM',
      'MMMSRUMMM',
      'MMDMMMTMM',
      'MMIMEMGMM',
      'MMPMMMFMM',
      'MMMNWXMMM',
      'MMMMMMMMM',
      'MMMMMMMMM'
    ],
    key: {
      M: PIXELGO_BALL_ING('master_ball'),
      E: { item: 'mysticalagradditions:creative_essence' },
      S: { item: 'extendedcrafting:ultimate_singularity' },
      R: { item: 'kubejs:random_egg' },
      U: { item: 'extendedcrafting:the_ultimate_component' },
      D: { item: 'refinedstorage:creative_storage_disk' },
      T: { item: 'mekanism:creative_fluid_tank' },
      I: { item: 'extendedcrafting:the_ultimate_ingot' },
      G: { item: 'havencobblegens:creative_cobble_gen' },
      P: { item: 'pipez:infinity_upgrade' },
      F: { item: 'ironfurnaces:million_furnace' },
      N: { item: 'naturescompass:naturescompass' },
      W: { item: 'constructionwand:infinity_wand' },
      X: { item: 'explorerscompass:explorerscompass' }
    },
    result: { id: 'projecte:philosophers_stone', count: 1 }
  })

  event.custom({
    type: 'extendedcrafting:shaped_table',
    tier: 4,
    pattern: [
      'GGAAAAAGG',
      'GABBBBBAG',
      'ABCCCCCBA',
      'ABCEEECBA',
      'ABCEFECBA',
      'ABCEEECBA',
      'ABCCCCCBA',
      'GABBBBBAG',
      'GGAAAAAGG'
    ],
    key: {
      A: { item: 'minecraft:blaze_powder' },
      B: { item: 'mysticalagriculture:supremium_essence' },
      C: { item: 'extendedcrafting:ultimate_singularity' },
      E: singIng('emc_singularity'),
      F: { item: 'projecte:transmutation_table' },
      G: { item: 'projecte:rm_furnace' } // ex-projectexpansion:fading_collector
    },
    result: { id: 'projecte:transmutation_tablet', count: 1 }
  })

  /* --- Armure en gemme de matière rouge ---------------------------------
   * 1.16.5 : la pièce centrale venait de Mystical Adaptations (absent).
   * 1.21.1 : on utilise l'essence créative, palier équivalent.
   * ------------------------------------------------------------------- */
  const gemArmor = piece =>
    event.custom({
      type: 'extendedcrafting:shaped_table',
      pattern: [
        'AAAAAAAAA',
        'ABBBBBBBA',
        'ABBBBBBBA',
        'ABBBCBBBA',
        'ABBCDCBBA',
        'ABBBCBBBA',
        'ABBBBBBBA',
        'ABBBBBBBA',
        'AAAAAAAAA'
      ],
      key: {
        A: singIng('emc_singularity'),
        B: PIXELGO_BALL_ING('master_ball'),
        C: { item: `projecte:rm_${piece}` },
        D: { item: 'mysticalagradditions:creative_essence' }
      },
      result: { id: `projecte:gem_${piece}`, count: 1 }
    })
  ;['helmet', 'chestplate', 'leggings', 'boots'].forEach(gemArmor)

  /* =========================================================================
   *  5. REFINED STORAGE 2.x & EXTRA DISKS
   *  Le silicium de Pixelmon et de RS sont unifiés via le tag `c:silicon`.
   * ====================================================================== */
  event.replaceInput({ mod: 'refinedstorage' }, 'refinedstorage:silicon', '#c:silicon')

  event.custom({
    type: 'extendedcrafting:shaped_table',
    pattern: [
      '    A    ',
      '   ABA   ',
      '  ABCBA  ',
      ' ABCDCBA ',
      'ABCDEDCBA',
      ' ABCDCBA ',
      '  ABCBA  ',
      '   ABA   ',
      '    A    '
    ],
    key: {
      A: { item: 'extradisks:infinite_item_storage_part' },
      B: { item: 'sophisticatedstorage:diamond_to_netherite_tier_upgrade' },
      C: { item: 'mysticalagradditions:creative_essence' },
      D: singIng('nether_star'),
      E: { item: 'extendedcrafting:ultimate_singularity' }
    },
    result: { id: 'refinedstorage:creative_storage_disk', count: 1 }
  })

  // Disque infini (recette remise après suppression, mais plus chère).
  event.shaped('extradisks:infinite_item_storage_disk', ['AAA', 'ABA', 'AAA'], {
    A: 'mysticalagradditions:insanium_essence',
    B: 'extradisks:infinite_item_storage_part'
  })

  /* =========================================================================
   *  6. FORGE (smithing) — 1.21 exige un gabarit dans le slot de gauche.
   *  On réutilise le gabarit d'amélioration en netherite, que le pack rend
   *  craftable en table élite (voir juste en dessous) puis duplicable en
   *  vanilla.
   * ====================================================================== */
  const TPL = 'minecraft:netherite_upgrade_smithing_template'
  const upgrade = (result, base, addition) => event.smithing(result, TPL, base, addition)

  /* --- Gabarit d'amélioration en netherite : recette de table élite -------
   *  En skyblock le bastion n'existe pas : sans ce craft, TOUTES les
   *  améliorations ci-dessous (anneau infini, contrôleur créatif, four du
   *  million, disque infini...) restaient définitivement hors de portée.
   *
   *  Table ÉLITE (7x7). Le gabarit étant duplicable en vanilla (gabarit +
   *  7 diamants + 1 bloc de netherite), un seul exemplaire suffit pour la
   *  partie : la recette peut donc se permettre d'être chère.
   *
   *  Coût en items enchantés (PixelGO Minions, 160 unités chacun) :
   *      4 x diamant enchanté          =  640 diamants
   *      4 x obsidienne enchantée      =  640 obsidiennes
   *      1 x éclat de netherite enchanté = 160 éclats
   *  + 20 lingots de fer noir, 12 obsidiennes, 8 blocs d'or.
   * -------------------------------------------------------------------- */
  event.custom({
    type: 'extendedcrafting:shaped_table',
    pattern: [
      'BBBDBBB',
      'BNOOONB',
      'BOGGGOB',
      'DOGSGOD',
      'BOGGGOB',
      'BNOOONB',
      'BBBDBBB'
    ],
    key: {
      B: { item: 'extendedcrafting:black_iron_ingot' },
      N: { item: 'pixelgo_minions:enchanted_obsidian' },
      O: { item: 'minecraft:obsidian' },
      G: { item: 'minecraft:gold_block' },
      D: { item: 'pixelgo_minions:enchanted_diamond' },
      S: { item: 'pixelgo_minions:enchanted_netherite_scrap' }
    },
    result: { id: TPL, count: 1 }
  }).id('kubejs:netherite_upgrade_smithing_template')

  upgrade('pipez:infinity_upgrade', 'pipez:ultimate_upgrade', 'mysticalagradditions:creative_essence')
  upgrade('refinedstorage:creative_controller', 'refinedstorage:controller', 'extendedcrafting:the_ultimate_catalyst')
  upgrade('refinedstorage:creative_wireless_grid', 'refinedstorage:wireless_grid', 'extendedcrafting:the_ultimate_catalyst')
  upgrade('ironfurnaces:million_furnace', 'ironfurnaces:netherite_furnace', 'minecraft:nether_star')
  // 2026-11-09 : l'Infinity Upgrade de Sophisticated Storage (survie) n'a plus
  // de recette et est masquée (hide_entries.js) : trop forte, à la demande.
  // Maillage netherite d'Ex Deorum (remplace exnihilosequentia:mesh_netherite).
  upgrade('exdeorum:netherite_mesh', 'exdeorum:diamond_mesh', 'pixelgo_minions:enchanted_copper_block') // 2026-11-09 : ex-singularité ultime

  /* =========================================================================
   *  7. STOCKAGE & MACHINES DIVERSES
   * ====================================================================== */
  // Compact Machines 7 a refondu le système : plus de chaîne tiny -> maximum,
  // mais un bloc `new_machine` + un module d'agrandissement, tous deux déjà
  // pourvus de recettes par le mod (data/compactmachines/recipe/ et son
  // datapack interne `basic_templates`). Rien à redéfinir ici.

  event.shaped('interdimensionalwirelesstransmitter:interdimensional_wireless_transmitter',
    ['121', '232', '121'], {
      1: 'refinedstorage:wireless_transmitter',
      2: 'minecraft:nether_star',
      3: 'mysticalagradditions:insanium_essence'
    })

  // `event.shaped` n'accepte PAS d'ingrédient en JSON brut dans `key` (son
  // schéma attend un `pattern<optional_ingredient>`). Dès qu'un ingrédient à
  // composants est nécessaire, il faut passer par event.custom().
  event.custom({
    type: 'minecraft:crafting_shaped',
    pattern: ['  1', ' 2 ', '2  '],
    key: {
      1: singIng('nether_star'),
      2: { tag: 'c:rods' }
    },
    result: { id: 'constructionwand:infinity_wand', count: 1 }
  }).id('kubejs:infinity_wand')

  /* --- Coffres / tiroirs : passage à Sophisticated Storage -------------- */
  event.shaped('sophisticatedstorage:controller', ['222', '212', '222'], {
    1: 'sophisticatedstorage:barrel',
    2: 'minecraft:iron_ingot'
  })
  event.shaped('sophisticatedstorage:barrel', ['1'], { 1: '#c:chests' })
  event.shaped('2x sophisticatedstorage:barrel', ['11'], { 1: '#c:chests' })

  /* =========================================================================
   *  8. EX DEORUM — TOUS les minerais bruts de Pixelmon au tamis
   * =========================================================================
   *  Aucun minerai de Pixelmon ne génère en skyblock : ni la bauxite, ni le
   *  silicium, ni l'argent, ni le platine, ni les trois tumblestones. Sans
   *  tamis, la moitié des Poké Balls et TOUTES les balls de Hisui sont
   *  simplement infabricables — les tumblestones ne tombent que dans les
   *  coffres de mine abandonnée et de maison de tailleur de pierre.
   *
   *  Chaque sortie a donc sa source, choisie pour rester mémorisable :
   *
   *    minecraft:gravel            -> raw_silver, ruby (rare),
   *                                   raw_tumblestone (rare)
   *    minecraft:sand              -> raw_silicon, sapphire (rare),
   *                                   raw_sky_tumblestone (rare)
   *    exdeorum:crushed_deepslate  -> raw_silicon, raw_silver, crystal (rare)
   *    exdeorum:crushed_blackstone -> raw_black_tumblestone (rare)
   *
   *  HORS TAMIS : la BAUXITE et le PLATINE en ont été retirés. Ils ne
   *  s'obtiennent plus qu'en minant `pixelmon:bauxite_ore` et
   *  `pixelmon:platinum_ore` (+ variantes d'ardoise), dont les loot tables
   *  sont intactes. La bauxite servant aussi de source d'aluminium au four,
   *  toute cette branche suppose maintenant un accès réel au minerai.
   *
   *  Chaque brut se transforme ensuite SANS RIEN AJOUTER de notre côté :
   *    - bauxite -> aluminium, silicium, argent, platine : four et haut
   *      fourneau, recettes fournies par Pixelmon ;
   *    - les trois tumblestones : SCIE DE PIERRE (`minecraft:stonecutting`),
   *      recettes fournies par Pixelmon elles aussi.
   *
   *  Rubis, saphir et cristal sortent déjà taillés : aucune cuisson, ils
   *  entrent directement dans les recettes qui les demandent.
   *
   *  Les brutes se cuisent ensuite en `pixelmon:aluminum_ingot` et
   *  `pixelmon:silicon` : les recettes de four viennent de Pixelmon, rien à
   *  redéfinir. `pixelmon:silicon` est déjà dans `#c:silicon` (voir 40_tags).
   *
   *  Probabilités calquées sur les « ore chunks » du mod : la courbe de
   *  surface est celle de l'aluminium (0,04 -> 0,09 de la corde au netherite),
   *  l'ardoise des profondeurs est ~1,5x plus généreuse. Le tamis compressé
   *  cible le TAG du bloc compressé et tire 7 fois (n = 7), comme toutes les
   *  recettes `exdeorum:compressed_sieve`.
   * ====================================================================== */
  const MESHES = ['string', 'flint', 'iron', 'golden', 'diamond', 'netherite']
  const SURFACE_ODDS = [0.04, 0.05, 0.06, 0.07, 0.08, 0.09]
  const DEEPSLATE_ODDS = [0.06, 0.07, 0.09, 0.10, 0.12, 0.14]
  // Courbe « rare » : le platine en surface et les trois tumblestones, qui
  // n'ont aucune autre source et ne doivent pas inonder le joueur.
  const RARE_ODDS = [0.015, 0.02, 0.025, 0.03, 0.04, 0.05]

  // `source` : { item, tag, name } — `item` pour le tamis normal, `tag` pour
  // le tamis compressé, `name` pour l'identifiant de recette.
  //  PÉAGE DE FERME : les maillages ficelle et silex ne rendent AUCUN minerai
  //  (voir 15_farm_gate.js, qui retire les recettes correspondantes d'Ex Deorum).
  //  Les bruts de Pixelmon suivent la même règle : tamisage à partir du
  //  maillage de FER, dont la recette demande un sceau de ferme.
  const ORE_MESH_FLOOR = 2

  const sieveOre = (source, odds, result, resultName) => {
    MESHES.forEach((mesh, i) => {
      if (i < ORE_MESH_FLOOR) return
      const p = odds[i]
      event.custom({
        type: 'exdeorum:sieve',
        ingredient: { item: source.item },
        mesh: { item: `exdeorum:${mesh}_mesh` },
        result: { count: 1, id: result },
        result_amount: { type: 'minecraft:binomial', n: 1, p: p }
      }).id(`kubejs:exdeorum/sieve/${source.name}/${mesh}/${resultName}`)

      event.custom({
        type: 'exdeorum:compressed_sieve',
        ingredient: { tag: source.tag },
        mesh: { item: `exdeorum:${mesh}_mesh` },
        result: { count: 1, id: result },
        result_amount: { type: 'minecraft:binomial', n: 7, p: p }
      }).id(`kubejs:exdeorum/compressed_sieve/${source.name}/${mesh}/${resultName}`)
    })
  }

  const GRAVEL = { item: 'minecraft:gravel', tag: 'exdeorum:compressed/gravel', name: 'gravel' }
  const SAND = { item: 'minecraft:sand', tag: 'exdeorum:compressed/sand', name: 'sand' }
  const CRUSHED_DEEPSLATE = {
    item: 'exdeorum:crushed_deepslate',
    tag: 'exdeorum:compressed/crushed_deepslate',
    name: 'crushed_deepslate'
  }
  const CRUSHED_BLACKSTONE = {
    item: 'exdeorum:crushed_blackstone',
    tag: 'exdeorum:compressed/crushed_blackstone',
    name: 'crushed_blackstone'
  }

  // --- métaux ---------------------------------------------------------------
  //  BAUXITE ET PLATINE RETIRÉS DU TAMIS : ils ne s'obtiennent plus qu'en
  //  minant `pixelmon:bauxite_ore` / `pixelmon:platinum_ore` (et leurs
  //  variantes d'ardoise), dont les loot tables restent en place.
  //  Conséquence à garder en tête : la bauxite alimente l'aluminium ET le
  //  silicium/argent/platine au four côté Pixelmon, donc toute la chaîne des
  //  socles de balls dépend désormais d'un accès réel au minerai.
  sieveOre(SAND, SURFACE_ODDS, 'pixelmon:raw_silicon', 'raw_silicon')
  sieveOre(CRUSHED_DEEPSLATE, DEEPSLATE_ODDS, 'pixelmon:raw_silicon', 'raw_silicon')

  // L'ARGENT est le métal de toutes les balls de palier 2 : même courbe que la
  // bauxite, sinon la moitié du chapitre s'arrête faute de socles.
  sieveOre(GRAVEL, SURFACE_ODDS, 'pixelmon:raw_silver', 'raw_silver')
  sieveOre(CRUSHED_DEEPSLATE, DEEPSLATE_ODDS, 'pixelmon:raw_silver', 'raw_silver')

  // --- gemmes ---------------------------------------------------------------
  // Rubis, saphir et cristal : courbe RARE et une source distincte chacun,
  // sur le modèle des tumblestones ci-dessous. Tamiser du gravier ne doit pas
  // donner les trois d'un coup, sinon la moindre ferme de gravier couvre tout
  // le besoin en gemmes.
  sieveOre(GRAVEL, RARE_ODDS, 'pixelmon:ruby', 'ruby')
  sieveOre(SAND, RARE_ODDS, 'pixelmon:sapphire', 'sapphire')
  sieveOre(CRUSHED_DEEPSLATE, RARE_ODDS, 'pixelmon:crystal', 'crystal')

  // --- tumblestones ---------------------------------------------------------
  // Les neuf balls de Hisui et l'Origin Ball en dépendent, et elles n'avaient
  // AUCUNE source en skyblock. Une source distincte par couleur.
  sieveOre(GRAVEL, RARE_ODDS, 'pixelmon:raw_tumblestone', 'raw_tumblestone')
  sieveOre(SAND, RARE_ODDS, 'pixelmon:raw_sky_tumblestone', 'raw_sky_tumblestone')
  sieveOre(CRUSHED_BLACKSTONE, RARE_ODDS, 'pixelmon:raw_black_tumblestone', 'raw_black_tumblestone')

  /* =======================================================================
   *  FLEURS AU TAMIS  (bloc de mousse)
   * =======================================================================
   *  Ex Deorum ne rend AUCUNE petite fleur vanilla : ses seules sorties
   *  fleuries sont `pink_petals`, `flowering_azalea` et `chorus_flower`. En
   *  skyblock, les quatorze fleurs ci-dessous n'ont donc aucune source — ni
   *  teintures, ni ruches, ni décoration, ni les recettes qui en dépendent.
   *
   *  La MOUSSE est la source végétale du mod (pousses d'arbre, azalée en
   *  fleur) : les fleurs y ont leur place, et le `dirt` reste ainsi dédié
   *  aux cultures. Le tag `exdeorum:compressed/moss_block` existe, donc le
   *  tamis compressé suit automatiquement (n = 7).
   *
   *  PÉAGE DE FERME : contrairement aux minerais, les fleurs sont servies
   *  dès le maillage de FICELLE. Elles ne sont pas des sorties minérales,
   *  15_farm_gate.js ne les retire donc pas, et une fleur n'ouvre l'accès à
   *  rien — c'est de la teinture et de la décoration.
   * ==================================================================== */
  const MOSS = {
    item: 'minecraft:moss_block',
    tag: 'exdeorum:compressed/moss_block',
    name: 'moss_block'
  }

  // Même courbe que les minerais de surface, appliquée à tous les maillages.
  const FLEUR_ODDS = SURFACE_ODDS
  // Rose de wither et fleur-torche : introuvables autrement qu'en tuant avec
  // un wither ou en réveillant un renifleur. Réservées au maillage de FER et
  // au-delà, et bien plus rares — un zéro signifie « pas de recette ».
  const FLEUR_RARE_ODDS = [0, 0, 0.01, 0.015, 0.02, 0.03]

  /** Comme `sieveOre`, mais sans plancher de maillage ; `p = 0` = pas de recette. */
  const sieveFlore = (source, odds, result, resultName) => {
    MESHES.forEach((mesh, i) => {
      const p = odds[i]
      if (!p) return

      event.custom({
        type: 'exdeorum:sieve',
        ingredient: { item: source.item },
        mesh: { item: `exdeorum:${mesh}_mesh` },
        result: { count: 1, id: result },
        result_amount: { type: 'minecraft:binomial', n: 1, p: p }
      }).id(`kubejs:exdeorum/sieve/${source.name}/${mesh}/${resultName}`)

      event.custom({
        type: 'exdeorum:compressed_sieve',
        ingredient: { tag: source.tag },
        mesh: { item: `exdeorum:${mesh}_mesh` },
        result: { count: 1, id: result },
        result_amount: { type: 'minecraft:binomial', n: 7, p: p }
      }).id(`kubejs:exdeorum/compressed_sieve/${source.name}/${mesh}/${resultName}`)
    })
  }

  const FLEURS = [
    'dandelion', 'poppy', 'blue_orchid', 'allium', 'azure_bluet',
    'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip',
    'oxeye_daisy', 'cornflower', 'lily_of_the_valley'
  ]
  FLEURS.forEach(f => sieveFlore(MOSS, FLEUR_ODDS, `minecraft:${f}`, f))

  const FLEURS_RARES = ['wither_rose', 'torchflower']
  FLEURS_RARES.forEach(f => sieveFlore(MOSS, FLEUR_RARE_ODDS, `minecraft:${f}`, f))

})
