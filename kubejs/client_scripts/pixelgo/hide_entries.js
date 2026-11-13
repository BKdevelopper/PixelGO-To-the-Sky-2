// priority: 100
/* =============================================================================
 *  PixelGO — To the Sky : nettoyage de JEI / EMI
 * =============================================================================
 *  Portage de kubejs/client_scripts/{script,AVSP/jei_hideitems}.js.
 *
 *  API : onEvent('jei.hide.items', …) -> RecipeViewerEvents.removeEntries('item', …)
 *        (KubeJS 7 pilote JEI *et* EMI avec le même évènement ; les deux sont
 *         présents dans ce pack.)
 *
 *  `jei_hideitems.js` masquait ~800 doublons de matériaux (poussières, lingots
 *  et engrenages de Thermal / Immersive Engineering / Silent's / AE2…) au
 *  profit d'Emendatus Enigmatica. Aucun de ces mods n'est présent en 1.21.1 et
 *  EE n'enregistre aucun matériau : ce fichier n'a plus d'objet.
 *
 *  Ce qui reste utile, c'est de masquer les 16 déclinaisons colorées des blocs
 *  Refined Storage (et apparentés), qui noient la recherche. Elles restent
 *  fabricables en teintant la version de base.
 * ========================================================================== */

const DYE_COLORS = [
  'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
  'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'
]

RecipeViewerEvents.removeEntries('item', event => {
  /* --- Refined Storage : variantes colorées ------------------------------ */
  const RS_COLORABLE = [
    'grid', 'crafting_grid', 'pattern_grid', 'controller', 'creative_controller',
    'relay', 'cable', 'importer', 'exporter', 'external_storage', 'constructor',
    'destructor', 'detector', 'disk_interface', 'network_receiver',
    'network_transmitter', 'security_manager', 'wireless_transmitter',
    'autocrafter', 'autocrafter_manager', 'autocrafting_monitor'
  ]
  DYE_COLORS.forEach(color => {
    RS_COLORABLE.forEach(part => event.remove(`refinedstorage:${color}_${part}`))
  })

  /* --- Émetteur interdimensionnel : idem ---------------------------------- */
  DYE_COLORS.forEach(color =>
    event.remove(`interdimensionalwirelesstransmitter:${color}_interdimensional_wireless_transmitter`)
  )

  /* --- ProjectE : machines qui génèrent de l'EMC (2026-11-08) -------------
   * Collecteurs et relais n'ont plus de recette (00_removals.js) ; on les
   * masque pour qu'ils n'apparaissent plus du tout.                       */
  ;['collector', 'relay'].forEach(machine =>
    [1, 2, 3].forEach(mk => event.remove(`projecte:${machine}_mk${mk}`))
  )

  /* --- Objets « infinis » jugés trop forts (2026-11-09) -------------------
   * Plus de recette (30_tech.js) ni de butin (tools/pixelgo-loot/bags.mjs). */
  event.remove('sophisticatedstorage:survival_infinity_upgrade')
  event.remove('storagedrawers:creative_storage_upgrade')

  /* --- Items techniques sans usage dans ce pack --------------------------- */
  event.remove('ftbquests:barrier')      // support des singularités « recette seule »
  event.remove('ftbquests:stage_barrier')
  event.remove('refinedstorage:debug_stick')
  event.remove('sophisticatedstorage:debug_tool')
})
