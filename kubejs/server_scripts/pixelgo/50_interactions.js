// priority: 100
/* =============================================================================
 *  PixelGO — To the Sky : interactions (clic droit)
 * =============================================================================
 *  Portage de kubejs/server_scripts/{rightclick,lootbox,pixelmon/ticket}.js.
 *
 *  CORRECTIONS APPORTÉES AU PASSAGE
 *  --------------------------------
 *  Les scripts d'origine testaient `event.player.mainHandItem === Item.of(...)`,
 *  c'est-à-dire une comparaison d'identité entre deux ItemStack distincts :
 *  elle était TOUJOURS fausse, et la Clé Méga / l'Œuf Mystère / les tickets ne
 *  faisaient donc strictement rien. KubeJS 7 fournit `ItemEvents.rightClicked`
 *  filtré par item, ce qui règle le problème à la racine.
 *
 *  Les handlers se déclenchaient aussi deux fois (une par main) : on filtre
 *  désormais sur la main principale.
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 *  1. CAILLOUX — clic droit accroupi sur de la terre / de la pierre noire.
 *  exnihilosequentia:pebble_stone      -> exdeorum:stone_pebble
 *  exnihilosequentia:pebble_blackstone -> exdeorum:blackstone_pebble
 * ------------------------------------------------------------------------ */
const PEBBLE_SOURCES = {
  'minecraft:grass_block': 'exdeorum:stone_pebble',
  'minecraft:dirt': 'exdeorum:stone_pebble',
  'minecraft:coarse_dirt': 'exdeorum:stone_pebble',
  'minecraft:rooted_dirt': 'exdeorum:stone_pebble',
  'minecraft:blackstone': 'exdeorum:blackstone_pebble',
  'minecraft:polished_blackstone': 'exdeorum:blackstone_pebble',
  'minecraft:polished_blackstone_bricks': 'exdeorum:blackstone_pebble'
}

BlockEvents.rightClicked(event => {
  const { player, block } = event
  if (!player) return
  if (!player.mainHandItem.isEmpty()) return

  const pebble = PEBBLE_SOURCES[block.id]
  if (!pebble) return

  // Les « faux joueurs » (automatisation) reçoivent directement l'item.
  if (player.fake) {
    player.give(Item.of(pebble))
    event.cancel()
    return
  }

  if (!player.crouching) return
  player.give(Item.of(pebble))
  event.cancel()
})

/* ---------------------------------------------------------------------------
 *  2. BOÎTES MYSTÈRES — désormais gérées par le mod Treasure Bags.
 * ---------------------------------------------------------------------------
 *  Les items `kubejs:lootbox_1..4` et ce handler de clic droit ont été retirés.
 *  Les quatre boîtes sont maintenant des TYPES DE SACS déclarés en datapack :
 *
 *      kubejs/data/pixelgo/treasurebags_types/tier1.json  -> pixelgo:tier1
 *      kubejs/data/pixelgo/treasurebags_types/tier2.json  -> pixelgo:tier2
 *      kubejs/data/pixelgo/treasurebags_types/tier3.json  -> pixelgo:tier3
 *      kubejs/data/pixelgo/treasurebags_types/tier4.json  -> pixelgo:tier4
 *
 *  Chaque type pointe sur la table de butin d'origine (`loot:tier1..4`, dans
 *  kubejs/data/loot/loot_table/), donc le contenu des boîtes est inchangé.
 *
 *  Une boîte est l'item unique `treasurebags:treasure_bag` porteur du
 *  composant `treasurebags:bag_type` :
 *
 *      { id: 'treasurebags:treasure_bag', count: 1,
 *        components: { 'treasurebags:bag_type': 'pixelgo:tier2' } }
 *
 *  Treasure Bags fait le reste : ouverture au clic droit, son, couleurs,
 *  info-bulle et entrée EMI/JEI. Rien à scripter ici.
 *
 *  ATTENTION : le mod ouvre TOUT le stack d'un coup (contrairement à l'ancien
 *  handler qui n'en consommait qu'une). C'est le comportement natif.
 * ------------------------------------------------------------------------ */

