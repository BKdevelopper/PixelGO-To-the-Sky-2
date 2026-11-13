/* =============================================================================
 *  API KubeJS 2101 — ce qui a changé depuis KubeJS 6
 * =============================================================================
 *  `ItemBuilder` n'expose plus `.tooltip(...)` ni `.glow(...)` :
 *
 *    .tooltip('...')  ->  ItemEvents.modifyTooltips (client_scripts/pixelgo/tooltips.js)
 *    .glow(true)      ->  .component('minecraft:enchantment_glint_override', true)
 *
 *  Les infobulles de ces items sont désormais regroupées dans
 *  client_scripts/pixelgo/tooltips.js, avec celles du reste du pack.
 * ========================================================================== */

// Reflet d'enchantement (ex-`.glow(true)`).
const GLINT = 'minecraft:enchantment_glint_override'

StartupEvents.registry('item', event => {
  event.create('random_egg')
    .displayName('Random Egg')
    .maxStackSize(16)
    .rarity('rare')
    .texture('kubejs:item/random_egg')

  event.create('mega_key')
    .displayName('Mega Key')
    .maxStackSize(16)
    .rarity('rare')
    .texture('kubejs:item/mega_key')

  event.create('ssr_ticket')
    .displayName('SSR Ticket')
    .maxStackSize(64)
    .rarity('epic')
    .texture('kubejs:item/ssr_ticket')
    .component(GLINT, true)

  event.create('aluminum_nugget')
    .displayName('Aluminum Nugget')
    .maxStackSize(64)
    .texture('kubejs:item/aluminum_nugget')

  event.create('silver_nugget')
    .displayName('Silver Nugget')
    .maxStackSize(64)
    .texture('kubejs:item/silver_nugget')

  event.create('platinum_nugget')
    .displayName('Platinum Nugget')
    .maxStackSize(64)
    .texture('kubejs:item/platinum_nugget')

  event.create('crystal_shard')
    .displayName('Crystal Shard')
    .maxStackSize(64)
    .texture('kubejs:item/crystal_shard')

  /* ---------------------------------------------------------------------------
   *  ESSENCE D'AURA — monnaie de progression (DESIGN_ECONOMIE.md §6.5)
   *
   *  Seuls les donjons en produisent. Aucun `sellPrice` ne lui est associé,
   *  donc elle est invisible pour pixelgosell et pour toutes les boutiques :
   *  elle ne peut structurellement pas être convertie en pokédollars.
   *
   *  Texture : magenta_ticket, la seule libre dont la teinte correspond à la
   *  couleur d'Essence de la charte (#FF55FF). À remplacer par une texture
   *  dédiée quand tu en auras une.
   * ------------------------------------------------------------------------ */
  event.create('aura_essence')
    .displayName('§dAura Essence')
    .maxStackSize(64)
    .rarity('epic')
    .component(GLINT, true)
    .texture('kubejs:item/magenta_ticket')

  /* ---------------------------------------------------------------------------
   *  FORMES COMPACTÉES DE L'ESSENCE
   *
   *  Une recette sans forme n'accepte que 9 emplacements : « 70x Essence »
   *  en occupe 70 et fait échouer la recette au chargement. Les paliers
   *  endgame passent donc par du compacté, comme pépite -> lingot -> bloc.
   *
   *      9 Aura Essence   = 1 Condensed Aura
   *      9 Condensed Aura = 1 Aura Core   (= 81 Essence)
   * ------------------------------------------------------------------------ */
  event.create('condensed_aura')
    .displayName('§5Condensed Aura')
    .maxStackSize(64)
    .rarity('epic')
    .component(GLINT, true)
    .texture('kubejs:item/purple_ticket')

  event.create('aura_core')
    .displayName('§cAura Core')
    .maxStackSize(64)
    .rarity('epic')
    .component(GLINT, true)
    .texture('kubejs:item/rainbow_ticket')
})
