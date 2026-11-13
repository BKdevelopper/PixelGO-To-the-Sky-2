// priority: 90
/* =============================================================================
 *  PixelGO — To the Sky : machines <-> minions <-> Pixelmon
 * =============================================================================
 *  Deux objectifs, deux sens de circulation :
 *
 *  1. LES MINIONS ALIMENTENT LES MACHINES
 *     Les machines les plus utilisées de Mekanism, Ender IO et Cyclic voient un
 *     de leurs ingrédients remplacé par sa version « enchantée » du mod
 *     PixelGO Minions. Un item enchanté = 5 piles de 32 du matériau de base,
 *     soit 160 unités (recette `pixelgo_minions:enchanted`, 5 cases pleines).
 *     Autrement dit : plus de machine sans une ferme à minions qui tourne.
 *
 *  2. LES MACHINES ALIMENTENT LE POKÉMON
 *     En retour, les machines deviennent la seule source *déterministe* des
 *     items PixelGO Items (EV / IV / niveau / taille / fossile), jusque-là
 *     réservés au loot des boîtes et à la boutique. Le joueur est donc poussé
 *     à monter les trois chaînes techniques pour optimiser ses Pokémon.
 *
 *  On utilise `replaceInput` plutôt que remove + shaped : la forme d'origine
 *  des recettes est conservée, et une mise à jour de mod ne casse rien.
 *  Priorité 90 (< 100) : ce script passe donc APRÈS 00_removals, 20_pixelmon
 *  et 30_tech, pour travailler sur l'état final des recettes.
 *  Les recettes de type `mekanism:mek_data` (chambre de purification, mineur
 *  numérique, cubes d'énergie) ne sont PAS touchées : KubeJS ne sait pas les
 *  réécrire. Elles restent verrouillées indirectement par le châssis d'acier.
 * ========================================================================== */