/* ---------------------------------------------------------------------------
 *  3. TICKETS D'INVOCATION — un Pokémon aléatoire dont la qualité dépend du
 *  palier MK du ticket (IV minimum et chance de shiny), comme en 1.16.5.
 *
 *  Un temps de recharge global de 60 s est appliqué : la version 1.16.5 avait
 *  ce code, mais il était commenté et le `Map` de cooldown n'était jamais lu.
 * ------------------------------------------------------------------------ */
const TICKET_TIERS = [
  { id: 'light_gray', ivs: 0, shiny: 0 },
  { id: 'gray', ivs: 6, shiny: 1 },
  { id: 'red', ivs: 12, shiny: 2 },
  { id: 'magenta', ivs: 18, shiny: 3 },
  { id: 'pink', ivs: 24, shiny: 4 },
  { id: 'purple', ivs: 30, shiny: 5 },
  { id: 'blue', ivs: 36, shiny: 6 },
  { id: 'cyan', ivs: 42, shiny: 7 },
  { id: 'light_blue', ivs: 48, shiny: 8 },
  { id: 'green', ivs: 54, shiny: 9 },
  { id: 'lime', ivs: 60, shiny: 10 },
  { id: 'yellow', ivs: 66, shiny: 11 },
  { id: 'orange', ivs: 72, shiny: 12 },
  { id: 'brown', ivs: 78, shiny: 13 },
  { id: 'white', ivs: 84, shiny: 14 },
  { id: 'black', ivs: 90, shiny: 15 },
  { id: 'rainbow', ivs: 100, shiny: 20 }
]

// Recharge exprimée en MILLISECONDES d'horloge réelle (voir PG.maintenant dans
// 04_pg_lib.js : `level.getGameTime()` n'est pas appelable depuis Rhino), et
// stockée sur les données persistantes du joueur pour survivre à une
// déconnexion.
const TICKET_COOLDOWN_MS = 60 * 1000
const COOLDOWN_KEY = 'pixelgo_ticket_cooldown'

TICKET_TIERS.forEach(tier => {
  ItemEvents.rightClicked(`kubejs:${tier.id}_ticket`, event => {
    const { player } = event
    if (player.fake) return
    if (String(event.hand) !== 'MAIN_HAND') return

    const now = PG.maintenant()
    const readyAt = PG.lire(player, COOLDOWN_KEY, 0)

    if (now < readyAt) {
      player.tell(Text.red(`Ticket on cooldown — ${PG.restant(readyAt)} s left.`))
      return
    }

    PG.ecrire(player, COOLDOWN_KEY, now + TICKET_COOLDOWN_MS)
    event.item.count--

    /* Les specs de PixelSpecs (`minivspercent`, `shinychance`) ne sont ajoutées
     * QUE si leur valeur est > 0. Le ticket MK 0 envoyait sinon
     * `pokespawn random minivspercent:0 shinychance:0 islegendary:false`, la
     * seule ligne du lot à passer des valeurs nulles — et rien n'apparaissait.
     * À 0 ces deux specs ne contraignent de toute façon rien : les omettre
     * donne exactement le comportement voulu (un Pokémon totalement aléatoire)
     * sans dépendre de la façon dont le parseur traite le zéro. */
    const specs = ['islegendary:false']
    if (tier.ivs > 0) specs.unshift(`minivspercent:${tier.ivs}`)
    if (tier.shiny > 0) specs.push(`shinychance:${tier.shiny}`)

    player.server.runCommandSilent(
      `execute at ${player.username} as ${player.username} run pokespawn random ${specs.join(' ')}`
    )
    PG.son(player, 'magikarp', 1.0, 1.0)
  })
})
