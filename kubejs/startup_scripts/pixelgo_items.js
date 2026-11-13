// priority: 100
/* =============================================================================
 *  PixelGO — To the Sky : items & blocs du pack
 * =============================================================================
 *  Portage de kubejs/startup_scripts/{script,block}.js (KubeJS 1605 / MC 1.16.5)
 *  vers KubeJS 2101 / MC 1.21.1 NeoForge.
 *
 *  Changements d'API :
 *    onEvent('item.registry')   -> StartupEvents.registry('item')
 *    onEvent('block.registry')  -> StartupEvents.registry('block')
 *    onEvent('item.modification')-> ItemEvents.modification
 *    .material('iron')          -> .soundType('metal') + .hardness/.resistance
 *
 *  NOTE : random_egg / mega_key / ssr_ticket et les items d'Aura sont déjà
 *  déclarés dans startup_scripts/main.js — ils ne sont PAS redéclarés ici.
 * ========================================================================== */

// Tickets d'invocation. `mk` = palier affiché dans le nom (IV mini / chance shiny),
// repris tel quel de la version 1.16.5 pour ne pas casser l'équilibrage.
const PIXELGO_TICKETS = [
  { id: 'light_gray', label: 'Light Gray', mk: 0 },
  { id: 'gray', label: 'Gray', mk: 1 },
  { id: 'red', label: 'Red', mk: 2 },
  { id: 'magenta', label: 'Magenta', mk: 3 },
  { id: 'pink', label: 'Pink', mk: 4 },
  { id: 'purple', label: 'Purple', mk: 5 },
  { id: 'blue', label: 'Blue', mk: 6 },
  { id: 'cyan', label: 'Cyan', mk: 7 },
  { id: 'light_blue', label: 'Light Blue', mk: 8 },
  { id: 'green', label: 'Green', mk: 9 },
  { id: 'lime', label: 'Lime', mk: 10 },
  { id: 'yellow', label: 'Yellow', mk: 11 },
  { id: 'orange', label: 'Orange', mk: 12 },
  { id: 'brown', label: 'Brown', mk: 13 },
  { id: 'white', label: 'White', mk: 14 },
  { id: 'black', label: 'Black', mk: 15 },
  { id: 'rainbow', label: 'Rainbow', mk: 16 }
]

StartupEvents.registry('item', event => {
  /* --- Boîtes mystères -------------------------------------------------
   * SUPPRIMÉES : `kubejs:lootbox_1..4` sont remplacées par le mod Treasure
   * Bags. Les quatre boîtes sont désormais des types de sacs déclarés en
   * datapack (kubejs/data/pixelgo/treasurebags_types/tier1..4.json) et
   * portées par l'item unique `treasurebags:treasure_bag` + le composant
   * `treasurebags:bag_type`. Voir 50_interactions.js pour le détail.
   * ------------------------------------------------------------------- */

  /* --- Tickets d'invocation -------------------------------------------- */
  PIXELGO_TICKETS.forEach(t => {
    event
      .create(t.id + '_ticket')
      .displayName(`${t.label} Ticket [MK ${t.mk}]`)
      .texture(`kubejs:item/${t.id}_ticket`)
      .maxStackSize(64)
  })

  /* --- CERTIFICAT DE RÉCOLTE ------------------------------------------
   *  Le diplôme de fin d'étape 2, et la clé de l'étape 3.
   *
   *  Il coûte 11 680 unités de culture (voir 15_farm_gate.js) et ouvre à
   *  lui seul Ex Deorum (minerais), les Botany Pots et les générateurs de
   *  cobble. `containerItem` le désigne comme son propre reste de
   *  fabrication : il N'EST PAS CONSOMMÉ et revient dans la grille à chaque
   *  craft — c'est un laissez-passer, pas une monnaie. On en fabrique un,
   *  une seule fois, et il sert pour toute la partie.
   *
   *  Pile de 1 : le garder unique évite qu'on en accumule pour les revendre
   *  ou les prêter, et rend la ligne « 1/1 » lisible dans l'inventaire.
   * ------------------------------------------------------------------- */
  event
    .create('harvest_certificate')
    .displayName('§dHarvest Certificate')
    .texture('kubejs:item/harvest_certificate')
    .containerItem('kubejs:harvest_certificate')
    .rarity('epic')
    .maxStackSize(1)

  /* --- STEAK INFINI ----------------------------------------------------
   *  Nourrit comme un steak cuit (8 points de faim, saturation 0,8) et
   *  n'est JAMAIS consommé : on peut le manger autant de fois qu'on veut.
   *
   *  `food(...)` donne à l'item un composant de nourriture : c'est lui qui
   *  rend l'item mangeable (refusé quand la barre est pleine, animation et
   *  durée d'un steak). `finishUsing` remplace ensuite la fin du repas de
   *  vanilla — qui aurait retiré l'item de la pile — : on nourrit le joueur
   *  à la main, côté serveur seulement (la faim est synchronisée), et on
   *  rend la pile telle quelle.
   *
   *  Pile de 1 : un seul suffit pour toute la partie. Recette dans
   *  server_scripts/pixelgo/22_crafts.js, quête dans le chapitre Minions.
   * ------------------------------------------------------------------- */
  event
    .create('infinite_steak')
    .displayName('§6Infinite Steak')
    .texture('minecraft:item/cooked_beef')
    .component('minecraft:enchantment_glint_override', true)
    .rarity('epic')
    .maxStackSize(1)
    .food(food => food.nutrition(8).saturation(0.8))
    .finishUsing((stack, level, entity) => {
      if (!level.isClientSide() && entity.getFoodData) entity.getFoodData().eat(8, 0.8)
      return stack
    })
})

StartupEvents.registry('block', event => {
  // Bloc de slime rose (Industrial Foregoing) — repris de block.js.
  // NOTE : en KubeJS 2101 la méthode s'appelle `texture(...)` et non
  // `textureAll(...)` ; avec un seul argument elle applique la texture à
  // toutes les faces.
  event
    .create('pink_slime_block')
    .displayName('Pink Slime Block')
    .soundType('metal')
    .hardness(0.5)
    .resistance(0.5)
    .requiresTool(false)
    .texture('kubejs:block/pink_slime_block')
})

/* --- Piles agrandies (repris de script.js) ------------------------------ */
ItemEvents.modification(event => {
  ;['minecraft:egg', 'minecraft:ender_pearl', 'minecraft:snowball'].forEach(id => {
    event.modify(id, item => {
      item.maxStackSize = 64
    })
  })
})