ServerEvents.recipes(event => {
  /* =========================================================================
   *  1. ITEMS ENCHANTÉS DANS LES CRAFTS DE MACHINES
   * -------------------------------------------------------------------------
   *  gate(recette, ingrédient d'origine, item enchanté)
   *  Le remplacement touche TOUTES les occurrences de l'ingrédient dans la
   *  recette : le coût réel est donc 160 x (nombre de cases). Il est rappelé
   *  en commentaire à la fin de chaque ligne.
   * ====================================================================== */
  const gate = (id, from, enchanted) =>
    event.replaceInput({ id: id }, from, `pixelgo_minions:${enchanted}`)

  /* --- MEKANISM ---------------------------------------------------------
   *  Le châssis d'acier est le vrai péage : il entre dans presque toutes les
   *  machines du mod. Les autres entrées ciblent les machines de base que le
   *  chapitre de quêtes met en avant.
   * -------------------------------------------------------------------- */
  gate('mekanism:steel_casing', '#c:ingots/osmium', 'enchanted_iron_ingot')        // 160 fer
  gate('mekanism:metallurgic_infuser', '#c:dusts/redstone', 'enchanted_redstone_dust') // 2 x 160 redstone
  gate('mekanism:enrichment_chamber', '#c:ingots/iron', 'enchanted_iron_ingot')    // 2 x 160 fer
  gate('mekanism:energized_smelter', '#c:glass_blocks/cheap', 'enchanted_coal')    // 2 x 160 charbon
  gate('mekanism:crusher', '#c:buckets/lava', 'enchanted_flint')                   // 2 x 160 silex
  gate('mekanism:electrolytic_separator', '#c:dusts/redstone', 'enchanted_redstone_dust') // 2 x 160 redstone

  /* --- ENDER IO ---------------------------------------------------------
   *  Les trois machines de palier 1 partagent leur bloc d'obsidienne : une
   *  seule ligne de progression à farmer (minion d'obsidienne), trois
   *  machines débloquées. Le châssis animé ouvre lui le palier « âme ».
   * -------------------------------------------------------------------- */
  gate('enderio:alloy_smelter', '#c:obsidians', 'enchanted_obsidian')       // 1 x 160 obsidienne
  gate('enderio:sag_mill', '#c:obsidians', 'enchanted_obsidian')            // 2 x 160 obsidienne
  gate('enderio:stirling_generator', '#c:obsidians', 'enchanted_obsidian')  // 2 x 160 obsidienne
  gate('enderio:ensouled_chassis', '#c:gems/quartz', 'enchanted_nether_quartz') // 1 x 160 quartz

  /* --- CYCLIC -----------------------------------------------------------
   *  Machines d'automatisation les plus utilisées du pack (elles ont toutes
   *  leur quête dans le chapitre Cyclic). Le désassembleur, qui permet de
   *  récupérer les composants de n'importe quel objet, garde le péage le plus
   *  lourd du lot.
   * -------------------------------------------------------------------- */
  gate('cyclic:user', '#c:ingots/gold', 'enchanted_gold_ingot')                    // 2 x 160 or
  gate('cyclic:crafter', 'minecraft:sticky_piston', 'enchanted_slimeball')         // 2 x 160 slime
  gate('cyclic:miner', '#c:storage_blocks/lapis', 'enchanted_lapis_lazuli')        // 2 x 160 lapis
  gate('cyclic:harvester', '#c:storage_blocks/cobblestone', 'enchanted_cobblestone') // 2 x 160 pierre
  gate('cyclic:collector', 'minecraft:iron_ingot', 'enchanted_iron_ingot')         // 2 x 160 fer
  gate('cyclic:melter', 'minecraft:redstone_block', 'enchanted_redstone_dust')     // 2 x 160 redstone
  gate('cyclic:solidifier', '#c:storage_blocks/lapis', 'enchanted_lapis_lazuli')   // 2 x 160 lapis
  gate('cyclic:experience_pylon', '#c:dyes/lime', 'enchanted_cactus_green')        // 2 x 160 teinture
  gate('cyclic:uncrafter', 'minecraft:diamond', 'enchanted_diamond')               // 2 x 160 diamants

  /* =========================================================================
   *  2. ITEMS PIXELMON / PIXELGO FABRIQUÉS EN MACHINE
   * -------------------------------------------------------------------------
   *  Les items de `pixelgoitems` n'avaient aucune recette : ils ne tombaient
   *  que dans les boîtes à trésor et chez le marchand. Ils deviennent ici la
   *  récompense des trois chaînes techniques.
   * ====================================================================== */

  /* --- Infuseur métallurgique (Mekanism) --------------------------------
   *  Les vitamines Pixelmon donnent déjà des EV : on les raffine.
   *    infusion de REDSTONE  -> item « +EV » de la statistique correspondante
   *    infusion de DIAMANT   -> item « +IV », 4 vitamines par item
   *  Correspondance officielle vitamine -> statistique.
   * -------------------------------------------------------------------- */
  const VITAMINS = {
    hp_up: 'hp',
    protein: 'atk',
    iron: 'def',
    calcium: 'spatk',
    zinc: 'spdef',
    carbos: 'spd'
  }

  Object.keys(VITAMINS).forEach(vitamin => {
    const stat = VITAMINS[vitamin]

    event.custom({
      type: 'mekanism:metallurgic_infusing',
      chemical_input: { amount: 20, tag: 'mekanism:redstone' },
      item_input: { count: 1, item: `pixelmon:${vitamin}` },
      output: { count: 1, id: `pixelgoitems:add_ev_${stat}` },
      per_tick_usage: false
    }).id(`kubejs:mekanism/add_ev_${stat}`)

    event.custom({
      type: 'mekanism:metallurgic_infusing',
      chemical_input: { amount: 20, tag: 'mekanism:diamond' },
      item_input: { count: 4, item: `pixelmon:${vitamin}` },
      output: { count: 1, id: `pixelgoitems:add_iv_${stat}` },
      per_tick_usage: false
    }).id(`kubejs:mekanism/add_iv_${stat}`)
  })

  // Bonbon Exp XS : gemme de fluorite infusée à la redstone (2026-11-09).
  event.custom({
    type: 'mekanism:metallurgic_infusing',
    chemical_input: { amount: 10, tag: 'mekanism:redstone' },
    item_input: { count: 1, item: 'mekanism:fluorite_gem' },
    output: { count: 1, id: 'pixelmon:xs_exp_candy' },
    per_tick_usage: false
  }).id('kubejs:mekanism/xs_exp_candy')

  /* --- Chambre d'enrichissement (Mekanism) ------------------------------
   *  Le super bonbon monte un niveau : enrichi, il en monte un au hasard sur
   *  toute l'équipe.
   * -------------------------------------------------------------------- */
  event.custom({
    type: 'mekanism:enriching',
    input: { count: 1, item: 'pixelmon:rare_candy' },
    output: { count: 1, id: 'pixelgoitems:random_level' }
  }).id('kubejs:mekanism/random_level')

  /* --- Four à alliage (Ender IO) ----------------------------------------
   *  Trois vitamines fondues ensemble : on ne sait plus laquelle ressort.
   * -------------------------------------------------------------------- */
  event.custom({
    type: 'enderio:alloy_smelting',
    energy: 12000,
    experience: 1.0,
    inputs: [
      { count: 1, item: 'pixelmon:hp_up' },
      { count: 1, item: 'pixelmon:protein' },
      { count: 1, item: 'pixelmon:carbos' }
    ],
    output: { count: 1, id: 'pixelgoitems:random_ev' }
  }).id('kubejs:enderio/random_ev')

  /* --- Lieur d'âmes (Ender IO) ------------------------------------------
   *  Palier au-dessus : il faut une fiole d'âme remplie d'un monstre pour
   *  transformer un item d'EV aléatoire en item d'IV aléatoire.
   * -------------------------------------------------------------------- */
  event.custom({
    type: 'enderio:soul_binding',
    energy: 100000,
    experience: 4,
    input: { item: 'pixelgoitems:random_ev' },
    mob_category: 'monster',
    output: { count: 1, id: 'pixelgoitems:random_iv' }
  }).id('kubejs:enderio/random_iv')

  /* --- Broyeur (Cyclic) -------------------------------------------------
   *  Le fossile brut se casse au broyeur et livre un fossile au hasard.
   * -------------------------------------------------------------------- */
  event.custom({
    type: 'cyclic:crusher',
    ingredient: { item: 'pixelmon:fossil' },
    energy: { ticks: 200, rfpertick: 50 },
    result: { count: 1, id: 'pixelgoitems:random_fossil' }
  }).id('kubejs:cyclic/random_fossil')

  /* --- Solidificateur (Cyclic) ------------------------------------------
   *  Bonbons + silicium moulés dans l'eau : la taille du Pokémon devient
   *  imprévisible.
   * -------------------------------------------------------------------- */
  event.custom({
    type: 'cyclic:solidifier',
    ingredients: [
      { item: 'pixelmon:rare_candy' },
      { tag: 'c:silicon' },
      { item: 'pixelmon:rare_candy' }
    ],
    mix: { fluid: 'minecraft:water', amount: 1000 },
    energy: { rfpertick: 100, ticks: 400 },
    result: { count: 1, id: 'pixelgoitems:size_randomizer' }
  }).id('kubejs:cyclic/size_randomizer')

  /* =========================================================================
   *  3. LIVRES DES ENCHANTEMENTS MINIONS — tables Extended Crafting
   * -------------------------------------------------------------------------
   *  POURQUOI PAS UNE BOUTIQUE : `ShopItem.encode` de Pixelmon sérialise les
   *  items de boutique SANS accès aux registres (FriendlyByteBuf.writeJson
   *  WithCodec). Or depuis la 1.21 les enchantements sont un registre de
   *  datapack : dès qu'un livre enchanté se trouve dans une boutique, le
   *  paquet `custom_payload` ne s'encode plus et le joueur est déconnecté —
   *  et comme la Boutique Portable envoie toutes les boutiques d'un coup,
   *  c'est l'ensemble des marchands qui tombe.
   *
   *  Les livres se fabriquent donc en TABLE, au niveau maximum directement.
   *  Trois paliers selon le poids d'enchantement déclaré par le mod :
   *
   *    poids 4-5 (courants)  -> table AVANCÉE 5x5, 3 items enchantés
   *    poids 2   (rares)     -> table ÉLITE 7x7, 4 items enchantés
   *    poids 1   (rarissimes)-> table ÉLITE 7x7 + 2 mithril enchantés
   *
   *  Un item enchanté vaut 160 unités de base ; un mithril enchanté vaut
   *  160 mithril. Le livre le moins cher coûte donc déjà ~2 000 ressources,
   *  le plus cher dépasse les 6 000 plus le mithril.
   * ====================================================================== */
  const ENCH = n => ({ item: `pixelgo_minions:${n}` })
  const LIVRE = 'minecraft:book'

  // Motif 5x5 : A x4, B x4, C x4, livre au centre.
  const MOTIF_AVANCE = ['  A  ', ' BCB ', 'ACLCA', ' BCB ', '  A  ']
  // Motif 7x7 : A x12, B x8, C x12, D x6, livre au centre.
  const MOTIF_ELITE = [
    '  AAA  ',
    ' ABCBA ',
    'ABCDCBA',
    'ACDLDCA',
    'ABCDCBA',
    ' ABCBA ',
    '  AAA  '
  ]
  // Idem, mais deux mithril enchantés remplacent deux items du bord.
  const MOTIF_ELITE_MITHRIL = [
    '  ATA  ',
    ' ABCBA ',
    'ABCDCBA',
    'ACDLDCA',
    'ABCDCBA',
    ' ABCBA ',
    '  ATA  '
  ]

  /* NOTE RHINO : pas de propriété calculée (`{ [expr]: v }`) ni de
   * déstructuration de tableau en paramètre — le moteur JS de KubeJS rejette
   * les deux (« invalid property id »). On passe par des objets nommés et une
   * affectation par crochets. */
  const LIVRES_MINIONS = [
    { ench: 'absorb', niveau: 10, palier: 'mithril', a: 'enchanted_iron_ingot', b: 'enchanted_redstone_dust', c: 'enchanted_gold_ingot', d: 'enchanted_diamond' },
    { ench: 'compact', niveau: 10, palier: 'mithril', a: 'enchanted_gold_ingot', b: 'enchanted_iron_ingot', c: 'enchanted_redstone_dust', d: 'enchanted_diamond' },
    { ench: 'cultivating', niveau: 10, palier: 'mithril', a: 'enchanted_seeds', b: 'enchanted_wheat', c: 'enchanted_bone', d: 'enchanted_emerald' },
    { ench: 'crop_fever', niveau: 5, palier: 'mithril', a: 'enchanted_wheat', b: 'enchanted_carrot', c: 'enchanted_potato', d: 'enchanted_golden_carrot' },
    { ench: 'smelting_touch', niveau: 1, palier: 'mithril', a: 'enchanted_coal', b: 'enchanted_charcoal', c: 'enchanted_iron_ingot', d: 'enchanted_gold_ingot' },
    { ench: 'lapidary', niveau: 5, palier: 'elite', a: 'enchanted_lapis_lazuli', b: 'enchanted_redstone_dust', c: 'enchanted_nether_quartz', d: 'enchanted_diamond' },
    { ench: 'dedication', niveau: 4, palier: 'elite', a: 'enchanted_emerald', b: 'enchanted_gold_ingot', c: 'enchanted_iron_ingot', d: 'enchanted_diamond' },
    { ench: 'flowstate', niveau: 3, palier: 'elite', a: 'enchanted_sugar', b: 'enchanted_redstone_dust', c: 'enchanted_glowstone_dust', d: 'enchanted_diamond' },
    { ench: 'replenish', niveau: 1, palier: 'elite', a: 'enchanted_bone', b: 'enchanted_seeds', c: 'enchanted_wheat', d: 'enchanted_emerald' },
    { ench: 'harvesting', niveau: 6, palier: 'avance', a: 'enchanted_hay_bale', b: 'enchanted_wheat', c: 'enchanted_iron_ingot' },
    { ench: 'delicate', niveau: 1, palier: 'avance', a: 'enchanted_string', b: 'enchanted_wool', c: 'enchanted_feather' }
  ]

  LIVRES_MINIONS.forEach(livre => {
    const key = { A: ENCH(livre.a), B: ENCH(livre.b), C: ENCH(livre.c), L: { item: LIVRE } }
    let pattern = MOTIF_AVANCE

    if (livre.palier !== 'avance') {
      key.D = ENCH(livre.d)
      pattern = MOTIF_ELITE
      if (livre.palier === 'mithril') {
        pattern = MOTIF_ELITE_MITHRIL
        key.T = ENCH('enchanted_mithril')
      }
    }

    const niveaux = {}
    niveaux['pixelgo_minions:' + livre.ench] = livre.niveau

    event.custom({
      type: 'extendedcrafting:shaped_table',
      pattern: pattern,
      key: key,
      result: {
        id: 'minecraft:enchanted_book',
        count: 1,
        components: {
          'minecraft:stored_enchantments': { levels: niveaux }
        }
      }
    }).id('kubejs:minion_books/' + livre.ench)
  })
})
