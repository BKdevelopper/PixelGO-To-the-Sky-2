// priority: 900
/* =============================================================================
 *  PixelGO — To the Sky : suppressions de recettes
 * =============================================================================
 *  Fusion des `remove.js` de la version 1.16.5 (un par module), portés vers
 *  KubeJS 2101 / MC 1.21.1.
 *
 *  Les entrées visant des mods absents du pack 1.21.1 ont été retirées :
 *    thermal, compressium, storagedrawers, additionalcolors, autocrafter,
 *    extrastorage, angelring, javd, pokehaancraft*, exnihilosequentia.
 *  Leurs remplaçants (EnderIO, Sophisticated Storage, Ex Deorum, Extra Disks)
 *  sont traités plus bas quand une suppression équivalente avait du sens.
 * ========================================================================== */

ServerEvents.recipes(event => {
  const rm = id => event.remove({ id: id })

  /* -------------------------------------------------------------------------
   *  MEKANISM — le minerai ne doit PAS se cuire directement en lingot :
   *  tout passe par la chaîne de traitement (broyeur / purification / etc.).
   *  Les IDs `processing/<metal>/ingot/from_*` sont inchangés en 10.7.
   * ---------------------------------------------------------------------- */
  ;['lead', 'tin', 'osmium', 'uranium'].forEach(metal => {
    rm(`mekanism:processing/${metal}/ingot/from_ore_blasting`)
    rm(`mekanism:processing/${metal}/ingot/from_ore_smelting`)
    // Exception (2026-11-13, demande) : l'osmium brut se cuit au four / haut fourneau.
    if (metal === 'osmium') return
    rm(`mekanism:processing/${metal}/ingot/from_raw_blasting`)
    rm(`mekanism:processing/${metal}/ingot/from_raw_smelting`)
  })
  // Lead / tin / bronze : plus de raccourci « poussière -> lingot » au four.
  ;['lead', 'tin', 'bronze'].forEach(metal => {
    rm(`mekanism:processing/${metal}/ingot/from_dust_blasting`)
    rm(`mekanism:processing/${metal}/ingot/from_dust_smelting`)
  })
  // Les bacs Mekanism doublonnent avec Sophisticated Storage : recette refaite.
  ;['basic', 'advanced', 'elite', 'ultimate'].forEach(tier => rm(`mekanism:bin/${tier}`))

  /* -------------------------------------------------------------------------
   *  POKÉ BALLS — recettes d'origine (2026-11-07)
   * -------------------------------------------------------------------------
   *  Les recettes de ball et de couvercle de Pixelmon et du mod PixelGO - Ball
   *  (pixelballs) ne sont PLUS retirées : la chaîne Mekanism qui les
   *  remplaçait a été supprimée (voir 25_pokeballs.js). Seule la Park Ball
   *  reste retirée, plus bas.
   * ---------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------
   *  PIXELGO MINIONS — outils
   * -------------------------------------------------------------------------
   *  2026-11-09 : les 19 outils de récolte se craftent de nouveau (recettes
   *  du mod, copiées dans kubejs/data/pixelgo_minions/recipe/). Le marchand
   *  « Minions · Minion Tools » les vend toujours, au prix de leurs
   *  ingrédients.
   * ---------------------------------------------------------------------- */

  /* --- PIXELGO MINIONS — minions --------------------------------------------
   *  `pixelgo_minions:minion_upgrade` est GARDÉE (2026-11-01) : depuis la 4.0.0
   *  elle ne fabrique plus que le palier I (outil en bois au centre + 8 cases
   *  de ressource brute), les paliers suivants s'achètent dans le minion lui-
   *  même. Les quêtes « Minion Workshop » qui la remplaçaient sont retirées.
   * ---------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------
   *  PIXELMON
   * ---------------------------------------------------------------------- */
  rm('pixelmon:blast_furnace/silver_ore')
  rm('pixelmon:furnace/silver_ore')
  rm('pixelmon:movement_plate')
  rm('pixelmon:pokeball/ball/park_ball')

  /* -------------------------------------------------------------------------
   *  OBJETS « fin de jeu » — recraftés en table étendue (voir 30_tech.js)
   * ---------------------------------------------------------------------- */
  // Les trois ont une recette PixelGO (kubejs:…) dans 30_tech.js — celles du
  // mod sont infaisables ici (lingot ultime sans source, singularité de nickel
  // sans matière).
  rm('extendedcrafting:the_ultimate_component')
  rm('extendedcrafting:the_ultimate_catalyst')
  rm('extendedcrafting:ultimate_singularity')

  rm('mysticalagradditions:nether_star')
  rm('mysticalagriculture:seed/infusion/nether_star')
  rm('mysticalagriculture:infusion_pedestal')
  rm('mysticalagriculture:infusion_altar')
  rm('mysticalagriculture:machine_frame')

  rm('projecte:transmutation_tablet')
  rm('projecte:philosophers_stone')
  rm('projecte:watch_of_flowing_time')
  rm('projecte:gem_helmet')
  rm('projecte:gem_chestplate')
  rm('projecte:gem_leggings')
  rm('projecte:gem_boots')

  /* -------------------------------------------------------------------------
   *  PROJECTE — PLUS AUCUNE GÉNÉRATION D'EMC (2026-11-08)
   *  Les collecteurs (EMC tiré de la lumière) et les relais (bonus d'EMC à
   *  chaque transfert) sont les seules machines qui créent de l'EMC à partir
   *  de rien. On retire toutes leurs recettes (y compris les montées MK1 ->
   *  MK2 -> MK3) ; ils sont aussi masqués de JEI/EMI (hide_entries.js).
   *  L'EMC ne s'obtient plus qu'en brûlant de vrais objets.
   *  Project Expansion (collecteurs colorés, fleurs, liens EMC) a été retiré
   *  du pack le même jour.
   * ---------------------------------------------------------------------- */
  ;['collector', 'relay'].forEach(machine =>
    [1, 2, 3].forEach(mk => event.remove({ output: `projecte:${machine}_mk${mk}` }))
  )

  // Outils infinis d'Industrial Foregoing : réservés au endgame quêté.
  // Le mod a été retiré du pack ; le retrait ne s'applique que s'il revient.
  if (Platform.isLoaded('industrialforegoing')) {
    ;['hammer', 'saw', 'nuke', 'drill', 'launcher', 'trident'].forEach(t =>
      rm(`industrialforegoing:dissolution_chamber/infinity_${t}`)
    )
  }

  // Disques infinis d'Extra Disks : recette repensée (30_tech.js).
  ;['shaped', 'shapeless'].forEach(shape =>
    rm(`extradisks:disk/${shape}/infinite_item_storage_disk`)
  )

  rm('rftoolsbase:machine_frame')
  rm('ironfurnaces:furnaces/million_furnace')
  rm('fluxnetworks:flux_core')
  rm('naturescompass:natures_compass')
  rm('explorerscompass:explorers_compass')
  rm('constructionwand:infinity_wand')
  rm('clickmachine:click_machine')
  rm('cyclic:crafter')

  /* -------------------------------------------------------------------------
   *  EX DEORUM — remplace Ex Nihilo Sequentia.
   *  Le maillage netherite reste obtenable, mais par forge (voir 30_tech.js).
   * ---------------------------------------------------------------------- */
  rm('exdeorum:netherite_mesh')

  /* -------------------------------------------------------------------------
   *  VANILLA — recettes refaites plus loin (voir 10_minecraft.js)
   * ---------------------------------------------------------------------- */
  rm('minecraft:beacon')
  rm('minecraft:sticky_piston')
  rm('minecraft:magma_cream')
  rm('minecraft:end_crystal')
  rm('minecraft:daylight_detector')

  /* -------------------------------------------------------------------------
   *  NEOORIGINS — le calque « Classe » est désactivé (tools/pixelgo-origins) :
   *  l'Orbe de Classe ne servirait plus à rien. L'Orbe d'Origine reste.
   * ---------------------------------------------------------------------- */
  rm('neoorigins:orb_of_class')

  /* -------------------------------------------------------------------------
   *  PIXELGO ITEMS — Random EV / IV / Size (2026-11-14) : recettes d'établi du
   *  mod retirées, ces objets (et Random Level) se font avec toutes les baies
   *  à la table ultime (voir 35_machines.js).
   * ---------------------------------------------------------------------- */
  rm('pixelgoitems:random_ev')
  rm('pixelgoitems:random_iv')
  rm('pixelgoitems:size_randomizer')
})
