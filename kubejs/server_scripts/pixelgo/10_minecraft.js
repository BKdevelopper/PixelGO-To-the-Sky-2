// priority: 100
/* =============================================================================
 *  PixelGO — To the Sky : recettes vanilla & utilitaires
 * =============================================================================
 *  Portage de kubejs/server_scripts/{minecraft/minecraft,phc/recipe,other/recipe}.js
 *  (KubeJS 1605 / 1.16.5) vers KubeJS 2101 / 1.21.1.
 *
 *  Correspondances de tags : `#forge:x` -> `#c:x`
 *    forge:glass/colorless -> c:glass_blocks/colorless
 *    forge:slimeballs      -> c:slimeballs
 *    forge:chests          -> c:chests
 *    forge:rods            -> c:rods
 *    forge:obsidian        -> c:obsidians
 *    forge:dyes            -> c:dyes
 * ========================================================================== */

ServerEvents.recipes(event => {
  event.shaped('kubejs:light_gray_ticket', ['111', '121', '111'], { 1: 'pixelgo_minions:enchanted_sugar_cane', 2: 'minecraft:paper' })
  /* -------------------------------------------------------------------------
   *  Armure de mailles — via le lingot de fer noir (Extended Crafting).
   * ---------------------------------------------------------------------- */
  const BLACK_IRON = 'extendedcrafting:black_iron_ingot'
  event.shaped('minecraft:chainmail_helmet', ['111', '1 1'], { 1: BLACK_IRON })
  event.shaped('minecraft:chainmail_chestplate', ['1 1', '111', '111'], { 1: BLACK_IRON })
  event.shaped('minecraft:chainmail_leggings', ['111', '1 1', '1 1'], { 1: BLACK_IRON })
  event.shaped('minecraft:chainmail_boots', ['1 1', '1 1'], { 1: BLACK_IRON })
  

  /* -------------------------------------------------------------------------
   *  Crâne de wither-squelette. En 1.16.5 la recette utilisait la plaque de
   *  netherite de Thermal ; Thermal est absent en 1.21.1, on la remplace par
   *  l'acier sombre d'EnderIO (même palier de progression).
   * ---------------------------------------------------------------------- */
  event.shaped('minecraft:wither_skeleton_skull', ['131', '323', '131'], {
    1: 'minecraft:skeleton_skull',
    2: 'minecraft:nether_star',
    3: 'enderio:dark_steel_ingot'
  })

  /* -------------------------------------------------------------------------
   *  Blocs / matières de base d'un skyblock
   * ---------------------------------------------------------------------- */
  event.shaped('4x minecraft:clay_ball', [' 1 '], { 1: 'minecraft:clay' })
  event.shaped('6x minecraft:soul_sand', ['111', '111'], { 1: 'minecraft:sand' })
  event.smelting('minecraft:glass', 'minecraft:sand')

  // Comparateur : la torche de redstone remplace le quartz (introuvable au début).
  event.shaped('minecraft:comparator', [' 2 ', '232', '111'], {
    1: 'minecraft:stone',
    2: 'minecraft:redstone_torch',
    3: 'minecraft:redstone'
  })

  /* -------------------------------------------------------------------------
   *  Recettes vanilla assouplies (module « phc » d'origine)
   * ---------------------------------------------------------------------- */
  event.shapeless('minecraft:firework_rocket', ['minecraft:gunpowder', 'minecraft:paper'])

  event.shaped('minecraft:beacon', ['111', '121', '333'], {
    1: '#c:glass_blocks/colorless',
    2: 'minecraft:nether_star',
    3: 'minecraft:obsidian'
  })

  event.shaped('minecraft:sticky_piston', ['12'], {
    1: '#c:slimeballs',
    2: 'minecraft:piston'
  })

  event.shapeless('minecraft:magma_cream', ['minecraft:blaze_powder', '#c:slimeballs'])

  event.shaped('minecraft:end_crystal', ['111', '121', '131'], {
    1: '#c:glass_blocks/colorless',
    2: 'minecraft:ender_eye',
    3: 'minecraft:ghast_tear'
  })

  event.shaped('minecraft:daylight_detector', ['111', '222', '333'], {
    1: '#c:glass_blocks/colorless',
    2: 'minecraft:quartz',
    3: '#minecraft:wooden_slabs'
  })

  /* -------------------------------------------------------------------------
   *  WAYSTONES — chaîne complète reprise du module « phc ».
   *  `pixelmon:ruby_block` existe toujours en 9.4.
   * ---------------------------------------------------------------------- */
  event.shaped('waystones:warp_stone', ['121', '232', '121'], {
    1: 'minecraft:purple_dye',
    2: 'minecraft:ender_pearl',
    3: 'pixelmon:ruby_block'
  })

  event.shaped('waystones:waystone', ['111', '121', '333'], {
    1: 'minecraft:stone_bricks',
    2: 'waystones:warp_stone',
    // Ex-`projectexpansion:pink_compressed_collector` (mod retiré 2026-11-08).
    3: 'projecte:dark_matter_block'
  })

  event.shaped('waystones:return_scroll', ['121', '333'], {
    1: 'projecte:dark_matter',
    2: 'minecraft:ender_pearl',
    3: 'minecraft:paper'
  })

  event.shaped('waystones:bound_scroll', ['111', '232', '444'], {
    1: 'minecraft:purple_dye',
    2: 'projecte:dark_matter',
    3: 'minecraft:ender_pearl',
    4: 'minecraft:paper'
  })

  event.shaped('waystones:warp_scroll', ['121', '333', '424'], {
    1: 'minecraft:ender_pearl',
    2: 'minecraft:purple_dye',
    3: 'minecraft:paper',
    4: 'projecte:dark_matter'
  })

  event.shaped('waystones:mossy_waystone', ['111', '121', '111'], {
    1: 'minecraft:mossy_cobblestone',
    2: 'waystones:waystone'
  })

  event.shaped('waystones:sandy_waystone', ['111', '121', '111'], {
    1: 'minecraft:sandstone',
    2: 'waystones:waystone'
  })

  // Les Sharestones sont fournies par Waystones lui-même (une recette par
  // couleur, 15 au total — il n'existe pas de `waystones:sharestone` générique
  // en 21.1). La recette « matière noire » de la 1.16.5 n'est donc plus portée.

  /* -------------------------------------------------------------------------
   *  Boussoles — réintroduites après suppression, mais coûteuses.
   *  (La version 1.16.5 passait par la table étendue et l'infusion ; on garde
   *   le même esprit, voir aussi 30_tech.js pour la boussole d'explorateur.)
   * ---------------------------------------------------------------------- */
  event.shaped('naturescompass:naturescompass', ['121', '232', '121'], {
    1: 'mysticalagriculture:nature_seeds',
    2: 'mysticalagriculture:fertilized_essence',
    3: 'minecraft:compass'
  })

  /* -------------------------------------------------------------------------
   *  Machines & blocs utilitaires
   * ---------------------------------------------------------------------- */
  event.shaped('rftoolsbase:machine_frame', ['111', '121', '111'], {
    1: BLACK_IRON,
    2: 'extendedcrafting:black_iron_slate'
  })

  // La Click Machine est une machine d'ACCÉLÉRATION (étape 4 de la trame) :
  // sa recette vit dans 15_farm_gate.js, derrière un sceau de récolte.

  event.shaped('cyclic:crafter', ['121', '232', '121'], {
    1: 'minecraft:purple_concrete_powder',
    2: 'minecraft:crafting_table',
    3: 'minecraft:emerald'
  })

  event.shaped('fluxnetworks:flux_core', ['121', '2 2', '121'], {
    1: '#c:dusts/osmium',
    2: 'minecraft:redstone'
  })

  // Industrial Foregoing retiré du pack : le bloc décoratif repart du slime
  // vanilla teint en rose plutôt que du lingot de slime rose d'IF.
  event.shaped('kubejs:pink_slime_block', ['SSS', 'SDS', 'SSS'], {
    S: 'minecraft:slime_ball',
    D: '#c:dyes/pink'
  })


  /* -------------------------------------------------------------------------
   *  BOTANY POTS & POWER POTS
   *  1.16.5 : botanypots:botany_pot / ftb-power-pots:power_pot_mk1..4
   *  1.21.1 : botanypots:terracotta_botany_pot / powerpots:power_pot_1..3
   *  (PowerPots ne fournit AUCUNE recette par défaut — elles sont créées ici.)
   *  compressium:{iron,gold,diamond}_1 -> blocs vanilla correspondants.
   * ---------------------------------------------------------------------- */
  event.shaped('botanypots:terracotta_hopper_botany_pot', ['12'], {
    1: 'botanypots:terracotta_botany_pot',
    2: 'cyclic:hopper'
  })
  event.shaped('botanypots:terracotta_hopper_botany_pot', ['323', '313', ' 3 '], {
    1: 'minecraft:flower_pot',
    2: 'cyclic:hopper',
    3: 'minecraft:terracotta'
  })

  // Les Power Pots accélèrent la pousse (x2 / x4 / x8) : ce sont des machines
  // d'ACCÉLÉRATION (étape 4). Leurs recettes vivent dans 15_farm_gate.js.
})
