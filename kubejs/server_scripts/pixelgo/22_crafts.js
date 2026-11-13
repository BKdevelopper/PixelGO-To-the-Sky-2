// priority: 100
/* =============================================================================
 *  PixelGO — To the Sky : balises de Gate, clés de caisse, steak infini
 * =============================================================================
 *  Trois objets qui ne se fabriquaient pas :
 *
 *    1. les 9 balises de Gate (pixelgo_dungeon) — butin uniquement jusqu'ici ;
 *    2. les clés HelsCrates — on peut maintenant en fondre 4 en une du rang
 *       au-dessus (Poke -> Great -> Ultra -> Master) ;
 *    3. le Steak infini (kubejs:infinite_steak, déclaré dans
 *       startup_scripts/pixelgo_items.js).
 *
 *  Aucune de ces recettes ne crée d'argent : ni les balises, ni les clés,
 *  ni le steak ne se revendent, et aucun n'est vendu en boutique.
 * ========================================================================== */

ServerEvents.recipes(event => {
  /* =========================================================================
   *  1. BALISES DE GATE — une échelle, chaque rang bâti sur le précédent.
   * -------------------------------------------------------------------------
   *  Motif commun : la balise du rang inférieur au centre (un Œil de l'Ender
   *  pour le rang E), 4 essences Mystical Agriculture aux coins, 4 objets
   *  compactés des minions sur les côtés.
   *
   *  Les essences suivent leur propre échelle (inferium -> insanium), les
   *  objets compactés la valeur de revente du Rachat d'items enchantés :
   *  charbon 320 $, fer 480 $, or 640 $, émeraude 1 280 $, diamant 1 600 $,
   *  mithril 8 000 $, bloc de diamant 14 400 $, puis les étoiles du Nether
   *  (100 000 $ en boutique) et les Absolute Ender Pearls (128 000 $).
   *
   *  Comme chaque balise en contient une autre, une balise DEMON contient
   *  toute l'échelle : ~1,5 M$ de matières, quelques heures de revenus de
   *  fin de partie — un raccourci, pas une route gratuite (une Gate DEMON
   *  naturelle reste 1 sur 200, voir config/pixelgo_dungeon-common.toml).
   * ====================================================================== */
  const MA = id => `mysticalagriculture:${id}_essence`
  const ENCH = id => `pixelgo_minions:enchanted_${id}`
  const GATE_BEACONS = [
    { rank: 'e', center: 'minecraft:ender_eye', corner: MA('inferium'), side: ENCH('coal') },
    { rank: 'd', center: 'e', corner: MA('prudentium'), side: ENCH('iron_ingot') },
    { rank: 'c', center: 'd', corner: MA('tertium'), side: ENCH('gold_ingot') },
    { rank: 'b', center: 'c', corner: MA('imperium'), side: ENCH('emerald') },
    { rank: 'a', center: 'b', corner: MA('supremium'), side: ENCH('diamond') },
    { rank: 's', center: 'a', corner: 'mysticalagradditions:insanium_essence', side: ENCH('mithril') },
    { rank: 'ss', center: 's', corner: 'mysticalagradditions:insanium_essence', side: ENCH('diamond_block') },
    { rank: 'sss', center: 'ss', corner: 'minecraft:nether_star', side: ENCH('diamond_block') },
    { rank: 'demon', center: 'sss', corner: 'minecraft:nether_star', side: 'pixelgo_minions:absolute_ender_pearl' }
  ]
  const BEACON = rank => `pixelgo_dungeon:gate_beacon_${rank}`
  GATE_BEACONS.forEach(b => {
    event.shaped(BEACON(b.rank), ['CSC', 'SBS', 'CSC'], {
      C: b.corner,
      S: b.side,
      B: b.center.includes(':') ? b.center : BEACON(b.center)
    }).id(`pixelgo:gate_beacon_${b.rank}`)
  })

  /* =========================================================================
   *  2. CLÉS DE CAISSE — 4 clés = 1 clé du rang au-dessus.
   * -------------------------------------------------------------------------
   *  Sens unique : on ne redescend pas. Une Master Key vaut donc 64 Poke
   *  Keys. Aucune clé n'est vendue ni rachetée : le ratio ne crée aucun
   *  arbitrage, il recycle seulement les clés d'un rang qu'on ne veut plus.
   * ====================================================================== */
  const KEY_LADDER = ['poke', 'great', 'ultra', 'master']
  for (let i = 1; i < KEY_LADDER.length; i++) {
    event.shapeless(`helscrates:${KEY_LADDER[i]}_key`, [`4x helscrates:${KEY_LADDER[i - 1]}_key`])
      .id(`pixelgo:${KEY_LADDER[i]}_key_from_${KEY_LADDER[i - 1]}`)
  }

  /* =========================================================================
   *  3. STEAK INFINI — milieu de partie, au bout du minion vache.
   * -------------------------------------------------------------------------
   *  4 Enchanted Raw Beef (160 bœufs crus chacun, 800 $ au Rachat), 4 blocs
   *  d'or et un steak cuit au centre. Un seul suffit pour toute la partie.
   * ====================================================================== */
  event.shaped('kubejs:infinite_steak', ['BGB', 'GSG', 'BGB'], {
    B: ENCH('raw_beef'),
    G: 'minecraft:gold_block',
    S: 'minecraft:cooked_beef'
  }).id('pixelgo:infinite_steak')
})
