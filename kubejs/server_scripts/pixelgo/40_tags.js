// priority: 100
/* =============================================================================
 *  PixelGO — To the Sky : tags d'items
 * =============================================================================
 *  Portage de kubejs/server_scripts/{color/tag,AVSP/ITEMTAGS/assorted}.js.
 *
 *  Le gros de `assorted.js` servait à réétiqueter les matériaux d'Emendatus
 *  Enigmatica (`forge:ores/*` -> `emendatusenigmatica:*_cluster`). EE 2.x ne
 *  définit aucun matériau dans ce pack, et le namespace de tags est passé de
 *  `forge:` à `c:` : ces entrées ont donc disparu.
 *
 *  Le tag `pixelgo:color_glass_pane` a aussi été retiré : le mod `pixelgo` de
 *  la 1.21.1 est un mod d'enchantements, il ne consomme plus ce tag.
 * ========================================================================== */

ServerEvents.tags('item', event => {
  /* -------------------------------------------------------------------------
   *  Tickets d'invocation — remplace `forge:summon_ticket` de la 1.16.5.
   *  Utilisé par les recettes de coupons, de Pierre Clé et de ticket SSR.
   * ---------------------------------------------------------------------- */
  // Liste redéfinie ici : `global` n'est pas partagé entre les scripts de
  // démarrage (startup_scripts) et les scripts serveur dans KubeJS 7.
  const TICKET_COLORS = [
    'light_gray', 'gray', 'red', 'magenta', 'pink', 'purple', 'blue', 'cyan',
    'light_blue', 'green', 'lime', 'yellow', 'orange', 'brown', 'white',
    'black', 'rainbow'
  ]
  event.add('c:summon_tickets', TICKET_COLORS.map(c => `kubejs:${c}_ticket`))

  // Les tickets de haut palier valent aussi « ticket légendaire »
  // (ancien `forge:legendary_summon_ticket`).
  event.add('c:legendary_summon_tickets', [
    'kubejs:black_ticket',
    'kubejs:white_ticket',
    'kubejs:rainbow_ticket'
  ])

  /* -------------------------------------------------------------------------
   *  Unification du silicium : Refined Storage 2.x et Pixelmon en produisent
   *  chacun un. On les regroupe pour que `#c:silicon` soit interchangeable.
   * ---------------------------------------------------------------------- */
  event.add('c:silicon', ['refinedstorage:silicon', 'pixelmon:silicon'])

  /* -------------------------------------------------------------------------
   *  Boîtes mystères — permet aux quêtes / boutiques de cibler le groupe.
   *
   *  Depuis le passage à Treasure Bags, les quatre boîtes ne sont plus quatre
   *  items mais UN SEUL (`treasurebags:treasure_bag`) différencié par le
   *  composant `treasurebags:bag_type`. Un tag d'item ne peut donc plus
   *  distinguer les paliers : pour cibler un palier précis, filtrer sur le
   *  composant plutôt que sur ce tag.
   * ---------------------------------------------------------------------- */
  event.add('c:lootboxes', ['treasurebags:treasure_bag'])

  /* -------------------------------------------------------------------------
   *  SCEAUX DE FERME — les deux paliers de péage de la trame principale.
   * -------------------------------------------------------------------------
   *  Un item « enchanté » de PixelGO Minions vaut 160 unités de sa matière
   *  première (recette `pixelgo_minions:enchanted`, 5 cases de 32 dans un
   *  établi ordinaire). Aucun marchand ne les VEND : ils ne sortent que du
   *  farm du joueur. Ils servent donc de preuve de récolte.
   *
   *  pixelgo:farm_seal     — 160 unités d'une culture brute.
   *                          Débloque l'étape 3 (génération de ressources).
   *  pixelgo:farm_harvest  — 160 unités d'une culture TRANSFORMÉE
   *                          (ballot = 1 440 blés, melon-bloc = 1 440 tranches…).
   *                          Débloque l'étape 4 (accélération).
   * ---------------------------------------------------------------------- */
  event.add('pixelgo:farm_seal', [
    'pixelgo_minions:enchanted_wheat',
    'pixelgo_minions:enchanted_carrot',
    'pixelgo_minions:enchanted_potato',
    'pixelgo_minions:enchanted_seeds',
    'pixelgo_minions:enchanted_melon_slice',
    'pixelgo_minions:enchanted_pumpkin',
    'pixelgo_minions:enchanted_sugar_cane',
    'pixelgo_minions:enchanted_cactus',
    'pixelgo_minions:enchanted_cocoa_beans',
    'pixelgo_minions:enchanted_nether_wart',
    'pixelgo_minions:enchanted_brown_mushroom',
    'pixelgo_minions:enchanted_red_mushroom'
  ])

  /* Le palier 2 doit valoir EXACTEMENT 1 440 unités de culture pour chaque
   * entrée, sans quoi le calcul du Certificat de récolte (8 x 1 440, voir
   * 15_farm_gate.js) ne veut plus rien dire. Deux items seulement remplissent
   * la condition : le ballot (160 ballots = 1 440 blés) et le melon-bloc
   * (160 blocs = 1 440 tranches).
   *
   * Écartés volontairement :
   *   enchanted_bread          480 blés seulement — diviserait le mur par 3 ;
   *   enchanted_baked_potato   160 unités + combustible ;
   *   enchanted_cactus_green   idem ;
   *   enchanted_*_mushroom_block  les blocs de champignon exigent la Toucher
   *                            de soie, donc une table d'enchantement, donc
   *                            des diamants : l'entrée serait morte avant
   *                            le mur qu'elle est censée garder. */
  event.add('pixelgo:farm_harvest', [
    'pixelgo_minions:enchanted_hay_bale',
    'pixelgo_minions:enchanted_melon'
  ])

  /* -------------------------------------------------------------------------
   *  UNIFICATION DES MATÉRIAUX (Emendatus Enigmatica)
   * -------------------------------------------------------------------------
   *  Remplace le rôle de `AVSP/fusion.js` (3 109 lignes de `replaceOutput`) de
   *  la version 1.16.5 : en 1.21.1 le pack n'a plus Thermal / Immersive /
   *  Silent's, donc il n'y a presque plus de doublons à fusionner. Ce qu'il
   *  reste à faire, c'est garantir que les tags `c:` pointent vers TOUTES les
   *  variantes, afin qu'une recette écrite avec `#c:ingots/x` accepte
   *  indifféremment la version EE, Mekanism ou Pixelmon.
   *
   *  EE remplit lui-même ses tags (`c:ingots/nickel`, `c:plates/zinc`, …).
   *  On complète ici pour les métaux fournis par d'autres mods, afin que la
   *  préférence déclarée dans config/cucumber-tags.json ait toujours un tag
   *  cohérent derrière elle.
   * ---------------------------------------------------------------------- */
  const unify = (tag, items) => {
    items.forEach(i => event.add(tag, i))
  }

  unify('c:ingots/aluminum', ['pixelmon:aluminum_ingot'])
  unify('c:ingots/silver', ['pixelmon:silver_ingot'])
  unify('c:ingots/platinum', ['pixelmon:platinum_ingot'])
  unify('c:gems/ruby', ['pixelmon:ruby'])
  unify('c:gems/sapphire', ['pixelmon:sapphire'])
  unify('c:storage_blocks/aluminum', ['pixelmon:aluminum_block'])
  unify('c:storage_blocks/silver', ['pixelmon:silver_block'])
  unify('c:storage_blocks/platinum', ['pixelmon:platinum_block'])

  // Plaques : Pixelmon n'enregistre que la plaque d'aluminium (les modèles
  // silver_plate / platinum_plate du jar n'ont pas d'item derrière). EE
  // fournit les siennes ; `c:plates/*` reste la référence pour les recettes.
  unify('c:plates/aluminum', ['pixelmon:aluminum_plate'])
})

ServerEvents.tags('block', event => {
  // Le bloc de slime rose se mine à la pioche, comme son équivalent
  // Industrial Foregoing.
  event.add('minecraft:mineable/pickaxe', 'kubejs:pink_slime_block')
})
